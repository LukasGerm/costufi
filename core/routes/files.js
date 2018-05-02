const express = require('express');
const router = express.Router();
const logger = require('winston');
const fs = require('fs');
const path = require('path');
const async = require('async');
const settings = require('../../config/settings.json');
//Two global variables to minimize code redundancy
const userDataPath = path.join(__dirname,'..', '..','data', 'userdata');
const userBillPath = path.join(__dirname, '..','..','data', 'bills');
// no need to check userId with session.user.userId
// since middleware attached in app.js will guard this route
// and redirect user to '/'
//Router for /files/"user"
function checkAutorization(req,res){
    //If it is the users directory or the user is an administrator
    if(req.params.userName != req.session.user.username && !req.session.user.isAdmin) {
        const error = new Error("You cannot access other user's files");
        //send an error
        error.status = 403;
        return next(error);
    }
}
router.get("/:userName", (req, res, next) => {
    //require the right language pack
    const lang = require("../lang/"+req.session.user.lang+".json");
    //The directory of the user
    const directory = path.join(userDataPath, req.params.userName);
    //arrays to store the files and the directories in
    const files = [];
    const directories = [];
    //Check if the user can access the files (Administrators can access files of every user)
    checkAutorization(req,res);
    //This is for the ajax request in the main.js to display the files in the directories by onclick
    if(req.query.dir){
        //Read the directory which is passed by the query
        fs.readdir(path.join(directory, req.query.dir), (err,entries) => {
            //If it does not exist or other errors then this error will be displayed
                if(err){
                   console.log(err);
                   return res.send(err);
                }
            //so of the directory exists
               async.eachLimit(entries,10, (entry,done)=>{
                   //push it to the files array, to make the files of the directories visible
                   files.push(entry);
                   done();
                }, ()=> {
                   //After this async request the data will be send to the client
                   const data = {
                       dir:req.query.dir,
                       file: files
                   };
                   return res.send(data);
               });
        });
    }
    //Just to display the directories
    else{
        logger.info('Reading directory:', directory);
        //Read the directory of the user
        fs.readdir(
            directory,
            (err, entries) => {
                if (err) {
                    //By error abort the reading
                    logger.error('Error:', err);
                    const error = new Error('System error');
                    return next(error);
                }
                async.eachLimit(
                    //Push each directory to the directories array
                    entries, 10,
                    (entry, done) => {
                        fs.stat(path.join(directory, entry), (error, stat) => {
                            //Check if it is a directory
                            if (stat.isDirectory()) directories.push(entry);
                            done();
                        });
                    },
                    () => {
                        //After this function render the files.ejs with the directories in data
                        res.render("files", {
                            directories,
                            user: req.session.user,
                            title: settings.title,
                            lang: lang,
                        });
                    });
            });
    }

});
//Function for downloading the photos and videos
router.get('/:userName/download/:filename', (req, res, next) => {
    //Check if the user is authorized
    checkAutorization(req,res);
    //Download the file
    res.download(path.join(userDataPath, req.params.userName,req.query.dir, req.params.filename));
});
module.exports = router;
