var stream = require('stream');

var CodePainterError = require('./Error');
var CodePainterObject = require('./Object');
var Inferrer = require('./Inferrer');
var util = require('./util');


function MultiInferrer(onError) {
	MultiInferrer.super_.call(this, onError);
}

module.exports = util.inherits(MultiInferrer, CodePainterObject, {

	name : 'MultiInferrer',

	infer : function(globs, options, callback, Rule) {
		this.options = options || {};
		this.callback = callback;
		this.Rule = Rule;
		this.style = {};
		if (globs && globs[0] instanceof stream.Readable) {
			this.onGlobPath(globs[0]);
		} else {
			util.reduceGlobs(globs, this.onGlobPaths.bind(this));
		}
	},

	onGlobPaths : function(paths) {
		this.pathsFound = paths.length;
		paths.forEach(this.onGlobPath.bind(this));
	},

	onGlobPath : function(path) {
		var inferrer = new Inferrer();
		inferrer.infer(path, this.updateScore.bind(this), this.Rule);
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
			this.parseValues();
		}
		this.callback(this.style);
	},

	identifyTrend : function(key) {
		var rule = this.style[key];
		var trend, max = -1;
		Object.keys(rule).forEach(function(setting) {
			var score = parseInt(rule[setting], 10);
			if (score > max) {
				max = score;
				trend = setting;
			}
		});
		this.style[key] = trend;
	},

	parseValues : function() {
		Object.keys(this.style).forEach(function(key) {
			try {
				this.style[key] = JSON.parse(this.style[key]);
			} catch(e) {
			}
		}.bind(this));
	}

});
