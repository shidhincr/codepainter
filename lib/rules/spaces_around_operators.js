var assert = require('assert');


module.exports = {

	name : 'spaces_around_operators',

	operators : [
			'!', '~',
			'*', '/', '%',
			'+', '-',
			'<<', '>>', '>>>',
			'<', '<=', '>', '>=',
			'==', '!=', '===', '!==',
			'&', '^', '|', '&&', '||', '?', ':',
			'=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=', '&=', '^=', '|='
		],

	hybridGroupOperators : ['*', '/', '%'],

	tokens : {
		space : {type : 'Whitespaces', value : ' '}
	},

	infer : function(sample, callback) {
		this.prevToken = null;
		this.trueTrend = 0;
		this.falseTrend = 0;
		this.callback = callback;

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
		return this.hasOperatorThenSpaces() || this.hasSpacesThenOperator();
	},

	isFalseStyle : function() {
		return this.isOperatorAdjacentToNonspace();
	},

	onInferEnd : function() {
		var setting;

		if(this.trueTrend > this.falseTrend) {
			setting = (this.falseTrend === 0) ? true : 'hybrid';
		} else if(this.falseTrend > this.trueTrend) {
			setting = (this.trueTrend === 0) ? false : 'hybrid';
		} else {
			setting = null;
		}

		this.callback({spaces_around_operators : setting});
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
			case 'hybrid' :
				input.on('data', this.onHybridTransformData.bind(this));
				break;
			default :
				this.SkipRule();
				return;
		}

		input.on('end', this.onTransformEnd.bind(this));
	},

	onTrueTransformData : function(token) {
		this.token = token;
		this.prevToken && this.output.write(this.prevToken);
		if(this.isOperatorAdjacentToNonspace()) {
			this.output.write(this.tokens.space);
		}
		this.prevToken = token;
	},

	isOperatorAdjacentToNonspace : function() {
		if(this.hasOperatorThenNonspaces()) {
			return true;
		}
		if(this.hasNonspacesThenOperator()) {
			return true;
		}
		return false;
	},

	hasOperatorThenNonspaces : function() {
		return this.isOperator(this.prevToken) && ! this.isWhitespaces(this.token);
	},

	hasNonspacesThenOperator : function() {
		return ! this.isOnlySpaces(this.prevToken) && this.isOperator(this.token);
	},

	onFalseTransformData : function(token) {
		this.token = token;
		var prevToken = this.prevToken;
		if(this.hasOperatorThenSpaces()) {
			token.value = '';
		} else if(this.hasSpacesThenOperator()) {
			prevToken.value = '';
		}
			prevToken && this.output.write(prevToken);
		this.prevToken = token;
	},

	hasOperatorThenSpaces : function() {
		return this.isOperator(this.prevToken) && this.isOnlySpaces(this.token);
	},

	hasSpacesThenOperator : function() {
		return this.isOperator(this.token) && this.isOnlySpaces(this.prevToken);
	},

	onHybridTransformData : function(token) {
		this.token = token;
		var prevToken = this.prevToken;

		if(prevToken) {
			if(this.shouldHybridRemoveTokenSpace()) {
				this.token.value = '';
			} else if(this.shouldHybridRemovePrevTokenSpace()) {
				this.prevToken.value = '';
			}
			this.output.write(this.prevToken);
			if(this.shouldHybridAddSpace()) {
				this.output.write(this.tokens.space);
			}
		}
		this.prevToken = token;
	},

	shouldHybridRemoveTokenSpace : function() {
		return this.hasOperatorThenSpaces() && this.isHybridGroupToken(this.prevToken);
	},

	shouldHybridRemovePrevTokenSpace : function() {
		return this.hasSpacesThenOperator() && this.isHybridGroupToken(this.token);
	},

	isHybridGroupToken : function(token) {
		return this.isHybridGroupOperator(token) || this.isUnary(token);
	},

	shouldHybridAddSpace : function() {
		if(this.hasOperatorThenNonspaces() && ! this.isHybridGroupToken(this.prevToken)) {
			return true;
		}
		if(this.hasNonspacesThenOperator() && ! this.isHybridGroupToken(this.token)) {
			return true;
		}
		return false;
	},

	onTransformEnd : function() {
		this.token && this.output.write(this.token);
		this.output.end();
	},

	validate : function() {
		this.setting = this.settings[this.name];
		assert(typeof this.setting === 'boolean' || this.setting === 'hybrid');
	},

	isOperator : function(token) {
		return this.isPunctuator(token) && this.operators.indexOf(token.value) !== - 1;
	},

	isPunctuator : function(token) {
		return token && token.type === 'Punctuator';
	},

	isHybridGroupOperator : function(token) {
		return this.isPunctuator(token) && this.hybridGroupOperators.indexOf(token.value) !== - 1;
	},

	isUnary : function(token) {
		return token && token.grammarToken.type === 'UnaryExpression';
	},

	isOnlySpaces : function(token) {
		return this.isWhitespaces(token) && /^ +$/.test(token.value);
	},

	isWhitespaces : function(token) {
		return token && token.type === 'Whitespaces';
	},

	shouldBeSurroundedBySpaces : function(token) {
		return ! (this.setting === false || (this.setting === 'hybrid' &&
			(this.isHybridGroupOperator(token) || this.isUnary(token))));
	}
};
