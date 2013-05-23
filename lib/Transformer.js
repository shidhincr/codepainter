var async = require('async');
var crypto = require('crypto');
var editorconfig = require('editorconfig');
var EventEmitter = require('events').EventEmitter;
var extend = require('node.extend');
var fs = require('fs');
var glob = require('glob');
var path = require('path');
var util = require('util');

var codepainter = require('../codepainter');
var rules = require('./rules');
var Serializer = require('./Serializer');
var Tokenizer = require('./Tokenizer');
var util = require('./util');


function Transformer(options) {
	EventEmitter.call(this);
	this.options = options;
}

util.inherits(Transformer, EventEmitter, {

	transform : function() {
		this.transformed = 0;
		this.skipped = 0;
		this.errored = 0;

		this.infer(function() {
			this.cascadeStyles();
			this.getInputsFromGlobs(function(inputs) {
				this.inputs = inputs;
				if (this.options.globs.length) {
					inputs.forEach(this.onEachInput.bind(this));
				} else {
					this.useStdinAsInput();
				}
			}.bind(this));
		}.bind(this));
	},

	infer : function(callback) {
		this.style = {};
		if ( ! this.options.infer) {
			callback();
			return;
		}
		codepainter.infer(this.options.infer, function(inferredStyle) {
			this.emit('cascade', this.style, inferredStyle, 'Inferred style');
			this.style = inferredStyle;
			callback();
		}.bind(this));
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

	getInputsFromGlobs : function(callback) {
		var inputs = [];
		async.map(this.options.globs, onEachGlob, function(err, fileListList) {
			fileListList.forEach(function(fileList) {
				inputs.push.apply(inputs, fileList.filter(filterOutExisting));
			});
			callback(inputs);
		});
		function onEachGlob(globPattern, cb) {
			glob(globPattern, function(err, paths) {
				cb(null, paths);
			});
		}
		function filterOutExisting(file){
			return inputs.indexOf(file) === - 1;
		}
	},

	useStdinAsInput : function() {
		if (process.stdin.isTTY) {
			this.inputEnd();
			return;
		}

		process.stdin.setEncoding('utf-8');

		var rules = this.getRules(this.style);
		if ( ! rules.length) {
			process.stdin.on('data', function(chunk) {
				process.stdout.write(chunk);
			});
		}

		var streams = this.createStreams(process.stdin, rules, process.stdout);
		this.applyRules(rules, streams, this.style);
	},

	onEachInput : function(inputPath) {
		var style = this.cascadeEditorConfigStyle(inputPath);
		var rules = this.getRules(style);

		if ( ! rules.length || style.codepaint === false ) {
			this.skip(inputPath);
			return;
		}

		var input = this.createInputStream(inputPath);
		var streams = this.createStreams(input, rules);
		this.applyRules(rules, streams, style);
		input.resume();
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
		if ('indent_style' in style) {
			style.indent_style_and_size = true;
		}
		return style;
	},

	getRules : function(style) {
		var rulesToApply = [];
		rules.forEach(function(Rule) {
			if (Rule.prototype.name in style) {
				rulesToApply.push(new Rule());
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

module.exports = Transformer;
