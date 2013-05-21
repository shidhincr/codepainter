var os = require('os');


function Rule() {}

Rule.prototype = {

	tokens : {
		space : {type : 'Whitespaces', value : ' '},
		emptyString : {type : 'Whitespaces', value : ''}
	},

	skipRule : function() {
		this.input.on('data', function(token) {
			this.output.write(token);
		}.bind(this));
		this.input.on('end', function() {
			this.output.end();
		}.bind(this));
	},

	onTransformEnd : function() {
		this.output.end();
	},

	setEOLChar : function() {
		switch(this.settings.end_of_line) {
			case 'crlf' :
				this.EOL = '\r\n';
				break;
			case 'lf' :
				this.EOL = '\n';
				break;
			default :
				this.EOL = os.EOL;
				break;
		}
		this.tokens.EOL = { type : 'Whitespaces', value : this.EOL };
	},

	endsWithNewline : function(token) {
		return token.value.substr( - 1, 1) === '\n';
	},

	hasNewline : function(token) {
		return this.isWhitespaces(token) && token.value.indexOf('\n') !== - 1;
	},

	isCloseCurlyBrace : function(token) {
		return this.isPunctuator(token) && token.value === '}';
	},

	isFunctionKeyword : function(token) {
		return token && token.type === 'Keyword' && token.value === 'function';
	},

	isIdentifier : function(token) {
		return token && token.type === 'Identifier';
	},

	isLineComment : function(token) {
		return token && token.type === 'LineComment';
	},

	isOnlySpaces : function(token) {
		return this.isWhitespaces(token) && /^ +$/.test(token.value);
	},

	isOpenCurlyBrace : function(token) {
		return this.isPunctuator(token) && token.value === '{';
	},

	isOpenParen : function(token) {
		return this.isPunctuator(token) && token.value === '(';
	},

	isPunctuator : function(token) {
		return token && token.type === 'Punctuator';
	},

	isUnary : function(token) {
		return token && token.grammarToken.type === 'UnaryExpression';
	},

	isWhitespaces : function(token) {
		return token && token.type == 'Whitespaces';
	},

	isWhitespacesSansNewline : function(token) {
		return this.isWhitespaces(token) && ! this.hasNewline(token);
	}

};

module.exports = Rule;
