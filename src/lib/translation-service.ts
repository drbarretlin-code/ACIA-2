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

    // 🕵️ Discovery Step: Attempt to list models to help identify the correct ID
    try {
      const modelsList: any = await genAI.models.list();
      console.log("[Debug] Available Model IDs for this API Key:", modelsList.models?.map((m: any) => m.name));
    } catch (discoveryErr) {
      console.warn("[Debug] Model discovery failed (this is expected for some keys):", discoveryErr);
    }

    const systemPrompt = `You are a professional translator. 
Translate the following text from ${sourceLang} to ${targetLang}. 
Maintain the original tone and context. 
If the text contains technical terms, use the industry standard translation.
Output ONLY the translated text, no explanations, no greetings.
${targetLang === 'Traditional Chinese' || targetLang === '繁體中文' ? 'IMPORTANT: ALWAYS use Traditional Chinese (繁體中文). NEVER use Simplified Chinese.' : ''}`;

    const combinedPrompt = `${systemPrompt}\n\nTEXT TO TRANSLATE:\n${text}`;

    // 🚀 Comprehensive fallback chain to find a valid & non-exhausted model
    const modelsToTry = [
      "gemini-2.0-flash",           // Modern standard
      "gemini-2.5-flash",           // Project script reference
      "gemini-2.0-flash-exp",       // Experimental (high availability)
      "gemini-1.5-flash-latest",    // Pointer to latest
      "gemini-1.5-flash",           // Standard (previously 404'd)
      "gemini-1.5-flash-001",       // Specific version 1
      "gemini-1.5-flash-002",       // Specific version 2
      "gemini-1.5-flash-8b",        // 8B version (higher limits)
      "gemini-1.5-flash-8b-latest", // 8B latest
      "gemini-3.1-flash-live-preview" // Matching App.tsx reference
    ];
    let lastError: any = null;

    for (const modelId of modelsToTry) {
      try {
        console.log(`[Translation] Checking model: ${modelId}`);
        const result = await genAI.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }]
        });
        
        if (result.content || result.text) {
          console.log(`[Translation] Success with model: ${modelId}`);
          return result.text?.trim() || '';
        }
      } catch (error: any) {
        lastError = error;
        // Only log warning to keep console relatively clean
        console.warn(`[Translation] Model ${modelId} failed:`, error.message || error);
        
        // If it's a 429, we definitely want to try the next model
        // If it's a 404, the name is likely wrong, so try next
      }
    }
    
    // If we reached here, all models failed
    const errorMessage = lastError?.message || 'All models in fallback chain failed';
    throw new Error(`TRANSLATION_FAILED: ${errorMessage}`);
  } catch (error: any) {
    console.error('Final translation service error:', error);
    throw error;
  }
}
