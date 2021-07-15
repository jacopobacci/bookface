const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware');
const passport = require('passport');
const User = require('../models/user');
const Profile = require('../models/profile');
const Post = require('../models/post');
const Comment = require('../models/comment');

router.get('/register', (req, res) => {
  res.render('register.ejs');
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = new User({ username, email });
    const registeredUser = await User.register(user, password);
    req.login(registeredUser, (err) => {
      if (err) {
        console.log(err);
      } else {
        req.flash('success', 'Successfully registered!');
        res.redirect('/profiles/createprofile');
      }
    });
  } catch (err) {
    console.log(err);
    req.flash('error', 'Username already exists!');
    res.redirect('/user/register');
  }
});

router.get('/login', (req, res) => {
  res.render('login.ejs');
});

router.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/user/login' }), (req, res) => {
  try {
    req.flash('success', 'Successfully logged in!');
    const redirectUrl = req.session.returnTo || '/posts';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
  } catch {
    req.flash('error', 'Login process error, try again!');
  }
});

router.get('/logout', (req, res) => {
  req.logout();
  req.flash('success', 'Goodbye!');
  res.redirect('/posts');
});

router.get('/', (req, res) => {
  res.render('user.ejs');
});

router.post('/deleteuser/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await Profile.find({ author: id });
    const posts = await Post.find({ author: id });
    if (!profile) {
      if (profile[0].img) {
        const cloudinaryImgName = profile[0].imageFileName;
        await cloudinary.uploader.destroy(cloudinaryImgName);
      }
    }
    for (let post of posts) {
      if (post.img) {
        const cloudinaryImgName = post.imageFileName;
        await cloudinary.uploader.destroy(cloudinaryImgName);
      }
    }
    if (profile) await Profile.deleteMany({ author: id });
    if (posts) await Post.deleteMany({ author: id });
    if (posts) await Comment.deleteMany({ author: id });
    await User.findByIdAndDelete(id);
    res.redirect('/user/register');
  } catch (err) {
    console.log(err);
  }
});

router.get('/updateuser/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    res.render('updateUser.ejs', { user });
  } catch (err) {
    console.log(err);
  }
});

router.put('/updateuser/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndUpdate(id, req.body, { runValidators: true, new: true });
    res.redirect('/user');
  } catch (err) {
    req.flash('error', 'Update user error, try again!');
    res.redirect('/user/login');
    console.log(err);
  }
});

module.exports = router;
