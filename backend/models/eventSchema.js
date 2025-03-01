const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    coverPhoto: {
      type: String, // URL to the cover photo
    },
    imageUrls: {
      type: [String], // Array of image URLs
      default: [],
    },
    videoUrls: {
      type: [String], // Array of video URLs
      default: [],
    },
    author: {
      username: {
        type: String,
        required: true,
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User', // Reference to the User model
      },
    },
    private: {
      type: Boolean,
      default: false, // By default, events are public
    },
    password: {
      type: String, // Password for private event (hashed)
      required: function () {
        return this.private; // Password is required only if the event is private
      },
    },
    followers: {
      type: [String], // Array of user IDs who follow this event
      default: [],
    },
  },
  { timestamps: true } // Automatically handles `createdAt` and `updatedAt`
);

// 🔐 Hash password before saving the event (only if private)
EventSchema.pre('save', async function (next) {
  if (this.private && this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10); // Hash password
  }
  next();
});

const Event = mongoose.model('Event', EventSchema);

module.exports = Event;
