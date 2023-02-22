const express = require("express");
const cors = require('cors');
const app = express();
app.use(express.json({limit: '50mb'}));
app.use(cors());
const superagent = require('superagent');
const path = require('path');
const sharp = require('sharp');
const multer  = require('multer');
const fs = require('fs');
const auth = require('./middlewares/auth');
const helper = require('./helpers/helper');


app.get("/getImage/:image", async (req, res) => {
    return helper.getImage(req, res);
});

app.post("/uploadPicture",auth.validateRequest, async (req, res) => {
    return helper.uploadPicture(req, res, req.user._id, false);
});

app.delete("/deletePicture",auth.validateRequest, async (req, res) => {
    return helper.deletePicture(req, res, req.user._id, false);
});

app.post("/uploadPictureAdmin",auth.validateAdminRequest, async (req, res) => {
    return helper.uploadPicture(req, res, req.body.user_id, true);
});

app.listen(process.env.PORT, console.log(`Server started on port ${process.env.PORT}`));
