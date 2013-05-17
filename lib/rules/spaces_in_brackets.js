var assert = require('assert');


module.exports = {
	name : 'spaces_in_brackets',

	brackets : ['(', '[', '{', ')', ']', '}'],

	openBrackets : ['(', '[', '{'],

	closeBrackets : [')', ']', '}'],

	tokens : {
		space : {type : 'Whitespaces', value : ' '}
	},

	infer : function(sample, callback) {
		this.prevTokens = new Array(2);
		this.trueTrend = 0;
		this.falseTrend = 0;
		this.callback = callback;

		sample.on('data', this.onInferData.bind(this));
		sample.on('end', this.onInferEnd.bind(this));
	},

	onInferData : function(token) {

		this.setFriendlyTokenNames(token);

		if(this.isTrueStyle()) {
			this.trueTrend++;
		} else if(this.isFalseStyle()) {
			this.falseTrend++;
		}

		this.shiftTokens(token);
	},

	setFriendlyTokenNames : function(token) {
		this.token = token;
		this.prevToken = this.prevTokens[1];
		this.prevPrevToken = this.prevTokens[0];
	},

	isTrueStyle : function() {
		return this.hasSpaceInsideOpenBracket() || this.hasSpaceInsideCloseBracket();
	},

	isFalseStyle : function() {
		return this.hasNonSpaceInsideBracket();
	},

	shiftTokens : function() {
		this.prevTokens.shift();
		this.prevTokens.push(this.token);
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

		this.callback({spaces_in_brackets : setting});
	},

	transform : function(input, settings, output) {

		this.input = input;
		this.settings = settings;
		this.output = output;

		this.validate();
		this.prevTokens = new Array(2);

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

	validate : function() {
		this.setting = this.settings[this.name];
		assert(typeof this.setting === 'boolean' || this.setting === 'hybrid');
	},

	onTrueTransformData : function(token) {
		this.setFriendlyTokenNames(token);

		if(this.hasNonSpaceInsideBracket()) {
			this.output.write(this.tokens.space);
		}

		this.onAfterEachTransformData();
	},

	hasNonSpaceInsideBracket : function() {
		if(this.isOpenBracket(this.prevToken) && ! this.isWhitespaces(this.token)) {
			return true;
		}
		if( ! this.isWhitespaces(this.prevToken) && this.isCloseBracket(this.token)) {
			return true;
		}
		return false;
	},

	onAfterEachTransformData : function() {
		if(this.isWhitespaces(this.prevToken)) {
			this.output.write(this.prevToken);
		}
		if( ! this.isWhitespaces(this.token)) {
			this.output.write(this.token);
		}
		this.shiftTokens();
	},

	onFalseTransformData : function(token) {
		this.setFriendlyTokenNames(token);

		if(this.hasSpaceInsideOpenBracket()) {
			token.value = '';
		} else if(this.hasSpaceInsideCloseBracket()) {
			this.prevToken.value = '';
		}

		this.onAfterEachTransformData();
	},

	hasSpaceInsideOpenBracket : function() {
		return this.isOpenBracket(this.prevToken) && this.isWhitespacesSansNewline(this.token);
	},

	hasSpaceInsideCloseBracket : function() {
		return this.isWhitespacesSansNewline(this.prevToken) && this.isCloseBracket(this.token);
	},

	onHybridTransformData : function(token) {
		this.setFriendlyTokenNames(token);

		if(this.shouldHybridRemoveSpace()) {
			this.prevToken.value = '';
		}

		if(this.shouldHybridAddSpace()) {
			this.output.write(this.tokens.space);
		}

		this.onAfterEachTransformData();
	},

	shouldHybridRemoveSpace : function() {
		return this.hasBracketSpaceBracket() || this.hasBracketSpaceFunction();
	},

	hasBracketSpaceBracket : function() {
		if(this.isWhitespacesSansNewline(this.prevToken)) {
			if(this.isCloseBracket(this.prevPrevToken) && this.isOpenBracket(this.token)) {
				return false;
			}
			if(this.isBracket(this.prevPrevToken) && this.isBracket(this.token)) {
				return true;
			}
		}
		return false;
	},

	hasBracketSpaceFunction : function() {
		return this.isOpenBracket(this.prevPrevToken) &&
		this.isWhitespacesSansNewline(this.prevToken) &&
		this.isFunctionKeyword(this.token);
	},

	shouldHybridAddSpace : function() {
		if(this.isOpenBracket(this.prevToken) && ! this.isWhitespaces(this.token) &&
			 ! this.isBracket(this.token) && ! this.isFunctionKeyword(this.token)) {
			return true;
		}
		if(this.isCloseBracket(this.token) &&
			 ! this.isWhitespaces(this.prevToken) && ! this.isBracket(this.prevToken)) {
			return true;
		}
		return false;
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
		this.token && this.output.write(this.token);
		this.output.end();
	},

	isFunctionKeyword : function(token) {
		return token && token.type === 'Keyword' && token.value === 'function';
	},

	isPunctuator : function(token) {
		return token && token.type === 'Punctuator';
	},

	isBracket : function(token) {
		return this.isPunctuator(token) && this.brackets.indexOf(token.value) !== - 1;
	},

	isOpenBracket : function(token) {
		return this.isPunctuator(token) && this.openBrackets.indexOf(token.value) !== - 1;
	},

	isCloseBracket : function(token) {
		return this.isPunctuator(token) && this.closeBrackets.indexOf(token.value) !== - 1;
	},

	isWhitespaces : function(token) {
		return token && token.type == 'Whitespaces';
	},

	isWhitespacesSansNewline : function(token) {
		return this.isWhitespaces(token) && ! this.hasNewline(token);
	},

	hasNewline : function(token) {
		return token && token.value.indexOf('\n') !== - 1;
	}
};
