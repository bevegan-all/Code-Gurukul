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
    You are a professional and fair AI grading assistant for a computer science lab.
    
    ### TEACHER'S EXPECTED LOGIC:
    \`\`\`
    ${teacherCode}
    \`\`\`
    
    ### STUDENT'S SUBMITTED CODE:
    \`\`\`
    ${studentCode}
    \`\`\`
    
    ### EVALUATION GUIDELINES:
    1. **Balanced Assessment**: Grade based on both logic and basic syntax.
    2. **Minor Error Leniency**: For very small mistakes (like a single missing semicolon or casing issue) that don't break the logic, still give full marks (10/10).
    3. **Mandatory Feedback**: If you give full marks despite minor syntax issues, you MUST mention those specific mistakes in your reason (e.g., "Perfect logic, but remember to add your semicolons").
    4. **Significant Gaps**: If there are logical errors or missing requirements, reduce marks accurately based on the severity.
    5. **Style Differences**: Do not penalize for different variable names or formatting styles as long as the solution is correct.
    
    ### RESPONSE FORMAT:
    You must return a JSON object with:
    - "marks": A single whole number integer (0-10). 
    - "reason": A short 1-2 sentence explanation. Always highlight even small syntax errors even if they don't affect the final score.
    
    Format:
    { "marks": <integer>, "reason": "<string>" }`;

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
