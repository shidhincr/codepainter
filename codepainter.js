var Inferrer = require('./lib/Inferrer');
var Transformer = require('./lib/Transformer');


module.exports = {
	infer : function(samplePath, callback, Rule) {
		new Inferrer().infer(samplePath, callback, Rule);
	},

	transform : function(options) {
		new Transformer(options).transform();
	}
};
