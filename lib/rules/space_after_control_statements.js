var assert = require('assert');

var extend = require('node.extend');
var Rule = require('../rule');


function SpaceAfterControlStatementsRule(){}

SpaceAfterControlStatementsRule.prototype = extend({}, Rule.prototype, {

	name : 'space_after_control_statements',

	controlKeywords : ['if', 'for', 'switch', 'while', 'with'],

	tokens : {
		space : {type : 'Whitespaces', value : ' '}
	},

	infer : function(sample, callback) {

		this.callback = callback;

		this.prevToken = null;
		this.trueTrend = 0;
		this.falseTrend = 0;

		sample.on('data', this.onInferData.bind(this));
		sample.on('end', this.onInferEnd.bind(this));
	},

	onInferData : function(token) {
		this.token = token;
		if(this.isTrueStyle()) {
			this.trueTrend++;
		} else if(this.isFalseStyle()) {
			this.falseTrend++;
		}
		this.prevToken = token;
	},

	isTrueStyle : function() {
		return this.isControlKeyword(this.prevToken) && this.isWhitespaces(this.token);
	},

	isFalseStyle : function() {
		return this.isControlKeyword(this.prevToken) && ! this.isWhitespaces(this.token);
	},

	onInferEnd : function() {
		var t = this.trueTrend;
		var f = this.falseTrend;
		var setting = (t > f) ? true : (f > t) ? false : null;
		this.callback({space_after_control_statements : setting});
	},

	transform : function(input, settings, output) {
		this.input = input;
		this.settings = settings;
		this.output = output;

		this.validate();

		this.prevToken = null;

		switch(this.setting) {
			case true :
				input.on('data', this.onTrueTransformData.bind(this));
				break;
			case false :
				input.on('data', this.onFalseTransformData.bind(this));
				break;
			default :
				this.skipRule();
				return;
		}

		input.on('end', this.onTransformEnd.bind(this));
	},

	validate : function() {
		this.setting = this.settings[this.name];
		assert(typeof this.setting === 'boolean' || this.setting === null);
	},

	onTrueTransformData : function(token) {
		if(this.isControlKeyword(this.prevToken)) {
			this.output.write(this.tokens.space);
			if( ! this.isWhitespaces(token)) {
				assert(this.isOpenParen(token));
				this.output.write(token);
			}
		} else {
			this.output.write(token);
		}
		this.prevToken = token;
	},

	onFalseTransformData : function(token) {
		if( ! this.isControlKeyword(this.prevToken)) {
			this.output.write(token);
			this.prevToken = token;
			return;
		}
		if( ! this.isWhitespaces(token)) {
			assert(this.isOpenParen(token));
			this.output.write(token);
		}
		this.prevToken = token;
	},

	skipRule : function() {
		input.on('data', function(token) {
			this.output.write(token);
		}.bind(this));

		input.on('end', function() {
			this.output.end();
		}.bind(this));
	},

	onTransformEnd : function() {
		this.output.end();
	},

	isControlKeyword : function(token) {
		return token && token.type === 'Keyword' && this.controlKeywords.indexOf(token.value) !== - 1;
	},

	isOpenParen : function(token) {
		return token && token.type === 'Punctuator' && token.value === '(';
	},

	isWhitespaces : function(token) {
		return token && token.type === 'Whitespaces';
	}

});

module.exports = SpaceAfterControlStatementsRule;
