/**
 * Unified Translation Service for ACIA-2
 * Version: 2026-04-12-V3 (ID-BASED)
 */

const ID_TO_GT_CODE: Record<string, string> = {
  'zh-TW': 'zh-TW', 'zh-CN': 'zh-CN', 'en-US': 'en', 'en-GB': 'en',
  'th-TH': 'th', 'ja-JP': 'ja', 'vi-VN': 'vi', 'fil-PH': 'tl',
  'id-ID': 'id', 'ms-MY': 'ms', 'ko-KR': 'ko', 'fr-FR': 'fr',
  'de-DE': 'de', 'es-ES': 'es', 'it-IT': 'it', 'ru-RU': 'ru',
  'pt-BR': 'pt', 'pt-PT': 'pt', 'ar-SA': 'ar', 'hi-IN': 'hi',
  'bn-BD': 'bn', 'tr-TR': 'tr', 'nl-NL': 'nl', 'pl-PL': 'pl',
  'uk-UA': 'uk', 'cs-CZ': 'cs', 'el-GR': 'el', 'he-IL': 'iw',
  'sv-SE': 'sv', 'da-DK': 'da', 'fi-FI': 'fi', 'no-NO': 'no',
  'hu-HU': 'hu', 'ro-RO': 'ro', 'sk-SK': 'sk'
};

const ID_TO_NAME: Record<string, string> = {
  'zh-TW': 'Traditional Chinese (繁體中文)',
  'zh-CN': 'Simplified Chinese (简体中文)',
  'en-US': 'English (US)', 'en-GB': 'English (UK)',
  'th-TH': 'Thai (ไทย)', 'ja-JP': 'Japanese (日本語)',
  'vi-VN': 'Vietnamese (Tiếng Việt)', 'fil-PH': 'Filipino',
  'id-ID': 'Indonesian', 'ms-MY': 'Malay', 'ko-KR': 'Korean',
  'fr-FR': 'French', 'de-DE': 'German', 'es-ES': 'Spanish',
  'it-IT': 'Italian', 'ru-RU': 'Russian', 'pt-BR': 'Portuguese (Brazil)',
  'pt-PT': 'Portuguese (Portugal)', 'ar-SA': 'Arabic', 'hi-IN': 'Hindi',
  'bn-BD': 'Bengali', 'tr-TR': 'Turkish', 'nl-NL': 'Dutch',
  'pl-PL': 'Polish', 'uk-UA': 'Ukrainian', 'cs-CZ': 'Czech',
  'el-GR': 'Greek', 'he-IL': 'Hebrew', 'sv-SE': 'Swedish',
  'da-DK': 'Danish', 'fi-FI': 'Finnish', 'no-NO': 'Norwegian',
  'hu-HU': 'Hungarian', 'ro-RO': 'Romanian', 'sk-SK': 'Slovak'
};

export async function translateText(text: string, sourceLangId: string, targetLangId: string, apiKey: string): Promise<string> {
  const sourceName = ID_TO_NAME[sourceLangId] || sourceLangId;
  const targetName = ID_TO_NAME[targetLangId] || targetLangId;
  const prompt = `Translate this from ${sourceName} to ${targetName}. Output ONLY the translation: ${text}`;
  
  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  for (const model of models) {
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await resp.json();
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (result) return result.trim();
    } catch (e) {}
  }
  throw new Error("Gemini Translation Failed");
}

export async function translateTextStream(text: string, sourceLangId: string, targetLangId: string, apiKey: string, onChunk: (chunk: string) => void): Promise<string> {
  const result = await translateText(text, sourceLangId, targetLangId, apiKey);
  onChunk(result);
  return result;
}

export async function translateTextFree(text: string, sourceLangId: string, targetLangId: string): Promise<string> {
  const sl = ID_TO_GT_CODE[sourceLangId] || 'auto';
  const tl = ID_TO_GT_CODE[targetLangId] || 'en';
  console.log(`[FreeTranslate] ID-Match: ${sourceLangId}(${sl}) -> ${targetLangId}(${tl})`);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("GT API Error");
  const data = await resp.json();
  return data[0]?.map((p: any) => p[0]).join('') || "";
}
