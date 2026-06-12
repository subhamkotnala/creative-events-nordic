import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { title } = req.body;
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: "Title is required for optimization." });
  }

  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "Gemini API Key is not configured in the environment." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Request Title: ${title}`,
      config: {
        systemInstruction:
          "You are an assistant for an Event Vendor Marketplace where clients post requests for event services (such as photography, venues, catering, planners). You will receive a request title from the user. Your job is to expand and optimize this request by writing a natural, clear, detailed, and highly engaging request description (approx 2 to 4 sentences). Describe the event needs beautifully to help vendors understand what the client is looking for and write custom offers. Respond with ONLY the optimized description. Do not include any greeting, meta comments, introductory text, markdown bold titles, or conversational words. Speak directly as the client seeking help.",
      },
    });

    return res.json({ description: response.text?.trim() || "" });
  } catch (err: any) {
    console.error("[Vercel API] Gemini description optimization failed:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to optimize description with AI." });
  }
}
