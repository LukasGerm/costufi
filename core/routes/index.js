const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt-nodejs');
const _ = require('lodash'); // install it:  npm i --save lodash
const settings = require('../../config/settings.json');
let langVar;
const geoip = require("geoip-lite");
let lang;
/* GET home page. */
router.get('/', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const ipv4 = ip.split(', ')[1];
    let country = geoip.lookup(ipv4).country;
    switch (country){
        case "DE":
            langVar = "ger";
            break;
        default:
            langVar = "eng";
    }
    lang = require('../lang/'+langVar+'.json');
    if (_.get(req, 'session.user.userId')) {
    return res.redirect("/files/" + req.session.user.username);
  }

  res.render('index', {version: settings.version, errorMsg: null, lang:lang});
});


router.post('/auth', (req, res, next) => {
    if(req.session.falseLoginTry > 10){
      return res.render('index', {version: settings.version, errorMsg: lang.tooManyTries, lang:lang});
  }
  const {username, password} = req.body;

  const db = req.db;
  const query = 'SELECT * FROM users WHERE username = ? LIMIT 1';
  const fields = [username];
  db.query(
    query,
    fields,
    (error, result) => {
      if (error) {
        console.log('Error:', error);
        const error = new Error('System error');
        return next(error);
      }

      const user = _.get(result, '0');

      if (!user) {
        req.session.loggedIn = false;
          if(req.session.falseLoginTry)
              req.session.falseLoginTry++;
          else
              req.session.falseLoginTry = 1;
          return res.render('index', {version: settings.version, errorMsg: lang.UorPwrong, lang: lang});
      }

      bcrypt.compare(password, user.password,
        (err, isEqual) => {
          if(err || !isEqual) {
            console.log('Error in password compare:', err);
            /*const error = new Error('Passwort ungültig');
            error.status = 403;
            return next(error);*/
              if(req.session.falseLoginTry)
                  req.session.falseLoginTry++;
              else
                  req.session.falseLoginTry = 1;
              console.log(langVar);
              console.log(lang);
              return res.render('index', {version: settings.version, errorMsg: lang.UorPwrong, lang: lang});
          }
          req.session.user = _.pick(user, ['userId','costumerid', 'username', 'isAdmin', 'first_name', 'last_name', "email"]);
            console.log(user.lang);
            if(user.lang){
                console.log("1");
                req.session.user.lang = user.lang;
            }
            else{
                req.session.user.lang = langVar;
                console.log("2");
            }
            req.session.loggedIn = true;
          if (user.isAdmin) {
            return res.redirect("/admin");
          }

          res.redirect("/files/" + user.username);

        });
    });
});


router.get("/logout", (req, res) => {
  // simply destroy session and redirect,
  // no need for session check
  req.session.destroy();
  res.redirect("/");
});

module.exports = router;
