const express = require("express");
const router = express.Router();
let settings = require("../../config/settings.json");
const bcrypt = require("bcrypt-nodejs");



router.get('/', (req,res,next) => {
    const lang = require("../lang/"+req.session.user.lang+".json");
    let data = {
        lang: lang,
        title: settings.title,
        user: req.session.user
    };
   switch (req.query.site){
       /*case 'general':
           if(req.session.user.isAdmin){
               return res.render('./settings/general', data);
           }
           else{
               return res.render('./settings/unauthorized', data);
           }
           break;*/
       default:
           res.render('./settings/personal', data);
           break;
   }
});
router.post('/changepw', (req,res,next) => {
    if (!(req.body.newPassword === req.body.repeatPassword)){
        return res.send('doesntMatch');
    }
    if ((req.body.newPassword.length < 8)){
        return res.send('toShort');
    }
    console.log(req.body.newPassword + " Password");
    let encryptedPassword = bcrypt.hashSync(req.body.newPassword);
    const db = req.db;
    const query = 'UPDATE users SET password = ? WHERE userId = ?';
    const fields = [encryptedPassword, req.session.user.userId];
    db.query(query,fields, (error,results) =>{
        if(error){
            return res.send(false);
        }
        res.send("success2");
    });

});
router.post('/changelang', (req,res,next) => {
    if(!req.body){
        return res.send(false);
    }
    const db = req.db;
    const query = 'UPDATE users SET lang = ? WHERE userId = ?';
    const fields = [req.body.lang,req.session.user.userId];
    db.query(query,fields, (error,results) => {
        if(error){
            return res.send(false);
        }
        res.send(true);
    });
});
module.exports = router;