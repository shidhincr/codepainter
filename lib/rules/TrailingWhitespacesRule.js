const assert = require('assert');
const string = require('../util/string');

TrailingWhitespacesRule = {};

TrailingWhitespacesRule.name = 'TrailingWhitespaces';

TrailingWhitespacesRule.infer = function (sample, callback) {
    callback('strip');
};

TrailingWhitespacesRule.transform = function (input, value, output) {
    assert(value === 'strip');

    input.on('data', function (token) {
		
        if (token.type === 'Whitespaces') {
			
            var pos = token.value.lastIndexOf('\n');
			
            if (pos !== -1) {
				
	            var lineCount = (token.value.match(/\n/g)||[]).length;
                token.value = '\n'.repeat(lineCount) + token.value.substr(pos + 1);
				
			}
			
        }
		
        output.write(token);
		
    });
	
    input.on('end', function () {
        output.end();
    });
};

module.exports = TrailingWhitespacesRule;
