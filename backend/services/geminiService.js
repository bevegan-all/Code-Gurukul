const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class GeminiService {
  constructor() {
    this.keys = [
      process.env.GEMINI_KEY_1,
      process.env.GEMINI_KEY_2,
      process.env.GEMINI_KEY_3,
      process.env.GEMINI_KEY_4
    ].filter(Boolean);
    this.currentIndex = 0;

    // Model fallback chain — will try each in order
    this.modelChain = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ];
  }

  getGenAIInstance() {
    return new GoogleGenerativeAI(this.keys[this.currentIndex]);
  }

  rotateKey() {
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    console.log(`[Gemini] Rotating API key. New index: ${this.currentIndex}`);
  }

  async generateText(prompt, modelVersion) {
    // If no specific model requested, try the model chain
    const modelsToTry = modelVersion ? [modelVersion] : [...this.modelChain];

    for (const model of modelsToTry) {
      let keyAttempts = 0;

      while (keyAttempts < this.keys.length) {
        try {
          const genAI = this.getGenAIInstance();
          const genModel = genAI.getGenerativeModel({ model });
          console.log(`[Gemini] Trying model: ${model} with key index: ${this.currentIndex}`);
          const result = await genModel.generateContent(prompt);
          return result.response.text();
        } catch (error) {
          const msg = error.message || '';

          if (error.status === 429 || msg.includes('Resource has been exhausted') || msg.includes('quota')) {
            console.warn(`[Gemini] Key ${this.currentIndex} rate-limited. Rotating...`);
            this.rotateKey();
            keyAttempts++;
          } else if ((error.status === 403 && msg.includes('leaked')) || (error.status === 400 && msg.includes('expired')) || msg.includes('API_KEY_INVALID')) {
            console.warn(`[Gemini] Key ${this.currentIndex} is invalid or expired. Rotating...`);
            this.rotateKey();
            keyAttempts++;
          } else if (error.status === 404 || msg.includes('not found') || msg.includes('not supported')) {
            console.warn(`[Gemini] Model "${model}" not available. Trying next model...`);
            break; // Try next model in chain
          } else {
            console.error(`[Gemini] Unexpected error:`, msg);
            throw error;
          }
        }
      }
    }

    throw new Error('All Gemini API keys and models exhausted. Please check your API keys at https://aistudio.google.com/apikey');
  }

  async gradeAssignment(teacherCode, studentCode) {
    const prompt = `
    You are an AI grading assistant for computer science lab assignments.
    Teacher's expected logic:
    \`\`\`
    ${teacherCode}
    \`\`\`
    
    Student's submitted code:
    \`\`\`
    ${studentCode}
    \`\`\`
    
    Evaluate the logic out of 10. Be lenient on syntax errors (like missing semicolons).
    Focus on whether the underlying algorithm is correct.
    Return only a single whole number integer between 0 and 10 (e.g. 8, 9, 10). Do not use decimals.
    Also provide a short 1 sentence reason.
    Format your response exactly like this JSON:
    { "marks": <whole_number_integer>, "reason": "<reason>" }`;

    const response = await this.generateText(prompt);
    try {
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        return JSON.parse(response.substring(jsonStart, jsonEnd + 1));
      }
      return JSON.parse(response);
    } catch (e) {
      console.error('[Gemini] Failed to parse grading response:', response);
      return { marks: 5, reason: "Error parsing AI grade." };
    }
  }

  async generateStudentReport(studentDetails, performanceData) {
    const prompt = `
    Generate a short 3-sentence summary paragraph about the student's performance.
    Student details: ${JSON.stringify(studentDetails)}
    Performance data: ${JSON.stringify(performanceData)}
    Provide a professional assessment focusing on strengths and areas of improvement based purely on the data.
    `;
    return this.generateText(prompt);
  }
}

module.exports = new GeminiService();
