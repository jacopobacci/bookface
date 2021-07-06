if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const express = require('express');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const mongoSanitize = require('express-mongo-sanitize');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const User = require('./models/user');
const Post = require('./models/post');
const Profile = require('./models/profile');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const { isLoggedIn, isAuthor } = require('./middleware')

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
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

app.use(flash());

// MIDDLEWARE
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
})

mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

app.get('/', (req, res) => {
  res.render('home.ejs');
});

//Register 

app.get('/user/register', (req, res) => {
  res.render('register.ejs');
});

app.post('/user/register', async (req, res) => {
  try {
    const { username,email, password} = req.body;
    const user = new User ({ username, email });
    const registeredUser = await User.register(user, password);
    req.login(registeredUser, e => {
      if(e) {
        console.log(e)
      } else {
        req.flash('success', 'Successfully registered!');
        res.redirect('/posts');
      }
    })
  } catch (e) {
    console.log(e);
    req.flash('error', 'Registration error, try again!')
    res.redirect('/user/register');
  }
});

//Login

app.get('/user/login', (req,res) => {
  res.render('login.ejs');
})

app.get('/newpost', isLoggedIn, (req, res) => {
  res.render('newPost.ejs');
})

app.post('/user/login', passport.authenticate('local', { failureFlash: true, failureRedirect:'/user/login'}), (req, res) => {
  try {
    req.flash('success', 'Successfully logged in!');
    const redirectUrl = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
  } catch {
    req.flash('error', 'Login process error, try again!')
  }
})

// Logout

app.get('/logout', (req,res) => {
  req.logout();
  req.flash('success', 'Goodbye!');
  res.redirect('/')
})

// Reading posts

app.get('/posts', async (req, res)=> {
  const posts = await Post.find({}).populate('author');
 
  res.render('posts.ejs', { posts })
})

// Creating post

app.post('/posts', isLoggedIn, async (req, res, next) => {
 
  try {
    const newPost = new Post(req.body);
    newPost.author = req.user._id;
    await newPost.save();
    req.flash('success', 'Post succefully created');
    res.redirect('/posts');
  } catch (e) {
    req.flash('error', e);
  }
 
})
// Updating posts

app.get('/updatepost/:id', async (req, res)=> {
  try{
    const {id} = req.params
    console.log(req.params)
    const post = await Post.findById(id)
    res.render('updatePost.ejs', {post})

  }
  catch (e) {
    console.log(e)
  }
})

app.put('/updatepost/:id', isLoggedIn, isAuthor, async (req, res) => {
  try {
    const {id} = req.params
    await Post.findByIdAndUpdate(id, req.body)
    req.flash('success', 'Post successfully updated')
    res.redirect('/posts')
  }
  catch(e) {
    console.log(e)
  }
})

//Deleting posts

app.delete('/:id', isLoggedIn, isAuthor, async (req, res) => {
  try {
    const {id} = req.params
    await Post.findByIdAndDelete(id)
    req.flash('success', 'Post successfully deleted')
    res.redirect('/posts')
  }
  catch (e) {
    console.log(e)
  }
})


//Profile creation

app.get('/user/createprofile', (req,res) => {
  res.render('createProfile.ejs')
})

app.post('/user/profile', async (req, res) => {
  try {
    const newProfile = new Profile(req.body);
    newProfile.author = req.user._id;
    await newProfile.save();
    req.flash('success', 'Profile succefully created');
    
    res.redirect('/user/profile');
  } catch (e) {
    console.log(e)
  }
})

//Show Profile

app.get('/user/profile', async (req, res) => {
  // move the if else to app.post(user/profile)
  const profile = await Profile.findOne({}).populate('author')
  if (profile) {
    req.flash('error', 'Personal profile already created!')
    res.redirect('/posts')
  }else {
    res.render('showProfile.ejs', { profile })
  }
})


app.listen(process.env.PORT || 3000, () => console.log('Server Up and running'));
