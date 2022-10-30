
const multer = require('multer');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');

// Location of the saved file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + "/uploads/images/");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + ".png");
    }
});

const upload = multer({ storage: storage }).any();

//This middlewire will delete redundant images
function deleteExtraImages (req, res, next){
    let uploadedImages = req.body.images;
    let blogBody = req.body.blogBody;
    let presentImages = [];
    let redundantImages = [];

    //Finding list of available images in blogbody
    const dom = new JSDOM(blogBody);
    let imageList = dom.window.document.getElementsByTagName("img");
    for (i=0; i<imageList.length; i++){
        presentImages.push(imageList[i].src);
    }

    //Finding redundant images
    uploadedImages.forEach(function(uploadedImage){
        let index = presentImages.indexOf(uploadedImage);
        if (index == -1) { //Image is redundant
            redundantImages.push(uploadedImage);
        }
    });

    // delete redundant files
    redundantImages.forEach (function(image){
        let path = __dirname + image;
        fs.unlink (path, (err)=>{
            console.log ("Deleted redundant images");
        });
    });
    next();
}

//This will delete images for deleted blog
function removeImages(blogBody){
    let presentImages = [];

    //Finding list of available images in blogbody
    const dom = new JSDOM(blogBody);
    let imageList = dom.window.document.getElementsByTagName("img");
    for (i=0; i<imageList.length; i++){
        presentImages.push(imageList[i].src);
    }

    // delete redundant files
    presentImages.forEach (function(image){
        let path = __dirname + image;
        fs.unlink (path, (err)=>{
            console.log ("Deleted images for deleted blog");
        });
    });

}

module.exports = { upload: upload, deleteExtraImages: deleteExtraImages, removeImages: removeImages};