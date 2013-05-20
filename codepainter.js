var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var Pipe = require('./lib/Pipe');
var rules = require('./lib/rules');
var Serializer = require('./lib/Serializer');
var Tokenizer = require('./lib/Tokenizer');


module.exports = {
	infer : function(sample, callback) {
		var style = {};
		var tokenizer = new Tokenizer();

		sample.pipe(tokenizer);

		rules.forEach(function(Rule) {
			new Rule().infer(tokenizer, function(inferredStyle) {
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

	transform : function(inputPath, style, callback, isTesting) {

		if(style.hasOwnProperty('indent_style')) {
			style.indent_style_and_size = true;
		}

		var enabledRules = [];
		rules.forEach(function(Rule) {
			if(Rule.prototype.name in style) {
				enabledRules.push(new Rule());
			}
		});

		var input = this.createInputStream(inputPath);
		var tokenizer = new Tokenizer();
		input.pipe(tokenizer);

		var tempPath = this.generateTempPath(inputPath);
		var output = fs.createWriteStream(tempPath);
		var serializer = new Serializer();
		serializer.pipe(output);
		output.on('close', this.onTransformEnd.bind(
			this, inputPath, tempPath, callback, isTesting));

		if(enabledRules.length > 0) {

			tokenizer.registerRules(enabledRules);

			var streams = [];
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

	createInputStream : function(inputPath) {
		var stream = fs.createReadStream(inputPath);
		stream.pause();
		stream.setEncoding('utf-8');
		return stream;
	},

	generateTempPath : function(inputPath) {
		return [
			path.dirname(inputPath),
			'_' + crypto.randomBytes(4).readUInt32LE(0) + '.tmp'
		].join(path.sep);
	},

	onTransformEnd : function(inputPath, tempPath, callback, isTesting) {
		if (isTesting) {
			fs.readFile(tempPath, 'utf-8', function(err, data) {
				fs.unlink(tempPath, function(err2) {
					if (err) throw err;
					if (err2) throw err2;
					if (typeof callback === 'function') {
						callback(data);
					}
				});
			});
			return;
		}
		fs.rename(tempPath, inputPath, function(err2){
			if (err2) throw err2;
			if (typeof callback === 'function'){
				callback();
			}
		});
	}
};
