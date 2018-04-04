const express = require("express");
const router = express.Router();

router.get('/', (req,res,next) => {
   switch (req.query.site){
       default:
           res.render('./settings/personal');
       break;
   }
});

module.exports = router;