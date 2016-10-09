var bcrypt = require('bcryptjs'),
	Q = require('q');
//config = require('./config.js'), //config file contains all tokens and other private info

//used in local-signup strategy
exports.localReg = function (req, username, password) {
	var deferred = Q.defer();
	var passwordConfirm = req.body.passwordConfirm;
	var email = req.body.email;
	var hash = bcrypt.hashSync(password, 8);
	var user = {
		"username": username,
		"password": hash,
		"email": email,
		"avatar": "http://placepuppy.it/images/homepage/Beagle_puppy_6_weeks.JPG"
	}
	var users = req.app.get("db").collection('users');
	//check if username is already assigned in our database
	users.find({
		'username': username
	}).toArray(function (err, docs) {
		if (err != null) {
			console.log('Error: ' + err.body);
			deferred.reject(new Error(err.body)); //username already exists
		}
		if (docs.length != 0) {
			console.log('username already exists');
			deferred.resolve("exists"); //username already exists
		} else {
			console.log('Username is free for use');
			if (password != passwordConfirm) {
				deferred.resolve("passMismatch");
			} else {
				users.insertOne(user, function (err, result) {
					if (err === null) {
						deferred.resolve(user);
					} else {
						console.log("PUT FAIL:" + err.body);
						deferred.reject(new Error(err.body));
					}
				});
			}
		}
	})
	return deferred.promise;
};

//check if user exists
//if user exists check if passwords match (use bcrypt.compareSync(password, hash); // true where 'hash' is password in DB)
//if password matches take into website
//if user doesn't exist or password doesn't match tell them it failed
exports.localAuth = function (req, username, password) {
	var deferred = Q.defer();
	var db = req.app.get("db").collection('users');
	db.find({
		'username': username
	}).toArray(function (err, docs) {
		if (err != null) {
			console.log("Error: " + err.body);
			deferred.reject(err.body);
		} else if (docs.length === 0) {
			console.log("Error: User doesn't exist");
			deferred.resolve(false);
		} else {
			var hash = docs[0].password;
			if (bcrypt.compareSync(password, hash)) {
				console.log("user: " + JSON.stringify(docs[0]));
				deferred.resolve(docs[0]);
			} else {
				console.log("PASSWORDS NOT MATCH");
				deferred.resolve(false);
			}
		}
	})

	return deferred.promise;
}
