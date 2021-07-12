const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const profileSchema = new Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
  },
  address: {
    type: String,
  },
  birthday: {
    type: String,
  },
  hobbies: {
    type: String,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  img: {
    type: String,
  },
  imageFileName: {
    type: String,
  },
});

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
