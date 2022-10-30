const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require("passport-local-mongoose");
const db = require("./database.js");
require("dotenv").config();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const passwordgen = require("generate-password");

//User Database Collection
var User;

//Configure nodemailer service 
const Oauth2 = google.auth.OAuth2;
const Oauth2Client = new Oauth2(process.env.OAUTH_CLIENT_ID, process.env.OAUTH_CLIENT_SECRET);
Oauth2Client.setCredentials({ refresh_token: process.env.OAUTH_REFRESH_TOKEN });

function sendMail(receipient, message, subject) {
    const accesstoken = Oauth2Client.getAccessToken();

    const transport = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.OAUTH_USER,
            clientId: process.env.OAUTH_CLIENT_ID,
            clientSecret: process.env.OAUTH_CLIENT_SECRET,
            refreshToken: process.env.OAUTH_REFRESH_TOKEN,
            accessToken: accesstoken
        }
    });

    const mail_options = {
        from: `Team Legalblog ${process.env.OAUTH_USER}`,
        to: receipient,
        subject: subject,
        html: message
    }

    return new Promise((resolve, reject) => {
        transport.sendMail(mail_options, (err) => {
            if (!err) {
                console.log("Mail sent successfully");
                resolve(true);
            }
            else {
                console.log("Mail not sent, something went wrong.");
                resolve(false);
            }
        });
    });

}

//Session configuration
function configureSession(app) {
    // 1. USE SESSION
    app.use(session({
        secret: process.env.SESSION_SECRET,
        saveUninitialized: false,
        resave: false
    }));

    //2. USE PASSPORT IN EXPRESS BASED APP
    app.use(passport.initialize());
    app.use(passport.session());

    //3. Define Userschema
    const userSchema = db.mongoose.Schema({
        username: String
    });

    //4. This is for salting and hashing password
    userSchema.plugin(passportLocalMongoose);

    //5. Making model
    User = db.mongoose.model("User", userSchema);

    // 6. Configure passportLocalMongoose
    passport.use(User.createStrategy());
    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());

}

//Register User
async function registerUser(username, password) {
    try {
        let users = await User.find().exec();//Find existing users
        if (users.length != 0) { //User already exists  - not allowed to create more
            return "sorry";
        }
        await User.register({ username: username }, password);
        return "success";

    }
    catch (error) {
        throw Error(error);
    }

}

//Login and authenticate user
function loginUser(req, res) {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (!err) {
            passport.authenticate("local", { failureRedirect: "/login/loginfailed", failureMessage: true })(req, res, function () {
                res.redirect("/");
            });
        }
    });

}

//Logout User
function logout(req, res) {
    req.logout({ keepSessionInfo: false }, function (err) {
        res.redirect("/");
    });

}

//Reset password
async function resetPassword(req, res) {
    try {
        const newPass = passwordgen.generate({ length: 10, numbers: true }); //new password generated
        let users = await User.find({ username: req.body.username }).exec(); //find user by e-mail
        let user = users[0];//registered user
        if (user) { //if user is found
            //First send mail to user  - and wait for response
            let resp = await sendMail(user.username, "Your password has been reset to "+ newPass, "Password Reset");
            if (resp) { //If response is true - message is sent - now reset password
                await user.setPassword(newPass);
                await user.save();
                res.redirect("/login/resetsuccess");
            }
        }
        else {
            res.redirect("/login/resetfailed");
        }
    }
    catch (error) {
        res.redirect("/login/resetfailed");
    }
}

//Change password
async function changePassword(req, res){
    try{
        let users = await User.find({ username: req.body.username }).exec(); //find user by e-mail
        let user = users[0];//registered user
        if (user) { //if user is found
            await user.changePassword(req.body.old_password, req.body.new_password);
            res.redirect("/login/changesuccess");
        }
        else {
            res.redirect("/login/changepassfailed");
        }
    }
    catch(error) {
        res.redirect("/login/changepassfailed");
    }
}

module.exports = {
    configureSession: configureSession,
    registerUser: registerUser,
    loginUser: loginUser,
    logout: logout,
    sendMail: sendMail,
    resetPassword: resetPassword,
    changePassword: changePassword
}