var fs = require('fs');
var extend = require('node.extend');

var CodePainterError = require('./Error');
var CodePainterObject = require('./Object');
var Pipe = require('./Pipe');
var rules = require('./rules');
var Tokenizer = require('./Tokenizer');
var util = require('./util');


function Inferrer(onError) {
	Inferrer.super_.call(this, onError);
}

util.inherits(Inferrer, CodePainterObject, {

	name : 'Inferrer',

	infer : function(samplePath, callback, Rule) {
		this.openSample( samplePath );
		this.initTokenizer();
		this.inferRules( Rule );
		this.initTokenizerEnd( callback );
		this.sample.resume();
	},

	openSample : function( samplePath ) {
		var sample = fs.createReadStream( samplePath );
		sample.pause();
		sample.setEncoding( 'utf-8' );
		this.sample = sample;
	},

	initTokenizer : function() {
		this.tokenizer = new Tokenizer();
		this.sample.pipe( this.tokenizer );
	},

	inferRules : function( Rule ) {
		if( typeof Rule !== 'undefined' ) {
			this.inferRule( Rule );
		} else {
			rules.forEach(this.inferRule.bind(this));
		}
	},

	inferRule : function( Rule ) {
		new Rule().infer( this.tokenizer, onInferEnd.bind(this) );
		function onInferEnd( inferredStyle ) {
			this.style = extend(this.style, inferredStyle);
		}
	},

	initTokenizerEnd : function( callback ) {
		this.tokenizer.on('end', function() {
			callback(this.style);
		}.bind(this));
	},

	Error : InferrerError

});

function InferrerError(message) {
	InferrerError.super_.call(this, message);
}

util.inherits(InferrerError, CodePainterError, {
	name : 'InferrerError'
});

module.exports = Inferrer;
