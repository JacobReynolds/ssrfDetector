var Mailgun = require('mailgun-js');
var fs = require('fs');
var creds;
var crypto = require('crypto');

function resetPasswordTemplate(token) {
	return '<html><body>Your reset link is: http://localhost:3000/resetPasswordForm/' + token + '.  Please log in and update it.';
}
var apiKey, domain, from, mailgun;
fs.readFile(__dirname + '/../.creds/mailgun.json', 'utf8', function (err, data) {
	if (err) throw err;
	creds = JSON.parse(data);
	apiKey = creds.apiKey;
	domain = creds.domain;
	from = creds.from;
	mailgun = new Mailgun({
		apiKey: apiKey,
		domain: domain
	});
});


function sendMail(template, to, link) {
	if (template === 'resetLink') {
		console.log('resetting link');
		template = resetPasswordTemplate(link);
		var data = {
			from: from,
			to: to,
			subject: 'SSRF Detector password reset',
			html: template
		}
		mailgun.messages().send(data, function (err, body) {
			//If there is an error, render the error page
			if (err) {
				console.log("got an error: ", err);
			} else {}
		});
	}
}

module.exports = {
	sendMail: sendMail
};
