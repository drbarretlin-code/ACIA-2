
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

  const models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-2.0-flash",
    "gemini-1.5-pro-002"
  ];
  
  // Endpoints to try for each model
  const versions = ["v1", "v1beta"];
  let lastError: any = null;

  for (const modelId of models) {
    for (const v of versions) {
      try {
        console.log(`[Path 3] Attempting ${v} / ${modelId}...`);
        const url = `https://generativelanguage.googleapis.com/${v}/models/${modelId}:generateContent?key=${cleanApiKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (response.ok) {
          const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (result) {
            console.log(`[Path 3] ✅ Success: ${v}/${modelId}`);
            return result.trim();
          }
        } else {
          lastError = new Error(data.error?.message || `HTTP ${response.status}`);
          const msg = lastError.message.toLowerCase();
          if (msg.includes("429") || msg.includes("quota")) {
             console.warn(`[Path 3] ⚠️ ${modelId} quota exhausted.`);
             break; // Skip other versions of this model if quota is out
          }
          console.warn(`[Path 3] ❌ ${v}/${modelId} failed:`, lastError.message);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Path 3] Unexpected error for ${modelId}:`, err.message);
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
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-2.0-flash",
    "gemini-1.5-pro-002"
  ];
  
  let lastError: any = null;

  for (const modelId of models) {
    // For streaming, prioritize v1beta as it's more stable for SSE
    const endpoints = [
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${cleanApiKey}`,
      `https://generativelanguage.googleapis.com/v/models/${modelId}:streamGenerateContent?alt=sse&key=${cleanApiKey}`
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
          
          if (response.status === 404 || response.status === 400 || response.status === 429) {
            console.warn(`[Path 2] Skipping ${modelId} (${response.status}):`, errMsg);
            break; // Skip other endpoints for this model
          }
          continue;
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
