var express = require('express'),
	logger = require('morgan'),
	cookieParser = require('cookie-parser'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	session = require('express-session'),
	crypto = require('crypto'),
	sendMail = require('../misc/sendMail.js'),
	database = require('../misc/database.js'), //funct file contains our helper functions for our Passport and database work
	fs = require('fs'),
	reportingApiKey, creds,
	favicon = require('serve-favicon');

/* GET home page. */
var app = express();
app.use(favicon(__dirname + '/../favicon.ico'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({
	name: 'session',
	secret: 'supernova',
	saveUninitialized: true,
	resave: true,
	cookie: {
		maxAge: 1800000 //30 minutes
	}
}));
app.use(function (req, res, next) {
	var err = req.session.error,
		msg = req.session.notice,
		success = req.session.success;

	delete req.session.error;
	delete req.session.success;
	delete req.session.notice;

	if (err) res.locals.error = err;
	if (msg) res.locals.notice = msg;
	if (success) res.locals.success = success;

	next();
});
app.all('*', function (req, res, next) {
	res.locals.user = req.session.user || null;

	next();
});

function isAuthenticated(req) {
	return req.session.user && req.session.user.email != null;
}

app.all('/profile/*', function (req, res, next) {
	if (isAuthenticated(req)) {
		next();
	} else {
		req.session.error = "Please log in"
		res.redirect('/login');
	}
})

//Should find a way to put /profile and /profile/* into one, will do later
app.all('/profile', function (req, res, next) {
	if (isAuthenticated(req)) {
		next();
	} else {
		req.session.error = "Please log in";
		res.redirect('/login');
	}
})

app.all('/dashboard/*', function (req, res, next) {
	if (isAuthenticated(req)) {
		next();
	} else {
		req.session.error = "Please log in";
		res.redirect('/login');
	}
})

//Should find a way to put /dashboard and /dashboard/* into one, will do later
app.all('/dashboard', function (req, res, next) {
	if (isAuthenticated(req)) {
		next();
	} else {
		req.session.error = "Please log in";
		res.redirect('/login');
	}
})

app.get('/', function (req, res) {
	res.render('index');
});

app.get('/login', function (req, res) {
	res.render('login');
});

app.get('/profile', function (req, res) {
	res.render('profile');
});

app.post('/profile/changePassword', function (req, res, next) {
	database.updatePassword(req).then(function (data) {
			req.session.message = "Password successfully updated";
			res.redirect('/profile')
		})
		.fail(function (err) {
			res.render('profile/changePassword', {
				error: err
			});
		}).catch(next);
})

app.get('/profile/changeEmail', function (req, res) {
	res.render('profile/changeEmail');
})

app.post('/profile/changeEmail', function (req, res, next) {
	if (req.body.newEmail.length > 254) {
		res.render('profile/changeEmail', {
			error: 'Email must be 254 characters or less'
		})
	} else if (verifyEmailRegex(req.body.newEmail) && req.body.newEmail === req.body.newEmailConfirm) {
		database.updateEmail(req).then(function (data) {
				req.session.user.email = req.body.newEmail;
				req.session.message = "Email successfully updated";
				res.redirect('/profile')
			})
			.fail(function (err) {
				res.render('profile/changeEmail', {
					error: err
				});
			}).catch(next);
	} else {
		res.render('profile/changeEmail', {
			error: 'Incorrect information supplied'
		})
	}
})
app.get('/profile/changePassword', function (req, res, next) {
	res.render('profile/changePassword')
})

app.post('/login', function (req, res, next) {
	database.localAuth(req, req.body.email, req.body.password)
		.then(function (user) {
			if (user) {
				user.username = user.email.split('@')[0];
				req.session.user = user;
				res.redirect('/dashboard');
			}
			if (!user) {
				req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
				res.redirect('/login');
			}
		})
		.fail(function (err) {
			req.session.error = err; //inform user could not log them in
			res.redirect('/login');
		});
});

app.get('/register', function (req, res) {
	res.render('register');
});

app.post('/register', function (req, res, next) {
	password = req.body.password;
	email = req.body.email;
	if (email.length > 254) {
		res.render('register', {
			error: 'Email must be 254 characters or less'
		})
	} else if (password.length > 48) {
		res.render('register', {
			error: 'Password must be 48 characters or less'
		})
	} else if (verifyEmailRegex(email)) {
		database.localReg(req, email, password)
			.then(function (user) {
				console.log("REGISTERED: " + user.email);
				sendMail.sendEmailConfirmation(user.email, user.confirmationLink);
				//Log them out and send them to sign on
				res.render('register', {
					message: 'Please check your email for a confirmation URL.  Email may take a few minutes to deliver.'
				})
			})
			.fail(function (err) {
				res.render('register', {
					error: err
				})
			}).catch(next);
	} else {
		res.render('register', {
			error: 'Invalid email'
		})
	}
});

app.get('/dashboard', function (req, res, next) {
	database.getReport(req, req.session.user.email).then(function (report) {
		res.render('dashboard', {
			user: req.session.user,
			report: report
		});
	}).catch(next);
});

app.post('/dashboard/deleteDetections', function (req, res, next) {
	database.deleteDetections(req).then(function (data) {
			res.redirect('/dashboard');
		})
		.fail(function (err) {
			res.render('dashboard', {
				error: 'Error deleting Detections'
			})
		}).catch(next);
})

app.post('/dashboard/deleteAccount', function (req, res, next) {
	database.deleteAccount(req).then(function (data) {
			req.session.destroy();
			res.redirect('/');
		})
		.fail(function (err) {
			res.render('dashboard', {
				error: 'Error deleting account'
			})
		}).catch(next);
})

app.post('/profile/registerDomain', function (req, res, next) {
	req.body.domain = req.body.domain.toLowerCase();
	var domainAlphaNumberic = new RegExp(/^[a-z0-9]+$/i);
	if (req.body.domain.length > 6) {
		res.render('profile/registerDomain', {
			error: 'Domain must be 6 characters or less'
		})
	} else if (domainAlphaNumberic.test(req.body.domain)) {
		database.registerDomain(req).then(function (data) {
				req.session.message = 'Successfully registered domain';
				res.redirect('/profile');
			})
			.fail(function (err) {
				res.render('profile/registerDomain', {
					error: 'Error registering domain'
				})
			}).catch(next);
	} else {
		res.render('profile/registerDomain', {
			error: 'Domain can only be a-z0-9'
		})
	}
})

app.get('/profile/registerDomain', function (req, res, next) {
	res.render('profile/registerDomain');
})

//Page for requesting a password reset email
app.get('/resetPasswordEmail', function (req, res) {
	res.render('resetPasswordEmail');
});

app.post('/resetPasswordEmail', function (req, res, next) {
	database.setResetLink(req).then(function (data) {
			sendMail.sendResetLink(data.email, data.resetLink);
			res.render('resetPasswordEmail', {
				message: 'If the email address is registered, a reset link will be sent to it'
			})
		})
		.fail(function (err) {
			res.render('resetPasswordEmail', {
				message: 'If the email address is registered, a reset link will be sent to it'
			})
		}).catch(next);
})

//Page for actually resetting the password
app.get('/resetPasswordForm/:resetLink', function (req, res, next) {
	database.getResetLink(req)
		.then(function (link) {
			res.render('resetPasswordForm', {
				resetLink: link
			})
		})
		.fail(function (err) {
			req.session.error = "Expired or non-existent reset link"
			res.redirect('/login');
		}).catch(next);
});

app.get('/confirmEmail/:confirmationLink', function (req, res, next) {
	database.confirmationLink(req, req.params.confirmationLink)
		.then(function (link) {
			req.session.message = "Please log in";
			res.redirect('/login');
		})
		.fail(function (err) {
			req.session.error = "Error confirming email";
			res.redirect('/login');
		}).catch(next);
});

app.post('/resetPasswordForm', function (req, res, next) {
	database.resetPassword(req)
		.then(function (message) {
			req.session.message = message;
			res.redirect('/login')
		})
		.fail(function (err) {
			req.session.error = "Error resetting password";
			res.redirect('/login')
		}).catch(next);
});

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', function (req, res) {
	req.session.destroy();
	res.redirect('/');
});

app.post('/reportDomain', function (req, res) {
	if (req.body.apiKey === process.env.BLINKIE_KEY) {
		database.reportDomain(req, req.body.domain, {
			ip: req.body.ip,
			headers: JSON.parse(req.body.headers)
		}).then(function (email) {
			sendMail.sendReport(email, req.body.domain, req.body.ip);
			res.send("200");
		})
	}
})


//=======================PASSPORT CODE=======================

function verifyEmailRegex(email) {
	var emailRegex = new RegExp(/^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i);
	if (emailRegex.test(email)) {
		return true;
	} else {
		return false;
	}
}

module.exports = app;
