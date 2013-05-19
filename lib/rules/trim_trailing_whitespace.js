var os = require('os');
var assert = require('assert');

var extend = require('node.extend');
var string = require('../util/string');
var eol = require('../eol');
var Rule = require('../rule');


function TrimTrailingWhitespaceRule() {}

TrimTrailingWhitespaceRule.prototype = extend({}, Rule.prototype, {

	name : 'trim_trailing_whitespace',

	infer : function(sample, callback) {

		var hasTrailingWhitespace = false;

		sample.on('data', function(token) {
			if(token.type === 'Whitespaces' && /[ \t]\r?\n$/.test(token.value)) {
				hasTrailingWhitespace = true;
			}
		});

		sample.on('end', function() {
			callback({trim_trailing_whitespace : ! hasTrailingWhitespace});
		});
	},

	transform : function(input, settings, output) {

		this.input = input;
		this.output = output;
		this.settings = settings;

		if( ! this.validate()) {
			this.skipRule();
			return;
		}

		this.beforeData();
		this.bindEvents();
	},

	validate : function() {
		var enforceRule = this.settings[this.name];
		assert(typeof enforceRule === 'boolean');
		return enforceRule;
	},

	skipRule : function() {
		this.input.on('data', function(token) {
			this.output.write(token);
		}.bind(this));
		this.input.on('end', this.onTransformEnd.bind(this));
	},

	beforeData : function() {
		this.EOL = eol.getEOLChar(this.settings.end_of_line);
	},

	bindEvents : function() {
		this.input.on('data', this.onTransformData.bind(this, this.output));
		this.input.on('end', this.onTransformEnd.bind(this));
	},

	onTransformData : function(output, token) {
		if(token.type === 'Whitespaces') {
			var pos = token.value.lastIndexOf('\n');
			if(pos !== - 1) {
				var lineCount = (token.value.match(/\n/g) || []).length;
				token.value = this.EOL.repeat(lineCount) + token.value.substr(pos + 1);
			}
		}
		output.write(token);
	},

	onTransformEnd : function() {
		this.output.end();
	}

});

module.exports = TrimTrailingWhitespaceRule;
