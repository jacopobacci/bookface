const express = require('express');
const router = express.Router();
const { isLoggedIn, isAuthorPost, isAuthorReview } = require('../middleware');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const { cloudinary } = require('../cloudinary');
const Post = require('../models/post');
const Comment = require('../models/comment');

const today = new Date();
const dd = String(today.getDate()).padStart(2, '0');
const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
const yyyy = today.getFullYear();
const now = `${dd}/${mm}/${yyyy}`;

router.get('/', async (req, res) => {
  const posts = await Post.find({})
    .populate({
      path: 'comments',
      populate: {
        path: 'author',
      },
    })
    .populate('author')
    .exec();
  res.render('posts.ejs', { posts });
});

router.get('/createpost', isLoggedIn, (req, res) => {
  res.render('createPost.ejs');
});

router.post('/createpost', isLoggedIn, upload.single('img'), async (req, res) => {
  try {
    if (!req.file) {
      const newPost = new Post({ ...req.body, date: now });
      newPost.author = req.user._id;
      await newPost.save();
    } else {
      req.body.img = req.file.path;
      req.body.imageFileName = req.file.filename;
      const newPost = new Post({ ...req.body, date: now });
      newPost.author = req.user._id;
      await newPost.save();
    }
    req.flash('success', 'Post succefully created');
    res.redirect('/posts');
  } catch (err) {
    req.flash('error', err);
  }
});

router.get('/updatepost/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    res.render('updatePost.ejs', { post });
  } catch (err) {
    console.log(err);
  }
});

router.put('/updatepost/:id', isLoggedIn, isAuthorPost, upload.single('img'), async (req, res) => {
  try {
    if (!req.file) {
      const { id } = req.params;
      await Post.findByIdAndUpdate(id, req.body, {
        runValidators: true,
        new: true,
      });
    } else {
      const { id } = req.params;
      req.body.img = req.file.path;
      const post = await Post.findById(id);
      const cloudinaryImgName = post.imageFileName;
      if (req.body.imageFileName !== cloudinaryImgName) {
        await cloudinary.uploader.destroy(cloudinaryImgName);
      }
      req.body.imageFileName = req.file.filename;
      await Post.findByIdAndUpdate(id, req.body, {
        runValidators: true,
        new: true,
      });
    }
    req.flash('success', 'Post successfully updated');
    res.redirect('/posts');
  } catch (err) {
    console.log(err);
  }
});

router.delete('/deletepost/:id', isLoggedIn, isAuthorPost, async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (post.img) {
      const cloudinaryImgName = post.imageFileName;
      await cloudinary.uploader.destroy(cloudinaryImgName);
      await Post.findByIdAndDelete(id);
    } else {
      await Post.findByIdAndDelete(id);
    }
    req.flash('success', 'Post successfully deleted');
    res.redirect('/posts');
  } catch (err) {
    console.log(err);
  }
});

router.get('/search', async (req, res) => {
  try {
    const { search } = req.query;
    const searchedPosts = await Post.find({
      content: { $regex: search, $options: 'i' },
    })
      .populate('author')
      .exec();
    if (searchedPosts) {
      res.render('searchPosts.ejs', { searchedPosts });
    } else {
      req.flash('error', 'The post you are searching for does not exist');
      res.redirect('/posts');
    }
  } catch (err) {
    console.log(err);
  }
});

// COMMENTS

router.post('/:id/comments', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const post = await Post.findById(id);
  const comment = new Comment({ ...req.body, date: now });
  comment.author = req.user._id;
  post.comments.push(comment);
  await comment.save();
  await post.save();
  req.flash('success', 'Comment succesfully created');
  res.redirect('/posts');
});

router.delete('/:id/comments/:commentId', isLoggedIn, isAuthorReview, async (req, res) => {
  const { id, commentId } = req.params;
  await Post.findByIdAndUpdate(id, { $pull: { comments: commentId } });
  await Comment.findByIdAndDelete(commentId);
  req.flash('success', 'Comment succesfully deleted');
  res.redirect('/posts');
});

module.exports = router;
