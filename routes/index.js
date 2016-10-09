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
	flash = require('connect-flash');

//var config = require('./config.js'), //config file contains all tokens and other private info
var funct = require('./functions.js'); //funct file contains our helper functions for our Passport and database work

/* GET home page. */
var app = express();
app.use(logger('combined'));
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
	res.render('login', {
		errorMessage: req.flash('error')
	});
});
app.get('/register', function (req, res) {
	res.render('register', {
		errorMessage: req.flash('error')
	});
});

app.get('/dashboard', function (req, res) {
	if (req.isAuthenticated()) {
		res.render('dashboard', {
			user: req.user
		});
	} else {
		res.render('login', {
			user: req.user
		});
	}
});
app.get('/', function (req, res) {
	res.render('index', {
		user: req.user
	});
});

//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/register', passport.authenticate('register', {
	successRedirect: '/dashboard',
	failureRedirect: '/register',
	failureFlash: true
}));

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
	console.log("serializing " + user.username);
	done(null, user);
});

passport.deserializeUser(function (obj, done) {
	console.log("deserializing " + obj);
	done(null, obj);
});
passport.use('login', new LocalStrategy({
		passReqToCallback: true
	}, //allows us to pass back the request to the callback
	function (req, username, password, done) {
		funct.localAuth(req, username, password)
			.then(function (user) {
				if (user) {
					console.log("LOGGED IN AS: " + user.username);
					req.session.success = 'You are successfully logged in ' + user.username + '!';
					done(null, user);
				}
				if (!user) {
					console.log("COULD NOT LOG IN");
					req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
					done(null, user);
				}
			})
			.fail(function (err) {
				console.log(err.body);
			});
	}
));
// Use the LocalStrategy within Passport to register/"signup" users.
passport.use('register', new LocalStrategy({
		passReqToCallback: true
	}, //allows us to pass back the request to the callback
	function (req, username, password, done) {
		funct.localReg(req, username, password)
			.then(function (user) {
				if (user === "exists") {
					console.log("COULD NOT REGISTER");
					done(null, null, req.flash('error', 'Username not available'));
				} else if (user === "passMismatch") {
					console.log("Password mismatch");
					done(null, null, req.flash('error', 'Password mismatch'));
				} else if (user) {
					console.log("REGISTERED: " + user.username);
					req.session.success = 'You are successfully registered and logged in ' + user.username + '!';
					done(null, user);
				}
			})
			.fail(function (err) {
				console.log(err);
			});
	}
));

module.exports = app;
