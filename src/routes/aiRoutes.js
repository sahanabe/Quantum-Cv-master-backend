const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { extname } = require('path');
const authMiddleware = require('../middleware/auth');

const {
  ResumeAnalysisService,
  InterviewService,
  JobMatchingService,
  CareerCoachingService,
  askGemini
} = require('../services/aiService');

const router = express.Router();

// Test endpoint to verify AI service is working
router.get('/test', async (req, res) => {
  try {
    console.log('AI test endpoint called');
    res.json({ 
      success: true, 
      message: 'AI service is working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI test error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'AI test failed',
      error: error.message 
    });
  }
});

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: uploadsDir });

/**
 * Extract text from uploaded file
 */
async function extractTextFromFile(file) {
  const ext = extname(file.originalname).toLowerCase();
  const filePath = file.path;

  try {
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text;
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (ext.startsWith('.jp') || ext === '.png' || ext === '.bmp') {
      return '[Image file uploaded. OCR not implemented.]';
    } else {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (error) {
    throw new Error(`Failed to extract text: ${error.message}`);
  }
}

// ===== RESUME ANALYSIS ROUTES =====

/**
 * ATS Resume Analysis
 */
router.post('/analyze-ats', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No resume file uploaded' });
    }

    const resumeText = await extractTextFromFile(req.file);
    const analysis = await ResumeAnalysisService.analyzeATS(resumeText);

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('ATS Analysis Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to analyze resume for ATS compatibility',
      error: error.message 
    });
  }
});

/**
 * Skills Analysis
 */
router.post('/analyze-skills', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No resume file uploaded' });
    }

    const resumeText = await extractTextFromFile(req.file);
    const analysis = await ResumeAnalysisService.analyzeSkills(resumeText);

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Skills Analysis Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to analyze skills',
      error: error.message 
    });
  }
});

/**
 * Career Path Analysis
 */
router.post('/analyze-career-path', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No resume file uploaded' });
    }

    const resumeText = await extractTextFromFile(req.file);
    const analysis = await ResumeAnalysisService.analyzeCareerPath(resumeText);

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Career Path Analysis Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to analyze career path',
      error: error.message 
    });
  }
});

/**
 * Resume Optimization
 */
router.post('/optimize-resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No resume file uploaded' });
    }

    const { targetJob } = req.body;
    const resumeText = await extractTextFromFile(req.file);
    const optimization = await ResumeAnalysisService.optimizeResume(resumeText, targetJob);

    res.json({ success: true, optimization });
  } catch (error) {
    console.error('Resume Optimization Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to optimize resume',
      error: error.message 
    });
  }
});

// ===== INTERVIEW PREPARATION ROUTES =====

/**
 * Generate Interview Questions
 */
router.post('/generate-questions', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No resume file uploaded' });
    }

    const { jobDescription } = req.body;
    const resumeText = await extractTextFromFile(req.file);
    const questions = await InterviewService.generateQuestions(resumeText, jobDescription);

    res.json({ success: true, questions });
  } catch (error) {
    console.error('Interview Questions Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate interview questions',
      error: error.message 
    });
  }
});

/**
 * Mock Interview Feedback
 */
router.post('/mock-interview', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No resume file uploaded' });
    }

    const { question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ message: 'Question and answer are required' });
    }

    const resumeText = await extractTextFromFile(req.file);
    const feedback = await InterviewService.mockInterview(resumeText, question);

    res.json({ success: true, feedback });
  } catch (error) {
    console.error('Mock Interview Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to provide interview feedback',
      error: error.message 
    });
  }
});

// ===== JOB MATCHING ROUTES =====

/**
 * Job Matching Analysis
 */
router.post('/match-jobs', upload.single('resume'), async (req, res) => {
  try {
    console.log('Job matching request received');
    console.log('File:', req.file);
    console.log('Body:', req.body);
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ message: 'No resume file uploaded' });
    }

    const { jobListings } = req.body;
    console.log('Job listings received:', jobListings);
    
    if (!jobListings) {
      console.log('No job listings provided');
      return res.status(400).json({ message: 'Job listings are required' });
    }

    // Parse jobListings if it's a JSON string
    let parsedJobListings;
    try {
      parsedJobListings = typeof jobListings === 'string' ? JSON.parse(jobListings) : jobListings;
      console.log('Parsed job listings:', parsedJobListings);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return res.status(400).json({ message: 'Invalid job listings format' });
    }

    if (!Array.isArray(parsedJobListings)) {
      console.log('Job listings is not an array:', typeof parsedJobListings);
      return res.status(400).json({ message: 'Job listings must be an array' });
    }

    console.log('Extracting text from file...');
    const resumeText = await extractTextFromFile(req.file);
    console.log('Resume text extracted, length:', resumeText.length);
    
    console.log('Calling JobMatchingService...');
    const matches = await JobMatchingService.matchJobs(resumeText, parsedJobListings);
    console.log('Job matching completed:', matches);

    res.json({ success: true, matches });
  } catch (error) {
    console.error('Job Matching Error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to match jobs',
      error: error.message 
    });
  }
});

/**
 * Generate Cover Letter
 */
router.post('/generate-cover-letter', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No resume file uploaded' });
    }

    const { jobDescription } = req.body;
    if (!jobDescription) {
      return res.status(400).json({ message: 'Job description is required' });
    }

    const resumeText = await extractTextFromFile(req.file);
    const coverLetter = await JobMatchingService.generateCoverLetter(resumeText, jobDescription);

    res.json({ success: true, coverLetter });
  } catch (error) {
    console.error('Cover Letter Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate cover letter',
      error: error.message 
    });
  }
});

// ===== CAREER COACHING ROUTES =====

/**
 * Career Advice
 */
router.post('/career-advice', upload.single('resume'), async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ message: 'Question is required' });
    }

    let resumeText = '';
    if (req.file) {
      resumeText = await extractTextFromFile(req.file);
    }

    const advice = await CareerCoachingService.careerAdvice(resumeText, question);

    res.json({ success: true, advice });
  } catch (error) {
    console.error('Career Advice Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to provide career advice',
      error: error.message 
    });
  }
});

/**
 * Salary Negotiation Advice
 */
router.post('/salary-negotiation', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No resume file uploaded' });
    }

    const { jobOffer } = req.body;
    if (!jobOffer) {
      return res.status(400).json({ message: 'Job offer details are required' });
    }

    const resumeText = await extractTextFromFile(req.file);
    const advice = await CareerCoachingService.salaryNegotiation(resumeText, jobOffer);

    res.json({ success: true, advice });
  } catch (error) {
    console.error('Salary Negotiation Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to provide salary negotiation advice',
      error: error.message 
    });
  }
});

// ===== GENERAL AI ROUTES =====

/**
 * Custom AI Chat
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    let prompt = message;
    if (context) {
      prompt = `Context: ${context}\n\nUser Question: ${message}`;
    }

    const response = await askGemini(prompt, { temperature: 0.7 });

    res.json({ success: true, response });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get AI response',
      error: error.message 
    });
  }
});

/**
 * AI Text Analysis (no file upload)
 */
router.post('/analyze-text', async (req, res) => {
  try {
    const { text, analysisType } = req.body;
    if (!text || !analysisType) {
      return res.status(400).json({ message: 'Text and analysis type are required' });
    }

    let prompt = '';
    switch (analysisType) {
      case 'grammar':
        prompt = `Analyze the following text for grammar, spelling, and writing quality. Provide corrections and suggestions for improvement.\n\nText: ${text}`;
        break;
      case 'tone':
        prompt = `Analyze the tone and style of the following text. Provide insights on professionalism, clarity, and effectiveness.\n\nText: ${text}`;
        break;
      case 'keywords':
        prompt = `Extract and analyze keywords from the following text. Identify important terms, skills, and concepts.\n\nText: ${text}`;
        break;
      default:
        return res.status(400).json({ message: 'Invalid analysis type' });
    }

    const analysis = await askGemini(prompt, { temperature: 0.3 });

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Text Analysis Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to analyze text',
      error: error.message 
    });
  }
});

/**
 * AI Health Check
 */
router.get('/health', async (req, res) => {
  try {
    const testResponse = await askGemini('Hello, this is a test message.', { temperature: 0.1 });
    
    res.json({ 
      success: true, 
      status: 'AI service is operational',
      testResponse: testResponse.substring(0, 100) + '...'
    });
  } catch (error) {
    console.error('AI Health Check Error:', error);
    res.status(500).json({ 
      success: false, 
      status: 'AI service is not operational',
      error: error.message 
    });
  }
});

module.exports = router; 