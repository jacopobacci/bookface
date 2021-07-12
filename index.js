if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const express = require('express');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const User = require('./models/user');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const profiles = require('./routes/profiles.js');
const posts = require('./routes/posts.js');
const user = require('./routes/user.js');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(mongoSanitize());
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/book-face';
const secret = process.env.SECRET || 'team-four';
// process.env.DB_URL ||

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

app.use(flash());

app.use(async (req, res, next) => {
  const user = await User.find({ hasProfile: false });
  res.locals.currentUser = req.user;
  res.locals.hasProfile = user.length;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

mongoose.connect(dbUrl, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', () => {
  console.log('Database connected');
});

app.get('/', (req, res) => {
  res.render('home.ejs');
});

app.use('/user', user);
app.use('/posts', posts);
app.use('/profiles', profiles);

app.listen(process.env.PORT || 3000, () => console.log('Server Up and running'));
