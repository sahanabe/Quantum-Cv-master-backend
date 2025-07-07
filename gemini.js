// backend/gemini.js

require('dotenv').config();
const fetch = require('node-fetch');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

if (!API_KEY) {
  throw new Error('GEMINI_API_KEY is missing in .env file');
}

/**
 * Send a prompt to Gemini API and get a response
 * @param {string} prompt
 * @returns {Promise<string>} Gemini response text
 */
async function askGemini(prompt) {
  console.log('Gemini Prompt:\n', prompt);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  
  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorResponse = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}\n${errorResponse}`);
    }

    const data = await response.json();

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Sorry, Gemini could not generate a response.'
    );

  } catch (error) {
    console.error('Error communicating with Gemini API:', error.message);
    return 'An error occurred while communicating with Gemini.';
  }
}

module.exports = { askGemini };
