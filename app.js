// IMPORTING MODEULES
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const CONST = require("./constants");
const imageUpload = require("./imageupload");
const fs = require("fs");
const db = require("./database.js");
const htmlToTExt = require('html-to-text');
const auth = require("./authorisation.js");
const authorisation = require('./authorisation.js');


//CREATING APP
const app = express();

// Allow App to Receive JSON data
app.use(express.json({ limit: "100mb" }));

// create application/x-www-form-urlencoded parser
app.use(bodyParser.urlencoded({ extended: false }));

//For static file rendering
app.use(express.static(__dirname));

//set view engine to ejs
app.set("view engine", "ejs");

//Set up authorisation
auth.configureSession(app);

// Connect to Database
db.connectDB()
    .then(() => {
        //Connection successful - emit "ready" to start the app
        console.log("DB Connection successful");
        app.emit("ready");
    })
    .catch((err) => {
        // App cannot be started 
        console.log("DB connection failed, app cannot be started");
    });





// STARTING ROUTERS

// 1. Home Route
app.get("/", (req, res) => {
    let editor = false;
    if (req.isAuthenticated()) { //Editor is logged in
        editor = true;
    }
    res.render("home",
        {
            title: CONST.TITLE,
            
            homePageDesc: CONST.HOME_PAGE_DESC,
            feature1: CONST.FEATURE_1_DESC,
            feature2: CONST.FEATURE_2_DESC,
            faKitCode: process.env.FONT_AW_CODE,
            editor: editor
        });
});

// 2. Blogs route
app.route("/blogs")
    .get((req, res) => {

        console.log("Get blogs route is firing");

        let editor = false;
        if (req.isAuthenticated()) { //Editor is logged in
            editor = true;
        }

        let subjects = db.getSubjects();//get promise for subjects
        let exams = db.getExams();//get promise for exams

        Promise.all([subjects, exams])
            .then((values) => {
                res.render("blogs", {
                    title: CONST.TITLE,
                    faKitCode: process.env.FONT_AW_CODE,
                    subjects: values[0], // render all subjects
                    previousExams: values[1], // render all exams
                    editor: editor
                });
            });
    })
    .post((req, res) => {
        console.log("Post blogs route is firing");


        let subjects = db.getSubjects(); //get promise for subjects
        let exams = db.getExams();//get promise for exams
        let blogs = db.getBlogs(req.body.subject, req.body.exam, req.body.nav); //get all blogs
        let blogviews = [];

        let editor = false;
        if (req.isAuthenticated()) { //Editor is logged in
            editor = true;
        }

        Promise.all([subjects, exams, blogs])
            .then((values) => {
                //Make subject dictionary
                subjectDict = {};
                values[0].forEach((subject) => {
                    subjectDict[subject._id] = subject.subject;
                })

                //Make exam dictionary
                examDict = {};
                values[1].forEach((exam) => {
                    examDict[exam._id] = exam.exam;
                })

                //For each blog create a view to show in frontend
                values[2].forEach((blog) => {
                    let blogview = {
                        id: blog._id,
                        title: blog.blogTitle,
                        paragraph: htmlToTExt.convert(blog.blogBody).substring(1, 10),
                        subject: subjectDict[blog.subject],
                        exam: examDict[blog.exam],
                        date: blog.date,
                        published: blog.published,
                        editor: editor
                    }
                    blogviews.push(blogview);
                });

                //Send blogviews
                res.send(blogviews);
            })

    });

//3. Blog route
app.route("/blog/:id")
    .get((req, res) => {

        console.log("Blog route is firing with " + req.params.id);
        db.getBlogById(req.params.id)
            .then((data) => {
                let id = data.blog._id;
                let blogTitle = data.blog.blogTitle;
                let blogBody = data.blog.blogBody;
                let date = data.blog.date;
                let subject = data.subject;
                let exam = data.exam;
                let likes = data.blog.likes

                // console.log(subject);
                // console.log(exam);

                res.render("blog", {
                    title: CONST.TITLE,
                    faKitCode: process.env.FONT_AW_CODE,
                    id: id,
                    subject: subject,
                    date: date,
                    exam: exam,
                    blogBody: blogBody,
                    blogTitle: blogTitle,
                    likes: likes
                });
            })
            .catch((error) => {
                console.log("Error in loading blog - " + error);
            });

    }).post((req, res) => { //to update the numbers of likes


        db.addLike(req.params.id, req.body.like)
            .then((likes) => {
                res.send({ likes: likes });
            })
            .catch((error) => console.log(error));
    });


//4. Edit Route
app.get("/editor", (req, res) => {

    if (req.isAuthenticated()) { //Only logged in user can edit
        let subjects = db.getSubjects();//get promise for subjects
        let exams = db.getExams();//get promise for exams

        Promise.all([subjects, exams])
            .then((values) => {
                res.render("editor", {
                    faKitCode: process.env.FONT_AW_CODE,
                    title: CONST.TITLE,
                    subjects: values[0], // render all subjects
                    prevExams: values[1], // render all exams
                    blogTitle: "",
                    subjectSelected: "",
                    selectedExam: "",
                    blogBody: "",
                    blogId: ""
                });
            });
    }
    else {
        res.redirect("/login/login");
    }
});

//5. Editor  - document update
app.get("/editor/:id", (req, res) => {

    if (req.isAuthenticated()) { //Only logged in user can edit
        let blogData = db.getBlogById(req.params.id);
        let subjects = db.getSubjects();//get promise for subjects
        let exams = db.getExams();//get promise for exams

        Promise.all([subjects, exams, blogData])
            .then((values) => {
                let blogId = values[2].blog._id;
                let blogTitle = values[2].blog.blogTitle;
                let blogBody = values[2].blog.blogBody;
                let subject = values[2].subject;
                let exam = values[2].exam;

                res.render("editor", {
                    faKitCode: process.env.FONT_AW_CODE,
                    title: CONST.TITLE,
                    subjects: values[0], // render all subjects
                    prevExams: values[1], // render all exams
                    blogTitle: blogTitle,
                    subjectSelected: subject,
                    selectedExam: exam,
                    blogBody: blogBody,
                    blogId: blogId
                });
            });
    }
    else {
        res.redirect("/login/login");
    }
});

//6. Publish route - to publish a document
app.get("/publish/:id", (req, res) => {

    if (req.isAuthenticated()) {
        db.publish(req.params.id)
            .then((st) => {
                res.send({ status: st });// send published if successful
            }).catch((error) => {
                console.log("Error in publish - " + error);
            });
    }
    else {
        res.redirect("/login/login");
    }
});

//7. Delete route
app.get("/delete/:id", (req, res) => {

    if (req.isAuthenticated()) {
        db.deleteBlog(req.params.id)
            .then((st) => {
                res.send({ status: st });// send deleted if successful
            }).catch((error) => {
                console.log("Error in publish - " + error);
            });
    }
    else {
        res.redirect("/login/login");
    }
});


// 8. Save or Update Blog
app.post("/save", imageUpload.deleteExtraImages, (req, res) => {

    if (req.isAuthenticated()) {
        // Middlewire will delete all redundant images first - then following will be executed
        db.insert(req.body)
            .then((result) => {
                res.send({ status: result });
                // Result is _id if it is newly created
                //Result is "error" if the operation fails
                //Result is "updated" if existing document gets uodate
            });
    }
    else {
        res.redirect("/login/login");
    }


});

//9. Upload Images 
app.post("/upload_image", (req, res) => {

    if (req.isAuthenticated()) {

        imageUpload.upload(req, res, (err) => {
            if (!err) {
                console.log(`/uploads/images/` + req.files[0].filename);
                res.send({ location: `/uploads/images/` + req.files[0].filename });
            }
            else {
                console.log(err);
            }
        });
    }
    else {
        res.redirect("/login/login");
    }
});

//10. Search Route
app.post("/search", (req, res) => {
    db.searchBlog(req.body.query)
        .then((blogs) => {
            let searchResults = [];
            let count = 0;
            while(count < 10 && count < blogs.length) { //Send only 10 search results
                let result = {
                    id: blogs[count]._id,
                    blogTitle: blogs[count].blogTitle
                }
                searchResults.push(result);
                count++;
            }
            
            res.send(searchResults);
        })
        .catch((error) => { console.log("cannot fetch blogs " + error) });
});


// ROUTERS FOR AUTHORISATION
//1. Login - Register Page
app.get("/login/:mode", (req, res) => {
    let mode = req.params.mode;
    res.render("login", {
        faKitCode: process.env.FONT_AW_CODE,
        title: CONST.TITLE,
        mode: mode,
    });
});

//2. Register route
app.post("/register", (req, res) => {
    authorisation.registerUser(req.body.username, req.body.password)
        .then((result) => {
            res.redirect("/login/" + result);
        })
        .catch((error) => {
            console.log(error);
        });

});

//3. Login route
app.post("/login", (req, res) => {
    authorisation.loginUser(req, res);
});

//4. Logout route
app.get("/logout", (req, res) => {
    authorisation.logout(req, res);
});

//5. Reset password route
app.post("/reset", (req, res) => {
    authorisation.resetPassword(req, res);
});

//6. Change password route
app.post("/change_pass", (req, res) => {
    authorisation.changePassword(req, res);
});


//CREATING SERVER ON PORT 4000 - Only when Database connection is successful
app.on("ready", () => {
    app.listen(4000, () => {
        console.log("Server is running on port: 4000");
    });
});
