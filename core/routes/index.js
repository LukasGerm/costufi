const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt-nodejs');
const _ = require('lodash'); // install it:  npm i --save lodash
const settings = require('../../config/settings.json');

/* GET home page. */
router.get('/', (req, res) => {
  if (_.get(req, 'session.user.userId')) {
    return res.redirect("/files/" + req.session.user.username);
  }

  res.render('index', {version: settings.version, errorMsg: null});
});


router.post('/auth', (req, res, next) => {
  if(req.session.falseLoginTry > 10){
      return res.render('index', {version: settings.version, errorMsg: 'Du hast dich zu oft falsch angemeldet.'});
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
        const error = new Error('System fehler');
        return next(error);
      }

      const user = _.get(result, '0');

      if (!user) {
        req.session.loggedIn = false;
          if(req.session.falseLoginTry)
              req.session.falseLoginTry++;
          else
              req.session.falseLoginTry = 1;
        return res.render('index', {version: settings.version, errorMsg: "Nutzername oder Passwort falsch!"});
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
            return res.render('index', {version: settings.version, errorMsg: "Nutzername oder Passwort falsch!"});
          }


          req.session.user = _.pick(user, ['userId','costumerid', 'username', 'isAdmin', 'first_name', 'last_name', "email"]);
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
