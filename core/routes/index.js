const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt-nodejs');
const _ = require('lodash'); // install it:  npm i --save lodash
const settings = require('../../config/settings.json');
//which lang is set? (like "ger", "eng")
let langVar;
const geoip = require("geoip-lite");
//Actual included language (json format)
let lang;
//function to increase the FalseLogintries
function increaseFalseLogin(req){
    if(req.session.falseLoginTry)
        req.session.falseLoginTry++;
    else
        req.session.falseLoginTry = 1;
}
/* GET home page. */
router.get('/', (req, res) => {
    //Get the IP's of the Client
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    //split to have the ipv4
    const ipv4 = ip.split(', ')[1];
    //now use the geoip we required before to set the country
    let country = geoip.lookup(ipv4).country;
    langVar = country;
    //Then try require the right language pack from the languages
    try {
        lang = require('../lang/'+langVar+'.json');
    }
    catch(e){
        langVar = "EN";
        lang = require('../lang/'+langVar+'.json');
    }

    //If the user is admin, instant redirect to /admin page, if user is not an admin, redirect to userfiles
    if (_.get(req, 'session.user.isAdmin'))
        return res.redirect("/admin");
    else if(_.get(req,"session.user.userId"))
        return res.redirect("/files/" + req.session.user.username);
    //If not returned yet, you will get the index page with some parameters like lang
  res.render('index', {version: settings.version, errorMsg: null, lang:lang});
});

//method to check the credentials entered
router.post('/auth', (req, res, next) => {
    //If you can't access your account within 10 times, your browser will get temporarily locked
    //There is at this point no better solution for me, because you can just clear your cookies
    //and then you can try again
    if(req.session.falseLoginTry > 10){
        //ErrorMSG will get displayed above the login-panel, just look in the index.ejs file
      return res.render('index', {version: settings.version, errorMsg: lang.tooManyTries, lang:lang});
    }
    //Create two variables to catch the credentials the user entered
  const {username, password} = req.body;
  //Initializing a local variable based on the req.db (This is declared in the app.js)
  const db = req.db;
  //query string(pretty self explaining)
  const query = 'SELECT * FROM users WHERE username = ? LIMIT 1';
  //escape the username to prevent sql injection
  const fields = [username];
  //Create the query (Just made the whitespace to increase readability)
  db.query(
    query,
    fields,
    (error, result) => {
        //If something went absolutely wrong then this error will get displayed
      if (error) {
        console.log('Error:', error);
        const error = new Error('System error');
        return next(error);
      }
        //The first result is now the user object. Just used lodash
        //because of simplicity. You could use
        //const user = result[0];
      const user = _.get(result, '0');
        //If the user doesn't exist(user object = null or [])
      if (!user) {
        //Then create the falseLoginTry attribute or increase it
          increaseFalseLogin(req);
          //Then display the index view with the error msg
          return res.render('index', {version: settings.version, errorMsg: lang.UorPwrong, lang: lang});
      }
        //now its time to check the password
        //here we use the function to compare two strings within bcrypt
        bcrypt.compare(password, user.password,
            (err, isEqual) => {
              if(err || !isEqual) {
                  //If error or not equal the error will be displayed in the console
                console.log('Error in password compare:', err);
                //Again a self explaining function
                  increaseFalseLogin(req);
                  //Render the index.ejs with the right error message
                  return res.render('index', {version: settings.version, errorMsg: lang.UorPwrong, lang: lang});
              }
              //If this is not true, so the password is right
              //The Server will create a cookie with the following content
              req.session.user = _.pick(user, ['userId','costumerid', 'username', 'isAdmin', 'first_name', 'last_name', "email"]);
                if(user.lang){
                    //check if a database entry is there
                    req.session.user.lang = user.lang;
                }
                else{
                    //If not, just choose the language by geolocating
                    req.session.user.lang = langVar;
                }
                //Finally the user is logged in
                req.session.loggedIn = true;
                //If admin then it should return you to the /admin page
                if (user.isAdmin) {
                    return res.redirect("/admin");
                }
                //If not, redirect him to the files he has
                res.redirect("/files/" + user.username);

            });
    });
});


router.get("/logout", (req, res) => {
  // simply destroy session and redirect,
  req.session.destroy();
  res.redirect("/");
});

module.exports = router;
