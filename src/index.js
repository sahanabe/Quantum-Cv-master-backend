
require('dotenv').config();
const { existsSync, mkdirSync, readFileSync } = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { join, extname } = require('path');
const fetch = require('node-fetch');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const { connect, Schema, model } = require('mongoose');
const { spawn } = require('child_process');
const FormData = require('form-data');
// Models & Middleware
const authMiddleware = require('./middleware/auth');
const User = require('./models/User');

// --- Constants and Config ---
// DeepSeek removed. Use Gemini only.
const AIMLAPI_KEY = process.env.AIMLAPI_KEY;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quantumcv';
const HUGGINGFACE_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN;
const HF_MODEL = 'microsoft/DialoGPT-medium';
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// --- MongoDB Setup ---
connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- Resume Schema ---
const ResumeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: false, default: null },
  filename: { type: String, required: true },
  originalname: { type: String, required: true },
  path: { type: String, required: true },
  analysis: { type: Object, default: null }, // Stores AI analysis result
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Resume = model('Resume', ResumeSchema);

// --- App Init ---

const app = express();
const uploadsDir = join(__dirname, '../../uploads');
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
const upload = multer({ dest: uploadsDir });

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow any localhost port for dev
    if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// --- Routes ---
app.get('/api/health', (req, res) => res.json({ status: 'Backend is running' }));
app.use('/api', require('./routes/userRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

app.get('/api/role-templates', (req, res) => {
  const filePath = join(__dirname, '../role_templates.json');
  try {
    const data = readFileSync(filePath, 'utf-8');
    res.json({ templates: JSON.parse(data) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load role templates', error: err.message });
  }
});

app.post('/api/advanced-python-analyze', express.json(), async (req, res) => {
  const { fileName } = req.body;
  const filePath = join(__dirname, '../../uploads', fileName);
  if (!existsSync(filePath)) return res.status(404).json({ message: 'File not found' });
  const pyProcess = spawn('python', [join(__dirname, '../auto_chatbot.py'), filePath]);
  let output = '', errorOutput = '';
  pyProcess.stdout.on('data', (data) => output += data.toString());
  pyProcess.stderr.on('data', (data) => errorOutput += data.toString());
  pyProcess.on('close', (code) => {
    if (code !== 0) return res.status(500).json({ message: 'Python analysis failed', error: errorOutput || output });
    res.json({ analysis: output.trim() });
  });
});

// Remove authMiddleware for public access
app.post('/api/upload', upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const resume = new Resume({ filename: req.file.filename, originalname: req.file.originalname, path: req.file.path });
    await resume.save();
    res.json({ resume });
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload resume', error: err.message });
  }
});




// Updated: Route to userController.analyzeReport for multi-analysis support
const userController = require('./controllers/userController');
app.post('/api/analyze-cv-gemini', upload.single('cv'), userController.analyzeReport);

app.get('/api/user/resumes', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    // Fetch resumes from Resume collection for this user
    const resumes = await Resume.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ resumes });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch resumes', error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') return res.status(400).json({ message: 'Message is required.' });

  // Custom simple logic for common greetings and FAQ
  const lowerMsg = message.trim().toLowerCase();
  if (["hi", "hello", "hey", "good morning", "good afternoon", "good evening"].includes(lowerMsg)) {
    return res.json({ response: "👋 Hi there! Welcome to Quantum CV. We're excited to help you optimize your resume and boost your career. Ask me anything!" });
  }
  if (lowerMsg.includes("what is this site") || lowerMsg.includes("what is quantum cv") || lowerMsg.includes("about this site")) {
    return res.json({ response: "Quantum CV is an AI-powered resume analyzer and optimizer. Upload your resume, choose an analysis, and get instant feedback to improve your chances of landing your dream job!" });
  }
  if (lowerMsg.includes("how to work") || lowerMsg.includes("how does this work") || lowerMsg.includes("how to use") || lowerMsg.includes("how do i use")) {
    return res.json({ response: "Just upload your resume, select the type of analysis you want, and our AI will give you easy-to-understand feedback and suggestions. It's that simple!" });
  }

  // Website context for Gemini (NO meta instructions, just the user message)
  // Fix: Do not wrap the message in any template, just send the plain user message to Gemini
  const websiteContext = message;
  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=' + GEMINI_API_KEY;
    const body = {
      contents: [{ parts: [{ text: websiteContext }] }]
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    const aiText = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    res.json({ response: aiText });
  } catch (err) {
    console.error('Gemini chat error:', err);
    res.status(500).json({ message: 'Gemini chat error', error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
