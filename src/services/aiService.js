const fetch = require('node-fetch');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is missing in .env file');
}

/**
 * Send a prompt to Gemini API and get a response
 * @param {string} prompt - The prompt to send to Gemini
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Gemini response text
 */
async function askGemini(prompt, options = {}) {
  const { temperature = 0.7, maxTokens = 2048 } = options;
  
  console.log('Gemini Prompt:', prompt.substring(0, 200) + '...');
  console.log('Gemini API Key:', GEMINI_API_KEY ? 'Present' : 'Missing');
  console.log('Gemini Model:', GEMINI_MODEL);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      topP: 0.8,
      topK: 40
    }
  };

  try {
    console.log('Making request to Gemini API...');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    console.log('Gemini response status:', response.status);

    if (!response.ok) {
      const errorResponse = await response.text();
      console.error('Gemini API error response:', errorResponse);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}\n${errorResponse}`);
    }

    const data = await response.json();
    console.log('Gemini API response received');
    
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, Gemini could not generate a response.';
    console.log('Gemini result length:', result.length);
    
    return result;

  } catch (error) {
    console.error('Error communicating with Gemini API:', error.message);
    console.error('Error stack:', error.stack);
    return 'An error occurred while communicating with Gemini.';
  }
}

/**
 * Resume Analysis Service
 */
class ResumeAnalysisService {
  static async analyzeATS(resumeText) {
    const prompt = `You are an expert ATS (Applicant Tracking System) resume analyzer. Analyze the following resume for ATS compatibility and provide detailed feedback.

Resume Text:
${resumeText}

Please provide a comprehensive analysis in JSON format with the following structure:
{
  "summary": "Brief overview of the resume",
  "atsScore": 85,
  "missingKeywords": ["keyword1", "keyword2"],
  "formattingIssues": ["issue1", "issue2"],
  "strengths": ["strength1", "strength2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "keywordOptimization": {
    "suggestedKeywords": ["keyword1", "keyword2"],
    "keywordDensity": "analysis of keyword usage"
  }
}

Focus on:
- ATS-friendly formatting
- Keyword optimization
- Industry-specific terminology
- Quantifiable achievements
- Professional presentation`;

    const response = await askGemini(prompt, { temperature: 0.3 });
    return this.parseJSONResponse(response);
  }

  static async analyzeSkills(resumeText) {
    const prompt = `You are an expert skills and experience analyzer. Analyze the following resume for skills, experience, and career progression.

Resume Text:
${resumeText}

Please provide a comprehensive skills analysis in JSON format:
{
  "summary": "Overview of skills and experience",
  "technicalSkills": ["skill1", "skill2"],
  "softSkills": ["skill1", "skill2"],
  "experience": [
    {
      "role": "Job Title",
      "company": "Company Name",
      "duration": "Duration",
      "achievements": ["achievement1", "achievement2"]
    }
  ],
  "skillGaps": ["gap1", "gap2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "skillLevel": {
    "beginner": ["skill1"],
    "intermediate": ["skill2"],
    "advanced": ["skill3"]
  }
}`;

    const response = await askGemini(prompt, { temperature: 0.4 });
    return this.parseJSONResponse(response);
  }

  static async analyzeCareerPath(resumeText) {
    const prompt = `You are a career development expert. Analyze the following resume for career progression, potential paths, and growth opportunities.

Resume Text:
${resumeText}

Please provide career path analysis in JSON format:
{
  "summary": "Career overview and trajectory",
  "currentLevel": "Current career level",
  "potentialPaths": [
    {
      "path": "Career path name",
      "description": "Description of this path",
      "requirements": ["requirement1", "requirement2"],
      "timeline": "Estimated timeline",
      "salaryRange": "Expected salary range"
    }
  ],
  "skillDevelopment": [
    {
      "skill": "Skill name",
      "importance": "High/Medium/Low",
      "resources": ["resource1", "resource2"]
    }
  ],
  "industryTrends": ["trend1", "trend2"],
  "recommendations": ["recommendation1", "recommendation2"]
}`;

    const response = await askGemini(prompt, { temperature: 0.5 });
    return this.parseJSONResponse(response);
  }

  static async optimizeResume(resumeText, targetJob = '') {
    const prompt = `You are an expert resume writer and optimizer. Optimize the following resume for better impact and effectiveness.

Resume Text:
${resumeText}
${targetJob ? `Target Job: ${targetJob}` : ''}

Please provide optimization suggestions in JSON format:
{
  "summary": "Overall assessment",
  "optimizedContent": {
    "summary": "Improved professional summary",
    "experience": [
      {
        "original": "Original bullet point",
        "optimized": "Optimized bullet point",
        "explanation": "Why this change improves the resume"
      }
    ]
  },
  "actionVerbs": ["suggested", "action", "verbs"],
  "quantifiableAchievements": ["achievement1", "achievement2"],
  "keywordOptimization": {
    "added": ["keyword1", "keyword2"],
    "removed": ["keyword1", "keyword2"]
  },
  "formatting": ["formatting suggestion1", "formatting suggestion2"],
  "overallScore": 85
}`;

    const response = await askGemini(prompt, { temperature: 0.4 });
    return this.parseJSONResponse(response);
  }
}

/**
 * Interview Preparation Service
 */
class InterviewService {
  static async generateQuestions(resumeText, jobDescription = '') {
    const prompt = `You are an expert interview coach. Generate relevant interview questions based on the resume and job description.

Resume Text:
${resumeText}
${jobDescription ? `Job Description: ${jobDescription}` : ''}

Please provide interview questions in JSON format:
{
  "summary": "Interview preparation overview",
  "technicalQuestions": [
    {
      "question": "Question text",
      "category": "Technical/Behavioral/Problem-solving",
      "difficulty": "Easy/Medium/Hard",
      "tips": "Tips for answering"
    }
  ],
  "behavioralQuestions": [
    {
      "question": "Question text",
      "category": "Leadership/Teamwork/Problem-solving",
      "tips": "Tips for answering"
    }
  ],
  "questionsToAsk": [
    {
      "question": "Question to ask interviewer",
      "category": "Company/Team/Role",
      "purpose": "Why ask this question"
    }
  ],
  "preparationTips": ["tip1", "tip2"],
  "commonMistakes": ["mistake1", "mistake2"]
}`;

    const response = await askGemini(prompt, { temperature: 0.6 });
    return this.parseJSONResponse(response);
  }

  static async mockInterview(resumeText, question) {
    const prompt = `You are conducting a mock interview. The candidate has the following resume, and you need to provide feedback on their answer to this question.

Resume Text:
${resumeText}

Interview Question: ${question}

Please provide feedback in JSON format:
{
  "question": "The interview question",
  "analysis": "Analysis of the answer",
  "strengths": ["strength1", "strength2"],
  "areasForImprovement": ["area1", "area2"],
  "suggestedAnswer": "A well-structured answer example",
  "score": 85,
  "tips": ["tip1", "tip2"]
}`;

    const response = await askGemini(prompt, { temperature: 0.5 });
    return this.parseJSONResponse(response);
  }
}

/**
 * Job Matching Service
 */
class JobMatchingService {
  static async matchJobs(resumeText, jobListings = []) {
    const prompt = `You are an expert job matching AI. Analyze the resume and match it with the best job opportunities.

Resume Text:
${resumeText}

Job Listings:
${JSON.stringify(jobListings, null, 2)}

Please provide job matching analysis in JSON format:
{
  "summary": "Overall matching analysis",
  "matches": [
    {
      "jobId": "job_id",
      "jobTitle": "Job Title",
      "company": "Company Name",
      "matchScore": 85,
      "strengths": ["strength1", "strength2"],
      "gaps": ["gap1", "gap2"],
      "recommendations": ["recommendation1", "recommendation2"]
    }
  ],
  "topMatches": ["job_id1", "job_id2", "job_id3"],
  "skillAlignment": {
    "matchingSkills": ["skill1", "skill2"],
    "missingSkills": ["skill1", "skill2"]
  }
}`;

    const response = await askGemini(prompt, { temperature: 0.4 });
    return this.parseJSONResponse(response);
  }

  static async generateCoverLetter(resumeText, jobDescription) {
    const prompt = `You are an expert cover letter writer. Generate a compelling cover letter based on the resume and job description.

Resume Text:
${resumeText}

Job Description:
${jobDescription}

Please provide a cover letter in JSON format:
{
  "summary": "Cover letter overview",
  "coverLetter": {
    "opening": "Compelling opening paragraph",
    "body": "Main body paragraphs",
    "closing": "Professional closing paragraph"
  },
  "keyPoints": ["point1", "point2"],
  "tone": "Professional/Enthusiastic/Confident",
  "customization": ["customization1", "customization2"]
}`;

    const response = await askGemini(prompt, { temperature: 0.7 });
    return this.parseJSONResponse(response);
  }
}

/**
 * Career Coaching Service
 */
class CareerCoachingService {
  static async careerAdvice(resumeText, question) {
    const prompt = `You are an expert career coach. Provide personalized career advice based on the resume and the user's question.

Resume Text:
${resumeText}

User Question: ${question}

Please provide career advice in JSON format:
{
  "summary": "Brief response to the question",
  "detailedAdvice": "Comprehensive career advice",
  "actionItems": ["action1", "action2"],
  "resources": ["resource1", "resource2"],
  "timeline": "Suggested timeline",
  "nextSteps": ["step1", "step2"]
}`;

    const response = await askGemini(prompt, { temperature: 0.6 });
    return this.parseJSONResponse(response);
  }

  static async salaryNegotiation(resumeText, jobOffer) {
    const prompt = `You are an expert salary negotiation coach. Provide advice on salary negotiation based on the resume and job offer.

Resume Text:
${resumeText}

Job Offer: ${jobOffer}

Please provide salary negotiation advice in JSON format:
{
  "summary": "Negotiation strategy overview",
  "marketAnalysis": "Market rate analysis",
  "negotiationPoints": ["point1", "point2"],
  "counterOffer": "Suggested counter offer",
  "talkingPoints": ["point1", "point2"],
  "timing": "When to negotiate",
  "redFlags": ["red flag1", "red flag2"]
}`;

    const response = await askGemini(prompt, { temperature: 0.5 });
    return this.parseJSONResponse(response);
  }
}

/**
 * Utility function to parse JSON responses
 */
function parseJSONResponse(response) {
  try {
    // Try to find JSON in the response
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      return { error: 'No JSON found in response', rawResponse: response };
    }
    
    const jsonString = response.substring(jsonStart, jsonEnd + 1);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    return { error: 'Failed to parse JSON response', rawResponse: response };
  }
}

// Add parseJSONResponse to ResumeAnalysisService
ResumeAnalysisService.parseJSONResponse = parseJSONResponse;
InterviewService.parseJSONResponse = parseJSONResponse;
JobMatchingService.parseJSONResponse = parseJSONResponse;
CareerCoachingService.parseJSONResponse = parseJSONResponse;

module.exports = {
  askGemini,
  ResumeAnalysisService,
  InterviewService,
  JobMatchingService,
  CareerCoachingService
}; 