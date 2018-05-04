const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require("express-session");
const fileUpload = require('express-fileupload');
const settings = require("../config/settings.json");
const rimraf = require("rimraf");

const mysql = require('mysql');
const db = mysql.createConnection({
  host: settings.db.host,
  user: settings.db.user,
  password: settings.db.password,
  database: settings.db.database
});


const app = express();

app.set("trust proxy", 1);

// set view engine and renderer
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// serve static files
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));

// connect morgan to profile requests
app.use(logger('dev'));

// parse cookies first
app.use(cookieParser());
// then handle session
app.use(session({
  secret: "asdf235gj2341234nfq2351fisvns3415nfmaefi153kf465nfasofh3w43",
  resave: false,
  cookie: {
    maxAge: 120000000
  },
  saveUninitialized: true
}));

// handle requests data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use((req, res, next) => {
  req.db = db; // attach db connection to request context
  next();
});
const checkIfInstalled = (req,res,next) => {
    if (settings.installed){
        rimraf(path.join(__dirname , 'routes', 'installation.js'), err => {
            console.log(err);
        });
        rimraf(path.join(__dirname , 'views', 'installation.ejs'), err => {
            console.log(err);
        });
        return next();
    }
    else{
        return next();
    }
};
const checkIfLoggedin = (req ,res, next) => {
    if (!req.session.loggedIn && settings.installed) {
        return res.redirect('/');
    }
    res.locals.user = req.session.user;
    next();
};
const checkIfAdmin = (req,res,next) => {
    if(!req.session.user.isAdmin) {
        return res.send("Du bist kein Admin");
    }
    next();
};
app.use('/data/:data/:username/*',(req,res,next)=>{
    if(req.session.user){
        if (req.session.user.username === req.params.username)
        next();
    }
    else{
        res.sendStatus(401);
    }
});
app.use('/data', express.static(path.join(__dirname, '..', 'data')));
// public routes that does not need auth check
app.use('/',checkIfInstalled, require('./routes/index'));
// internal routes that needs auth check
app.use('/admin', checkIfLoggedin, checkIfAdmin, require('./routes/admin'));
app.use('/files', checkIfLoggedin, require('./routes/files'));
app.use('/settings', checkIfLoggedin, require('./routes/settings'));
app.use('/changepass', checkIfLoggedin, require('./routes/changepass'));

// catch 404 and forward to error handler
app.use((error, req, res, next) => {
  if (error) return next(error);


  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((error, req, res, next) => {

  // set locals, only providing error in development
  res
   .status(error.status || 500)
   .render('error', {
     message: error.message,
     error: req.app.get('env') === 'development' ? error : {}
   });
});

module.exports = app;
