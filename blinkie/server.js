//Lets require/import the HTTP module
var https = require('https');
var http = require('http');
var querystring = require('querystring');
var fs = require('fs');

//Lets define a port we want to listen to
var reportDomain = {
    host: process.env.SSRF_HOST,
    port: process.env.SSRF_HOST_PORT,
    path: "/external/reportDomain",
    method: "POST",
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
};

var apiKey = process.env.BLINKIE_KEY;

//We need a function which handles requests and send response
function handleRequest(request, response) {
    console.log("Request received");
    if (!request.headers.host) {
        response.writeHead(403);
        response.end();
        return;
    }
    var subdomain = request.headers.host.split('.');
    if (subdomain.length === 3) {
        console.log('subdomain requested: ' + subdomain[0]);
        request.headers['url'] = request.url;
				var ip = request.headers['x-forwarded-for'] +":"+ request.headers['x-forwarded-port'];
				delete request.headers['x-forwarded-for'];
				delete request.headers['x-forwarded-port'];
				delete request.headers['x-forwarded-proto'];
				delete request.headers['x-amzn-trace-id'];
        var postData = {
            apiKey: apiKey,
            domain: subdomain[0].toLowerCase(),
            headers: JSON.stringify(request.headers),
            ip: ip
        }

        postData = querystring.stringify(postData);
        reportDomain.headers['Content-Length'] = Buffer.byteLength(postData);
        var req = https.request(reportDomain, null);
        req.write(postData);
        req.end();
    }
    response.writeHead(200);
    response.end();
}

//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(process.env.PORT, function() {});
