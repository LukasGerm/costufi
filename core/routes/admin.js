const express = require('express');
const bcrypt = require("bcrypt-nodejs");
const router = express.Router();
const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require("path");
const async = require("async");
const rimraf = require('rimraf');//NPM Packet to delete things
let settings = require('../../config/settings.json');
const fileDir = path.join(__dirname, '..', '..', 'data', 'userdata');
const billDir = path.join(__dirname, '..', '..', 'data', 'bills');
let message = null;
let lang;
//Function to check the ending of a file.
//However, I think its not the best solution, but it does its job for this time
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
    //Require the right language
    lang = require("../lang/"+req.session.user.lang+".json");
    //Getting the db settings from request context
    const db = req.db;
    const query = "SELECT * FROM users";
    const users = [];
    //We want to list all the users in the adminpanel
    db.query(query, (error, results, fields) => {
        async.eachOf( results, function(user, i, next) {
            //For each user in the results push the users array
            users.push(user);
            //Initialize a new attribute for the directories
            user.dir = [];
            //Push things into the directories array
            fs.readdir(path.join(fileDir, user.username), (err, entries) => {
                if (err) return next(err);
                user.dir = entries;
                next();
            });


        }, function (err) {

            //After this, just if an error occured, abort
            if (err) {
                throw err;
                return res.send('error occured');
            }
            //Render the adminpanel with the data
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
//Router for creating a new user
router.post("/createuser", (req,res,next) => {
  //regex for the email checking
  const checkEmail = /[A-Z0-9.-]+@[A-Z0-9.-]+.[A-Z]/igm;
  //Check the form that is submitted
  if(req.body.first_name == "" || req.body.last_name == "" || req.body.username == "" || (req.body.password == "" || req.body.password.length < 8) || req.body.email_address == "" || !checkEmail.test(req.body.email_address)){
      //If it is not correct, you will get a message
      res.send("checkData");
  }
  else{
      //Create a new variable if the user is admin or not
      let isAdmin;
      //Create a bunch of variables out of the forms data
      const{first_name,last_name,username,password,email_address,costumerid} = req.body;
      //You have to make the admin value like this, because "true" or "false" is not directly convertable into integer.. so i use a long way to do this
      if(req.body.isAdmin === 'true') isAdmin = 1;
      else isAdmin = 0;
      //Database out of requestcontext
      const db = req.db;
      let hashedPassword = bcrypt.hashSync(password);
        //create user in db
        const query = 'INSERT INTO users (costumerid, first_name, last_name,username,password,email,isAdmin) VALUES(?,?,?,?,?,?,?)';
        const fields = [costumerid,first_name,last_name,username,hashedPassword,email_address,isAdmin];
        const newUserDir = fileDir+"/"+username;
        const newBillsDir = billDir+"/"+username;
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
                //If the user is existing, you get a message
                console.log(err);
                return res.send("duplicate");
            }

          });
   }
});
//Function for deleting a user
router.get('/deleteuser', (req,res,next) => {
    //Database out of request context
    const db = req.db;
    const query = 'DELETE FROM users WHERE username = ?';
    const fields = [req.query.user];
    //If you want to delete yourself, I just made a little security measure. You cannot do this
    if(req.query.user === req.session.user.username){
        res.send(false);
        console.log("false");
    }
    //If its not yourself, it will be deleted with all its data
    else{
        db.query(query,fields, (err,results) => {
            if(!err){
                rimraf(path.join(billDir,req.query.user), () => { console.log("Done") });
                rimraf(path.join(fileDir,req.query.user), () => { console.log("Done") });
                return res.send(true);

            }
            res.send(false);
        });
    }

});
//Delete a Job router
router.get("/delete", (req,res,next) => {
    //Delete-Path's based on the requested query
    let deletePath = path.join(fileDir, req.query.user, req.query.file);
    let billPath = path.join(billDir, req.query.user, req.query.file);

    //Delete command
    rimraf(deletePath, () => {console.log("Done")});
    rimraf(billPath, () => {console.log("Done")});
    //Send it to the client, so it can delete the "div" container
    res.send(true);
});
//Router for creating a job
router.post('/createassignment', (req,res,next) => {
    //If anything isnt filled
    if(req.body.assignment_name == '' || req.files == {}){
       message = lang.fillAllFields;
       return res.redirect('/admin');
    }
    //If the jobname isnt correct (like "../Jooob")
    else if(!(/^[A-Z0-9.-_\s]/.test(req.body.assignment_name))){
        message = lang.falseJobName;
        return res.redirect("/admin");
    }
    let falseEnding = false;
    let filePath = path.join(fileDir, req.body.username,req.body.assignment_name);
    let billPath = path.join(billDir, req.body.username,req.body.assignment_name);
    let fileEnding;
    let thisFile;
    //make a dir for the job
    mkdirp.sync(filePath, err => {
        console.log(err);
    });
    //If files is an array
    if(req.files.userData.length){
        //For every file in files
        for(let i = 0; i < req.files.userData.length ; i++){
            //check the ending
            fileEnding = req.files.userData[i].name.split('.').pop();
            if (checkEnding(fileEnding)){
                falseEnding = true;
                //Break if it doenst fit in
                break;
            }
            else{
                //Move this file to the userdata-path
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
    //If it is a single file
    else{
        //Check again if the ending fits
        fileEnding = req.files.userData.name.split('.').pop();
        if (checkEnding(fileEnding)){
            falseEnding = true;
        }
        else{
            //Move this file at the right position
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
    //The program has to delete
    //The Folder it recently created
    //if the ending is false
    //If you wouldnt do this, you would have a empty folder after unsuccesfully create a job
    if (falseEnding){
        rimraf(filePath, err => {
            if(err)
                console.log(err);
        });
        return res.redirect('/admin');
    }
    else{
        //after this a path for the bill will be created, too
        mkdirp.sync(billPath, err => {
            if(err)
                console.log(err);
        });
        //The bill will be moved to the right position
        req.files.bill.mv(path.join(billPath, "bill.pdf"), err => {
            if(err){
                console.log(err);
            }
            else{
                console.log("Uploaded-Bill");
            }
        });
        //Everything is true, so the message is null and the admin can be redirected to the admin root
        message = null;
        return res.redirect('/admin');
    }
});
//Router for editing a user
router.get("/edituser", (req,res,next) => {
    //message that will be displayed if error
    let mes;
    //database out of request context
    const db = req.db;
    const query = "SELECT * FROM users WHERE username = ? LIMIT 1";
    const fields = req.query.user;
    //all of the users properties will be selected in this query
    db.query(query, fields, (error, results) => {
        if(error){
            //If error, this will be displayed
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
        //So if the user isnt existing, you will get a message for that
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
        //BUUUT, if this is successful, you wont get any messages, you are free to edit the user
        mes = null;
        //Render the edituser.ejs with the data
        res.render("edituser", {
            message: mes,
            userToEdit: user.username,
            title: settings.title,
            user : req.session.user,
            lang: lang
        });
    });
});
//Function to change any users password
//If you are an admin
router.post('/changepw', (req,res,next) => {
    //Checks if the password and the repeated password are the same
    if (!(req.body.newPassword === req.body.repeatPassword)){
        return res.send('doesntMatch');
    }
    //Checks the length of the password
    if ((req.body.newPassword.length < 8)){
        return res.send('toShort');
    }
    //encrypts the password
    let encryptedPassword = bcrypt.hashSync(req.body.newPassword);
    //database out of request context
    const db = req.db;
    const query = "UPDATE users SET password = ? WHERE username = ?";
    const fields= [encryptedPassword, req.body.userName];
    //changes the password
    db.query(query,fields, (error,results) => {
        if(error)
            //If this is unsuccessful, you will get a message
            return res.send(false);
        //if you are changing your own password, you will be logged out in a sec
        if (req.session.user.username === req.body.userName){
            return res.send("logout");
        }
        res.send("success");
    });
});

module.exports = router;
