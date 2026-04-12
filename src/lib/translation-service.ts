/**
 * Standard REST translation using direct fetch (no SDK dependency for better reliability)
 */
export async function translateText(
  text: string, 
  sourceLang: string, 
  targetLang: string, 
  apiKey: string
): Promise<string> {
  const cleanApiKey = apiKey.trim();
  const systemPrompt = `You are a professional translator. 
Translate from ${sourceLang} to ${targetLang}. 
Maintain original tone. Output ONLY translated text.
${targetLang === 'Traditional Chinese' || targetLang === '繁體中文' ? 'IMPORTANT: ALWAYS use Traditional Chinese (繁體中文). NEVER use Simplified Chinese.' : ''}`;

  const payload = {
    contents: [{ parts: [{ text: `${systemPrompt}\n\nTEXT:\n${text}` }] }],
    generationConfig: { temperature: 0.1 }
  };

  // ✅ V4 Plan: Include the Voice model which we KNOW works for this key
  const models = [
    "gemini-3.1-flash-live-preview", // Voice Model
    "gemini-2.0-flash-exp",          // Experimental (often higher quota)
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",       // Alias
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro-002"
  ];
  
  // Versions and prefix combinations
  const versions = ["v1beta", "v1"];
  const prefixes = ["models/"]; 
  let lastError: any = null;

  for (const modelId of models) {
    for (const v of versions) {
      for (const prefix of prefixes) {
        try {
          const fullModelId = `${prefix}${modelId}`;
          console.log(`[Path 3] Attempting: ${v}/${fullModelId}...`);
          const url = `https://generativelanguage.googleapis.com/${v}/${fullModelId}:generateContent?key=${cleanApiKey}`;
          
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const data = await response.json();
          
          if (response.ok) {
            const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (result) {
              console.log(`[Path 3] ✅ Success: ${v}/${fullModelId}`);
              return result.trim();
            }
          } else {
            lastError = new Error(data.error?.message || `HTTP ${response.status}`);
            const msg = lastError.message.toLowerCase();
            // If quota exhausted or "method not found", skip to next variant/model
            if (msg.includes("429") || msg.includes("quota") || msg.includes("not found")) {
               console.warn(`[Path 3] ⚠️ Skipping ${v}/${fullModelId}:`, msg);
               break; 
            }
            console.warn(`[Path 3] ❌ ${v}/${fullModelId} failed:`, msg);
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[Path 3] Network error for ${modelId}:`, err.message);
        }
      }
    }
  }

  throw new Error(`TRANSLATION_FAILED: ${lastError?.message || "All fallback models failed"}`);
}

/**
 * Streaming REST translation using direct fetch
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
Translate from ${sourceLang} to ${targetLang}. 
Maintain original tone. Output ONLY translated text.
${targetLang === 'Traditional Chinese' || targetLang === '繁體中文' ? 'IMPORTANT: ALWAYS use Traditional Chinese (繁體中文).' : ''}`;

  const payload = {
    contents: [{ parts: [{ text: `${systemPrompt}\n\nTEXT:\n${text}` }] }],
    generationConfig: { temperature: 0.1 }
  };

  const models = [
    "gemini-3.1-flash-live-preview", // Voice Model
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro-002"
  ];
  
  let lastError: any = null;

  for (const modelId of models) {
    // For streaming, prioritize v1beta
    const endpoints = [
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${cleanApiKey}`,
      `https://generativelanguage.googleapis.com/v1/models/${modelId}:streamGenerateContent?alt=sse&key=${cleanApiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/${modelId}:streamGenerateContent?alt=sse&key=${cleanApiKey}`
    ];

    for (const url of endpoints) {
      try {
        console.log(`[Path 2] Attempting stream: ${modelId} via ${url.includes('v1beta') ? 'v1beta' : 'v1'}...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData.error?.message || `HTTP ${response.status}`;
          lastError = new Error(errMsg);
          const msg = errMsg.toLowerCase();
          
          if (response.status === 404 || response.status === 400 || response.status === 429 || msg.includes("not found")) {
            console.warn(`[Path 2] Skipping endpoint for ${modelId}:`, errMsg);
            continue; 
          }
          throw lastError;
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let fullText = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const lines = decoder.decode(value, { stream: true }).split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (content) {
                  fullText += content;
                  onChunk(content);
                }
              } catch (e) {}
            }
          }
        }
        return fullText;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Path 2] Error for ${modelId}:`, err.message);
      }
    }
  }

  throw new Error(`TRANSLATION_FAILED: ${lastError?.message || "All streaming paths failed"}`);
}

/**
 * Path 4: FREE Google Translate Public Endpoint (No Quotas, No Key)
 */
export async function translateTextFree(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  // Mapping UI language names to Google Translate codes
  const langMap: Record<string, string> = {
    'Traditional Chinese': 'zh-TW',
    '繁體中文': 'zh-TW',
    'Simplified Chinese': 'zh-CN',
    '简体中文': 'zh-CN',
    'English (US)': 'en',
    'English (UK)': 'en',
    'Japanese': 'ja',
    '日本語': 'ja',
    'Korean': 'ko',
    '한국어': 'ko',
    'French': 'fr',
    'Spanish': 'es',
    'German': 'de'
  };

  const sl = langMap[sourceLang] || 'auto';
  const tl = langMap[targetLang] || 'en';

  try {
    console.log("[Path 4] Using Free Google Translate (" + sl + " -> " + tl + ")...");
    const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" + sl + "&tl=" + tl + "&dt=t&q=" + encodeURIComponent(text);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("HTTP " + response.status);

    const data = await response.json();
    const result = data[0]?.map((part: any) => part[0]).join('') || "";
    
    if (result) {
      console.log("[Path 4] ✅ Success via Free Endpoint");
      return result;
    }
  } catch (err: any) {
    console.error("[Path 4] Free Translate failed:", err.message);
    throw err;
  }
  throw new Error("Free translation returned no result");
}
