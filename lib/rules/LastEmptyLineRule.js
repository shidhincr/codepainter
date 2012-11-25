const assert = require('assert');

LastEmptyLineRule = {};

LastEmptyLineRule.name = 'LastEmptyLine';

LastEmptyLineRule.infer = function (sample, callback) {
    var previousToken = null;

    sample.on('data', function (token) {
        previousToken = token;
    });
    sample.on('end', function () {
		
        var value = null;
		
        if ((previousToken && previousToken.type === 'Whitespaces') &&
			(previousToken.value.indexOf('\n') !== -1) ) {
			
            value = 'present';
        } else {
            value = 'omitted';
        }
		
        callback(value);
    });
};

LastEmptyLineRule.transform = function (input, value, output) {
    assert(value === 'present' || value === 'omitted');

    var previousToken = null,
        newLine = { type: 'Whitespaces', value: '\n' };

    input.on('data', function (token) {
		
        if (previousToken){
            output.write(previousToken);
		}
		
        previousToken = token;
    });
	
    input.on('end', function () {
		
        if (previousToken && previousToken.type !== 'Whitespaces'){
            output.write(previousToken);
		}
		
        if (value === 'present'){
            output.write(newLine);
		}
		
        output.end();
    });
};

module.exports = LastEmptyLineRule;
