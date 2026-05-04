
// FIX: Import `Type` for defining response schema.
import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'undefined' || key.includes('failed to load')) return null;
  return key;
};

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function optimizeVendorDescription(name: string, category: string, rawText: string): Promise<string> {
  if (!ai) return rawText;
  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview",
      contents: `You are a value-focused marketing specialist for "Creative Events", Sweden's budget-friendly event marketplace. 
      Refine this vendor description for "${name}", a "${category}" vendor.
      Original description: "${rawText}"
      Keep it focused on affordability, reliability, and high value for money. Maximum 3 sentences. Use clear and welcoming language.`
    });
    return response.text || rawText;
  } catch (error) {
    console.error("AI Optimization failed:", error);
    return rawText;
  }
}

export async function generateServiceIdeas(category: string): Promise<string[]> {
  if (!ai) return [];
  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview",
      contents: `List 3 budget-friendly, high-value service names for a "${category}" vendor as a JSON array of strings. Focus on affordable, efficient, and essential offerings suitable for a cost-conscious marketplace.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || "[]");
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("AI Service generation failed:", error);
    return [];
  }
}

export async function analyzeVendorApplication(name: string, category: string, description: string): Promise<string> {
  if (!ai) return "Analysis unavailable (AI key not configured).";
  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview",
      contents: `Analyze this vendor application for a budget-friendly event marketplace.
      Merchant: ${name}
      Category: ${category}
      Description: ${description}
      Evaluate their "Value Proposition" and "Price Accessibility" for a budget-conscious audience. Provide a 2-sentence professional summary for an admin dashboard.`
    });
    return response.text || "Analysis unavailable.";
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "Failed to analyze application.";
  }
}

export async function getMarketInsights(): Promise<string> {
  if (!ai) return "The budget-friendly event market continues to favor transparency and value.";
  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview",
      contents: `As a budget marketplace strategist, provide one short insight for the Swedish affordable event market in 2024. Max 15 words.`
    });
    return response.text || "Cost-conscious planning is driving demand for DIY-friendly event services in 2024.";
  } catch (error) {
    console.error("Market insights failed:", error);
    return "The budget-friendly event market continues to favor transparency and value.";
  }
}
