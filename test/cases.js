const assert = require('assert'),
	  fs = require('fs'),
	  path = require('path');
const should = require('should');
const codepainter = require('../codepainter');
const casesRoot = path.join(__dirname, 'cases');

var testCases = [
	'quotes'
];

function infer(samplePath, callback) {
	var sampleStream = fs.createReadStream(samplePath);
	sampleStream.pause();
	sampleStream.setEncoding('utf-8');
	codepainter.infer(sampleStream, function (error, style) {
		callback(style);
	});
}

function transform(inputPath, style, outputPath, callback) {
	var inputStream = fs.createReadStream(inputPath);
	inputStream.pause();
	inputStream.setEncoding('utf-8');

	var outputStream = fs.createWriteStream(outputPath);
    codepainter.transform(inputStream, style, outputStream, function (error) {
    	outputStream.on('close', callback);
    	outputStream.end();
    });
}

describe('Code Painter', function () {
	testCases.forEach(function (testCase) {
		var inputPath = path.join(casesRoot, testCase + '.input.js'),
			outputPath = path.join(casesRoot, testCase + '.output.js'),
			tmpPath = path.join(casesRoot, testCase + '.tmp.js');
			samplePath = path.join(casesRoot, testCase + '.sample.json'),
			stylePath = path.join(casesRoot, testCase + '.style.json');

		it('should properly format ' + testCase, function (done) {
			if (path.existsSync(samplePath)) {
				infer(samplePath, function (style) {
					if (path.existsSync(inputPath)) {
						path.existsSync(outputPath).should.be.true;
						var expected = fs.readFileSync(outputPath, 'utf-8');
						transform(inputPath, style, tmpPath, function () {
							var output = fs.readFileSync(tmpPath, 'utf-8');
							output.should.equal(expected);
							done();
						});
					} else {
						path.existsSync(stylePath).should.be.true;
						var expected = JSON.parse(fs.readFileSync(stylePath, 'utf-8'));
						style.should.equal(expected);
						done();
					}
				});
			} else {
				path.existsSync(inputPath).should.be.true;
				path.existsSync(stylePath).should.be.true;
				path.existsSync(outputPath).should.be.true;

				var expected = fs.readFileSync(outputPath, 'utf-8');
				var style = JSON.parse(fs.readFileSync(stylePath, 'utf-8'));
				transform(inputPath, style, tmpPath, function () {
					var output = fs.readFileSync(tmpPath, 'utf-8');
					output.should.equal(expected);
					done();
				});
			}
		});
	});
});
