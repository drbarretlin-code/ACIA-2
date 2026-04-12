import { GoogleGenAI } from '@google/genai';

export async function translateText(
  text: string, 
  sourceLang: string, 
  targetLang: string, 
  apiKey: string
): Promise<string> {
  const cleanApiKey = apiKey.trim();
  if (!cleanApiKey) {
    throw new Error('API_KEY_MISSING');
  }
  try {
    const genAI = new GoogleGenAI({ apiKey: cleanApiKey });

    // 🕵️ HARD DISCOVERY: Try to find EVERY available model name
    try {
      console.log("[Debug] Attempting to list all models for this key...");
      const modelsList: any = await genAI.models.list();
      const modelNames = modelsList.models?.map((m: any) => m.name.replace('models/', '')) || [];
      console.log("[Debug] SUCCESS! Available Model IDs:", modelNames);
    } catch (discoveryErr: any) {
      console.warn("[Debug] Model discovery failed. Error:", discoveryErr?.message || discoveryErr);
    }

    const systemPrompt = `You are a professional translator. 
Translate the following text from ${sourceLang} to ${targetLang}. 
Maintain the original tone and context. 
If the text contains technical terms, use the industry standard translation.
Output ONLY the translated text, no explanations, no greetings.
${targetLang === 'Traditional Chinese' || targetLang === '繁體中文' ? 'IMPORTANT: ALWAYS use Traditional Chinese (繁體中文). NEVER use Simplified Chinese.' : ''}`;

    const combinedPrompt = `${systemPrompt}\n\nTEXT TO TRANSLATE:\n${text}`;

    // 🚀 FINAL Fallback List (Aggressively Specific)
    const modelsToTry = [
      "gemini-2.0-flash",           // Confirmed found in prev runs (but 429)
      "gemini-1.5-flash-002",       // New stable id
      "gemini-1.5-flash-001",       // Old stable id
      "gemini-2.0-flash-exp",       // Experimental id
      "gemini-1.5-flash-latest",    // Pointer
      "gemini-1.5-flash",           // Standard (previously 404'd)
      "gemini-1.5-pro-002",         // Pro version
      "gemini-2.5-flash",           // Reference from project files
      "gemini-3.1-flash-live-preview" // Matching App.tsx
    ];
    let lastError: any = null;
    let quotaExhaustedModel = null;

    for (const modelId of modelsToTry) {
      try {
        console.log(`[Translation] Attempting model: ${modelId}`);
        const result = await genAI.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }]
        });
        
        if (result.text) {
          console.log(`[Translation] ✅ Success with model: ${modelId}`);
          return result.text.trim();
        }
      } catch (error: any) {
        lastError = error;
        const msg = error.message || "";
        
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
          quotaExhaustedModel = modelId;
          console.warn(`[Translation] ⚠️ Model ${modelId} has NO QUOTA (429).`);
        } else {
          console.warn(`[Translation] ❌ Model ${modelId} rejected:`, msg);
        }
      }
    }

    // Special handling for user feedback
    if (quotaExhaustedModel) {
      throw new Error(`QUOTA_EXHAUSTED: 模型 ${quotaExhaustedModel} 本次配額已滿，請稍後再試。`);
    }
    
    // If we reached here, all models failed
    const errorMessage = lastError?.message || 'All models in fallback chain failed';
    throw new Error(`TRANSLATION_FAILED: ${errorMessage}`);
  } catch (error: any) {
    console.error('Final translation service error:', error);
    throw error;
  }
}

/**
 * Streaming version of translateText
 * Uses standard fetch to the Google API to enable chunked response handling
 */
export async function translateTextStream(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const cleanApiKey = apiKey.trim();
  const systemPrompt = `You are a professional translator. 
Translate the following text from ${sourceLang} to ${targetLang}. 
Maintain original tone. Output ONLY translated text.
${targetLang === 'Traditional Chinese' || targetLang === '繁體中文' ? 'IMPORTANT: ALWAYS use Traditional Chinese (繁體中文).' : ''}`;

  const payload = {
    contents: [{ parts: [{ text: `${systemPrompt}\n\nTEXT:\n${text}` }] }],
    generationConfig: { temperature: 0.1 }
  };

  // We'll try the most likely models first for streaming
  const models = ["gemini-2.0-flash", "gemini-1.5-flash-002", "gemini-1.5-flash"];
  let lastError: any = null;

  for (const modelId of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${cleanApiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Could not get stream reader");

      const decoder = new TextDecoder();
      let fullText = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (content) {
                fullText += content;
                onChunk(content);
              }
            } catch (e) {
              // ignore parse errors for partial lines
            }
          }
        }
      }
      
      return fullText;
    } catch (err: any) {
      lastError = err;
      console.warn(`Streaming failed for ${modelId}:`, err.message);
      if (err.message.includes("429")) continue; // Try next on quota
      break; // Exit on other fatal errors
    }
  }

  throw lastError || new Error("Streaming translation failed");
}
