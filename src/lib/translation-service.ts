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

    const genAI = new GoogleGenAI({ apiKey: cleanApiKey });

    const systemPrompt = `You are a professional translator. 
Translate the following text from ${sourceLang} to ${targetLang}. 
Maintain the original tone and context. 
If the text contains technical terms, use the industry standard translation.
Output ONLY the translated text, no explanations, no greetings.
${targetLang === 'Traditional Chinese' || targetLang === '繁體中文' ? 'IMPORTANT: ALWAYS use Traditional Chinese (繁體中文). NEVER use Simplified Chinese.' : ''}`;

    const combinedPrompt = `${systemPrompt}\n\nTEXT TO TRANSLATE:\n${text}`;

    // fallback chain for model IDs
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let lastError: any = null;

    for (const modelId of modelsToTry) {
      try {
        console.log(`Attempting translation with model: ${modelId}`);
        const result = await genAI.models.generateContent({
          model: modelId,
          contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }]
        });
        
        if (result.text) {
          return result.text.trim();
        }
      } catch (error: any) {
        lastError = error;
        console.warn(`Model ${modelId} failed:`, error.message || error);
        // continue to next model
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
