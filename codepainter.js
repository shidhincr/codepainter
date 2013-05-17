var fs = require('fs');

var Pipe = require('./lib/Pipe');
var rules = require('./lib/rules');
var Serializer = require('./lib/Serializer');
var Tokenizer = require('./lib/Tokenizer');


module.exports = {
	infer : function(sample, callback) {
		var style = {};
		var tokenizer = new Tokenizer();

		sample.pipe(tokenizer);

		rules.forEach(function(rule) {
			rule.infer(tokenizer, function(inferredStyle) {
				Object.keys(inferredStyle).forEach(function(key) {
					style[key] = inferredStyle[key];
				});
			});
		});

		tokenizer.on('end', function() {
			tokenizer.registerRules(style);
			callback(style);
		});

		sample.resume();
	},

	transform : function(input, style, output, callback) {
		var enabledRules = [];
		var tokenizer = new Tokenizer();
		var serializer = new Serializer();
		var streams = [];

		style = this.convertStyle(style);
		if(style.hasOwnProperty('indent_style')) {
			style.indent_style_and_size = true;
		}
		rules.forEach(function(iRule) {
			if(iRule.name in style) {
				enabledRules.push(iRule);
			}
		});

		input.pipe(tokenizer);
		serializer.pipe(output);
		serializer.on('end', function() {
			if(typeof callback === 'function') {
				callback();
			}
		});

		if(enabledRules.length > 0) {

			tokenizer.registerRules(enabledRules);

			streams.push(tokenizer);

			for(var i = 0; i < enabledRules.length - 1; i++)
				streams.push(new Pipe());

			streams.push(serializer);

			var errorFunction = function(){};
			for(i = 0; i < enabledRules.length; i++) {
				var rule = enabledRules[i];
				rule.transform(streams[i], style, streams[i + 1], errorFunction);
			}
		} else {
			tokenizer.pipe(serializer);
		}
		input.resume();
	},

	/**
	 * Converts the style string into an object.
	 *
	 * First tries to parse the style string as a JSON string. If that does not work,
	 * tries interpret the style string as the name of a predefined style and load
	 * the respective style file. If that does not work either, throws an error.
	 *
	 */
	convertStyle : function(style) {
		try {
			return typeof style === 'string' ? JSON.parse(style) : style;
		} catch(e) {
				try {
					return require(__dirname + '/lib/styles/' + style + '.json');
				} catch(e2) {

						var msg = style + ' is not a valid style.\n\nValid predefined styles are:\n';

						var files = fs.readdirSync(__dirname + '/lib/styles/');

						for(var i in files) {
							msg += '  ' + files[i].slice(0, - 5) + '\n';
						}

						throw new Error(msg);
					}
			}
	}
};
