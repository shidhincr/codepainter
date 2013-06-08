var util = require('./util');

function CodePainterError(message) {
    CodePainterError.super_.call(this);
    this.message = message || '';
}

util.inherits(CodePainterError, Error, {
    name: 'CodePainterError'
});

module.exports = CodePainterError;
