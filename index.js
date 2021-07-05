if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const express = require('express');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const mongoSanitize = require('express-mongo-sanitize');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const User = require('./models/user');
const passport = require('passport');
const LocalStrategy = require('passport-local');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(flash());
app.use(mongoSanitize());
app.use(express.static('public'));
app.set('view engine', 'ejs');





const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/book-face';
const secret = process.env.SECRET || 'team-four';

app.use(
  session({
    store: MongoStore.create({ mongoUrl: dbUrl }),
    name: 'session',
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

mongoose
  .connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true  })
  .then(() => {
    console.log('Database connected!');
  })
  .catch((err) => {
    console.log('Database connection error!');
    console.log(err);
  });

app.get('/', (req, res) => {
  res.render('home.ejs');
});



app.get('/user/register', (req, res) => {
  res.render('register.ejs');
});



app.get('/user/login', (req,res) => {
  res.render('login.ejs');
})


app.get('/user/createprofile', (req,res) => {
  res.render('createProfile.ejs')
})




app.listen(process.env.PORT || 3000, () => console.log('Server Up and running'));
