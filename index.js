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
const { isLoggedIn, isAuthorPost, isAuthorProfile } = require('./middleware');
const multer = require('multer');
const { storage } = require('./cloudinary');
const { cloudinary } = require('./cloudinary');
const upload = multer({ storage });

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

app.use(async (req, res, next) => {
  const user = await User.find({hasProfile: false})
  res.locals.currentUser = req.user;
  res.locals.hasProfile = user.length;
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
    const { username, email, password } = req.body;
    const user = new User ({ username, email });
    const registeredUser = await User.register(user, password);
    req.login(registeredUser, e => {
      if (err) {
        console.log(err)
      } else {
        req.flash('success', 'Successfully registered!');
        res.redirect('/user/createprofile');
      }
    })
  } catch (err) {
    console.log(err);
    req.flash('error', 'Username already exists!')
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

const today = new Date();
const dd = String(today.getDate()).padStart(2, '0');
const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
const yyyy = today.getFullYear();
const now = `${dd}/${mm}/${yyyy}`;

app.post('/posts', isLoggedIn, upload.single('img'), async (req, res) => {
  try {
    if (!req.file) {
      const newPost = new Post({...req.body, date: now});
      newPost.author = req.user._id;
      await newPost.save();
    } else {
    req.body.img = req.file.path;
    req.body.imageFileName = req.file.filename;
    const newPost = new Post({...req.body, date: now});
    newPost.author = req.user._id;
    await newPost.save();
    }
    req.flash('success', 'Post succefully created');
    res.redirect('/posts');
  } catch (err) {
    req.flash('error', err);
  }
})

// Updating posts

app.get('/updatepost/:id', async (req, res)=> {
  try{
    const {id} = req.params
    const post = await Post.findById(id)
    res.render('updatePost.ejs', {post})
  }
  catch (err) {
    console.log(err)
  }
})

app.put('/updatepost/:id', isLoggedIn, isAuthorPost, upload.single('img'), async (req, res) => {
  try {
    if(!req.file) {
      const { id } = req.params
      await Post.findByIdAndUpdate(id, req.body, { runValidators: true, new: true })
    } else {
      const { id } = req.params;
      req.body.img = req.file.path;
      const post = await Post.findById(id);
      const cloudinaryImgName = post.imageFileName;
      if(req.body.imageFileName !== cloudinaryImgName){
        await cloudinary.uploader.destroy(cloudinaryImgName);
      }
      req.body.imageFileName = req.file.filename;
      await Post.findByIdAndUpdate(id, req.body, { runValidators: true, new: true })
    }
    req.flash('success', 'Post successfully updated')
    res.redirect('/posts')
  }
  catch(e) {
    console.log(err)
  }
})

//Deleting posts

app.delete('/:id', isLoggedIn, isAuthorPost, async (req, res) => {
  try {
    const {id} = req.params
    const post = await Post.findById(id);
    if(post.img){
      const cloudinaryImgName = post.imageFileName;
      await cloudinary.uploader.destroy(cloudinaryImgName);
      await Post.findByIdAndDelete(id)
    }else{
      await Post.findByIdAndDelete(id)
    }
    req.flash('success', 'Post successfully deleted')
    res.redirect('/posts')
  }
  catch (err) {
    console.log(err)
  }
})


//Profile creation

app.get('/user/createprofile', (req,res) => {
  res.render('createProfile.ejs')
})

app.post('/profiles', isLoggedIn, async (req, res) => {
  try {
    const user = await User.find({hasProfile: false})
    if(user.length){
      const newProfile = new Profile(req.body);
      newProfile.author = req.user._id;
      await User.findByIdAndUpdate(req.user.id, { hasProfile: true })
      await newProfile.save();
      req.flash('success', 'Profile succefully created');
      res.redirect('/profiles');
    } else {
      req.flash('error', 'Personal profile already created!')
      res.redirect('/profiles');
    }
  } catch (err) {
    console.log(err)
  }
})

//Show Profile

app.get('/profiles', async (req, res) => {
  const profiles = await Profile.find({}).populate('author');
  res.render('showProfiles.ejs', { profiles });
})

// update profile

app.get('/updateprofile/:id', async (req, res)=> {
  try{
    const {id} = req.params;
    const profile = await Profile.findById(id);
    res.render('updateProfile.ejs', { profile });
  }
  catch (err) {
    console.log(err)
  }
})

app.put('/updateprofile/:id', isLoggedIn, isAuthorProfile, upload.single('img'), async (req, res) => {
  try {
    const { id } = req.params
    await Profile.findByIdAndUpdate(id, req.body, { runValidators: true, new: true })
    req.flash('success', 'Profile successfully updated')
    res.redirect('/profiles')
  }
  catch(e) {
    console.log(err)
  }
})

// delete profile

app.delete('/deleteprofile/:id', isLoggedIn, isAuthorProfile, async (req, res) => {
  try {
    const { id } = req.params
    await User.findByIdAndUpdate(req.user._id, { hasProfile: false })
    await Profile.findByIdAndDelete(id)
    req.flash('success', 'Profile successfully deleted')
    res.redirect('/profiles')
  }
  catch (err) {
    console.log(err)
  }
})

// get user

app.get('/user', (req,res)=>{
  res.render('user.ejs')
})

// delete user

app.post('/user/:id', isLoggedIn, async (req, res)=>{
 try {
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  res.redirect('/user/register');
 } catch (err) {
   console.log(err)
 }
})

app.get('/posts/search', async (req, res) => {
  try {
    const {search} = req.query;
    const searchedPosts = await Post.find({ content: { $regex: search, $options: 'i' }}).exec()
    if (searchedPosts) {
      res.render('searchPosts.ejs', {searchedPosts})
    }
    else {
      req.flash('error', 'The post you are searching for does not exist')
      res.redirect('/posts')
    }
  }
  catch (err) {
    console.log(err)
  }
})

app.get('/profiles/search', async (req, res) => {
  try {
    const { search } = req.query;
    const searchedProfiles = await User.find({ username: { $regex: search, $options: 'i' }}).exec()
    if (searchedProfiles) {
      res.render('searchProfiles.ejs', {searchedProfiles})
    }
    else {
      req.flash('error', 'The profile you are searching for does not exist')
      res.redirect('/posts')
    }
  }
  catch (err) {
    console.log(err)
  }
})

//update user

app.get('/updateuser/:id', async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(id)
    console.log(user);
    res.render('updateUser.ejs', {user})
  }
  catch (err) {
    console.log(err)
  }
});

app.put('/updateuser/:id',  async (req, res) => {
  try {
    const { id } = req.params;
    console.log(req.body)
    await User.findByIdAndUpdate(id, req.body, { runValidators: true, new: true })
    res.redirect('/user');
  } catch (err) {
    req.flash('error', 'Update user error, try again!')
    res.redirect('/user/login');
    console.log(err);
    }
});

app.listen(process.env.PORT || 3000, () => console.log('Server Up and running'));
