const express = require('express');
const router = express.Router();
const { isLoggedIn, isAuthorProfile } = require('../middleware');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const { cloudinary } = require('../cloudinary');
const Profile = require('../models/profile');
const User = require('../models/user');

router.get('/createprofile', (req, res) => {
  res.render('createProfile.ejs');
});

router.post('/createprofile', isLoggedIn, upload.single('img'), async (req, res) => {
  try {
    if (!req.file) {
      const user = await User.findOne({ hasProfile: false, _id: req.user._id });
      if (user) {
        const newProfile = new Profile(req.body);
        newProfile.author = req.user._id;
        await User.findByIdAndUpdate(req.user.id, { hasProfile: true });
        await newProfile.save();
        req.flash('success', 'Profile succefully created');
        res.redirect('/profiles');
      } else {
        req.flash('error', 'Personal profile already created!');
        res.redirect('/profiles');
      }
    } else {
      const user = await User.findOne({ hasProfile: false, _id: req.user._id });
      if (user) {
        req.body.img = req.file.path;
        req.body.imageFileName = req.file.filename;
        const newProfile = new Profile(req.body);
        newProfile.author = req.user._id;
        await User.findByIdAndUpdate(req.user.id, { hasProfile: true });
        await newProfile.save();
        req.flash('success', 'Profile succefully created');
        res.redirect('/profiles');
      } else {
        req.flash('error', 'Personal profile already created!');
        res.redirect('/profiles');
      }
    }
  } catch (err) {
    console.log(err);
  }
});

router.get('/', async (req, res) => {
  const profiles = await Profile.find({}).populate('author');
  res.render('showProfiles.ejs', { profiles });
});

router.get('/updateprofile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await Profile.findById(id);
    res.render('updateProfile.ejs', { profile });
  } catch (err) {
    console.log(err);
  }
});

router.put('/updateprofile/:id', isLoggedIn, isAuthorProfile, upload.single('img'), async (req, res) => {
  try {
    if (!req.file) {
      const { id } = req.params;
      await Profile.findByIdAndUpdate(id, req.body, { runValidators: true, new: true });
    } else {
      const { id } = req.params;
      req.body.img = req.file.path;
      const profile = await Profile.findById(id);
      const cloudinaryImgName = profile.imageFileName;
      if (req.body.imageFileName !== cloudinaryImgName) {
        await cloudinary.uploader.destroy(cloudinaryImgName);
      }
      req.body.imageFileName = req.file.filename;
      await Profile.findByIdAndUpdate(id, req.body, { runValidators: true, new: true });
    }
    req.flash('success', 'Profile successfully updated');
    res.redirect('/profiles');
  } catch (err) {
    console.log(err);
  }
});

router.delete('/deleteprofile/:id', isLoggedIn, isAuthorProfile, async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await Profile.findById(id);
    if (profile.img) {
      await User.findByIdAndUpdate(req.user._id, { hasProfile: false });
      const cloudinaryImgName = profile.imageFileName;
      await cloudinary.uploader.destroy(cloudinaryImgName);
      await Profile.findByIdAndDelete(id);
    } else {
      await User.findByIdAndUpdate(req.user._id, { hasProfile: false });
      await Profile.findByIdAndDelete(id);
    }
    req.flash('success', 'Profile successfully deleted');
    res.redirect('/profiles');
  } catch (err) {
    console.log(err);
  }
});

router.get('/search', async (req, res) => {
  try {
    const { search } = req.query;
    const searchedProfiles = await Profile.find({ firstName: { $regex: search, $options: 'i' } })
      .populate('author')
      .exec();
    if (searchedProfiles.length) {
      res.render('searchProfiles.ejs', { searchedProfiles });
    } else {
      req.flash('error', 'The profile you are searching for does not exist');
      res.redirect('/profiles');
    }
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
