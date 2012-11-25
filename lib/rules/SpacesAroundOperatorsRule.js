SpacesAroundOperatorsRule = {};

SpacesAroundOperatorsRule.name = 'SpacesAroundOperators';

var operators = [ '||', '&&', '^', '|', '&', '==', '!=', '===', '!==', '<', '>', '<=', '>=',
'<<', '>>', '>>>', '+', '-', '*', '%', '/',
'+=', '-=', '*=', '%=', '&=', '|=', '^=', '/=', '=' ];

function isOperator(token) {
	return token && token.type === 'Punctuator' && operators.indexOf(token.value) !== -1;
}

function onlySpaces(value) {
	return (/^ +$/).test(value);
}

SpacesAroundOperatorsRule.infer = function (sample, callback) {
	var previousToken = null,
	spaces = {};

	sample.on('data', function (token) {

		if (isOperator(token)) {

			if (typeof spaces[token.value] === 'undefined'){
				spaces[token.value] = {
					present: 0,
					omitted: 0,
					count: 0
				};
			}

			if (previousToken && previousToken.type === 'Whitespaces') {
				if (previousToken.value === ' '){
					spaces[token.value].present = spaces[token.value].present + 1;
				}
			} else {
				spaces[token.value].omitted = spaces[token.value].omitted + 1;
			}

			spaces[token.value].count = spaces[token.value].count + 1;
		}
		previousToken = token;
	});

	sample.on('end', function () {

		var value = {};

		var character;
		for ( character in spaces) {
			var characterValue = spaces[character],
			max = Math.max(characterValue.present, characterValue.omitted,
				characterValue.count - characterValue.present - characterValue.omitted);

			if (max === characterValue.present){
				value[character] = 'present';
			}
			else if (max === characterValue.omitted){
				value[character] = 'omitted';
			}
			else {
				value[character] = null;
			}
		}

		callback(value);
	});
};

SpacesAroundOperatorsRule.transform = function (input, value, output) {

	var previousToken = null,
	space = {
		type: 'Whitespaces',
		value: ' '
	};

	function shouldUseSpaces(operator) {
		if (typeof value === 'object'){
			return value[operator];
		}
		return value;
	}

	input.on('data', function (token) {

		if ( previousToken ) {
			if ( isOperator(token) ) {

				if ( ( previousToken.type !== 'Whitespaces' ) || ! onlySpaces( previousToken.value ) || ( shouldUseSpaces(token.value) !== 'omitted' ) ) {
					// (prev token is no whitespace) or (prev token is not only spaces ) or ( spaces should not be omitted )

					output.write(previousToken);

				}

				if ( ( ( previousToken.type !== 'Whitespaces' ) || ! onlySpaces( previousToken.value )) && (shouldUseSpaces(token.value) === 'present') ) {
					// ((prev token is not whitespaces) or (prev token is not only spaces)) but (spaces shall be present)

					output.write(space);

				}


			} else if ( isOperator(previousToken)) {

				// write out the previous token, then decide what to append
				output.write(previousToken);

				if ( token.type === 'Whitespaces' && onlySpaces( token.value ) && ( shouldUseSpaces(token.value) === 'omitted' || ( previousToken.grammarToken.type === 'UnaryExpression' ))  ) {
					// (token is whitespace) and (token is only spaces) and (spaces should be omitted or the previous token was an unary operator)

					// drop token
					token.value = '';

				} else if ( (token.type !== 'Whitespaces') && ( shouldUseSpaces(token.value) === 'present' ) && ( previousToken.grammarToken.type !== 'UnaryExpression' ) ){
					// (token is not whitespace) but (spaces should be present and the previous token was not an unary operator)

					output.write(space);

				}

			} else { // neither token nor prev token are operators

				output.write(previousToken);

			}

		}

		previousToken = token;
	});

	input.on('end', function () {
		if (previousToken){
			output.write(previousToken);
		}
		output.end();
	});
};

module.exports = SpacesAroundOperatorsRule;
