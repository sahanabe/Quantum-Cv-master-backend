const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: true },
  // verificationToken removed, not needed
  role: { type: String, enum: ['admin', 'company', 'user'], default: 'user' },
  
  // Enhanced profile fields
  bio: { type: String, default: '' },
  skills: [String],
  location: { type: String, default: '' },
  website: { type: String, default: '' },
  phoneNumber: { type: String, default: '' },
  linkedinUrl: { type: String, default: '' },
  linkedinUrl: { type: String, default: '' },
  
  // Professional details
  currentTitle: { type: String, default: '' },
  experience: { type: String, default: '' },
  education: { type: String, default: '' },
  
  // Dashboard metrics
  profileViews: { type: Number, default: 0 },
  lastLoginDate: { type: Date, default: Date.now },
  
  // Enterprise verification fields
  companyVerified: { type: Boolean, default: false },
  companyName: { type: String },
  companyRegistration: { type: String },
  companyWebsite: { type: String },
  verificationDocument: { type: String }, // Path to uploaded verification document
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  verificationDate: { type: Date },
  verificationNotes: { type: String },
  
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  resumes: [
    {
      name: String,
      date: { type: Date, default: Date.now },
      score: Number,
      status: String,
      filePath: String
    }
  ]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
