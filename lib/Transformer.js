var async = require( 'async' );
var crypto = require('crypto');
var editorconfig = require( 'editorconfig' );
var extend = require( 'node.extend' );
var fs = require('fs');
var glob = require( 'glob' );
var path = require('path');

var rules = require('./rules');
var Serializer = require('./Serializer');
var Tokenizer = require('./Tokenizer');


function Transformer() {}

Transformer.prototype = {

	transform : function(options, callback) {
		this.options = options;
		if( typeof callback === 'function' ) {
			this.callback = callback;
		}

		this.getInputsFromGlobs( this.transformInputs.bind( this ) );
	},

	getInputsFromGlobs : function(callback) {
		var inputs = [];
		async.map( this.options.globs, onEachGlob, function( err, fileListList ) {
			fileListList.forEach( function( fileList ) {
				inputs.push.apply( inputs, fileList.filter( filterOutExisting ) );
			} );
			callback( inputs );
		});
		function onEachGlob(globPattern, cb) {
			glob( globPattern, function(err, paths) {
				cb( null, paths );
			});
		}
		function filterOutExisting(file){
			return inputs.indexOf(file) === -1;
		}
	},

	transformInputs : function( inputs ) {
		inputs.forEach( this.onEachInput.bind(this));
	},

	onEachInput : function( inputPath ) {
		var style = this.cascadeEditorConfigStyle( inputPath );
		var rules = this.getRules( style );

		if( !rules.length ) {
			return;
		}

		var input = this.createInputStream( inputPath );
		var streams = this.createStreams( input, rules );
		this.applyRules( rules, streams, style );
		input.resume();
	},

	cascadeEditorConfigStyle : function( inputPath ) {
		var style = extend( {}, this.options.style );
		if( this.options.editorConfig ) {
			var editorConfigStyle = editorconfig.parse( inputPath );
			style = extend( style, editorConfigStyle );
		}
		if ('indent_style' in style) {
			style.indent_style_and_size = true;
		}
		return style;
	},

	getRules : function( style ) {
		var rulesToApply = [];
		rules.forEach(function(Rule) {
			if(Rule.prototype.name in style) {
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

	createStreams : function( input, rules ) {
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

		for(var i = 0; i < rules.length - 1; i++)
			streams.push(new Pipe());

		streams.push(serializer);
		return streams;
	},

	applyRules : function( rules, streams, style ) {
		rules.forEach( function( rule, i ) {
			rule.transform(streams[i], style, streams[i + 1], onError);
		}.bind(this) );
		function onError() {}
	},

	generateTempPath : function(inputPath) {
		return [
			path.dirname(inputPath),
			'_' + crypto.randomBytes(4).readUInt32LE(0) + '.tmp'
		].join(path.sep);
	},

	onTransformEnd : function(inputPath, tempPath) {
		var callback = this.callback;
		if (this.options.isTesting) {
			fs.readFile(tempPath, 'utf-8', function(err, data) {
				fs.unlink(tempPath, function(err2) {
					callback( err || err2, data );
				});
			});
			return;
		}
		fs.rename(tempPath, inputPath, callback);
	},

	callback : function(err) {
		if (err) throw err;
	}

};

module.exports = Transformer;
