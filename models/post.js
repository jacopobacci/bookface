const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema({
  content: {
    type: String
  },
  date: {
    type: String
  },
  img: {
    type: String,
  },
  imageFileName: {
    type: String,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
});


const Post = mongoose.model('Post', postSchema);

module.exports = Post;