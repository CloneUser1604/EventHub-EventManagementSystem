const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  banner: String,
  description: String,
  typeEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'TypeEvent' },
  
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
  startDateTime: { type: Date, required: true },
  endDateTime: { type: Date, required: true },

  status: {
    type: String,
    enum: ['Draft', 'Pending', 'Approved', 'Rejected'],
    default: 'Draft'
  },

  ticketTypes: [{
    name: String,
    price: Number,
    quota: Number,
    description: String
  }],

  verificationDocuments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: Date
  }],

  rejectionReason: String,
  isPublic: { type: Boolean, default: false },

  tags: [String],
  agenda: String,
  livestreamUrl: String,
  maxCapacity: Number,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

eventSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Event', eventSchema);