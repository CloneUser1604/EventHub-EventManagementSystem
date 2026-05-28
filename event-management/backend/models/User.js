const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  fullName: { type: String, required: true },
  phone: String,
  role: {
    type: String,
    enum: ['Admin', 'Organizer', 'User', 'Speaker', 'Staff'],
    default: 'User'
  },
  isVerified: { type: Boolean, default: false },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: { type: Date, default: Date.now },

  organizerDocuments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  isOrganizerVerified: { type: Boolean, default: false },

});


module.exports = mongoose.model('User', userSchema);