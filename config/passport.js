var LocalStrategy = require('passport-local').Strategy;
var cfenv = require('cfenv');
var fs = require('fs');
var crypto   = require('crypto');
var passport = require('passport');
var connection = require('../lib/dbconn.js')

// load local VCAP configuration
var vcapLocal = null;
var appEnv = null;
var appEnvOpts = {};

fs.stat('./vcap-local.json', function(err, stat) {
    if (err && err.code === 'ENOENT') {
        // file does not exist
        console.log('No vcap-local.json');
        initializeAppEnv();
    } else if (err) {
        console.log('Error retrieving local vcap: ', err.code);
    } else {
        vcapLocal = require("../vcap-local.json");
        console.log("Loaded local VCAP", vcapLocal);
        appEnvOpts = {
            vcap: vcapLocal
        };
        initializeAppEnv();
    }
});

// get the app environment from Cloud Foundry, defaulting to local VCAP
function initializeAppEnv() {
    appEnv = cfenv.getAppEnv(appEnvOpts);

    if (appEnv.isLocal) {
        require('dotenv').load();
    }
}

//passport Strategy -- the express session middleware before calling passport.session()
module.exports = function(passport) {
	passport.serializeUser(function(user, done){
		console.log('serializeUser ' + user);
	    done(null, user.id);
	});

	passport.deserializeUser(function(id, done){
	    connection.query("select * from users where id = "+ id, function (err, rows){
	        done(err, rows[0]);
	    });
	});

    passport.use('local-login', new LocalStrategy({
		usernameField: 'username',
		passwordField: 'password',
		passReqToCallback: true 
		} , function (req, username, password, done){
	      console.log(username+' = '+ password);
	      if(!username || !password ) { return done(null, false, req.flash('message','All fields are required.')); }
	      var salt = '7fa73b47df808d36c5fe328546ddef8b9011b2c6';
	      connection.query("select * from users where lower(email) = ?", [username], function(err, rows) {
	        console.log(err);
	        if (err) return done(req.flash('message',err));
	        else console.log('No Error');

	        if(!rows.length){ return done(null, false, req.flash('message','Invalid username or password.')); }
	        salt = salt+''+password;
	        var encPassword = crypto.createHash('sha1').update(salt).digest('hex');
	        var dbPassword  = rows[0].password;
	        
	        if(!(dbPassword == encPassword)){
	        	console.log('passwords do not match')
	            return done(null, false, req.flash('message','Invalid username or password.'));
	        }
	        console.log('Login Complete')
	        return done(null, rows[0]);
	      });
	    }
	));

	passport.use('local-register', new LocalStrategy({
		usernameField: 'username',
		passwordField: 'password',
		passReqToCallback: true 
		} , function (req, username, password, done){
	      	console.log(username+' = '+ password);
			var fname = req.body.fname;
            var lname = req.body.lname;
            var birthyear = req.body.birthyear;
            var mobile = req.body.mobile;
            var salt = '7fa73b47df808d36c5fe328546ddef8b9011b2c6';
            salt = salt+''+password;
            var encodedPassword = crypto.createHash('sha1').update(salt).digest('hex');

			if(!username || !password || !fname || !lname || !birthyear || !mobile) { return done(null, false, req.flash('message','All fields are required.')); }
			console.log('Now querying db...');
			connection.query("insert into users (fname,lname, email,password,mobile,birthyear) VALUES (?,?,?,?,?,?) ", [fname,lname,username,encodedPassword,mobile,birthyear], function(err, result){
				console.log(result);
				if (err) return done(err);
				else {
					connection.query("select * from users where lower(email) = ?", [username], function(err, rows) {
				        console.log(err);
				        if (err) return done(req.flash('message',err));
				        else console.log('No Error');

				        if(!rows.length){ return done('Register unsuccessfull', false, req.flash('message','Register unsuccessfull.')); }
				        console.log('Register Complete')
				        return done(null, rows[0]);
		      		});
				}
			});
	    }
	));
};
