var os = require('os');


module.exports = {
	getEOLChar : function(eol) {
		switch(eol) {
			case 'crlf' : 
				return '\r\n';
			case 'lf' : 
				return '\n';
			default : 
				return os.EOL;
		}
	}
};
