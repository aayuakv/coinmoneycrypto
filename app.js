//jshint esversion:6
//read documentation of dotenv module in npm
require('dotenv').config()
//dotenv is used to kept your secrets in a secret file namely .env
//and after that add this file .env to .gitignore,so that no one can see your file .env

//express is a npm module used to create backend in node.js language
const express = require("express");

//body-parser is used to handle inputs we recieve in web pages
const bodyParser = require("body-parser");

//ejs is used to dynamically change the value of web page without making separate html pages
const ejs = require("ejs");

//mongoose is library of mongodb used to do CRUD operations in database
const mongoose = require("mongoose");


const session = require('express-session')
const passport = require('passport')

//donot install passport-local because it is one of the dependency used by 'passport-local-mongoose' module
const passportLocalMongoose = require('passport-local-mongoose')
//for setup google strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy;
//for configure google strategy we need to require this below module
const findOrCreate = require('mongoose-findorcreate');

// //bcrypt is npm module used to encrypt and decrypt the data using hashing and salting
// const bcrypt = require("bcrypt");
//
// const saltRounds = 5; //number of salt rounds you want with your password


//app constant assigned to express function
const app = express();

//this line is used to tell the compiler about css files,images is in public folder
app.use(express.static(__dirname+"/public"));


//this line sets the view engine in views folder using ejs module
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));

//save user login session
//to use cookies and sessions,session must write code ,read documentation of 'express-session' module
app.use(session({
  secret: 'Our little secret',
  resave: false,
  saveUninitialized: true
}))


//passport initialization,for more information read documentation of passport and passportLocalMongoose
app.use(passport.initialize());

//to tell our app to use passport to also setup our session
app.use(passport.session());



//connect to database name:userDB
mongoose.connect("mongodb+srv://admin-aayush:Test123@cluster0.fl0ip.mongodb.net/userDB", {
  useNewUrlParser: true,useUnifiedTopology: true
});

mongoose.set("useCreateIndex", true)

// create a database schema(bleprint) with encrypt
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    countrycode: String,
    contact: Number,
    city: String,
    firstName: String,
    lastName: String,
    //this below google id is added in database to store information about user of google id
    //google id contains all information without any passwords
    googleId: String
});





//in order to use passport local mongoose we have to add it to our mongoose scheme as a plugin
//it is used to hash and salt our passwords and to save our users to mongoDB databases
userSchema.plugin(passportLocalMongoose);


//findOrCreate plugin
userSchema.plugin(findOrCreate);


//create model or collection of database

const User = new mongoose.model("User", userSchema)

//to create a local strategy to authenticate users using their username and passwords and also to seralize and
//deserialize user
passport.use(User.createStrategy());

//the below serialize and deserialize code is working for all strategies ex-local and google etc.

//serialize and deserializeis only useful when we use sessions
//when we say serialize the user it basically create a cookie  and stuffs with information for
//user identification stored in cookie.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

//when we say deserialize the user it basically allows passport to broke the cookie and findout the information
//inside the cookie which is who the user is and all their identification,so that we can authenticate user on
// the server.
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


//for configuration of google strategy
//we point out all the options for using the google Strategy to login our user
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL:"http://localhost:3000/auth/google/main",
    // callbackURL:"https://coinmoneycrypto.herokuapp.com/auth/google/main",
    //this below line is compulsory to add because google announces that google+ is sunsetting
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  //this is where google sent back the access token that allows us to get data of the user
  function(accessToken, refreshToken, profile, cb) {

    // console.log(profile);
    //if find the user of that profile id is fine otherwise create the user of that name
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {

      return cb(err, user);
    });
  }
));


//now use get route to send files to browser when browser requests to backend

app.get("/", function(req, res) {
  res.render("home");
});



app.get("/main", function(req, res) {
  //this below code is to check that if user is authenticated then only render the main page otherwise login
  //the user again
  if (req.isAuthenticated()) {
    res.render("main");
  } else {
    res.redirect("/login");
  }

});


//authenticate the user using google strategy and we tell the google that we wants user profile this includes
//the email and the user id which we will able to use and identify in future
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile']
  }));


//this get request made by google to redirect user back to our website
app.get('/auth/google/main',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect main.
    res.redirect('/main');
  });





app.get("/register", function(req, res) {
  res.render("register");
});


app.get("/login", function(req, res) {
  res.render("login");
});



app.get("/learnmore", function(req, res) {
  res.render("learnmore");
});







//for logout route we use get request
app.get("/logout", function(req, res) {
  //logout() is also provided by the passportLocalMongoose to logout or deauthenticate the user
  req.logout();
  res.redirect("/");
});









//post request is used when we give input in browser and after that browser send that input to backend and that inputs
//handeled by post route and again send data/files to browser

app.post("/register", function(req, res) {

  //you will provide username and passworde which you take as input to the user
  //and if there are no errors we successfully authenticate the user
  //register() comes from the passport local mongoose that is used to create new user ,saving user and interact
  //with mongoose directly
  User.register({
    username: req.body.username,
    firstName: req.body.fName,
    lastName: req.body.lName,
    countrycode: req.body.cCode,
    contact: req.body.contact,
    city: req.body.location,
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      //redirect to register page for try again if error
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        //if successfully registered then go to main page
        res.redirect("/main");
      });
    }

  });

});





app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  })
  //we use login() that passport gives us if no error founds that it takes us to the main page
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/main");
      });
    }

  })
});




//for web app to connect to a port:3000 in localhost


app.listen(process.env.PORT||3000,function(){
  //if we want that our app work on both heroku and local server then use or symbol
  console.log("server is running on port 3000");
})
