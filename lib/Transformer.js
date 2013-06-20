var async = require('async');
var crypto = require('crypto');
var editorconfig = require('editorconfig');
var extend = require('node.extend');
var fs = require('fs');
var glob = require('glob');
var path = require('path');
var stream = require('stream');
var util = require('util');

var codepainter = require('../codepainter');
var CodePainterObject = require('./Object');
var EndOfLineRule = require('./rules/end_of_line');
var Inferrer = require('./Inferrer');
var rules = require('./rules');
var Serializer = require('./Serializer');
var Tokenizer = require('./Tokenizer');
var util = require('./util');


function Transformer() {
	Transformer.super_.apply(this, arguments);
}

module.exports = util.inherits(Transformer, CodePainterObject, {

	transform : function(globs, options) {

		this.globs = globs;
		this.options = options || {};

		this.transformed = 0;
		this.skipped = 0;
		this.errored = 0;
		this.style = {};

		if (options.infer) {
			this.infer(this.cascadeAndTransform.bind(this));
			return;
		}

		this.cascadeAndTransform();
	},

	infer : function(callback) {
		codepainter.infer(this.options.infer, function(inferredStyle) {
			this.emit('cascade', this.style, inferredStyle, 'Inferred style');
			this.style = inferredStyle;
			callback();
		}.bind(this));
	},

	cascadeAndTransform : function() {
		this.cascadeStyles();
		var globs = this.globs;
		if (typeof globs === 'string') {
			this.inputs = [globs];
			this.transformPath(globs);
		} else if (globs && globs instanceof stream.Readable) {
			this.transformStream(globs);
		} else if (globs && globs[0] instanceof stream.Readable) {
			this.transformStream(globs[0]);
		} else {
			util.reduceGlobs(globs, this.onGlobPaths.bind(this));
		}
	},

	cascadeStyles : function() {
		var style = this.style;
		var options = this.options;

		if (options.predef) {
			var predefStyle = require('./styles/' + options.predef + '.json');
			this.emit('cascade', style, predefStyle, options.predef + ' style');
			style = extend(style, predefStyle);
		}

		if (options.json) {
			var jsonStyle = require(options.json);
			this.emit('cascade', style, jsonStyle, 'Supplied JSON file');
			style = extend(style, jsonStyle);
		}

		if (options.style && Object.keys(options.style).length) {
			this.emit('cascade', style, options.style, 'Inline styles');
			style = extend(style, options.style);
		}

		if (options.editorConfig) {
			this.emit('cascade', style, {
				editor_config : true
			}, 'Editor Config (applied on a file-by-file basis)');
		}

		this.style = style;
	},

	transformPath : function(inputPath) {
		var style = this.cascadeEditorConfigStyle(inputPath);
		var rules = this.getRules(style);

		if ( ! rules.length || style.codepaint === false ) {
			this.skip(inputPath);
			return;
		}

		var inputStream = this.createInputStream(inputPath);
		var streams = this.createStreams(inputStream, rules);

		new Inferrer().infer(inputPath, function(inferredStyle) {
			this.EOL = this.getEOLChar(inferredStyle['end_of_line']);
			this.applyRules(rules, streams, style, inputStream);
			inputStream.resume();
		}.bind(this), EndOfLineRule);
	},

	getEOLChar : function(setting) {
		switch (setting) {
			case 'crlf':
				return '\r\n';
			case 'lf':
				return '\n';
			default:
				return os.EOL;
		}
	},

	transformStream : function(inputStream) {
		inputStream.setEncoding('utf-8');
		var rules = this.getRules(this.style);
		if ( ! rules.length) {
			inputStream.on('data', function(chunk) {
				process.stdout.write(chunk);
			});
		}

		var streams = this.createStreams(inputStream, rules, process.stdout);
		this.applyRules(rules, streams, this.style);
	},

	onGlobPaths : function(paths) {
		this.inputs = paths;
		if (this.globs.length) {
			paths.forEach(this.transformPath.bind(this));
		} else {
			this.useStdinAsInput();
		}
	},

	onGlobPath : function(path) {
		this.transformPath(path, this.updateScore.bind(this));
	},

	skip : function(inputPath) {
		this.emit('skip', ++this.skipped, inputPath);
		this.inputEnd();
	},

	cascadeEditorConfigStyle : function(inputPath) {
		var style = extend({}, this.style);
		if (this.options.editorConfig) {
			var editorConfigStyle = editorconfig.parse(inputPath);
			style = extend(style, editorConfigStyle);
		}
		return style;
	},

	getRules : function(style) {
		var rulesToApply = [];
		rules.forEach(function(Rule) {
			var supportedSettings = Rule.prototype.supportedSettings;
			var keys = Object.keys(supportedSettings);
			for (var i = 0; i < keys.length; i++) {
				var key = keys[i];
				if (key in style) {
					rulesToApply.push(new Rule());
					break;
				}
			}
		}.bind(this));
		return rulesToApply;
	},

	createInputStream : function(inputPath) {
		var stream = fs.createReadStream(inputPath);
		stream.pause();
		stream.setEncoding('utf-8');
		return stream;
	},

	createStreams : function(input, rules, output) {
		var tokenizer = new Tokenizer();
		input.pipe(tokenizer);

		var inputPath = input.path || path.resolve('.');
		var tempPath = this.generateTempPath(inputPath);
		if ( ! output) {
			output = fs.createWriteStream(tempPath);
			tokenizer.on('error', function(err) {
				this.onError.call(this, err, inputPath, output);
			}.bind(this));
		}
		var serializer = new Serializer();
		serializer.pipe(output);

		output.on('close', this.onTransformEnd.bind(this, inputPath, output));

		tokenizer.registerRules(rules);

		var streams = [];
		streams.push(tokenizer);

		for (var i = 0; i < rules.length - 1; i++)
			streams.push(new Pipe());

		streams.push(serializer);
		return streams;
	},

	applyRules : function(rules, streams, style) {
		rules.forEach(function(rule, i) {
			rule.EOL = this.EOL;
			rule.transform(streams[i], style, streams[i + 1], onError);
		}.bind(this));
		function onError() {}
	},

	generateTempPath : function(inputPath) {
		return [
		path.dirname(inputPath),
			'_' + crypto.randomBytes(4).readUInt32LE(0) + '.tmp'
		].join(path.sep);
	},

	onTransformEnd : function(inputPath, output) {
		if (this.options.isTesting) {
			fs.readFile(output.path, 'utf-8', function(err, data) {
				fs.unlink(output.path, function(err2) {
					this.emit('test', err || err2, data);
				}.bind(this));
			}.bind(this));
			return;
		}
		fs.rename(output.path, inputPath, function(err) {
			this.emit('transform', ++this.transformed, inputPath);
			this.inputEnd(err);
		}.bind(this));
	},

	inputEnd : function(err) {
		if (this.transformed + this.skipped + this.errored === this.inputs.length) {
			this.emit('end', this.firstError || err, this.transformed, this.skipped, this.errored);
		}
	},

	onError : function(err, inputPath, output) {
		this.emit('error', err, inputPath);
		if ( ! this.firstError) {
			this.firstError = err;
		}
		if (output.path) {
			fs.unlink(output.path, function() {
				this.errored++;
				this.inputEnd();
			}.bind(this));
			return;
		}
		this.errored++;
		this.inputEnd.call(this, err);
	}

});
