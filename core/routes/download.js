import express from "express";
const router = express.Router();

/*router.get("/", (req,res,next) => {
  res.send("download");
});*/
router.get("/:filename", (req,res,next) =>{
  console.log(req.params.filename);

});

module.exports = router;
