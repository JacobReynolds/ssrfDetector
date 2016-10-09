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
	database = require('../misc/database.js'); //funct file contains our helper functions for our Passport and database work

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
app.get('/', function (req, res) {
	res.render('index');
});
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
app.get('*', function (req, res, next) {
	// put user into res.locals for easy access from templates
	res.locals.user = req.user || null;

	next();
});
app.get('/login', function (req, res) {
	res.render('login');
});
app.get('/register', function (req, res) {
	res.render('register');
});

app.get('/dashboard', function (req, res) {
	if (req.isAuthenticated()) {
		res.render('dashboard', {
			user: req.user
		});
	} else {
		res.render('login', {
			error: 'Please log in'
		});
	}
});
app.get('/resetPassword', function (req, res) {
	res.render('resetPassword');
});

app.get('/resetPasswordForm/:resetLink', function (req, res, next) {
	database.getResetLink(req)
		.then(function (link) {
			res.render('resetPasswordForm', {
				resetLink: link
			})
		})
		.fail(function (err) {
			res.render('login', {
				errorMessage: 'Incorrect reset link'
			})
		}).catch(next);
});

app.get('/', function (req, res) {
	res.render('index', {
		user: req.user
	});
});

//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/resetPasswordForm', function (req, res) {
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
		})
});
//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/register', passport.authenticate('register', {
	successRedirect: '/dashboard',
	failureRedirect: '/register',
	failureFlash: true
}));
//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/sendResetLink', function (req, res) {
	database.setResetLink(req).then(function (data) {
			sendMail.sendMail('resetLink', data.email, data.resetLink);
			res.render('resetPassword', {
				message: 'Please check your email for a password reset link'
			})
		})
		.fail(function (err) {
			return err;
		});
})

//sends the request through our local login/signin strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/login', passport.authenticate('login', {
	successRedirect: '/dashboard',
	failureRedirect: '/login',
	failureFlash: true
}));

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', function (req, res) {
	var name = req.user.username;
	console.log("LOGGIN OUT " + req.user.username)
	req.logout();
	res.redirect('/');
	req.session.notice = "You have successfully been logged out " + name + "!";
});
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
	}
));

function sendResetLink(req) {
	var deferred = Q.defer();
	database.setResetLink(req).then(function (email, resetLink) {
			sendMail.sendMail('resetLink', email, resetLink);
			deferred.resolve('Please check your email for a password reset link');
		})
		.fail(function (err) {
			return err;
		});
	return deferred.promise;
}

function getResetLink(req) {
	var deferred = Q.defer();
	database.getResetLink(req)
		.then(function (user) {
			deferred.resolve(true, req.params.resetLink);
		})
		.fail(function (err) {
			deferred.resolve(false);
		});
	return deferred.promise;
}

function resetPassword(req) {
	var deferred = Q.defer();
	database.resetPassword(req)
		.then(function (user) {
			deferred.resolve("Password reset");
		})
		.fail(function (err) {
			deferred.resolve(null, "Error resetting password");
		});
	return deferred.promise;
}

module.exports = app;
