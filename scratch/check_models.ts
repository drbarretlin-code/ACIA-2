import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

// Try to get key from env or pass as arg
const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("No API Key provided.");
  process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

async function listModels() {
  try {
    // In @google/genai, listing models might be different
    console.log("Checking models via @google/genai...");
    // The current SDK might not have a direct listModels at the root
    // Let's try to see what's in client.models
    console.log("Client models object keys:", Object.keys((client as any).models || {}));
    
    // Most @google/genai fans use this for live, 
    // but for standard models, let's try a small generateContent check on 1.5-flash
    try {
      console.log("Testing gemini-1.5-flash...");
      const res = await (client as any).models.generateContent({
        model: "gemini-1.5-flash",
        contents: "hi"
      });
      console.log("1.5-flash check: OK");
    } catch (e: any) {
      console.log("1.5-flash check: FAILED -", e.message || e);
    }
    
    try {
      console.log("Testing gemini-1.5-flash-latest...");
      const res = await (client as any).models.generateContent({
        model: "gemini-1.5-flash-latest",
        contents: "hi"
      });
      console.log("1.5-flash-latest check: OK");
    } catch (e: any) {
      console.log("1.5-flash-latest check: FAILED -", e.message || e);
    }

    try {
      console.log("Testing gemini-2.0-flash-exp...");
      const res = await (client as any).models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: "hi"
      });
      console.log("2.0-flash-exp check: OK");
    } catch (e: any) {
      console.log("2.0-flash-exp check: FAILED -", e.message || e);
    }

    try {
      console.log("Testing gemini-3.1-flash-live-preview...");
      const res = await (client as any).models.generateContent({
        model: "gemini-3.1-flash-live-preview",
        contents: "hi"
      });
      console.log("3.1-flash-live-preview check: OK");
    } catch (e: any) {
      console.log("3.1-flash-live-preview check: FAILED -", e.message || e);
    }

  } catch (err) {
    console.error("Fatal error listing models:", err);
  }
}

listModels();
