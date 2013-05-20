var fs = require('fs');

var Pipe = require('./Pipe');
var rules = require('./rules');
var Tokenizer = require('./Tokenizer');


function Inferrer() {}

Inferrer.prototype = {

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
			rules.forEach(this.inferRule);
		}
	},

	inferRule : function( Rule ) {
		new Rule().infer( this.tokenizer, onInferEnd.bind(this) );
		function onInferEnd( inferredStyle ) {
			this.style = inferredStyle;
		}
	},

	initTokenizerEnd : function( callback ) {
		this.tokenizer.on('end', function() {
			callback(this.style);
		}.bind(this));
	}

};

module.exports = Inferrer;
