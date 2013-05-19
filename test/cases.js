var assert = require( 'assert' );
var fs = require( 'fs' );
var glob = require( 'glob' );
var should = require( 'should' );
var editorconfig = require('editorconfig');

var Pipe = require( '../lib/Pipe' );
var codepainter = require( '../codepainter' );
var rules = require( '../lib/rules' );


describe( 'Code Painter', function() {

	var globOptions = { sync: true };

	glob( 'test/cases/*', globOptions, function( er, testCases ) {

		testCases.forEach( function( testCase ) {

			testCase = testCase.substr( testCase.lastIndexOf( '/' ) + 1 );

			describe( testCase + ' rule', function() {
				var Rule;
				for (var i = 0; i < rules.length; i++) {
					if( rules[i].prototype.name === testCase ) {
						Rule = rules[i];
						break;
					}
				}

				glob( 'test/cases/' + testCase + '/*/*.json', globOptions, function( er2, stylePaths ) {
					stylePaths.forEach( function( stylePath ) {
						var setting = {
							folder: stylePath.substr( 0, stylePath.lastIndexOf( '/' ) + 1 ),
							styles: JSON.parse( fs.readFileSync( stylePath, 'utf-8' ) )
						};

						if (editorconfig.parse(stylePath).test !== true) {
							return;
						}

						testInferrance( new Rule(), setting );
						testTransformation( setting );
					} );
				} );
			} );
		} );
	} );
} );

function testInferrance( rule, setting ) {
	Object.keys( setting.styles ).forEach( function( styleKey ) {
		var styleValue = setting.styles[ styleKey ];
		var samplePath = verifyPath( setting.folder + 'sample.js' );
		if( fs.existsSync( samplePath ) ) {
			it( 'infers ' + styleKey + ' setting as ' + styleValue, function( done ) {
				infer( rule, samplePath, function( inferredStyle ) {
					styleValue.should.equal( inferredStyle[ styleKey ] );
					done();
				} );
			} );
		}
	} );
}

function verifyPath( path ) {
	fs.existsSync( path ).should.be.true;
	return path;
}

function infer( rule, samplePath, callback ) {
	var sampleStream = fs.createReadStream( samplePath );
	sampleStream.pause();
	sampleStream.setEncoding( 'utf-8' );

	var tokenizer = new Tokenizer();
	sampleStream.pipe( tokenizer );

	rule.infer( tokenizer, function( inferredStyle ) {
		callback( inferredStyle );
	} );

	sampleStream.resume();
}

function testTransformation( setting ) {
	var folders = setting.folder.split( '/' );
	setting.name = folders[ folders.length - 2 ];
	it( 'formats ' + setting.name + ' setting properly', function( done ) {
		var inputPath = verifyPath( setting.folder + 'input.js' );
		var expectedPath = verifyPath( setting.folder + 'expected.js' );
		var expected = fs.readFileSync( expectedPath, 'utf-8' );

		codepainter.transform(inputPath, setting.styles, function(output) {
			expected.should.equal( output );
			done();
		}, true);
	} );
}
