var https = require('https');
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

exports.resetRateLimits = function() {
    var postData = {
        apiKey: process.env.BLINKIE_KEY
    }
    postData = querystring.stringify(postData);
    resetDomain.headers['Content-Length'] = Buffer.byteLength(postData);
    var req = https.request(resetDomain, null);
    console.log('running');
    req.write(postData);
    req.end();
}

exports.resetRateLimits();
