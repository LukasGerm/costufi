const express = require('express');
const router = express.Router();
const logger = require('winston');
const fs = require('fs');
const path = require('path');
const async = require('async');
const settings = require('../../config/settings.json');
const userDataPath = path.join(__dirname,'..', '..','data', 'userdata');
const userBillPath = path.join(__dirname, '..','..','data', 'bills');
// no need to check userId with session.user.userId
// since middleware attached in app.js will guard this route
// and redirect user to '/'

router.get("/:userName", (req, res, next) => {
    const lang = require("../lang/"+req.session.user.lang+".json");
    const directory = path.join(userDataPath, req.params.userName);
    const files = [];
    const directories = [];
    if (req.params.userName != req.session.user.username && !req.session.user.isAdmin) {

        const error = new Error("You cannot access other user's files");
        error.status = 403;
        return next(error);
    }
    else if(req.query.dir){
        fs.readdir(path.join(directory, req.query.dir), (err,entries) => {
           if(err){
               console.log(err);
               return res.send(err);
           }
           async.eachLimit(entries,10, (entry,done)=>{
               files.push(entry);
               done();
            }, ()=> {
               const data = {
                   dir:req.query.dir,
                   file: files
               };
               return res.send(data);
           });
        });
    }
    else{
        logger.info('Reading directory:', directory);
        fs.readdir(
            directory,
            (err, entries) => {
                if (err) {
                    logger.error('Error:', err);
                    const error = new Error('System error');
                    return next(error);
                }
                async.eachLimit(
                    entries, 10,
                    (entry, done) => {
                        fs.stat(path.join(directory, entry), (error, stat) => {
                            if (stat.isDirectory()) directories.push(entry);
                            done();
                        });
                    },
                    () => {
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

router.get('/:userName/:type/:filename', (req, res, next) => {
    if(req.params.type == "download"){
        if(req.params.userName != req.session.user.username && !req.session.user.isAdmin) {
            const error = new Error("You cannot access other user's files");
            error.status = 403;
            return next(error);
        }
        res.download(path.join(userDataPath, req.params.userName,req.query.dir, req.params.filename));
    }
    else if(req.params.type == "bills"){
        if(req.params.userName != req.session.user.username && !req.session.user.isAdmin) {
            const error = new Error("You cannot access other user's files");
            error.status = 403;
            return next(error);
        }
        res.download(path.join(userBillPath, req.params.userName, req.params.filename, 'bill.pdf'));
    }


});
module.exports = router;
