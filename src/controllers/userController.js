// --- All Reports AI Analysis ---
const pdfParse = require('pdf-parse');
const fs = require('fs');
const { extname } = require('path');
const User = require('../models/User');

exports.analyzeReport = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const { analysisType } = req.body;
  let resumeText = '';
  try {
    const ext = extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      resumeText = pdfData.text;
    } else if (ext === '.docx') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      resumeText = result.value;
    } else if (ext.startsWith('.jp') || ext === '.png' || ext === '.bmp') {
      resumeText = '[Image file uploaded. OCR not implemented.]';
    } else {
      resumeText = fs.readFileSync(filePath, 'utf-8');
    }
  } catch (err) {
    return res.status(500).json({ message: 'Failed to extract resume text', error: err.message });
  }

  // Compose prompt for Gemini based on analysisType
  let prompt = '';
  switch (analysisType) {
    case 'ats':
      prompt = `You are an ATS (Applicant Tracking System) resume analyzer. Analyze the following resume for ATS compatibility. Provide: a summary, missing keywords, formatting issues, and an ATS score (0-100).\nResume:\n${resumeText}\nRespond in JSON with keys: summary, missingKeywords (array), formattingIssues (array), atsScore (number).`;
      break;
    case 'gap':
      prompt = `You are a resume gap detection expert. Analyze the following resume for employment or education gaps. Provide: a summary, list of detected gaps (with dates), and suggestions to address them.\nResume:\n${resumeText}\nRespond in JSON with keys: summary, gaps (array), suggestions (array).`;
      break;
    case 'skill':
      prompt = `You are an AI for skill and experience matching. Analyze the following resume for skills and experience. Provide: a summary, extracted skills (array), experience highlights (array), and suggestions for improvement.\nResume:\n${resumeText}\nRespond in JSON with keys: summary, skills (array), experience (array), suggestions (array).`;
      break;
    case 'fit':
      prompt = `You are an AI job fit scoring engine. Analyze the following resume for job fit. Provide: a summary, job-fit score (0-100), and reasons for the score.\nResume:\n${resumeText}\nRespond in JSON with keys: summary, jobFitScore (number), reasons (array).`;
      break;
    case 'lang':
      prompt = `You are an AI language proficiency detector. Analyze the following resume for language proficiency. Provide: a summary, detected languages (array), proficiency levels (array), and suggestions for improvement.\nResume:\n${resumeText}\nRespond in JSON with keys: summary, languages (array), proficiency (array), suggestions (array).`;
      break;
    default:
      prompt = `Analyze the following resume and provide a summary.\nResume:\n${resumeText}`;
  }

  try {
    const fetch = require('node-fetch');
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=' + GEMINI_API_KEY;
    const body = {
      contents: [{ parts: [{ text: prompt }] }]
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ message: 'Gemini API error', error: errText });
    }
    const data = await response.json();
    const aiText = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    let aiReport;
    try {
      const jsonStart = aiText.indexOf('{');
      const jsonEnd = aiText.lastIndexOf('}');
      const jsonString = aiText.substring(jsonStart, jsonEnd + 1);
      aiReport = JSON.parse(jsonString);
    } catch (e) {
      return res.status(500).json({ message: 'Gemini AI did not return valid JSON', rawOutput: aiText });
    }
    res.json({ analysis: aiReport });
  } catch (err) {
    res.status(500).json({ message: 'Gemini analysis failed', error: err.message });
  }
};
const crypto = require('crypto');
// Forgot Password: send reset link
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  const user = await User.findOne({ email });
  if (!user) return res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 1000 * 60 * 30; // 30 min
  await user.save();
  // Send email (console fallback)
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  const mailOptions = {
    from: EMAIL_FROM || 'no-reply@quantumcv.com',
    to: user.email,
    subject: 'Quantum CV Password Reset',
    text: `Reset your password: ${resetUrl}`
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (e) {
    console.log('Reset email:', mailOptions.text);
  }
  res.json({ message: 'If that email is registered, a reset link has been sent.' });
};

// Reset Password: set new password
exports.resetPassword = async (req, res) => {
  const { email, token, password } = req.body;
  if (!email || !token || !password) return res.status(400).json({ message: 'Missing fields' });
  const user = await User.findOne({ email, resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
  if (!user) return res.status(400).json({ message: 'Invalid or expired reset link' });
  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  res.json({ message: 'Password reset successful. You can now log in.' });
};
// --- Job Application Workflow ---
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Email sender setup
const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM
} = process.env;

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: false,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

// User applies for a job (with CV upload)
exports.applyForJob = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const { jobId, jobTitle } = req.body;
    let finalJobTitle = jobTitle;
    let jobRef = null;
    if (jobId) {
      const job = await Job.findById(jobId);
      if (job) {
        finalJobTitle = job.title;
        jobRef = job._id;
      }
    }
    if (!finalJobTitle || !req.file) {
      return res.status(400).json({ message: 'Job title and CV file are required' });
    }
    const newApp = new JobApplication({
      user: req.user._id,
      userName: req.user.firstName + ' ' + req.user.lastName,
      jobId: jobRef,
      jobTitle: finalJobTitle,
      cvPath: req.file.path,
      status: 'pending',
    });
    await newApp.save();
    res.json({ message: 'Application submitted', application: newApp });
  } catch (err) {
    res.status(500).json({ message: 'Failed to apply for job', error: err.message });
  }
};

// Admin: List all job applications
exports.listJobApplications = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
    const apps = await JobApplication.find()
      .populate('user', 'firstName lastName email isVerified role createdAt')
      .populate('jobId', 'title company location'); // Populates jobId with job details
    res.json({ applications: apps });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch applications', error: err.message });
  }
};

// Admin: Approve or reject a job application
exports.updateJobApplicationStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
    const { id } = req.params;
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const app = await JobApplication.findByIdAndUpdate(id, { status }, { new: true });
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json({ message: `Application ${status}`, application: app });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update application', error: err.message });
  }
};

// User: List their own job applications
exports.listMyApplications = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const apps = await JobApplication.find({ user: req.user._id });
    res.json({ applications: apps });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch your applications', error: err.message });
  }
};

// Admin: Add a new job
exports.addJob = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
    const { title, company, location, description } = req.body;
    if (!title || !company || !location || !description) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const job = new Job({ title, company, location, description });
    await job.save();
    res.json({ message: 'Job created', job });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create job', error: err.message });
  }
};

// Public: List all jobs
exports.listJobs = async (req, res) => {
  try {
    const jobs = await Job.find().sort({ postedAt: -1 });
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch jobs', error: err.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, companyName, companyRegistration, companyWebsite } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'First name, last name, email, and password are required' });
    }
    
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Determine user role - restrict admin signup
    let userRole = 'user';
    if (role === 'company') {
      userRole = 'company';
    } else if (role === 'admin') {
      // Only allow admin creation through admin panel or special process
      return res.status(403).json({ message: 'Admin accounts can only be created by existing administrators' });
    } else {
      userRole = 'user';
    }
    
    // Create user object
    const userData = {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      isVerified: true,
      role: userRole
    };
    
    // If registering as company, add company details and set as unverified
    if (userRole === 'company') {
      userData.companyName = companyName;
      userData.companyRegistration = companyRegistration;
      userData.companyWebsite = companyWebsite;
      userData.companyVerified = false;
      userData.verificationStatus = 'pending';
    }
    
    const user = new User(userData);
    await user.save();

    let message = 'User registered successfully.';
    if (userRole === 'company') {
      message = 'Company account created successfully. Your account is pending verification. You will receive access to the enterprise dashboard once approved.';
    }

    res.json({
      message,
      user: { 
        firstName, 
        lastName, 
        email, 
        role: user.role,
        companyVerified: user.companyVerified || false,
        verificationStatus: user.verificationStatus || null
      },
      emailVerification: false
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

// Email verification endpoint removed: not needed, all users are verified by default

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // Do not reveal if user exists
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    // Generate JWT
    const token = jwt.sign(
      { email: user.email, role: user.role },
      process.env.JWT_SECRET || 'devsecret',
      { expiresIn: '2h' }
    );
    // If role is 'employee', return 'user' instead
    let userRole = user.role === 'employee' ? 'user' : user.role;
    res.json({
      message: 'Login successful',
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isVerified: user.isVerified,
        role: userRole,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        companyVerified: user.companyVerified || false,
        verificationStatus: user.verificationStatus || null,
        companyName: user.companyName || null
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

// Admin: Get all users
exports.getAllUsers = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
    const users = await User.find({}, 'firstName lastName email role isVerified companyVerified verificationStatus companyName createdAt');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
};

// Admin: Delete user
exports.deleteUser = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
};

// Save analyzed/uploaded resume to user profile
exports.saveResume = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { name, score, filePath, status } = req.body;
    if (!name || !filePath) return res.status(400).json({ message: 'Missing resume info' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.resumes.push({
      name,
      date: new Date(),
      score: score || null,
      status: status || 'Analyzed',
      filePath
    });
    await user.save();
    res.json({ message: 'Resume saved', resumes: user.resumes });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save resume', error: err.message });
  }
};

// Get all resumes for logged-in user
exports.getResumes = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ resumes: user.resumes || [] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch resumes', error: err.message });
  }
};

// Admin: Get all resumes from all users
exports.getAllResumes = async (req, res) => {
  try {
    // Only allow admin
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const users = await User.find({}, 'firstName lastName email resumes');
    // Flatten resumes with user info
    const allResumes = users.flatMap(user =>
      (user.resumes || []).map(resume => ({
        ...resume.toObject(),
        userName: `${user.firstName} ${user.lastName}`.trim(),
        userEmail: user.email
      }))
    );
    res.json({ resumes: allResumes });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch all resumes', error: err.message });
  }
};

// Admin: Get pending company verifications
exports.getPendingVerifications = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
    const pendingCompanies = await User.find({ 
      role: 'company', 
      verificationStatus: 'pending' 
    }, 'firstName lastName email companyName companyRegistration companyWebsite verificationDocument createdAt');
    res.json({ pendingCompanies });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending verifications', error: err.message });
  }
};

// Admin: Approve/Reject company verification
exports.updateCompanyVerification = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
    
    const { userId } = req.params;
    const { status, notes } = req.body; // status: 'approved' or 'rejected'
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }
    
    const user = await User.findById(userId);
    if (!user || user.role !== 'company') {
      return res.status(404).json({ message: 'Company user not found' });
    }
    
    user.verificationStatus = status;
    user.companyVerified = status === 'approved';
    user.verificationDate = new Date();
    user.verificationNotes = notes || '';
    
    await user.save();
    
    res.json({ 
      message: `Company verification ${status} successfully`,
      user: {
        id: user._id,
        email: user.email,
        companyName: user.companyName,
        verificationStatus: user.verificationStatus,
        companyVerified: user.companyVerified
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update verification', error: err.message });
  }
};
