// User Manual metadata - content is loaded dynamically from /manuals/*.md

export const MANUAL_LANGUAGES = [
  { code: 'en-US', label: 'English' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'th-TH', label: 'ไทย' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'id-ID', label: 'Bahasa Indonesia' },
  { code: 'vi-VN', label: 'Tiếng Việt' },
  { code: 'fil-PH', label: 'Filipino' },
] as const;

export type ManualLangCode = typeof MANUAL_LANGUAGES[number]['code'];

// Helper: find best matching manual language for a given UI locale
export function getManualLangForLocale(uiLang: string): ManualLangCode {
  // Direct match
  const codes = MANUAL_LANGUAGES.map(l => l.code) as readonly string[];
  if (codes.includes(uiLang)) return uiLang as ManualLangCode;
  // Prefix match (e.g., "en-GB" -> "en-US")
  const prefix = uiLang.split('-')[0];
  const match = MANUAL_LANGUAGES.find(l => l.code.startsWith(prefix));
  if (match) return match.code;
  // Default to English
  return 'en-US';
}
