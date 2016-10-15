var express = require('express'),
	logger = require('morgan'),
	cookieParser = require('cookie-parser'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	session = require('express-session'),
	passport = require('passport'),
	LocalStrategy = require('passport-local'),
	TwitterStrategy = require('passport-twitter'),
	GoogleStrategy = require('passport-google'),
	FacebookStrategy = require('passport-facebook'),
	flash = require('connect-flash'),
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
	secret: 'supernova',
	saveUninitialized: true,
	resave: true,
	cookie: {
		maxAge: 1800000 //30 minutes
	}
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
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
	res.locals.user = req.user || null;

	next();
});

app.all('/profile/*', function (req, res, next) {
	if (req.isAuthenticated()) {
		next();
	} else {
		res.redirect('/login?error=Please%20log%20in');
	}
})

//Should find a way to put /profile and /profile/* into one, will do later
app.all('/profile', function (req, res, next) {
	if (req.isAuthenticated()) {
		next();
	} else {
		res.render('login', {
			error: 'Please log in'
		});
	}
})

app.all('/dashboard/*', function (req, res, next) {
	if (req.isAuthenticated()) {
		next();
	} else {
		res.render('login', {
			error: 'Please log in'
		});
	}
})

//Should find a way to put /dashboard and /dashboard/* into one, will do later
app.all('/dashboard', function (req, res, next) {
	if (req.isAuthenticated()) {
		next();
	} else {
		res.render('login', {
			error: 'Please log in'
		});
	}
})

app.get('/', function (req, res) {
	res.render('index');
});

app.get('/login', function (req, res) {
	if (req.query.message || req.query.error) {
		res.render('login', {
			message: req.query.message,
			error: req.query.error,
		});
	} else {
		res.render('login');
	}
});

app.get('/profile', function (req, res) {
	res.render('profile', {
		user: req.user,
		domain: req.user.domain,
		message: req.query.message
	});
});

app.post('/profile/changePassword', function (req, res, next) {
	database.updatePassword(req).then(function (data) {
			res.redirect('/profile?message=Password%20successfully%20updated')
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
	if (verifyEmailRegex(req.body.newEmail) && req.body.newEmail === req.body.newEmailConfirm) {
		database.updateEmail(req).then(function (data) {
				res.redirect('/profile?message=Email%20successfully%20updated')
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

app.post('/login', passport.authenticate('login', {
	successRedirect: '/dashboard',
	failureRedirect: '/login',
	failureFlash: true
}));

app.get('/register', function (req, res) {
	res.render('register');
});

app.post('/register', function (req, res, next) {
	username = req.body.username.toLowerCase();
	password = req.body.password;
	var userAlphaNumeric = new RegExp(/^[a-z0-9]+$/i);
	if (userAlphaNumeric.test(username) && verifyEmailRegex(req.body.email)) {
		database.localReg(req, username, password)
			.then(function (user) {
				console.log("REGISTERED: " + user.username);
				sendMail.sendEmailConfirmation(user.email, user.confirmationLink);
				//Log them out and send them to sign on
				res.render('register', {
					message: 'Please check your email for a confirmation URL'
				})
			})
			.fail(function (err) {
				res.render('register', {
					error: err
				})
			}).catch(next);
	} else {
		res.render('register', {
			error: 'Invalid username or email'
		})
	}
});

app.get('/dashboard', function (req, res, next) {
	database.getReport(req, req.user.username).then(function (report) {
		res.render('dashboard', {
			user: req.user,
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
			req.logout();
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
	if (domainAlphaNumberic.test(req.body.domain)) {
		database.registerDomain(req).then(function (data) {
				res.redirect('/profile?message=Successfully%20registered%20domain');
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
			res.redirect('/login?error=Expired%20or%20non-existent%20reset%20link');
		}).catch(next);
});

app.get('/confirmEmail/:confirmationLink', function (req, res, next) {
	database.confirmationLink(req, req.params.confirmationLink)
		.then(function (link) {
			res.redirect('/login?message=Please%20sign%20in');
		})
		.fail(function (err) {
			res.redirect('/login?error=Error%20confirming%20email');
		}).catch(next);
});

app.post('/resetPasswordForm', function (req, res, next) {
	database.resetPassword(req)
		.then(function (message) {
			res.render('login', {
				message: message
			})
		})
		.fail(function (err) {
			res.render('login', {
				errorMessage: 'Error resetting password'
			})
		}).catch(next);
});

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', function (req, res) {
	req.logout();
	res.redirect('/');
});

app.post('/reportDomain', function (req, res) {
	if (req.body.apiKey === process.env.BLINKIE_API) {
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


passport.serializeUser(function (user, done) {
	done(null, user);
});

passport.deserializeUser(function (obj, done) {
	done(null, obj);
});

passport.use('login', new LocalStrategy({
		passReqToCallback: true
	}, //allows us to pass back the request to the callback
	function (req, username, password, done) {
		username = username.toLowerCase();
		database.localAuth(req, username, password)
			.then(function (user) {
				if (user) {
					done(null, user);
				}
				if (!user) {
					req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
					done(null, null);
				}
			})
			.fail(function (err) {
				req.session.error = err; //inform user could not log them in
				done(null, null)
			});
	}
));

function verifyEmailRegex(email) {
	var emailRegex = new RegExp(/^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i);
	if (emailRegex.test(email)) {
		return true;
	} else {
		return false;
	}
}

module.exports = app;
