const mongoose = require("mongoose");
require("../Config/passportConfig");
var upload = require("../uploadmodule");
var jwt = require("jsonwebtoken");
const passport = require("passport");
const path = require("path");
var GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

var addEvent = require("../Model/addEvent");
var User = require("../Model/googleLogin");
var registerUser = require("../Model/newUserModel");
const { log } = require("util");

//to add events
module.exports.addEvent = (req, res) => {
  var newEvent = req.body;
  console.log(req.file);

  newEvent.src = req.file ? req.file.originalname : "";
  var EventData = new addEvent(newEvent);
  EventData.save()
    .then((data) => {
      return res.status(201).json({ newEvent: data });
    })
    .catch((error) => {
      return res
        .status(500)
        .json({ error: "Failed to save the event to MongoDB" });
    });
};
// display events
module.exports.display = async (req, res) => {
  try {
    const getevent = await addEvent.find();
    res.status(200).json({ status: 200, getevent });
  } catch (error) {
    res.status(400).json({ status: 400, error });
  }
};

// for finding event
module.exports.findEvent = (req, res) => {
  const array = [];
  return addEvent
    .find({ title: req.body.title })
    .then((data) => {
      array.push(data);
      res.json({ data });
    })
    .catch((err) => {
      res.status(404).json({
        success: false,
        error: err,
      });
    });
};

//for signup
module.exports.Register = async (req, res) => {
  var newregister = new registerUser({
    name: req.body.uname,
    email: req.body.uemail,
    password: req.body.upassword,
  });
  if (!newregister.name) {
    return res.json({
      error: "name is required",
    });
  }
  if (!newregister.password || newregister.password.length < 6) {
    return res.json({
      error: "Password is required and should be atleast 6 characters long",
    });
  }
  const exist = await registerUser.findOne({ email: newregister.email });
  if (exist) {
    return res.json({
      error: "Email already exists",
    });
  } else {
    newregister
      .save()
      .then((data) => {
        return res.status(200).json({
          success: true,
          userDetails: data,
        });
      })
      .catch((err) => {
        return res.status(404).json({
          success: false,
          err: err,
        });
      });
  }
};

//for manual login
module.exports.loginUser = (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return res.status(404).json(err);
    if (user) {
      const token = jwt.sign(
        { _id: user.id, username: user.name },
        "tokenSecret!",
        { expiresIn: "1h" }
      );
      res.cookie("token", token, {
        expires: new Date(Date.now() + 9000000),
        httpOnly: true,
      });
      return res.status(200).json({ status: 200, token: token });
    }
    if (info) return res.status(400).json({ info });
  })(req, res, next);
};
module.exports.profile = (req, res) => {
  registerUser
    .findOne({ _id: req.userid })
    .then((validUser) => {
      return res.status(200).json({ status: 200, validUser });
    })
    .catch((error) => {
      return res.status(404).json({ status: 404, error });
    });
};

module.exports.logout = (req, res) => {
  try {
    res.clearCookie("token", { path: "/" });
    return res.status(200).json({ status: 200 });
  } catch (error) {
    return res.status(400).json({ status: 400, error });
  }
};

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET_KEY = process.env.GOOGLE_CLIENT_SECRET_KEY;
const REDRICT_URL = process.env.REDRICT_URL;

//authorization with passport
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET_KEY,
      callbackURL: REDRICT_URL,
      scope: ["email", "profile"],
    },
    async function (accessToken, RefreshToken, profile, done) {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = new User({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
            image: profile.photos[0].value,
          });
          await user.save();
        }
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

//login with google
module.exports.loginWithGoogle = passport.authenticate("google", {
  scope: ["profile", "email"],
});

module.exports.googleCallback = passport.authenticate("google", {
  successRedirect: "http://localhost:5173",
  failureRedirect: "http://localhost:5173/login",
});

module.exports.loginSuccess = async (req, res) => {
  if (req.user) {
    res.status(200).json({ message: "User Login successful", user: req.user });
  } else {
    res.status(400).json({ message: "Not Authorized" });
  }
};

module.exports.logoutgoogle = (req, res, next) => {
  req.logout(function (error) {
    if (error) return next(error);
    res.redirect("http://localhost:5173");
  });
};

//to store info in session
passport.serializeUser(function (user, cb) {
  cb(null, user);
});
//to retrive info from passport session
passport.deserializeUser(function (user, cb) {
  cb(null, user);
});
