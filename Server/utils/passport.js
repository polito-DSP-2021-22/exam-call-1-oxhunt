const passportJWT = require("passport-jwt")
const ExtractJWT = passportJWT.ExtractJwt;
const userDao = require('../dao/user'); // module for accessing the users in the DB
var jsonwebtoken = require('jsonwebtoken');

const passport = require('passport'); // auth middleware
const LocalStrategy = require('passport-local').Strategy
const secret = "SuperSecretPasswordNoOneCanEverGuess";

var cookieExtractor = function (req) {
  var token = null;
  if (req && req.cookies) {
    token = req.cookies['jwt']
  }
  return token
}
var JwtStrategy = require('passport-jwt').Strategy;
var opts = {}
opts.jwtFromRequest = cookieExtractor;
opts.secretOrKey = secret
passport.use(new JwtStrategy(opts, function (jwt_payload, done) {
  console.log("entered jwt strategy")
  console.log("jwt_payload: ", jwt_payload)// delete this
  done(null, jwt_payload.user)
  return;
}))


passport.use(new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, (email, password, done) => {
  console.log("entered passport local strategy")//delete this
  userDao.getUser(email, password).then((user) => {
    if (!user){
      console.log("passport: incorrect username or password")//delete this
      return done(null, false, { message: 'Incorrect username and/or password.' });
    }
    console.log("passport: authentication was successful")
    return done(null, user);
  })
}))

passport.serializeUser((user, done) => done(null, user.id))

passport.deserializeUser((id, done) => {
  userDao.getUserById(id)
    .then(user => {
      done(null, user); // this will be available in req.user
    }).catch(err => {
      done(err, null);
    });
});



exports.passport = passport
// version of passport authenticate jwt that does not throw unauthorized to client
exports.identifyUser =(req, res, next) => {
  passport.authenticate('jwt', { session: false }, function (err, user, info){
    req.userOfCookie = user;
    console.log("identify user =>  user:", user, /*", error: ", err, ", info: ", info*/)//delete this
    next()
  })(req,res,next)
}
exports.setCookie = function (res, user) {
  console.log("signing cookie:  ==> user: ", user)
  const token = jsonwebtoken.sign({ user: user }, secret);
  res.cookie('jwt', token, { httpOnly: true, sameSite: true });
  return res
}
