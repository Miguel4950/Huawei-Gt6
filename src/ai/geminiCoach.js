const { GoogleGenAI } = require('@google/genai');
const path = require('path');
const config = require('../config/config');
const prompts = require('./prompts');

// Ensure credentials path is set
if (config.KEY_FILE_PATH) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = config.KEY_FILE_PATH;
}

class GeminiCoach {
  constructor() {
    this.primaryClient = new GoogleGenAI({
      vertexai: true,
      project: config.PROJECT_ID,
      location: 'global' // Global endpoint supports gemini-3.8-flash
    });

    this.fallbackClient = new GoogleGenAI({
      vertexai: true,
      project: config.PROJECT_ID,
      location: 'us-central1'
    });

    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalQueriesCount = 0;
  }

  async generateAnalysis(userPrompt, options = {}) {
    const model = options.model || 'gemini-3.8-flash';
    const thinkingLevel = options.thinkingLevel || 'MEDIUM';

    try {
      const response = await this.primaryClient.models.generateContent({
        model: model,
        contents: userPrompt,
        config: {
          systemInstruction: prompts.SYSTEM_INSTRUCTION,
          maxOutputTokens: 900,
          temperature: 0.4,
          thinkingConfig: {
            thinkingLevel: thinkingLevel
          }
        }
      });

      this.totalQueriesCount++;
      // Approximate token counting (~4 chars per token)
      const inTokens = Math.round((userPrompt.length + prompts.SYSTEM_INSTRUCTION.length) / 4);
      const outTokens = Math.round((response.text || '').length / 4);
      this.totalInputTokens += inTokens;
      this.totalOutputTokens += outTokens;

      return {
        text: response.text,
        modelUsed: model,
        tokensEstimate: { input: inTokens, output: outTokens, total: inTokens + outTokens }
      };
    } catch (err) {
      console.warn(`[GeminiCoach] Error con ${model} en global, intentando fallback a gemini-2.5-flash:`, err.message);
      // Fallback
      try {
        const fbResponse = await this.fallbackClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userPrompt,
          config: {
            systemInstruction: prompts.SYSTEM_INSTRUCTION,
            maxOutputTokens: 900,
            temperature: 0.4
          }
        });
        return {
          text: fbResponse.text,
          modelUsed: 'gemini-2.5-flash (fallback)',
          tokensEstimate: { input: 600, output: 400, total: 1000 }
        };
      } catch (fbErr) {
        console.error('[GeminiCoach] Error total en fallback:', fbErr.message);
        throw fbErr;
      }
    }
  }

  getCostSummary() {
    // Gemini 3.8 Flash rates: $0.15/1M input, $0.60/1M output
    const costIn = (this.totalInputTokens / 1000000) * 0.15;
    const costOut = (this.totalOutputTokens / 1000000) * 0.60;
    const totalCost = costIn + costOut;

    return {
      queriesCount: this.totalQueriesCount,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      totalCostUsd: parseFloat(totalCost.toFixed(6)),
      remainingBudgetUsd: parseFloat((5.0 - totalCost).toFixed(4))
    };
  }
}

module.exports = new GeminiCoach();
