const Post = require('./models/post');
const Profile = require('./models/profile');
const Comment = require('./models/comment');

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'You must be signed in first!');
    return res.redirect('/user/login');
  }
  next();
};

module.exports.isAuthorPost = async (req, res, next) => {
  const { id } = req.params;
  const post = await Post.findById(id);
  if (!post.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to do that!');
    return res.redirect(`/user/login`);
  }
  next();
};

module.exports.isAuthorProfile = async (req, res, next) => {
  const { id } = req.params;
  const profile = await Profile.findById(id);
  if (!profile.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to do that!');
    return res.redirect(`/user/login`);
  }
  next();
};

module.exports.isAuthorReview = async (req, res, next) => {
  const { commentId } = req.params;
  const comment = await Comment.findById(commentId);
  if (!comment.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to do that!');
    return res.redirect('/user/login');
  }
  next();
};
