var EventEmitter = require('events').EventEmitter;

var CodePainterError = require('./Error');
var util = require('./util');


function CodePainterObject(onError) {
	CodePainterObject.super_();
	this.onError = onError || this.onError;
}

util.inherits(CodePainterObject, EventEmitter, {

	error: function(message) {
		this.onError(new this.Error(message));
	},

	onError: function(err) {
		this.emit('error', err);
	},

	Error: CodePainterObjectError

});

function CodePainterObjectError(message) {
	CodePainterObjectError.super_(message);
	this.name = 'CodePainterObjectError';
}

util.inherits(CodePainterObjectError, CodePainterError);

module.exports = CodePainterObject;
