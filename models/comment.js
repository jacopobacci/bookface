const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
  commentText: {
    type: String,
    required: true,
  },
  date: {
    type: String,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
