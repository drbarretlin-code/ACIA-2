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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `You are a professional translator. 
Translate the following text from ${sourceLang} to ${targetLang}. 
Maintain the original tone and context. 
If the text contains technical terms, use the industry standard translation.
Output ONLY the translated text, no explanations, no greetings.
${targetLang === 'Traditional Chinese' || targetLang === '繁體中文' ? 'IMPORTANT: ALWAYS use Traditional Chinese (繁體中文). NEVER use Simplified Chinese.' : ''}`;

    const combinedPrompt = `${systemPrompt}\n\nTEXT TO TRANSLATE:\n${text}`;

    const result = await model.generateContent(combinedPrompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    console.error('Translation error detail:', error);
    throw new Error(`TRANSLATION_FAILED: ${errorMessage}`);
  }
}
