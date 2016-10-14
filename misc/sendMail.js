var Mailgun = require('mailgun-js');
var fs = require('fs');
var creds;
var crypto = require('crypto');

function resetPasswordTemplate(token) {
	return '<html><body>Your reset link is: https://ssrfdetector.com/resetPasswordForm/' + token + '.  Please log in and update it.';
}

function confirmationLinkTemplate(token) {
	return '<html><body>Your confirmation link is: https://ssrfdetector.com/confirmEmail/' + token + '.  Please visit this link to confirm.';
}

function sendReportTemplate(ip) {
	return '<html><body>SSRF has been detected from IP address: ' + ip + '.  Please log on to <a href="https://ssrfdetector.com">SSRF Detector</a> to learn more</body></html>';
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


function sendResetLink(to, link) {
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

function sendReport(email, domain, ip) {
	console.log('Sending report to: ' + email);
	template = sendReportTemplate(ip);
	var data = {
		from: from,
		to: email,
		subject: 'SSRF Detected',
		html: template
	}
	mailgun.messages().send(data, function (err, body) {
		//If there is an error, render the error page
		if (err) {
			console.log("got an error: ", err);
		} else {}
	})
}

function sendEmailConfirmation(email, confirmationLink) {
	console.log('Sending confirmation link to: ' + email);
	template = confirmationLinkTemplate(confirmationLink);
	var data = {
		from: from,
		to: email,
		subject: 'SSRF Detector confirmation',
		html: template
	}
	mailgun.messages().send(data, function (err, body) {
		//If there is an error, render the error page
		if (err) {
			console.log("got an error: ", err);
		} else {}
	})
}

module.exports = {
	sendResetLink: sendResetLink,
	sendReport: sendReport,
	sendEmailConfirmation: sendEmailConfirmation
};
