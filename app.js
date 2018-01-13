var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var unirest = require('unirest');
var nodemailer = require('nodemailer'); 

var app = express();

require('./config/passport')(passport);
var connectionQuery = require('./config/query.js')
var chatbot = require('./config/bot.js');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//login script from here

var flash    = require('connect-flash');
/* Login script */

var sess  = require('express-session');
var Store = require('express-session').Store;
var BetterMemoryStore = require(__dirname + '/memory');
var store = new BetterMemoryStore({ expires: 60 * 60 * 1000, debug: true });
app.use(sess({
  name: 'JSESSION',
  secret: 'ArceusPersonalDiagnostician',
  store:  store,
  resave: true,
  saveUninitialized: true
}));

// uncomment after placing your favicon in /public
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated()) {
        return next();
    }

    // if they aren't redirect them to the home page
    res.redirect('/login');
}

app.get('/', isLoggedIn, function(req, res) {
    res.redirect('/diagnose');
});

app.get('/isLoggedIn', function(req, res) {
    var result = {
        outcome: 'failure'
    };

    if (req.isAuthenticated()) {
        result.outcome = 'success';
        result.username = req.user.email;
        result.fname = req.user.fname;
        result.lname = req.user.lname;
    }

    res.send(JSON.stringify(result, null, 3));
});

app.get('/login', function(req, res){
  if(req.isAuthenticated()) {
    res.redirect('/diagnose');
    return;
  }
  res.render('login/index',{'message' :req.flash('message')});
});

app.post("/login", passport.authenticate('local-login', {
    successRedirect: '/login',
    failureRedirect: '/register',
    failureFlash: true
}), function(req, res, info){
    res.render('login/index',{'message' :req.flash('message')});
});

app.get('/register', function(req, res){
  if(req.isAuthenticated()) {
    res.redirect('/diagnose');
    return;
  }
  res.render('login/register',{'message' :req.flash('message')});
});

app.post("/register", passport.authenticate('local-register', {
    successRedirect: '/login',
    failureRedirect: '/register',
    failureFlash: true
}), function(req, res, info){
    res.render('login/register',{'message' :req.flash('message')});
});

app.get('/diagnose', isLoggedIn, function(req, res){
  res.sendfile('./public/diagnose.html');
});

app.get('/booktest', isLoggedIn, function(req, res){
  res.sendfile('./public/booktest.html');
});


app.post('/api/arceus', function(req, res) {
    processChatMessage(req, res, true);
});

app.post('/api/medlab', function(req, res) {
    processChatMessage(req, res, false);
});

app.post('/api/propose', function(req, res) {
    //processChatMessage(req, res);
    var symptomIds;
    connectionQuery.getSymptomsIds(req, function(err, data) {
        if(err) {
            res.status(err.code || 500).json(err);
        } else {
            symptomIds = data;
            var finalUrl = req.body.uri + "symptoms=" + symptomIds + "&gender=" + req.body.gender + "&year_of_birth=" + req.body.year_of_birth + "&token=" + req.body.apiMedicToken + "&language=" + req.body.lang + "&format=" + req.body.format;
            unirest.get(finalUrl).header("Accept", "application/json").end(function(result) {
                res.status(result.status).json(result.body);
            });
        }   
    });
}); 

app.post('/api/diagnose', function(req, res) {
    var symptomIds;
    connectionQuery.getSymptomsIds(req, function(err, data) {
        if(err) {
            res.status(err.code || 500).json(err);
        } else {
            symptomIds = data;
            var finalUrl = req.body.uri + "symptoms=" + symptomIds + "&gender=" + req.body.gender + "&year_of_birth=" + req.body.year_of_birth + "&token=" + req.body.apiMedicToken + "&language=" + req.body.lang + "&format=" + req.body.format;
            unirest.get(finalUrl).header("Accept", "application/json").end(function(result) {
                res.status(result.status).json(result.body);
            });
        }   
    });
}); 

app.post('/api/getDoctor', function(req, res) {
    connectionQuery.getNearestDoctor(req, function(err, data) {
        if(err) {
            res.status(err.code || 500).json(err);
        } else {
            res.status(200).json(data);
        }   
    });
}); 

app.post('/api/getTestDetails', function(req, res) {
    connectionQuery.getTestDetails(req, function(err, data) {
        if(err) {
            res.status(err.code || 500).json(err);
        } else {
            res.status(200).json(data);
        }   
    });
}); 


app.get('/logout', function(req, res){
    req.session.destroy();
    req.logout();
    res.redirect('/login');
});

function sendEmail(toEmail, subject, htmlBody) {
    var transporter =  nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'nagarro.jpr@gmail.com',
            pass: 'Mayank@#99'
        }
    });
    var mailOptions = {
        from: 'nagarro.jpr@gmail.com',
        to: toEmail,
        subject: subject,
        html:  htmlBody
    };
    transporter.sendMail(mailOptions,  function(error, info){
        if (error) {
            console.error("Error sending mail, " + error);
        } else {
            console.log('Email sent successfully');
        }
    }); 
}

function processChatMessage(req, res, workspaceArceus) {
    chatbot.sendMessage(req, workspaceArceus, function(err, data) {
        if (err) {
            res.status(err.code || 500).json(err);
        } else {
            if(data.context.appointmentBooked == true) {
                var date = data.context.appointmentDate;
                var time = data.context.appointmentTime;
                var doctorName = data.context.doctorName;
                var subject = 'Your appointment is booked!';
                var body = 'Hi ' + req.user.fname + ',<br/>Your appointment with Dr. ' + doctorName + ' is booked for ' + date + ' at ' + time + '.<br/>Please contact in case of any query.<br/><br/>Regards,<br/>Your Personal Diagnostician';
                sendEmail(req.user.email, subject, body);
            }
            if(data.context.confirmedBooking == true) {
                console.log('Sending mail.');
                var testDetails = data.context.testDetails;
                var date = data.context.date;
                var testReq = data.context.test;
                var time = data.context.time;
                var subject = 'Your test is booked!';
                var body = 'Hi ' + req.user.fname + ',<br/>' 
                body += 'Your test for ' + testReq + ' is booked';
                if(date && time) {
                    body += ' for ' + date + ' at ' + time;
                } else if (date) {
                    body += ' for ' + date + ' at 10:00 am';
                } else if(time) {
                    body += ' at ' + time + ' today';
                }
                body += '. Please check the details for the test below:<br/>' + 'Procedure:<br/>&nbsp;&nbsp;&nbsp;&nbsp;' + testDetails.proc + '<br/>Requirements:<br/>&nbsp;&nbsp;&nbsp;&nbsp;' + testDetails.req + '<br/>Cost:<br/>&nbsp;&nbsp;&nbsp;&nbsp;' + testDetails.cost + ' INR<br/><br/>Please contact in case of any query.<br/><br/>Regards,<br/>Your Personal Diagnostician';   
                sendEmail(req.user.email, subject, body)
            }
            var context = data.context;
            var amount = context.claim_amount;
            var owner = req.user.email;
            res.status(200).json(data);
        }
    });
}


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
