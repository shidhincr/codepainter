var CodePainterError = require('./Error');
var CodePainterObject = require('./Object');
var Inferrer = require('./Inferrer');
var util = require('./util');


function MultiInferrer(onError) {
	MultiInferrer.super_.call(this, onError);
}

util.inherits(MultiInferrer, CodePainterObject, {

	name : 'MultiInferrer',

	infer : function(globs, options, callback) {
		this.options = options;
		this.callback = callback;
		this.style = {};
		util.reduceGlobs(globs, this.onGlobPaths.bind(this));
	},

	onGlobPaths : function(paths) {
		this.pathsFound = paths.length;
		paths.forEach(this.onGlobPath.bind(this));
	},

	onGlobPath : function(path) {
		var inferrer = new Inferrer();
		inferrer.infer(path, this.updateScore.bind(this));
	},

	updateScore : function(style) {
		Object.keys(style).forEach(function(key) {
			var rule = this.style[key];
			if (!rule) {
				rule = this.style[key] = {};
			}
			var setting = style[key];
			rule[setting] = (rule[setting] || 0) + 1;
		}.bind(this));
		this.finalizeScores();
	},

	finalizeScores : function() {
		if (--this.pathsFound) {
			return;
		}
		if (!this.options.details) {
			Object.keys(this.style).forEach(this.identifyTrend.bind(this));
		}
		this.callback(this.style);
	},

	identifyTrend : function(key) {
		var rule = this.style[key];
		var trend, max = -1;
		Object.keys(rule).forEach(function(setting) {
			var score = rule[setting];
			if (score > max) {
				trend = setting;
			}
		});
		this.style[key] = trend;
	},

	Error : MultiInferrerError

});

function MultiInferrerError(message) {
	MultiInferrerError.super_.call(this, message);
}

util.inherits(MultiInferrerError, CodePainterError, {
	name : 'MultiInferrerError'
});

module.exports = MultiInferrer;
