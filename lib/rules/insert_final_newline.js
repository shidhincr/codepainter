var assert = require('assert');

var Rule = require('../Rule');
var util = require('../util');


function InsertFinalNewlineRule(){}

util.inherits(InsertFinalNewlineRule, Rule, {

	name : 'insert_final_newline',

	infer : function(sample, callback) {
		var previousToken = null;

		sample.on('data', function(token) {
			previousToken = token;
		});

		sample.on('end', function() {

			var value;

			if((previousToken && previousToken.type === 'Whitespaces') &&
			(previousToken.value.indexOf('\n') !== - 1)) {

				value = true;
			} else {
				value = false;
			}

			callback({insert_final_newline : value});
		});
	},

	transform : function(input, settings, output) {

		this.input = input;
		this.settings = settings;
		this.enforceRule = this.settings[this.name];
		this.output = output;

		this.validate();

		if( ! this.enforceRule) {
			this.skipRule();
			return;
		}

		this.beforeData();

		input.on('data', this.onTransformData.bind(this));
		input.on('end', this.onTransformEnd.bind(this));
	},

	validate : function() {
		assert(typeof this.enforceRule === 'boolean');
	},

	beforeData : function() {
		this.prevToken = null;
		this.setEOLChar();
	},

	onTransformData : function(token) {

		if(this.prevToken) {
			this.output.write(this.prevToken);
		}

		this.prevToken = token;
	},

	onTransformEnd : function() {
		var output = this.output;

		if(this.prevToken && this.prevToken.type !== 'Whitespaces') {
			output.write(this.prevToken);
		}

		if(this.enforceRule) {
			output.write(this.tokens.EOL);
		}

		output.end();
	}

});

module.exports = InsertFinalNewlineRule;
