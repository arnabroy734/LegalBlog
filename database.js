// Importing packages
const mongoose = require("mongoose");
require('dotenv').config();
const imageuploads = require("./imageupload");

// Defining schema - blog
const blogSchema = mongoose.Schema({
    blogTitle: String,
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" },
    date: Date,
    blogBody: String,
    published: Boolean,
    likes: Number
});

// Schema for subject
const subjectSchema = mongoose.Schema({ subject: String });

// Schema for exam
const examSchema = mongoose.Schema({ exam: String });

//Making model out of schema
var Exam = mongoose.model("Exam", examSchema);
var Subject = mongoose.model("Subject", subjectSchema);
var Blog = mongoose.model("Blog", blogSchema);



//Async Function to Connect with Remote DB
function connectDB() {
    //connect to mongo atlas
    let uri = "mongodb+srv://" + process.env.ATLAS_UID + ":" + process.env.ATLAS_PASS + "@cluster0.oxanwkk.mongodb.net/blogDB?retryWrites=true&w=majority";
    // let uri = "mongodb://127.0.0.1:27017/legalblogDB";
    return mongoose.connect(uri);
}

//Function to insert one document

async function insertBlog(input) {
    // First find subject id
    try {
        let sub = await Subject.findOne({ subject: input.subject }).exec(); //Try to find if subject exists or not
        if (!sub) {
            // Subject does not exist - so create new subject and save
            sub = new Subject({ subject: input.subject });
            await sub.save();
            // console.log("New subject added with id - " + sub._id);
        }

        let ex = await Exam.findOne({ exam: input.exam }).exec(); //Try to find if exam exists or not
        if (!ex) {
            //Exam does not exist - so create new exam and save
            ex = new Exam({ exam: input.exam });
            await ex.save();
            // console.log("New Exam added with id - " + ex._id);
        }

        //Find if a blog exists or not  - if exists then update that blog, otherwise create a new one
        // let blog = await Blog.findById(input.blogId);
        if (input.blogId == -1) {
            //Now create a new blog and save
            // console.log("Creating new blog");
            var blog = new Blog({
                blogTitle: input.blogTitle,
                subject: sub._id,
                exam: ex._id,
                date: new Date(),
                blogBody: input.blogBody,
                published: false,
                likes: 0
            });
            await blog.save();//saving the blog
            // console.log("New blog saved with id: " + blog._id);

            return blog._id; //return blog id if the creating is successful

        }
        else {//update the existing blog
            // console.log("Updating existing blog");
            await Blog.findByIdAndUpdate(input.blogId, {
                blogTitle: input.blogTitle,
                subject: sub._id,
                exam: ex._id,
                date: new Date(),
                blogBody: input.blogBody,
                published: false
            }).exec();
            // console.log("Blog updated with same id - : " + blog._id);

            return "updated"; //return the message
        }


    }
    catch (error) {
        console.log("Error in DB operation: " + error);
        return "error"; //return "error" if the operation fails
    }
}

//Function to retrieve all subjects
async function getSubjects() {
    try {
        let subjects = await Subject.find().exec();
        return subjects;
    }
    catch {
        return [];
    }

}

//Function to retrieve all exams
async function getExams() {
    try {
        let exams = await Exam.find().exec();
        return exams;
    }
    catch {
        return [];
    }
}

//Function to retrieve all blogs based on filter
async function getBlogs(subject, exam, nav) {
    try {
        let options = {};
        if (exam != "all_exams") {
            options.exam = exam; //exam selection
        }
        if (subject != "all_sub") { //subject selection
            options.subject = subject;
        }
        if (nav == "nav_drafts") {//published or drafts
            options.published = false
        }
        else {
            options.published = true;
        }

        let query = Blog.find(options);

        if (nav == "nav_recent") { // If recent is selected show latest blogs first
            query = query.sort({date: 'desc'});
        }

        if (nav == "nav_popular"){ // If popular is selected show blogs with most likes first
            query = query.sort({likes: 'desc'});
        }

        let blogs = await query.exec();
        return blogs;

    }
    catch (error) {
        throw Error(error);
    }



}

//Get blog by id
async function getBlogById(id) {
    try {
        let blog = await Blog.findById(id).exec(); //get blog by id
        let subject = await Subject.findById(blog.subject).exec(); //get subject by id
        let exam = await Exam.findById(blog.exam).exec(); //get exam by id

        return {
            blog: blog,
            subject: subject.subject,
            exam: exam.exam
        }
    }
    catch (error) {
        throw Error(error);
    }
}

//Add like to a blog - like=+1 or -1
async function addLike(id, like) {
    try {
        await Blog.findByIdAndUpdate(id, {$inc : {"likes" : like}}).exec();
        let blog = await Blog.findById(id).exec();
        return blog.likes;
    }
    catch (error) {
        throw Error(error);
    }
}

//Publish a blog
async function publish(id){
    try{
        await Blog.findByIdAndUpdate(id, {$set : {"published" : true}}).exec();
        return "published";
    }
    catch (error){
        throw Error(error);
    }
}

//Delete a blog
async function deleteBlog(id){
    try{
        //Delete images for the deleted blog
        let blog = await Blog.findById(id).exec();
        imageuploads.removeImages(blog.blogBody);

        await Blog.findByIdAndDelete(id).exec();
        return "deleted";
    }
    catch (error){
        throw Error(error);
    }
}

//Search a blog by title
async function searchBlog (query){
    try{
        let searchQuery = new RegExp(".*" + query + ".*", "i");
        let blogs = await Blog.find({$and: [{blogTitle: searchQuery}, {published: true}]});
        return blogs;
    }

    catch (error){
        console.log(error);
        throw Error(error);
    }
}



module.exports = {
    connectDB: connectDB,
    insert: insertBlog,
    getExams: getExams,
    getSubjects: getSubjects,
    getBlogs: getBlogs,
    getBlogById: getBlogById,
    addLike: addLike,
    publish: publish,
    deleteBlog: deleteBlog,
    mongoose: mongoose,
    searchBlog: searchBlog
}