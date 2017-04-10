var http = require('http');
var querystring = require('querystring');
var fs = require('fs');

var resetDomain = {
	host: process.env.SSRF_HOST,
	port: process.env.SSRF_HOST_PORT,
	path: "/external/resetRateLimits",
	method: "POST",
	headers: {
		'Content-Type': 'application/x-www-form-urlencoded'
	}
};

exports.resetRateLimits = function () {
	var creds;
	fs.readFile(__dirname + '/.creds/apiKey.json', 'utf8', function (err, data) {
		if (err) throw err;
		creds = JSON.parse(data);
		var postData = {
			apiKey: creds.apiKey
		}
		postData = querystring.stringify(postData);
		resetDomain.headers['Content-Length'] = Buffer.byteLength(postData);
		var req = http.request(resetDomain, null);
		console.log('running');
		req.write(postData);
		req.end();
	});
}

exports.resetRateLimits();
