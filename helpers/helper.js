const multer = require("multer");
const path = require("path");
const sharp = require("sharp");
const superagent = require("superagent");
const fs = require("fs");
const api_base_url = process.env.API_BASE_URL;

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

exports.deletePicture = async (req, res, user_id, is_admin) => {
    if(!req.body.picture_id){
        return res.status(500).json({error: 'no_image_sent'});
    }
}

exports.uploadPicture = async (req, res, user_id, is_admin) => {
    let upload = multer({ storage: storage, fileFilter: imageFilter, limits: { fileSize: 10485760 }  }).single('picture');
    upload(req, res, async function(err) {
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
            const url_controller = is_admin ? 'texas' : 'user';
            const url = `${api_base_url}/${url_controller}/addPicture`;
            const params = {};
            params.filename = filename;
            if(is_admin){
                params.user_id = req.body.user_id;
            }
            const api_call = await superagent.post(url).set('Accept', 'application/json')
                .set('Authorization', `Bearer ${req.auth}`)
                .send(params);
            const body = api_call?.body;
            if(body?.message === 'addPicture' && body?.pictures?.length){
                return res.json({message: "ok", pictures: body.pictures, filename: filename});
            }
            res.status(401).send({message: 'something_went_wrong'});
        }
        catch(exception){
            console.log("exception",exception);
            res.status(401).send({message: 'error'});
        }
    });
}

exports.getImage = async (req, res) => {
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
}