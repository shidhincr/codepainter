const assert = require('assert');
const esprima = require('esprima');

IndentationRule = {};

IndentationRule.name = 'Indentation';

const postfixExpressions = [
	'LogicalExpression',
	'BinaryExpression',
	'UnaryExpression'
]
	
IndentationRule.prepare = function (tree, contents ) {
	
	const noIndenting = [
		'BlockStatement',
		'Program',
		'NewExpression',
		'VariableDeclarator',
		'CallExpression',
		'FunctionExpression',
		'ObjectExpression'
	] + postfixExpressions;
	
	function annotateGrammarTree( tree, parent, parentLevel, parentRange, parentPath, parentLoc ) {
		
		var level = 0;
		var path = '';
		var range, loc;
		
		if ( tree['range'] !== undefined ) { // tree element has a range

			if ( tree['range'][0] === parentRange[0] && parentPath !== '-Program' || // token is first token of parent token
				noIndenting.indexOf( tree['type'] ) !== -1 // token is on the blacklist
				|| postfixExpressions.indexOf( parent['type'] ) !== -1
				|| tree['type'] === 'IfStatement' && parent['type'] === 'IfStatement'
			) {
					
				// do not indent			
				level = parentLevel;
				path = parentPath + '-' + tree['type'];
				range = tree['range'];
				loc = tree['loc'];
					
			} else {
				
				level = parentLevel + 1;
				path = parentPath + '-' + tree['type'] + '+1';
				range = tree['range'];
				loc = tree['loc'];
			}
				
			tree[ 'Indentation' ] = tree[ 'Indentation' ]||{};
			tree[ 'Indentation' ]['level'] = level;
			tree[ 'Indentation' ]['path'] = path;
			tree[ 'Indentation' ]['parent'] = parent.type;
					
		} else {
			level = parentLevel;
			path = parentPath;
			range = parentRange;
			loc = parentLoc;
		}
		
		for ( var key in tree ) {
			
			if ( ! (tree[ key ] instanceof Object) || ( key === 'range' ) ) {
				continue;
			} 
			
			annotateGrammarTree( tree[ key ], tree, level, range, path, loc );
		}
	}

	annotateGrammarTree(tree, tree, -1, [ 0, contents.length ], '' );

}

IndentationRule.infer = function (sample, callback) {
    var characters = {},
        indent = 0,
        previousToken = null,
        totalCount = 0;

    sample.on('data', function (token) {
		
        function indentation(whitespaces) {
            var first = whitespaces[0];
            if (!Array.prototype.every.call(whitespaces, function (character) {
                return character === first;
            }))
                return null;
            return { character: first, count: Math.floor(whitespaces.length / indent) };
        }

        function processWhitespaces(value) {
            var newLinePos = value.lastIndexOf('\n');
            if (newLinePos === -1 || newLinePos === value.length - 1)
                return;
            value = value.substr(newLinePos + 1);

            var indentationType = indentation(value);
            if (indentationType) {
                var character = indentationType.character,
                    count = indentationType.count;
                if (typeof characters[character] === 'undefined')
                    characters[character] = [];
                if (typeof characters[character][count] === 'undefined')
                    characters[character][count] = 0;
                characters[character][count]++;
            }
            totalCount++;
        }

        // FIXME: Handle if/for/while one-liners.
        // FIXME: Fix function argument/variable declaration alignment.
        if (token.type === 'Punctuator' && token.value === '}')
            --indent;
        if (previousToken && previousToken.type === 'Whitespaces' && indent > 0)
            processWhitespaces(previousToken.value);
        if (token.type === 'Punctuator' && token.value === '{')
            ++indent;

        previousToken = token;
    });
    sample.on('end', function () {
        var max = 0,
            mostCommon = {},
            sum = 0,
            value = null;
        for (var character in characters) {
            characters[character].forEach(function (count, index) {
                if (count > max) {
                    max = count;
                    mostCommon = { character: this.toString(), width: index };
                }
                sum += count;
            }, character);
        }

        if (max > totalCount - sum)
            value = mostCommon;
		
        callback(value);
    });
};

IndentationRule.transform = function (input, value, output) {
	
	function getIndentionLevel( grammarToken ) {
		return grammarToken.level;
	}
	
    assert(
		( value.character === ' ' || value.character === '\t' ) &&
		( typeof value.width === 'number' && value.width >= 0 )
	);

	var prevToken = null;

	input.on('data', function (token) {
		
		if ( prevToken === null && token.type === 'Whitespaces'){
			token.value = '';
		}
		
		if ( prevToken === null || ( prevToken.type === 'Whitespaces' ) && ( prevToken.value.indexOf('\n') !== -1 ) ) {
			
			if ( prevToken === null ) {
				prevToken = { type:'Whitespaces', value:'' };
			}
			
			var indent = 0;
			var path = '';
			
			// token has a grammarToken and is not an unindented line comment (i.e. commented out code)
			if ( token.grammarToken  &&
				! (token.type === 'LineComment' && ( prevToken.value === '' || prevToken.value.substr(-1, 1) === '\n') )
			) {
				indent = token.grammarToken[ 'Indentation' ].level;
				path =  token.grammarToken[ 'Indentation' ].path;
				
				if ( token.range[0] !== token.grammarToken.range[0] &&
					token.range[1] !== token.grammarToken.range[1] &&
					['(',')','.','else'].indexOf(token.value) === -1
					||
					postfixExpressions.indexOf( token.grammarToken[ 'Indentation' ].parent ) !== -1
				) {
					indent++;
					path = path + '*';
				}
			}

			var lineCount = (prevToken.value.match(/\n/g)||[]).length;
//			prevToken.value = '\n'.repeat(lineCount) + value.character.repeat( indent * value.width ) + '/*' + (indent) + '(' + path + ')*/ ';
			prevToken.value = '\n'.repeat(lineCount) + value.character.repeat( indent * value.width );
			
        }
		
        output.write(prevToken);
			
		prevToken = token;
    });
	
    input.on('end', function () {
		
		if (prevToken !== null ) {
	        output.write(prevToken);
		}
		
        output.end();
    });
};

module.exports = IndentationRule;
