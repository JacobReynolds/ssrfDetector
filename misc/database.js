var bcrypt = require('bcryptjs'),
	crypto = require('crypto')
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
		$or: [{
			username: username
	}, {
			email: email
	}]
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
				deferred.resolve(docs[0]);
			} else {
				console.log("PASSWORDS NOT MATCH");
				deferred.resolve(false);
			}
		}
	})

	return deferred.promise;
}

exports.setResetLink = function (req) {
	var deferred = Q.defer();
	var resetLink;
	var db = req.app.get("db").collection('users');
	var email = req.body.email;
	db.find({
		'email': req.body.email
	}).toArray(function (err, docs) {
		if (err != null) {
			console.log("Error: " + err.body);
			deferred.reject(err.body);
		} else if (docs.length === 0) {
			console.log("Error: User doesn't exist");
			deferred.resolve(false);
		} else {
			crypto.randomBytes(36, function (err, buffer) {
				resetLink = buffer.toString('hex');
				db.updateOne({
					email: email
				}, {
					$set: {
						resetLink: resetLink
					}
				}, function (err, result) {
					if (err === null) {
						deferred.resolve({
							email: email,
							resetLink: resetLink
						});
					} else {
						console.log("Reset link FAIL:" + err.body);
						deferred.reject(new Error(err.body));
					}
				});
			})
		}
	})

	return deferred.promise;
}

exports.getResetLink = function (req) {
	var deferred = Q.defer();
	var db = req.app.get("db").collection('users');
	var resetLink = req.params.resetLink;
	db.find({
		'resetLink': resetLink
	}).toArray(function (err, docs) {
		if (err != null) {
			console.log("Error: " + err.body);
			deferred.reject(err.body);
		} else if (docs.length === 0) {
			console.log('doc length: ' + docs.length);
			console.log("Error: Expired or non-existent link");
			deferred.reject("Expired or non-existent link.");
		} else {
			deferred.resolve(resetLink);
		}
	})

	return deferred.promise;
}


exports.registerDomain = function (req) {
	var deferred = Q.defer();
	var db = req.app.get("db").collection('users');
	var domain = req.body.domain;
	db.find({
		'domain': domain
	}).toArray(function (err, docs) {
		if (err != null) {
			console.log("Error: " + err.body);
			deferred.reject(err.body);
		} else if (docs.length === 0) {
			console.log('setting ' + req.user.username + '\'s domain to ' + domain);
			db.updateOne({
				username: req.user.username
			}, {
				$set: {
					domain: domain
				}
			}, function (err, result) {
				if (err === null) {
					deferred.resolve(true);
				} else {
					console.log("Register domain FAIL:" + err.body);
					deferred.reject(new Error(err.body));
				}
			});
		} else {
			deferred.reject("Domain already registered");
		}
	})

	return deferred.promise;
}


exports.resetPassword = function (req) {
	var deferred = Q.defer();
	var db = req.app.get("db").collection('users');
	var resetLink = req.body.resetLink;
	var password = req.body.password;
	var passwordConfirm = req.body.passwordConfirm;
	db.find({
		'resetLink': resetLink
	}).toArray(function (err, docs) {
		if (err != null) {
			console.log("Error: " + err.body);
			deferred.reject(err.body);
		} else if (docs.length === 0) {
			console.log("Error resetting password");
			deferred.reject("Error resetting password");
		} else {
			if (password === passwordConfirm) {
				var hash = bcrypt.hashSync(password, 8);
				db.updateOne({
					'resetLink': resetLink
				}, {
					$set: {
						password: hash,
						resetLink: ''
					}
				}, function (err, result) {
					if (err === null) {
						deferred.resolve('Password reset');
					} else {
						console.log("Reset password FAIL:" + err.body);
						deferred.reject(new Error(err.body));
					}
				});
			}
		}
	})

	return deferred.promise;
}

exports.updatePassword = function (req) {
	var deferred = Q.defer();
	var db = req.app.get("db").collection('users');
	var username = req.user.username;
	var newPassword = req.body.newPassword;
	var newPasswordConfirm = req.body.newPasswordConfirm;
	if (newPassword === newPasswordConfirm) {
		db.find({
			'username': username
		}).toArray(function (err, docs) {
			if (err != null) {
				console.log("Error: " + err.body);
				deferred.reject(err.body);
			} else if (docs.length === 0) {
				console.log("Error confirming user");
				deferred.reject("Error confirming user");
			} else {
				var hashConfirm = req.body.password;
				if (bcrypt.compareSync(hashConfirm, docs[0].password)) {
					var hash = bcrypt.hashSync(newPassword, 8);
					db.updateOne({
						'username': username
					}, {
						$set: {
							password: hash
						}
					}, function (err, result) {
						if (err === null) {
							deferred.resolve('Password reset');
						} else {
							console.log("Reset password FAIL:" + err.body);
							deferred.reject(new Error(err.body));
						}
					});
				} else {
					deferred.reject("Incorrect password");
				}
			}
		})
	} else {
		deferred.reject("Passwords do not match");
	}

	return deferred.promise;
}
