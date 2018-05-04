
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt-nodejs");
//router for changing passwords
router.post('/', (req,res,next) => {
    //check the new password if it matches the conditions
    if (!(req.body.newPassword === req.body.repeatPassword)){
        return res.send('doesntMatch');
    }
    if ((req.body.newPassword.length < 8)){
        return res.send('toShort');
    }
    //Encrypt the newly entered password with given function of bcrypt
    let encryptedPassword = bcrypt.hashSync(req.body.newPassword);
    //Getting the db out of req context
    const db = req.db;
    const query = 'UPDATE users SET password = ? WHERE userId = ?';
    //need data to send back to the client
    let data;
    let fields;
    //Check if the user is admin and he uses the right formular
    if(req.session.user.isAdmin && req.body.userId){
        fields = [encryptedPassword, req.body.userId];
        //check if the user is changing his own password
        if (req.session.user.userId == req.body.userId)
            data = "logout";
        else
            data = "success";
    }
    else{
        //If he is using the formular to change his own password
        fields = [encryptedPassword, req.session.user.userId];
        data = "success2";
    }
    db.query(query,fields, (error,results) =>{
        //If error, abort
        if(error){
            return res.send(false);
        }
        //Use a switch function in main.js
        res.send(data);
    });

});

module.exports = router;