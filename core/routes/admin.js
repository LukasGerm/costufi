const express = require('express');
const bcrypt = require("bcrypt-nodejs");
const router = express.Router();
const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require("path");
const async = require("async");
const rimraf = require('rimraf');
let settings = require('../../config/settings.json');
let message = null;
let lang;
/* GET users listing. */
function checkEnding(fileName){

    if (fileName != 'png' && fileName != 'jpg' && fileName != 'svg' && fileName != 'gif'&& fileName != 'mp4' ) {
        message = lang.wrongDataType;
        return true;
    }
    else{
        return false;
    }
}
router.get('/', function(req, res, next) {
    lang = require("../lang/"+req.session.user.lang+".json");
    const db = req.db;
    const query = "SELECT * FROM users";
    const users = [];

    db.query(query, (error, results, fields) => {
        async.eachOf( results, function(user, i, next) {

            users.push(user);
            user.dir = [];

            fs.readdir(path.join(__dirname,'..', '..','data', 'userdata', user.username), (err, entries) => {

                if (err) return next(err);
                user.dir = entries;
                next();
            });


        }, function (err) {


            if (err) {
                throw err;
                return res.send('error occured');
            }
            res.render("admin", {
                user: req.session.user,
                dbUsers: users,
                message : message,
                title: settings.title,
                lang: lang
            });

        });
    });
});
router.post("/createuser", (req,res,next) => {
  const checkEmail = /[A-Z0-9.-]+@[A-Z0-9.-]+.[A-Z]/igm;

  if(req.body.first_name == "" || req.body.last_name == "" || req.body.username == "" || (req.body.password == "" || req.body.password.length < 8) || req.body.email_address == "" || !checkEmail.test(req.body.email_address)){
    res.send("checkData");
  }
  else{
      let isAdmin;
      const{first_name,last_name,username,password,email_address,costumerid} = req.body;
      if(req.body.isAdmin === 'true') isAdmin = 1;
      else isAdmin = 0;
      const db = req.db;
      let hashedPassword = bcrypt.hashSync(password);
        //create user in db
        const query = 'INSERT INTO users (costumerid, first_name, last_name,username,password,email,isAdmin) VALUES(?,?,?,?,?,?,?)';
        const fields = [costumerid,first_name,last_name,username,hashedPassword,email_address,isAdmin];
        const newUserDir = path.join(__dirname, "..",'..','data', "userdata")+"/"+username;
        const newBillsDir = path.join(__dirname, "..",'..','data', "bills")+"/"+username;
        db.query(query,fields, (err, results) => {
            if(!err){
                //create path's for Users
                mkdirp(newUserDir, err => {
                    if(err){
                        return res.send("directoryExists");
                    }
                });
                mkdirp(newBillsDir, err => {
                    if(err){
                        return res.send("directoryExists");
                    }
                });
                res.send("success");
            }
            else{
                console.log(err);
                return res.send("duplicate");
            }

          });
   }
});
router.get('/deleteuser', (req,res,next) => {
    const db = req.db;
    const query = 'DELETE FROM users WHERE username = ?';
    const fields = [req.query.user];
    if(req.query.user === req.session.user.username){
        res.send(false);
        console.log("false");
    }
    else{
        db.query(query,fields, (err,results) => {
            if(!err){
                rimraf(`${__dirname}/../../data/bills/`+req.query.user, () => { console.log("Done") });
                rimraf(`${__dirname}/../../data/userdata/`+req.query.user, () => { console.log("Done") });
                return res.send(true);

            }
            res.send(false);
        });
    }

});
router.get("/delete", (req,res,next) => {
    let deletePath = `${__dirname}/../../data/userdata/`+req.query.user+`/`+req.query.file;
    let billPath = `${__dirname}/../../data/bills/`+req.query.user+`/`+req.query.file;

    rimraf(deletePath, () => {console.log("Done")});
    rimraf(billPath, () => {console.log("Done")});

    res.send(true);
});
router.post('/createassignment', (req,res,next) => {
    console.log(req.files.userData);
    if(req.body.assignment_name == '' || req.files == {}){
       message = lang.fillAllFields;
       return res.redirect('/admin');
    }

    let falseEnding = false;
    let filePath = path.join(__dirname, '..','..','data', 'userdata' , req.body.username,req.body.assignment_name);
    let billPath = path.join(__dirname, '..','..','data', 'bills', req.body.username,req.body.assignment_name);
    let fileEnding;
    let thisFile;
    mkdirp.sync(filePath, err => {
        console.log(err);
    });
    if(req.files.userData.length){
        for(let i = 0; i < req.files.userData.length ; i++){
            fileEnding = req.files.userData[i].name.split('.').pop();
            if (checkEnding(fileEnding)){
                falseEnding = true;
                break;
            }
            else{
                thisFile = req.files.userData[i];
                thisFile.mv(path.join(filePath, req.files.userData[i].name), err => {
                    if(err){
                        console.log(err);
                    }
                    else{
                        console.log("Uploaded-Pic");
                        message = null;
                    }
                })
            }
        }
    }
    else{
        fileEnding = req.files.userData.name.split('.').pop();
        if (checkEnding(fileEnding)){
            falseEnding = true;
        }
        else{
            req.files.userData.mv(path.join(filePath,req.files.userData.name), err =>{
                if(err)
                    console.log(err);
                else{
                    console.log("Uploaded-Single-Pic");
                    message = null;
                }
            });
        }
    }
    if (falseEnding){
        rimraf(filePath, err => {
            if(err)
                console.log(err);
        });
        return res.redirect('/admin');
    }
    else{
        mkdirp.sync(billPath, err => {
            if(err)
                console.log(err);
        });
        req.files.bill.mv(path.join(billPath, "bill.pdf"), err => {
            if(err){
                console.log(err);
            }
            else{
                console.log("Uploaded-Bill");
            }
        });
        message = null;
        return res.redirect('/admin');
    }
});
router.get("/edituser", (req,res,next) => {
    let mes;
    const db = req.db;
    const query = "SELECT * FROM users WHERE username = ? LIMIT 1";
    const fields = req.query.user;
    db.query(query, fields, (error, results) => {
        if(error){
            mes = "Systemerror";
            return res.render("edituser", {
                message: mes,
                userToEdit: null,
                title: settings.title,
                user : req.session.user,
                lang: lang
            });
        }
        const user = results[0];
        if(!user){
            mes = lang.userDontExist;
            return res.render("edituser", {
                message: mes,
                userToEdit: null,
                title: settings.title,
                user : req.session.user,
                lang: lang
            });
        }
        mes = null;
        res.render("edituser", {
            message: mes,
            userToEdit: user.username,
            title: settings.title,
            user : req.session.user,
            lang: lang
        });
    });
});
router.post('/changepw', (req,res,next) => {
    if (!(req.body.newPassword === req.body.repeatPassword)){
        return res.send('doesntMatch');
    }
    if ((req.body.newPassword.length < 8)){
        return res.send('toShort');
    }
    let encryptedPassword = bcrypt.hashSync(req.body.newPassword);
    const db = req.db;
    const query = "UPDATE users SET password = ? WHERE username = ?";
    const fields= [encryptedPassword, req.body.userName];
    db.query(query,fields, (error,results) => {
        if(error)
            return res.send(false);
        if (req.session.user.username === req.body.userName){
            return res.send("logout");
        }
        res.send("success");
    });
});

module.exports = router;
