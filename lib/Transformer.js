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
		this.infer(function() {
			this.cascadeStyles();
			this.transformed = 0;
			this.skipped = 0;
			this.getInputsFromGlobs(function(inputs) {
				this.matched = inputs.length;
				inputs.forEach(this.onEachInput.bind(this));
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

	onEachInput : function(inputPath) {
		var style = this.cascadeEditorConfigStyle(inputPath);
		var rules = this.getRules(style);

		if ( ! rules.length) {
			this.emit('skip', ++this.skipped, inputPath);
			this.inputEnd();
			return;
		}

		var input = this.createInputStream(inputPath);
		var streams = this.createStreams(input, rules);
		this.applyRules(rules, streams, style);
		input.resume();
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

	createStreams : function(input, rules) {
		var tokenizer = new Tokenizer();
		input.pipe(tokenizer);

		var tempPath = this.generateTempPath(input.path);
		var output = fs.createWriteStream(tempPath);
		var serializer = new Serializer();
		serializer.pipe(output);

		output.on('close', this.onTransformEnd.bind(this, input.path, tempPath));

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

	onTransformEnd : function(inputPath, tempPath) {
		if (this.options.isTesting) {
			fs.readFile(tempPath, 'utf-8', function(err, data) {
				fs.unlink(tempPath, function(err2) {
					this.emit('test', err || err2, data);
				}.bind(this));
			}.bind(this));
			return;
		}
		fs.rename(tempPath, inputPath, function(err) {
			this.emit('transform', ++this.transformed, inputPath);
			this.inputEnd(err);
		}.bind(this));
	},

	inputEnd : function(err) {
		if (this.transformed + this.skipped === this.matched) {
			this.emit('end', err, this.transformed, this.skipped);
		}
	}

});

module.exports = Transformer;
