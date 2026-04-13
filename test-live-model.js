const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: "dummy_key", apiVersion: "v1alpha" });
console.log(ai.live.constructor);
