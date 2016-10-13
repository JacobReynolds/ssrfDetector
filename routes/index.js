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
	reportingApiKey, creds;

fs.readFile(__dirname + '/../.creds/apiKey.json', 'utf8', function (err, data) {
	if (err) throw err;
	creds = JSON.parse(data);
	reportingApiKey = creds.apiKey;
});


/* GET home page. */
var app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({
	secret: 'supernova',
	saveUninitialized: true,
	resave: true
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
		res.render('login', {
			error: 'Please log in'
		});
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

//Should find a way to put /profile and /profile/* into one, will do later
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
	res.render('login', {
		message: req.query.message,
		error: req.query.error,
	});
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
			res.render('profile', {
				message: data
			})
		})
		.fail(function (err) {
			res.render('profile', {
				error: err
			});
		}).catch(next);
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

app.post('/register', passport.authenticate('register', {
	successRedirect: '/dashboard',
	failureRedirect: '/register',
	failureFlash: true
}));

app.get('/dashboard', function (req, res, next) {
	database.getReport(req, req.user.username).then(function (report) {
		res.render('dashboard', {
			user: req.user,
			report: report
		});
	}).catch(next);
});

app.post('/profile/registerDomain', function (req, res, next) {
	database.registerDomain(req).then(function (data) {
			res.redirect('/profile?message=Successfully%20registered%20domain');
		})
		.fail(function (err) {
			res.render('profile/registerDomain', {
				error: 'Error registering domain',
				user: req.user
			})
		}).catch(next);
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
			sendMail.sendMail('resetLink', data.email, data.resetLink);
			res.render('resetPasswordEmail', {
				message: 'Please check your email for a password reset link'
			})
		})
		.fail(function (err) {
			res.render('resetPasswordEmail', {
				error: 'Error sending password reset email'
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

app.post('/resetPasswordForm', function (req, res, next) {
	database.resetPassword(req)
		.then(function (message) {
			console.log('reset .then');
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
	var name = req.user.username;
	console.log("LOGGIN OUT " + req.user.username)
	req.logout();
	res.redirect('/');
	req.session.notice = "You have successfully been logged out " + name + "!";
});

app.post('/reportDomain', function (req, res) {
	if (req.body.apiKey === reportingApiKey) {
		database.reportDomain(req, req.body.domain, {
			ip: req.body.ip,
			headers: JSON.parse(req.body.headers)
		});
		res.send("200");
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
				req.session.error = 'Error. Please try again.'; //inform user could not log them in
			});
	}
));

// Use the LocalStrategy within Passport to register/"signup" users.
passport.use('register', new LocalStrategy({
		passReqToCallback: true
	}, //allows us to pass back the request to the callback
	function (req, username, password, done) {
		username = username.toLowerCase();
		var userAlphaNumeric = new RegExp(/^[a-z0-9]+$/i);
		if (userAlphaNumeric.test(username)) {
			database.localReg(req, username, password)
				.then(function (user) {
					if (user === "exists") {
						console.log("COULD NOT REGISTER");
						req.session.error = 'Username or email not available';
						done(null, null);
					} else if (user === "passMismatch") {
						console.log("Password mismatch");
						req.session.error = 'Passwords must match';
						done(null, null);
					} else if (user) {
						console.log("REGISTERED: " + user.username);
						done(null, user);
					}
				})
				.fail(function (err) {
					console.log(err);
				});
		} else {
			req.session.error = 'Username can only be A-Za-z0-9';
			done(null, null);
		}
	}
));

module.exports = app;
