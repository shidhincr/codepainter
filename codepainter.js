var MultiInferrer = require('./lib/MultiInferrer');
var Transformer = require('./lib/Transformer');


module.exports = {
	infer : function(globs, options, callback, Rule) {
		var inferrer = new MultiInferrer();
		if (typeof options === 'function') {
			inferrer.infer(globs, undefined, options, callback);
		} else {
			inferrer.infer(globs, options, callback, Rule);
		}
	},

	transform : function(options) {
		new Transformer(options).transform();
	}
};
