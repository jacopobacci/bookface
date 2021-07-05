const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const postSchema = new Schema({
  content: {
    type: String
  },
  isLiked: {
      type: Boolean
  }
});


const Post = mongoose.model('Post', postSchema);

module.exports = Post;