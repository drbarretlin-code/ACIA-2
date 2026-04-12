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
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-2.0-flash",
      "gemini-1.5-pro-002",
      "gemini-1.5-pro",
      "gemini-2.0-flash-exp"
    ];
    let lastError: any = null;
    let quotaExhaustedCount = 0;

    for (const modelId of modelsToTry) {
      try {
        console.log(`[Path 3] Attempting model: ${modelId}`);
        const model = genAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent(combinedPrompt);
        const translated = result.response.text();
        
        if (translated) {
          console.log(`[Path 3] ✅ Success with model: ${modelId}`);
          return translated.trim();
        }
      } catch (error: any) {
        lastError = error;
        const msg = (error.message || "").toLowerCase();
        
        if (msg.includes("429") || msg.includes("quota") || msg.includes("exhausted")) {
          quotaExhaustedCount++;
          console.warn(`[Path 3] ⚠️ Model ${modelId} quota exhausted.`);
        } else if (msg.includes("404") || msg.includes("not found") || msg.includes("not supported")) {
          console.warn(`[Path 3] ❌ Model ${modelId} not found/supported, skipping...`);
        } else {
          console.warn(`[Path 3] ❌ Model ${modelId} error:`, msg);
        }
      }
    }

    if (quotaExhaustedCount === modelsToTry.length) {
      throw new Error(`QUOTA_EXHAUSTED: 所有模型的免費配額皆已用盡，請稍後再試。`);
    }
    
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

  // 備援模型清單：優先嘗試輕量、高配額模型
  const models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-2.0-flash",
    "gemini-1.5-pro-002"
  ];
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
        const state = response.status;
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || `HTTP ${state}`;
        const lowerMsg = errMsg.toLowerCase();

        // 如果是 404 (找不到型號)、400 (不支援此方法) 或明顯的配額錯誤，跳往下一型號
        const shouldSkip = state === 404 || state === 400 || state === 429 ||
                           lowerMsg.includes("not found") || 
                           lowerMsg.includes("not supported") || 
                           lowerMsg.includes("invalid") ||
                           lowerMsg.includes("quota") || 
                           lowerMsg.includes("limit");

        if (shouldSkip) {
          console.warn(`[Stream] skipping model ${modelId} due to:`, errMsg);
          continue;
        }
        
        throw new Error(errMsg);
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
      console.warn(`[Stream] Model ${modelId} encountered error:`, err.message);
      continue;
    }
  }

  const finalMsg = lastError?.message || "All models failed";
  throw new Error(`TRANSLATION_FAILED: ${finalMsg}`);
}
