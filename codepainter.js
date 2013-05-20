var Inferrer = require('./lib/Inferrer');
var Transformer = require('./lib/Transformer');


module.exports = {

	infer : function(samplePath, callback, Rule) {
		var inferrer = new Inferrer();
		inferrer.infer( samplePath, callback, Rule );
	},

	transform : function(inputPath, style, callback, isTesting) {
		var transformer = new Transformer();
		transformer.transform( inputPath, style, callback, isTesting );
	}
};
