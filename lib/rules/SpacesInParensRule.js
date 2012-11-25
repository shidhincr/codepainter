const assert = require('assert');

SpacesInParensRule = {};

SpacesInParensRule.name = 'SpacesInParens';

function isOpeningParen(token) {
	return token && token.type === 'Punctuator' && token.value === '(';
}

function isClosingParen(token) {
	return token && token.type === 'Punctuator' && token.value === ')';
}

SpacesInParensRule.infer = function (sample, callback) {
	var previousToken = null,
	votePresent = 0,
	voteOmitted = 0;

	sample.on('data', function (token) {
		if ( isOpeningParen(previousToken) && token.type === 'Whitespaces' ||
			previousToken && previousToken.type === 'Whitespaces' && isClosingParen(token) ) {
			votePresent++;
		} else if ( !isOpeningParen(previousToken) && isClosingParen(token) ||
			isOpeningParen(previousToken) && !isClosingParen(token)) {
			voteOmitted++;
		}
		previousToken = token;
	});
	sample.on('end', function () {
		if ( votePresent >= voteOmitted ){
			callback('present');
		} else {
			callback('omitted');
		}
	});
};

SpacesInParensRule.transform = function (input, value, output) {
	var previousToken = null,
	ppreviousToken = null,
	space = {
		type: 'Whitespaces',
		value: ' '
	};

	assert(value === 'present' || value === 'omitted');

	input.on('data', function (token) {
		if ( previousToken && isOpeningParen(previousToken) ) {
			if ( token.type === 'Whitespaces' && value === 'omitted'){
				token.value = '';
			} else if (token.type !== 'Whitespaces' && !isClosingParen(token) && value === 'present') {
				output.write(previousToken);
				previousToken = space;
			}
		} else if (	isClosingParen(token) ) {
			if ( ( ppreviousToken && isOpeningParen( ppreviousToken ) || value === 'omitted' ) &&
				previousToken && previousToken.type === 'Whitespaces' ) {
				previousToken.value = '';
			} else if ( previousToken && previousToken.type !== 'Whitespaces' && value === 'present' ) {
				output.write(previousToken);
				previousToken = space;
			}
		}
		if ( previousToken ) output.write(previousToken);
		ppreviousToken = previousToken;
		previousToken = token;
	});

	input.on('end', function () {
		if ( previousToken ) output.write(previousToken);

		output.end();
	});
};

module.exports = SpacesInParensRule;
