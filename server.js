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
const api_base_url = process.env.API_BASE_URL;

const validateRequest = async (req, res, next) => {
    if(req.method === 'GET'){
        return next();
    }
    if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        const auth = req.headers.authorization.split(' ')[1];
        try{
            const url = `${api_base_url}/user/apiToken`;
            const api_call = await superagent.post(url).set('Accept', 'application/json').set('Authorization', `Bearer ${auth}`);
            const body = api_call?.body;
            if(body?.message !== 'ok' || !body?.user){
                return res.status(401).send({message: 'unauthorized'});
            }
            req.user = body.user;
            req.auth = auth;
            next();
        }
        catch(exception){
            console.log("exception",exception);
            res.status(401).send({message: 'unauthorized'});
        }
    }
    else{
        res.status(401).send({message: 'unauthorized'});
    }
}

app.use(validateRequest);

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, process.env.IMAGE_UPLOAD_PATH);
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const imageFilter = function(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|WEBP)$/)) {
        req.fileValidationError = 'only_images_allowed';
        return cb(new Error('only_images_allowed'), false);
    }
    if (file.size > 1048576) {
        req.fileValidationError = 'max_size_10_mb';
        return cb(new Error('max_size_10_mb'), false);
    }
    cb(null, true);
};

const storeUserImage = async (req, user_id) => {
    const resize_tiny = { width: 50, height: 50, fit: 'contain' };
    const resize_small = { width: 200, height: 200, fit: 'contain' };
    const resize_big = { width: 800, fit: 'contain' };
    await sharp(req.file.path).resize(resize_tiny).toFile(process.env.IMAGE_UPLOAD_PATH + '/tiny-' + req.file.filename);
    await sharp(req.file.path).resize(resize_small).toFile(process.env.IMAGE_UPLOAD_PATH + '/small-' + req.file.filename);
    await sharp(req.file.path).resize(resize_big).toFile(process.env.IMAGE_UPLOAD_PATH + '/big-' + req.file.filename);
    const filename = req.file.filename.replace('picture-', '');
    return filename;
}

app.get("/getImage/:image", async (req, res) => {
    try{
        const image = req.params.image;
        const image_not_found = 'no-photo.png';
        let imgPath = `${process.env.IMAGE_UPLOAD_PATH}/${image}`;
        if(!fs.existsSync(imgPath)){
            imgPath = `${process.env.IMAGES_PATH}/${image_not_found}`;
        }
        const img_file = fs.readFileSync(imgPath);
        const img = Buffer.from(img_file, 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': img.length
        });
        res.end(img);
    }
    catch(exception){
        return res.status(500).send({error: exception});
    }
});

app.post("/uploadPicture", async (req, res) => {
    let upload = multer({ storage: storage, fileFilter: imageFilter, limits: { fileSize: 10485760 }  }).single('picture');
    upload(req, res, async function(err) {
        if(!req?.user?._id && !req?.body?.user_id){
            return res.status(500).json({error: "missing_user"});
        }
        const user_id = req?.user?._id ? req.user._id : req.body.user_id;
        if (err instanceof multer.MulterError) {
            if(err.code === 'LIMIT_FILE_SIZE'){
                return res.status(500).json({error: "file_too_large"});
            }
            else{
                return res.status(500).json({error: err});
            }
        }
        if (req.fileValidationError) {
            return res.status(500).json({error: 'only_images_allowed'});
        }
        if (!req.file) {
            return res.status(500).json({error: 'no_image_sent'});
        }
        if (err) {
            return res.status(500).json({error: err});
        }
        try{
            const filename = await storeUserImage(req, user_id);
            const url = `${api_base_url}/user/addPicture`;
            const api_call = await superagent.post(url).set('Accept', 'application/json')
                .set('Authorization', `Bearer ${req.auth}`)
                .send({ filename: filename});
            const body = api_call?.body;
            if(body?.message === 'addPicture' && body?.pictures?.length){
                return res.json({message: "ok", pictures: body.pictures, filename: filename});
            }
            console.log("body",body);
            res.status(401).send({message: 'something_went_wrong'});
        }
        catch(exception){
            console.log("exception",exception);
            res.status(401).send({message: 'error'});
        }
    });
});

app.listen(process.env.PORT, console.log(`Server started on port ${process.env.PORT}`));
