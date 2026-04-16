import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import * as Y from 'yjs';
import { Virtuoso } from 'react-virtuoso';
import { Mic, Mic2, Square, Globe2, AlertCircle, Loader2, Languages, Settings, Key, ArrowRightLeft, Volume2, VolumeX, MessageSquare, MessageSquareOff, Square as StopIcon, Moon, Sun, Trash2, Share2, Check, Lock, Eye, EyeOff, X, Zap, Users, LogIn, LogOut, Copy, QrCode, Info, Send, Shield } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import * as OpenCC from 'opencc-js';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from './lib/utils';
import { db, auth, signInWithGoogle, signInAnon } from './firebase';
import { collection, doc, setDoc, onSnapshot, query, orderBy, deleteDoc, updateDoc, serverTimestamp, getDocs, getDoc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import toast, { Toaster } from 'react-hot-toast';
import { translations } from './translations';
import { translateText, translateTextStream, translateTextFree } from './lib/translation-service';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MANUAL_LANGUAGES, getManualLangForLocale, type ManualLangCode } from './manualsData';

// 獨立的 TranscriptItem 元件，使用 React.memo 優化渲染
const TranscriptItem = React.memo(({ t }: { t: any }) => (
  <div 
    key={t.id} 
    className={cn(
      "flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-3 transition-all duration-300 shadow-sm",
      !t.isFinal && "opacity-60"
    )}
  >
    {/* ID 與時間標籤 */}
    <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono h-4">
      <span>{t.speakerName || '匿名'}</span>
      <span>{new Date(t.createdAt || t.timestamp?.toMillis() || Date.now()).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
    </div>

    {/* 原文 */}
    <div className="flex flex-col gap-1.5 min-h-[1.5rem]">
      <div className="text-[15px] leading-tight text-slate-700 dark:text-slate-200">
        {t.detectedLang && <span className="text-xs text-slate-400 mr-1.5 font-mono">[{t.detectedLang}]</span>}
        {t.original}
      </div>
      {!t.isFinal && t.original && (
        <div className="text-xs text-slate-400 dark:text-slate-500 italic animate-pulse flex items-center gap-1">
          {t.isLocalStt ? (
            <>
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>極速預覽: {t.original}</span>
            </>
          ) : (
            <span>即時字幕: {t.original}</span>
          )}
        </div>
      )}
    </div>
    
    {/* 分隔線 */}
    <div className="h-px w-full bg-slate-200 dark:bg-slate-700 shrink-0"></div>
    
    {/* 翻譯文 */}
    <div className="flex flex-col gap-1.5 min-h-[1.5rem]">
      {t.error ? (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-[15px]">
          <AlertCircle className="w-4 h-4" />
          <span>{t.error}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {t.translated && (
            <div className="text-[15px] leading-tight text-blue-700 dark:text-blue-400 font-medium">
              {t.translated}
            </div>
          )}
          {!t.isFinal && (
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm h-5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  </div>
));

// 初始化簡轉繁轉換器 (加上 Try-Catch 以防程式碼載入時發生全域錯誤)
let s2tConverter: any;
try {
  s2tConverter = OpenCC.Converter({ from: 'cn', to: 'tw' });
} catch (e) {
  console.error("OpenCC initialization failed:", e);
  s2tConverter = (text: string) => text;
}

// 定義支援的語言與腔調清單
const LANGUAGES = [
  { id: 'zh-TW', nameKey: 'lang_zh_TW', suffix: '(TW)', name: '繁體中文' },
  { id: 'zh-CN', nameKey: 'lang_zh_CN', suffix: '(CN)', name: '簡體中文' },
  { id: 'en-US', nameKey: 'lang_en_US', suffix: '(USA)', name: 'English (US)' },
  { id: 'th-TH', nameKey: 'lang_th_TH', suffix: '(ไทย)', name: 'ไทย' },
  { id: 'ja-JP', nameKey: 'lang_ja_JP', suffix: '(Japan)', name: '日本語' },
  { id: 'vi-VN', nameKey: 'lang_vi_VN', suffix: '(Việt Nam)', name: 'Tiếng Việt' },
  { id: 'fil-PH', nameKey: 'lang_fil_PH', suffix: '(Pilipinas)', name: 'Filipino' },
  { id: 'id-ID', nameKey: 'lang_id_ID', suffix: '(Indonesia)', name: 'Bahasa Indonesia' },
  { id: 'ms-MY', nameKey: 'lang_ms_MY', suffix: '(Malaysia)', name: 'Bahasa Melayu' },
  
  { id: 'en-GB', nameKey: 'lang_en_GB', suffix: '(GBR)', name: 'English (GB)' },
  { id: 'ko-KR', nameKey: 'lang_ko_KR', suffix: '(한국)', name: '한국어' },
  { id: 'fr-FR', nameKey: 'lang_fr_FR', suffix: '(France)', name: 'Français' },
  { id: 'de-DE', nameKey: 'lang_de_DE', suffix: '(Deutschland)', name: 'Deutsch' },
  { id: 'es-ES', nameKey: 'lang_es_ES', suffix: '(España)', name: 'Español' },
  { id: 'it-IT', nameKey: 'lang_it_IT', suffix: '(Italia)', name: 'Italiano' },
  { id: 'ru-RU', nameKey: 'lang_ru_RU', suffix: '(Россия)', name: 'Русский' },
  { id: 'pt-BR', nameKey: 'lang_pt_BR', suffix: '(Brasil)', name: 'Português (Brasil)' },
  { id: 'pt-PT', nameKey: 'lang_pt_PT', suffix: '(Portugal)', name: 'Português (Portugal)' },
  { id: 'ar-SA', nameKey: 'lang_ar_SA', suffix: '(السعودية)', name: 'العربية' },
  { id: 'hi-IN', nameKey: 'lang_hi_IN', suffix: '(भारत)', name: 'हिन्दी' },
  { id: 'bn-BD', nameKey: 'lang_bn_BD', suffix: '(বাংলাদেশ)', name: 'বাংলা' },
  { id: 'tr-TR', nameKey: 'lang_tr_TR', suffix: '(Türkiye)', name: 'Türkçe' },
  { id: 'nl-NL', nameKey: 'lang_nl_NL', suffix: '(Nederland)', name: 'Nederlands' },
  { id: 'pl-PL', nameKey: 'lang_pl_PL', suffix: '(Polska)', name: 'Polski' },
  { id: 'uk-UA', nameKey: 'lang_uk_UA', suffix: '(Україна)', name: 'Українська' },
  { id: 'cs-CZ', nameKey: 'lang_cs_CZ', suffix: '(Česko)', name: 'Čeština' },
  { id: 'el-GR', nameKey: 'lang_el_GR', suffix: '(Ελλάδα)', name: 'Ελληνικά' },
  { id: 'he-IL', nameKey: 'lang_he_IL', suffix: '(ישראל)', name: 'עברית' },
  { id: 'sv-SE', nameKey: 'lang_sv_SE', suffix: '(Sverige)', name: 'Svenska' },
  { id: 'da-DK', nameKey: 'lang_da_DK', suffix: '(Danmark)', name: 'Dansk' },
  { id: 'fi-FI', nameKey: 'lang_fi_FI', suffix: '(Suomi)', name: 'Suomi' },
  { id: 'no-NO', nameKey: 'lang_no_NO', suffix: '(Norge)', name: 'Norsk' },
  { id: 'hu-HU', nameKey: 'lang_hu_HU', suffix: '(Magyarország)', name: 'Magyar' },
  { id: 'ro-RO', nameKey: 'lang_ro_RO', suffix: '(România)', name: 'Română' },
  { id: 'sk-SK', nameKey: 'lang_sk_SK', suffix: '(Slovensko)', name: 'Slovenčina' },
];

// 定義對話紀錄的資料結構
interface Transcript {
  id: string;
  original: string;
  translated: string;
  isFinal: boolean;
  isTranslating: boolean;
  sourceLang: string;
  targetLang: string;
  detectedLang?: string;
  error?: string;
  speakerId: string;
  speakerName?: string;
  createdAt: number;
  timestamp?: any;
  isLocal?: boolean;
  isLocalStt?: boolean; // 新增：用於標記是否為本地端即時辨識結果
}

const getFlagEmoji = (countryCode: string) => {
  if (!countryCode) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const CountryFlag = ({ langId, className }: { langId: string, className?: string }) => {
  const countryCode = langId.split('-')[1]?.toLowerCase();
  if (!countryCode) {
    return (
      <svg viewBox="0 0 60 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="60" height="40" fill="#E2E8F0"/>
        <circle cx="30" cy="20" r="10" fill="#94A3B8"/>
      </svg>
    );
  }
  return (
    <img 
      src={`https://flagcdn.com/w80/${countryCode}.png`} 
      alt={langId} 
      className={className} 
      style={{ objectFit: 'cover' }}
      referrerPolicy="no-referrer"
    />
  );
};

const getDefaultLang = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Taipei' || tz === 'Asia/Hong_Kong' || tz === 'Asia/Macau') return 'zh-TW';
    if (tz === 'Asia/Tokyo') return 'ja-JP';
    if (tz.startsWith('Europe/Paris')) return 'fr-FR';
    if (tz === 'Asia/Bangkok') return 'th-TH';
    if (tz === 'Asia/Ho_Chi_Minh') return 'vi-VN';
    if (tz === 'Asia/Jakarta') return 'id-ID';
    if (tz === 'Asia/Kuala_Lumpur') return 'ms-MY';
    if (tz === 'Europe/London') return 'en-GB';
    if (tz.startsWith('America/')) return 'en-US';
  } catch (e) {
    console.error(e);
  }
  
  // Fallback to navigator.language
  const lang = navigator.language;
  if (lang.startsWith('zh-TW') || lang.startsWith('zh-HK')) return 'zh-TW';
  if (lang.startsWith('zh')) return 'zh-TW';
  if (lang.startsWith('ja')) return 'ja-JP';
  if (lang.startsWith('fr')) return 'fr-FR';
  if (lang.startsWith('th')) return 'th-TH';
  if (lang.startsWith('vi')) return 'vi-VN';
  if (lang.startsWith('id')) return 'id-ID';
  if (lang.startsWith('ms')) return 'ms-MY';
  if (lang.startsWith('en-GB')) return 'en-GB';
  return 'en-US';
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCreatorId, setRoomCreatorId] = useState<string | null>(null);
  const [activeConnections, setActiveConnections] = useState<number>(0);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showRoomDialog, setShowRoomDialog] = useState(!new URLSearchParams(window.location.search).get('room'));
  const [joinRoomIdInput, setJoinRoomIdInput] = useState(() => new URLSearchParams(window.location.search).get('room') || '');
  const [userName, setUserName] = useState(() => localStorage.getItem('user_name') || '');
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [autoGainControl, setAutoGainControl] = useState(true);
  const [gainValue, setGainValue] = useState(1);
  const [showNameDialog, setShowNameDialog] = useState(!localStorage.getItem('user_name'));
  const [tempName, setTempName] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyType, setApiKeyType] = useState<'free' | 'paid'>(() => (localStorage.getItem('api_key_type') as 'free' | 'paid') || 'free');
  const [projectName, setProjectName] = useState(() => localStorage.getItem('project_name') || '');
  const [customAlert, setCustomAlert] = useState<{message: string, type: 'alert' | 'confirm' | 'custom', onConfirm?: () => void, buttons?: {label: string, onClick: () => void, variant?: 'primary' | 'secondary' | 'danger'}[]} | null>(null);

  const isRoomCreator = !!(user && roomCreatorId && user.uid === roomCreatorId);

  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);




  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(false);
  const [localLang, setLocalLang] = useState(getDefaultLang);
  const [clientLang, setClientLang] = useState(() => localStorage.getItem('client_lang') || 'en-US');
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [userGoogleCloudApiKey, setUserGoogleCloudApiKey] = useState(() => localStorage.getItem('google_cloud_api_key') || '');
  const [apiTier, setApiTier] = useState<'free' | 'paid'>(() => (localStorage.getItem('gemini_api_tier') as 'free' | 'paid') || 'free');
  const [voiceType, setVoiceType] = useState<'Men' | 'Women'>(() => (localStorage.getItem('voice_type') as 'Men' | 'Women') || 'Men');
  const [roomApiKey, setRoomApiKey] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [uiLang, setUiLang] = useState(() => localStorage.getItem('ui_lang') || 'en-US');
  const [isAtTop, setIsAtTop] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboarding_completed'));
  const virtuosoRef = useRef<any>(null);
  const prevTranscriptsLengthRef = useRef(0);

  const memoizedTranscripts = useMemo(() => {
    return [...transcripts].sort((a, b) => {
      const timeA = a.createdAt || a.timestamp?.toMillis() || 0;
      const timeB = b.createdAt || b.timestamp?.toMillis() || 0;
      return timeB - timeA;
    });
  }, [transcripts]);

  const [shareSuccess, setShareSuccess] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualLang, setManualLang] = useState<ManualLangCode>('en-US');
  const [manualMarkdown, setManualMarkdown] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  const [headerTitle1, setHeaderTitle1] = useState(() => localStorage.getItem('header_title_1') || 'TUC');
  const [headerTitle2, setHeaderTitle2] = useState(() => localStorage.getItem('header_title_2') || 'Equipment Department');
  const [responsiveness, setResponsiveness] = useState(() => localStorage.getItem('responsiveness') || 'normal');
  
  // Real-time text translation state
  const [inputText, setInputText] = useState('');
  const [translatedPreview, setTranslatedPreview] = useState('');
  const [isTranslatingText, setIsTranslatingText] = useState(false);
  const [translationDirection, setTranslationDirection] = useState<'localToClient' | 'clientToLocal'>('localToClient');
  
  // 費用統計相關 state
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isCostUnlocked, setIsCostUnlocked] = useState(false);
  const [costPasswordInput, setCostPasswordInput] = useState('');
  
  // 連線時間限制相關 state
  const [liveSessionDuration, setLiveSessionDuration] = useState(0);
  const [showTimePrompt, setShowTimePrompt] = useState(false);
  
  // 輸出模式控制
  const [isAudioOutputEnabled, setIsAudioOutputEnabled] = useState(() => {
    return localStorage.getItem('audio_output') !== 'false';
  });
  const [audioOutputMode, setAudioOutputMode] = useState<'None' | 'Myself' | 'ALL' | 'Others'>(() => (localStorage.getItem('audio_output_mode') as 'None' | 'Myself' | 'ALL' | 'Others') || 'ALL');
  // 語音引擎預設鎖定為高品質 AI 模式


  // Refs for stable access in async handlers (Socket/Gemini)
  const localLangRef = useRef(localLang);
  const clientLangRef = useRef(clientLang);
  const isAudioOutputEnabledRef = useRef(isAudioOutputEnabled);
  const lastMessageTimeRef = useRef<number>(Date.now());
  const isInitializingRef = useRef(false);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { localLangRef.current = localLang; }, [localLang]);
  useEffect(() => { clientLangRef.current = clientLang; }, [clientLang]);
  useEffect(() => { isAudioOutputEnabledRef.current = isAudioOutputEnabled; }, [isAudioOutputEnabled]);

  // Dynamic manual content fetch
  useEffect(() => {
    if (!showManual) return;
    let cancelled = false;
    setManualLoading(true);
    fetch(`${import.meta.env.BASE_URL}manuals/${manualLang}.md`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(text => { if (!cancelled) setManualMarkdown(text); })
      .catch(err => {
        console.error('[Manual] Failed to load:', err);
        if (!cancelled) setManualMarkdown(`> [!WARNING]\n> Failed to load manual content. Please check your network connection.`);
      })
      .finally(() => { if (!cancelled) setManualLoading(false); });
    return () => { cancelled = true; };
  }, [showManual, manualLang]);
  
  // Socket.io Ref



  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (auth.currentUser) {
        try {
          await deleteDoc(doc(db, 'connections', auth.currentUser.uid));
        } catch (e) {
          console.error("Error deleting connection:", e);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [auth.currentUser]);

  // 為本地 TTS 預先載入語音清單
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          console.log(`[TTS] Voices loaded: ${voices.length} available.`);
        }
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  // Initialize Auth-based Room Join logic ONLY after handleJoinRoom is defined later
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  // Live API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const isLiveRef = useRef<boolean>(false);
  const transcriptsRef = useRef<Transcript[]>([]);
  const recognitionRef = useRef<any>(null); 
  const ttsBufferRef = useRef<string>(""); // 用於緩存尚未成句的文字片段
  const lastSpokenIndexRef = useRef<number>(-1); // 追蹤最後朗讀的 Transcript 索引
  const ttsTimeoutRef = useRef<any>(null); // 超時強制朗讀定時器
  const lastProcessedTranscriptIdRef = useRef<Set<string>>(new Set());
  const reconnectCountRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<any>(null);
  const isFallbackModeRef = useRef<boolean>(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // 工具函數：繁簡轉換與腳本篩選，提升至元件頂層防止 ReferenceError
  const convertToTwIfNeeded = useCallback((text: string) => {
    if (!text) return text;
    if (localLang === 'zh-TW' || clientLang === 'zh-TW') {
      return s2tConverter(text);
    }
    return text;
  }, [localLang, clientLang]);

  const filterUnsupportedScripts = useCallback((text: string) => {
    if (!text) return text;
    const langs = [localLang, clientLang];
    const hasKorean = langs.some(l => l.startsWith('ko'));
    const hasJapanese = langs.some(l => l.startsWith('ja'));
    const hasChinese = langs.some(l => l.startsWith('zh'));

    let processed = text;
    if (!hasKorean) processed = processed.replace(/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\ud7b0-\ud7ff]/g, '');
    if (!hasJapanese) processed = processed.replace(/[\u3040-\u309f\u30a0-\u30ff]/g, '');
    if (!hasChinese) processed = processed.replace(/[\u4e00-\u9fa5]/g, '');
    
    return processed;
  }, [localLang, clientLang]);



  useEffect(() => {
    transcriptsRef.current = transcripts;
  }, [transcripts]);

  // 讀取與更新費用統計
  const updateApiUsage = (type: 'request' | 'tokens', count: number = 1) => {
    if (!userApiKey) return;
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const currentMinute = now.toISOString().slice(0, 16);
    const currentDay = now.toISOString().slice(0, 10);
    
    const allStats = JSON.parse(localStorage.getItem('api_usage_stats') || '{}');
    const stats = allStats[userApiKey] || { month: currentMonth, seconds: 0, rpm: 0, tpm: 0, rpd: 0, lastMinute: currentMinute, lastDay: currentDay };
    
    if (stats.lastMinute !== currentMinute) {
      stats.rpm = 0;
      stats.tpm = 0;
      stats.lastMinute = currentMinute;
    }
    if (stats.lastDay !== currentDay) {
      stats.rpd = 0;
      stats.lastDay = currentDay;
    }
    if (stats.month !== currentMonth) {
      stats.seconds = 0;
      stats.month = currentMonth;
    }
    
    if (type === 'request') {
      stats.rpm = (stats.rpm || 0) + count;
      stats.rpd = (stats.rpd || 0) + count;
    } else if (type === 'tokens') {
      stats.tpm = (stats.tpm || 0) + count;
    }
    
    allStats[userApiKey] = stats;
    localStorage.setItem('api_usage_stats', JSON.stringify(allStats));
  };

  useEffect(() => {
    const allStats = JSON.parse(localStorage.getItem('api_usage_stats') || '{}');
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const stats = allStats[userApiKey] || { month: currentMonth, seconds: 0 };
    
    if (stats.month !== currentMonth) {
      stats.seconds = 0;
      stats.month = currentMonth;
      allStats[userApiKey] = stats;
      localStorage.setItem('api_usage_stats', JSON.stringify(allStats));
      setSessionSeconds(0);
    } else {
      setSessionSeconds(stats.seconds || 0);
    }
  }, [userApiKey]);

  useEffect(() => {
    // [iOS FIX] 僅在非錄音中且 state 被外部（如房長）改為 false 時進行停止
    // 啟動邏輯已移至 toggleRecording 以確保 User Gesture
    if (!isRecording && isLiveRef.current) {
      stopLiveSession("remote_stop_or_state_sync");
    }
  }, [isRecording, userApiKey]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setSessionSeconds(prev => {
          const newVal = prev + 1;
          const currentMonth = new Date().toISOString().slice(0, 7);
          const currentMinute = new Date().toISOString().slice(0, 16);
          const currentDay = new Date().toISOString().slice(0, 10);
          const allStats = JSON.parse(localStorage.getItem('api_usage_stats') || '{}');
          const stats = allStats[userApiKey] || { month: currentMonth, seconds: 0, rpm: 0, tpm: 0, rpd: 0, lastMinute: currentMinute, lastDay: currentDay };
          
          if (stats.lastMinute !== currentMinute) {
            stats.rpm = 0;
            stats.tpm = 0;
            stats.lastMinute = currentMinute;
          }
          if (stats.lastDay !== currentDay) {
            stats.rpd = 0;
            stats.lastDay = currentDay;
          }
          if (stats.month !== currentMonth) {
            stats.seconds = 0;
            stats.month = currentMonth;
          }
          
          stats.seconds = newVal;
          // Estimate tokens per second: ~32 tokens for 1s audio input + ~10 tokens for output
          stats.tpm = (stats.tpm || 0) + 42;
          
          allStats[userApiKey] = stats;
          localStorage.setItem('api_usage_stats', JSON.stringify(allStats));
          return newVal;
        });

        setLiveSessionDuration(prev => prev + 1);
      }, 1000);
    } else {
      // NOTE: Removed redundant stopLiveSession() call here as it's already handled by the primary [isRecording] effect at line 388.
      setLiveSessionDuration(0);
      setShowTimePrompt(false);
    }
    return () => clearInterval(interval);
  }, [isRecording, userApiKey, localLang, clientLang]);

  useEffect(() => {
    if (liveSessionDuration === 3600 || liveSessionDuration === 7200) {
      if (user && roomCreatorId && user.uid === roomCreatorId) {
        setShowTimePrompt(true);
      }
    } else if (liveSessionDuration >= 10800) {
      if (user && roomCreatorId && user.uid === roomCreatorId) {
        setIsRecording(false);
        stopLiveSession("session_limit_3h");
        setCustomAlert({ message: "連續使用已達三小時，系統強制斷線。", type: 'alert' });
        setLiveSessionDuration(0);
      }
    }
  }, [liveSessionDuration, user, roomCreatorId]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showTimePrompt) {
      timeout = setTimeout(() => {
        setIsRecording(false);
        stopLiveSession("idle_timeout_3m");
        setShowTimePrompt(false);
        setCustomAlert({ message: "閒置超過3分鐘，系統已自動斷線。", type: 'alert' });
      }, 3 * 60 * 1000); // 3 minutes
    }
    return () => clearTimeout(timeout);
  }, [showTimePrompt]);

  useEffect(() => {
    localStorage.setItem('user_name', userName);
  }, [userName]);

  // Handle page unload for room creator
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 移除自動關閉房間邏輯，避免頁面重新整理時誤觸
      console.log("Page unloading, not closing room automatically.");
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId, user, roomCreatorId]);

  // 同步 state 到 ref，供事件回呼使用
  useEffect(() => {
    transcriptsRef.current = transcripts;

    // Sync newly finalized transcripts to Firestore
    if (roomId && user) {
      const lastTranscript = transcripts[transcripts.length - 1];
      if (lastTranscript && lastTranscript.isFinal && !lastTranscript.isTranslating && !lastTranscript.id.startsWith('fs-')) {
        // Mark as synced to avoid duplicate writes
        const transcriptToSave = { ...lastTranscript, id: `fs-${lastTranscript.id}` };
        
        // We need to update local state to mark it as synced, but doing it here might cause infinite loop.
        // Instead, we can just write to Firestore. The snapshot listener will pull it back.
        // To avoid duplicates in UI, our snapshot listener merges based on `isFinal`.
        // Actually, the snapshot listener replaces the local final transcripts.
        // So we just write it once.
        
        const saveToFirestore = async () => {
          const authUser = auth.currentUser;
          if (!authUser) {
            console.warn("[Firestore] Skip save: No active auth session.");
            return;
          }
          if (!roomId) {
            console.error("[Firestore] Skip save: roomId is missing.");
            return;
          }
          
          try {
            // 更新本地 ID，確保與 Firestore 的同步一致性
            setTranscripts(prev => prev.map(t => t.id === lastTranscript.id ? transcriptToSave : t));
            
            console.log(`[Firestore] Attempting to save transcript ${transcriptToSave.id} to room ${roomId}`);
            const docRef = doc(db, 'rooms', roomId, 'transcripts', transcriptToSave.id);
            await setDoc(docRef, {
              original: transcriptToSave.original,
              translated: transcriptToSave.translated,
              isFinal: true,
              sourceLang: transcriptToSave.sourceLang,
              targetLang: transcriptToSave.targetLang,
              createdAt: transcriptToSave.createdAt, // 保存原始時間戳記以便排序穩定
              timestamp: serverTimestamp(),
              speakerId: authUser.uid,
              ...(userName ? { speakerName: userName } : {})
            }, { merge: true });
            console.log('[Firestore] Transcript saved successfully');
          } catch (e: any) {
            console.error("[Firestore] Permission denied or write error:", e.message, {
              uid: authUser.uid,
              roomId: roomId,
              docId: transcriptToSave.id
            });
            // 如果是因為權限問題且非房主，這可能是預期的（規則限制）
            if (e.code === 'permission-denied') {
              console.warn("[Firestore] Note: Write permission denied. Ensure you are the room owner or rules allow guest writes.");
            }
          }
        };
        saveToFirestore();
      }
    }
  }, [transcripts, roomId, user, userName]);
            
  // 專屬捲動控制 Effect - 確保「最新訊息置頂」且「對齊頂端」
  useEffect(() => {
    // 只有當 transcripts 數量增加時（代表有新訊息插入，通常是在 Index 0）才觸發捲動
    if (transcripts.length > prevTranscriptsLengthRef.current) {
      const lastTranscript = transcripts[transcripts.length - 1]; // 注意：transcripts 內部是 Ascending
      const isLocalUser = lastTranscript?.speakerId === user?.uid;
      
      // 如果使用者目前在頂端，或該訊息是本地發送，則強制對齊頂端 (Index 0)
      if (isAtTop || isLocalUser) {
        // 使用 behavior: 'auto' 減少即時更新時的視覺跳動感
        virtuosoRef.current?.scrollToIndex({
          index: 0,
          behavior: 'auto',
          align: 'start'
        });
      }
    }
    prevTranscriptsLengthRef.current = transcripts.length;
  }, [transcripts.length, isAtTop, user?.uid]);

  // Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 保持螢幕喚醒
  const wakeLockRef = useRef<any>(null);
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('Wake Lock active');
        }
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          console.warn('Wake Lock permission denied, skipping.');
        } else {
          console.error('Wake Lock request failed:', err);
        }
      }
    };

    if (isRecording) {
      requestWakeLock();
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [isRecording]);

  // Firebase Connections & Room Sync
  useEffect(() => {
    if (!isAuthReady || !user) return;

    // 1. Maintain connection document
    const connRef = doc(db, 'connections', user.uid);
    const updateConnection = async () => {
      try {
        const connData: any = {
          lastActive: serverTimestamp()
        };
        if (roomId) {
          connData.roomId = roomId;
        }
        await setDoc(connRef, connData);
      } catch (e) {
        console.error("Failed to update connection", e);
      }
    };
    updateConnection();
    const connInterval = setInterval(updateConnection, 30000); // Heartbeat every 30s

    // 2. Listen to active connections
    const qConnections = query(collection(db, 'connections'));
    const unsubConnections = onSnapshot(qConnections, (snapshot) => {
      // Count connections active in the last 2 minutes
      const now = Date.now();
      let count = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.lastActive) {
          const lastActiveMs = data.lastActive.toMillis();
          if (now - lastActiveMs < 120000) {
            count++;
          }
        }
      });
      setActiveConnections(count);
    });

    // 3. Listen to Room Transcripts if roomId exists
    let unsubTranscripts: () => void;
    let unsubRoom: () => void;
    if (roomId) {
      const roomRef = doc(db, 'rooms', roomId);
      unsubRoom = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRoomCreatorId(data.creatorId);
          if (data.apiKey) {
            setRoomApiKey(data.apiKey);
          }
          if (data.apiKeyType) {
            setApiKeyType(data.apiKeyType);
          }
          if (data.projectName) {
            setProjectName(data.projectName);
          }
          if (data.isSpeakingEnabled !== undefined && data.isSpeakingEnabled !== isRecordingRef.current) {
            // [HARDEN] Prevent remote state from unsetting local isRecording if the user is the creator
            // This avoids "state flickering" during Firestore document updates.
            const isCreator = user?.uid === data.creatorId;
            const isRemoteDisabling = data.isSpeakingEnabled === false && isRecordingRef.current === true;
            
            if (isCreator && isRemoteDisabling) {
              console.log("[Diagnostic] Ignoring remote speaker-disable update to maintain local session consistency.");
            } else if (data.isSpeakingEnabled === false || data.isSpeakingEnabled === true) {
              // Only update if it's an explicit boolean to avoid null/undefined flickering
              console.log(`[Diagnostic] setIsRecording(${data.isSpeakingEnabled}) from Room Listener`);
              setIsSpeakingEnabled(data.isSpeakingEnabled);
              setIsRecording(data.isSpeakingEnabled);
            }
          }
          // 移除從遠端強制覆蓋語系設定，讓每一個與會者（包含訪客）能自主選擇自己的 localLang 與 clientLang
          if (data.isClosed === true) {
            if (user?.uid !== data.creatorId) {
              setCustomAlert({ 
                message: "房間已由建立者關閉，連線已失效。", 
                type: 'alert',
                onConfirm: () => {
                  window.location.href = '/';
                }
              });
            }
            setIsRecording(false);
            stopLiveSession("room_closed_or_deleted");
          }
        } else {
          // Room deleted or doesn't exist
          setCustomAlert({ 
            message: "房間已關閉或不存在", 
            type: 'alert',
            onConfirm: () => {
              window.location.href = '/';
            }
          });
          setIsRecording(false);
          stopLiveSession("room_deleted");
        }
      }, (error) => {
        console.error("Error listening to room:", error);
      });

      const qTranscripts = query(collection(db, 'rooms', roomId, 'transcripts'), orderBy('timestamp', 'asc'));
      let isFirstSnapshot = true;
      unsubTranscripts = onSnapshot(qTranscripts, (snapshot) => {
        console.log("Transcript snapshot received, count:", snapshot.size);
        const firestoreTranscripts: Transcript[] = [];
        snapshot.forEach(doc => {
          firestoreTranscripts.push({ id: doc.id, ...doc.data() } as Transcript);
        });

        // --- 極速模式本地朗讀邏輯 (支援 Firestore 同步) ---
        // --- 跨裝置自動朗讀邏輯 (僅針對他人翻譯) ---
        if (isAudioOutputEnabledRef.current && audioOutputMode !== 'None') {
          // 如果是初次快照，將現有 ID 標記為已處理，避免開啟頁面時朗讀所有歷史紀錄
          if (isFirstSnapshot) {
            snapshot.docs.forEach(doc => lastProcessedTranscriptIdRef.current.add(doc.id));
            isFirstSnapshot = false;
          } else {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added" || (change.type === "modified")) {
                const data = change.doc.data() as Transcript;
                const id = change.doc.id;

                if (data.isFinal && data.translated && !lastProcessedTranscriptIdRef.current.has(id)) {
                  const isSelf = data.speakerId === auth.currentUser?.uid;
                  const matchesFilter = (audioOutputMode === 'ALL') || 
                                       (audioOutputMode === 'Others' && !isSelf);
                  
                  // 極速模式機械音僅用於朗讀他人翻譯，本地翻譯由高品質 AI 語音處理
                  if (matchesFilter && !isSelf) {
                    speakText(data.translated, data.targetLang);
                  }
                  lastProcessedTranscriptIdRef.current.add(id);
                }
              }
            });
          }
        } else {
          isFirstSnapshot = false;
        }
        
        // 智能合併：Firestore 資料為主，本地非最終狀態為輔
        setTranscripts(prev => {
          const firestoreIds = new Set(firestoreTranscripts.map(t => t.id));
          
          // 1. 更新已存在的 Firestore 資料
          // 2. 保留本地尚未同步的資料 (包含非最終狀態，以及剛發送但尚未同步的最終狀態)
          const localToKeep = prev.filter(t => {
            const inFirestore = firestoreIds.has(t.id);
            const prefixedInFirestore = !t.id.startsWith('fs-') && firestoreIds.has(`fs-${t.id}`);
            return !inFirestore && !prefixedInFirestore;
          });
          
          // 確保排序穩定：使用強健的時間戳記解析 (Ascending)
          const merged = [...firestoreTranscripts, ...localToKeep].sort((a, b) => {
            const timeA = a.createdAt || a.timestamp?.toMillis() || 0;
            const timeB = b.createdAt || b.timestamp?.toMillis() || 0;
            return timeA - timeB;
          });
          return merged;
        });
      }, (error) => {
        console.error("Error listening to transcripts:", error);
      });
    }

    return () => {
      clearInterval(connInterval);
      unsubConnections();
      if (unsubTranscripts) unsubTranscripts();
      if (unsubRoom) unsubRoom();
    };
  }, [isAuthReady, user, roomId]);

  const handleCreateRoom = async () => {
    // 【解鎖 Web Audio】
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        try {
          audioContextRef.current = new AudioContextClass({ latencyHint: 'interactive', sampleRate: 16000 });
        } catch(e) {
          audioContextRef.current = new AudioContextClass({ latencyHint: 'interactive' });
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch (e) {}

    let currentUser = user;
    if (!currentUser) {
      try {
        currentUser = await signInAnon();
      } catch (e) {
        console.warn("Anonymous sign in failed, trying Google", e);
        try {
          currentUser = await signInWithGoogle();
        } catch (err: any) {
          setCustomAlert({ message: "登入失敗，請確認瀏覽器是否阻擋彈出視窗：" + err.message, type: 'alert' });
          return;
        }
      }
    }
    if (!currentUser) return;

    if (activeConnections >= 100) {
      setCustomAlert({ message: "系統警告：目前線上人數已達 100 人上限，無法建立新連線。請稍後再試。", type: 'alert' });
      return;
    }
    
    if (!userApiKey) {
      setCustomAlert({ message: "請輸入您的 API 金鑰，再建立房間。", type: 'alert' });
      return;
    }

    try {
      const newRoomId = Math.random().toString(36).substring(2, 9);
      // 確保所有寫入欄位皆有有效值，避免 undefined 導致權限或系統錯誤
      const roomData = {
        creatorId: currentUser.uid,
        createdAt: serverTimestamp(),
        apiKey: userApiKey || "",
        apiKeyType: apiKeyType || "free",
        projectName: projectName || "",
        localLang: localLang || "zh-TW",
        clientLang: clientLang || "en-US",
        isSpeakingEnabled: false,
        isClosed: false
      };

      await setDoc(doc(db, 'rooms', newRoomId), roomData);
      setRoomId(newRoomId);
      setShowRoomDialog(false);
      window.history.replaceState({}, '', `?room=${newRoomId}`);
    } catch (e: any) {
      console.error(e);
      setCustomAlert({ message: "建立房間失敗：" + e.message, type: 'alert' });
    }
  };

  const handleJoinRoom = async () => {
    // 【解鎖 Web Audio】
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        try {
          audioContextRef.current = new AudioContextClass({ latencyHint: 'interactive', sampleRate: 16000 });
        } catch(e) {
          audioContextRef.current = new AudioContextClass({ latencyHint: 'interactive' });
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch (e) {}

    let currentUser = user;
    if (!currentUser) {
      try {
        currentUser = await signInAnon();
      } catch (e) {
        // Fallback to Google sign in if anonymous auth is disabled
        try {
          currentUser = await signInWithGoogle();
        } catch (err: any) {
          setCustomAlert({ message: "登入失敗，請確認瀏覽器是否阻擋彈出視窗：" + err.message, type: 'alert' });
          return;
        }
      }
    }
    if (!currentUser) return;

    if (activeConnections >= 100) {
      setCustomAlert({ message: "系統警告：目前線上人數已達 100 人上限，無法建立新連線。請稍後再試。", type: 'alert' });
      return;
    }
    if (!joinRoomIdInput.trim()) return;
    
    try {
      const roomSnap = await getDoc(doc(db, 'rooms', joinRoomIdInput.trim()));
      if (roomSnap.exists()) {
        setRoomId(joinRoomIdInput.trim());
        setShowRoomDialog(false);
        window.history.replaceState({}, '', `?room=${joinRoomIdInput.trim()}`);
      } else {
        setCustomAlert({ message: "找不到此房間代碼", type: 'alert' });
      }
    } catch (e: any) {
      console.error(e);
      setCustomAlert({ message: "加入房間失敗：" + e.message, type: 'alert' });
    }
  };

  const handleClearRoomChat = async () => {
    if (!roomId || !user || roomCreatorId !== user.uid) return;
    setCustomAlert({
      message: "確定要清除所有對話紀錄嗎？此操作無法復原。",
      type: 'confirm',
      onConfirm: async () => {
        try {
          const q = query(collection(db, 'rooms', roomId, 'transcripts'));
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          // 修正：明確清空本地狀態
          setTranscripts([]);
        } catch (e) {
          console.error("清除失敗", e);
        }
      }
    });
  };

  const handleShareUrl = () => {
    const url = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2000);
  };


  useEffect(() => {
    isAudioOutputEnabledRef.current = isAudioOutputEnabled;
    localStorage.setItem('audio_output', isAudioOutputEnabled.toString());
    localStorage.setItem('audio_output_mode', audioOutputMode);
  }, [isAudioOutputEnabled, audioOutputMode]);

  useEffect(() => {
    localStorage.setItem('voice_type', voiceType);
  }, [voiceType]);

  // 同步語系設定到 Firestore (僅限房主)
  useEffect(() => {
    if (roomId && user && roomCreatorId === user.uid) {
      const roomRef = doc(db, 'rooms', roomId);
      updateDoc(roomRef, {
        localLang: localLang,
        clientLang: clientLang
      }).catch(err => console.error("Failed to sync languages to Firestore:", err));
    }
  }, [localLang, clientLang, roomId, user, roomCreatorId]);

  // Auth-based auto-join must happen AFTER handleJoinRoom is defined
  useEffect(() => {
    const roomIdFromUrl = new URLSearchParams(window.location.search).get('room');
    if (roomIdFromUrl && isAuthReady) {
      handleJoinRoom();
    }
  }, [isAuthReady]);

  const roomIdRef = useRef(roomId);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  // Yjs Foundation
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const yTranscriptsRef = useRef<Y.Array<any>>(ydocRef.current.getArray('transcripts'));

  // 讀取與更新費用統計


  // 使用 ref 快取驗證狀態，避免重複請求
  const apiKeyValidationCache = useRef<{ [key: string]: { type: 'paid' | 'free', projectName: string } }>({});

  const inferApiKeyInfo = async (key: string) => {
    if (!key) return;

    // 檢查快取
    if (apiKeyValidationCache.current[key]) {
      const cached = apiKeyValidationCache.current[key];
      setApiKeyType(cached.type);
      setProjectName(cached.projectName);
      return;
    }

    try {
      // 停止不必要的 API Key 驗證：取消這個會消耗免費配額的請求
      // 以免使用者在 F5 重新整理時不斷觸發 429 Too Many Requests 鎖死。
      const type = 'free';
      const projectName = 'Interpreter';

      const result = { type, projectName };
      apiKeyValidationCache.current[key] = result;
      setApiKeyType(result.type);
      setProjectName(result.projectName);
      console.log(`API Key validated (mocked to free tier).`);
    } catch (e) {
      console.error("API Key validation failed:", e);
      // 驗證失敗時，保持原狀態
    }
  };

  useEffect(() => {
    localStorage.setItem('gemini_api_key', userApiKey);
    localStorage.setItem('api_key_type', apiKeyType);
    localStorage.setItem('project_name', projectName);
    localStorage.setItem('gemini_api_tier', apiTier);
    
    // 使用 debounce 避免頻繁觸發驗證
    const handler = setTimeout(() => {
      inferApiKeyInfo(userApiKey);
    }, 1000);
    
    return () => clearTimeout(handler);
  }, [userApiKey, apiTier]);

  useEffect(() => {
    localStorage.setItem('header_title_1', headerTitle1);
  }, [headerTitle1]);

  useEffect(() => {
    localStorage.setItem('header_title_2', headerTitle2);
  }, [headerTitle2]);

  useEffect(() => {
    localStorage.setItem('ui_lang', uiLang);
  }, [uiLang]);

  // 暗色模式切換
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // 文字輸入轉譯 (已根據使用者需求停用自動預覽)

  const handleSendText = async () => {
    if (!inputText.trim() || !user) return;

    // 確保使用當次對話最新的同步語系 ID
    const sourceId = translationDirection === 'clientToLocal' ? (clientLang || 'en-US') : (localLang || 'zh-TW');
    const targetId = translationDirection === 'clientToLocal' ? (localLang || 'zh-TW') : (clientLang || 'en-US');
    
    console.log(`[Translation Sync] Sending text from ${sourceId} to ${targetId}`);

    const effectiveKey = userApiKey || roomApiKey;

    if (!effectiveKey) {
      toast.error("找不到 API Key，請先在設定中輸入金鑰。");
      return;
    }

    const currentInput = inputText;
    const msgId = Date.now().toString();
    
    // 立即將原文加入列表，進入「轉錄中」狀態
    const sourceName = LANGUAGES.find(l => l.id === sourceId)?.name || sourceId;
    const targetName = LANGUAGES.find(l => l.id === targetId)?.name || targetId;

    // 立即將原文加入列表，進入「轉錄中」狀態
    setTranscripts(prev => [...prev, {
      id: msgId,
      original: currentInput,
      translated: "",
      isFinal: true,
      isTranslating: true,
      sourceLang: sourceName,
      targetLang: targetName,
      createdAt: Date.now(),
      isLocal: true,
      ...(userName ? { speakerName: userName } : {})
    }]);

    setInputText('');
    setIsTranslatingText(true);
    // 移除 setIsNoiseShieldActive(true/false) 以避免硬切換音訊流造成的 WebSocket 不穩定

    try {
      // 0. 特殊路徑：如果當前 Live 會話已建立，直接輸入到會話中以獲得語音回饋
      if (isLiveRef.current && sessionRef.current) {
        console.log("[handleSendText] Path 0 (Dual-Track): Sending Voice to Live Session...");
        sessionRef.current.sendRealtimeInput([{ text: currentInput }]);
        // Path 0 does NOT return; it falls through to Path 1 for TRANSCRIPTION visibility
      }

      // 1. 優先路徑 (零配額限制)：Google 免費線上翻譯接口 (安全性與容量最佳)
      try {
        console.log("[handleSendText] Path: Using Free Translation Service (Isolated)");
        const freeResult = await translateTextFree(
          currentInput,
          sourceId,
          targetId
        );

        setTranscripts(prev => prev.map(t => 
          t.id === msgId ? { ...t, translated: freeResult, isTranslating: false } : t
        ));
        
        setIsTranslatingText(false);
        return;
      } catch (freeErr: any) {
        console.warn("[handleSendText] Isolated path failed. Falling back to REST...", freeErr.message);
      }

      // 2. 備援路徑：使用 REST API (不與運作中的 Live WebSocket 競爭)

      // 3. 三級路徑：使用 REST Streaming (Gemini)
      try {
        console.log("[handleSendText] Path 2: Using Streaming REST Fallback");
        await translateTextStream(
          currentInput, 
          sourceId, 
          targetId, 
          effectiveKey,
          (chunk) => {
            setTranscripts(prev => prev.map(t => 
              t.id === msgId ? { ...t, translated: (t.translated || "") + chunk } : t
            ));
          }
        );
        
        setTranscripts(prev => prev.map(t => 
          t.id === msgId ? { ...t, isTranslating: false } : t
        ));
        setIsTranslatingText(false);
        return;
      } catch (streamErr: any) {
        console.warn("[handleSendText] Path 2 failed. Falling back to Path 3 (Standard REST)...", streamErr.message);
      }

      // 4. 終極保險路徑：標準 REST
      console.log("[handleSendText] Path 3: Using Standard REST Endpoint");
      const finalResult = await translateText(
        currentInput,
        sourceId,
        targetId,
        effectiveKey
      );

      setTranscripts(prev => prev.map(t => 
        t.id === msgId ? { ...t, translated: finalResult, isTranslating: false } : t
      ));

    } catch (err: any) {
      console.error("Triple-Path translation failed:", err);
      const detail = err.message?.replace('TRANSLATION_FAILED: ', '') || '服務暫時不可用';
      toast.error(`轉譯失敗: ${detail}`);
      
      setTranscripts(prev => prev.map(t => 
        t.id === msgId ? { ...t, isTranslating: false, translated: "⚠️ 轉譯失敗 (配額或連線問題)" } : t
      ));
    } finally {
      setIsTranslatingText(false);
    }
  };

  const getUiText = (key: string) => {
    let actualKey = key;
    if (key === 'darkMode') {
      actualKey = isDarkMode ? 'darkMode_on' : 'darkMode_off';
    } else if (key === 'share') {
      actualKey = shareSuccess ? 'share_success' : 'share';
    }
    
    return translations[uiLang]?.[actualKey] || translations['en-US']?.[actualKey] || key;
  };

  // 清除對話紀錄
  const handleClear = () => {
    setTranscripts([]);
    setShowClearConfirm(false);
  };

  // 分享對話紀錄
  const handleShare = async () => {
    if (transcripts.length === 0) return;
    
    const text = transcripts.map(t => {
      const speaker = `[${t.speakerName || '匿名'}] `;
      return `${speaker}原文：${t.original}\n翻譯：${t.translated}`;
    }).join('\n\n---\n\n');
    
    const shareData = {
      title: '語音翻譯對話紀錄',
      text: text,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } else {
        throw new Error('Web Share API not supported');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        // Fallback to clipboard
        try {
          await navigator.clipboard.writeText(text);
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 2000);
        } catch (copyErr) {
          console.error('Failed to copy', copyErr);
        }
      }
    }
  };

  // 清除資源
  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, []);

  // 清除資源
  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, []);

  const playAudioChunk = (base64Audio: string) => {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const audioCtx = playbackContextRef.current;

    if (audioCtx.state === 'suspended') {
      console.warn("[Diagnostic] Playback Context suspended, resuming...");
      audioCtx.resume();
    }

    const binary = atob(base64Audio);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }
    const int16View = new Int16Array(buffer);
    const pcmData = new Float32Array(int16View.length);
    for (let i = 0; i < int16View.length; i++) {
      pcmData[i] = int16View[i] / 32768;
    }

    const audioBuffer = audioCtx.createBuffer(1, pcmData.length, 24000);
    audioBuffer.getChannelData(0).set(pcmData);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    const currentTime = audioCtx.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }

    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;
  };

  const stopLiveSession = async (reason = "unspecified") => {
    if (!isLiveRef.current && reason !== "room_deleted" && reason !== "unmount") {
      // Avoid redundant logs if already stopped, unless it's a critical lifecycle event
      // console.log(`[Diagnostic] stopLiveSession(${reason}) ignored: Already stopped.`);
      // return;
    }

    isLiveRef.current = false;

    if (roomId && user && roomCreatorId && user.uid === roomCreatorId) {
      console.log(`[Diagnostic] Room session stopped (Reason: ${reason}), but not closing room automatically.`);
    }

    const isSoftStop = reason === "reconnect" || reason === "language_changed";

    if (!isSoftStop) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
    }

    if (processorRef.current) {
      try {
        processorRef.current.port.onmessage = null;
        processorRef.current.port.close();
        processorRef.current.disconnect();
      } catch (e) {
        console.error("Error disconnecting processor:", e);
      }
      processorRef.current = null;
    }

    if (filterRef.current) {
      try {
        filterRef.current.disconnect();
      } catch (e) {
        console.error("Error disconnecting filter:", e);
      }
      filterRef.current = null;
    }

    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch (e) {
        console.error("Error disconnecting source:", e);
      }
      sourceRef.current = null;
    }

    if (playbackContextRef.current) {
      try {
        if (playbackContextRef.current.state !== 'closed') {
          // 在關閉前嘗試 suspend 以釋放硬體資源
          if (playbackContextRef.current.state === 'running') {
            await playbackContextRef.current.suspend();
          }
          await playbackContextRef.current.close();
        }
      } catch (e) {
        console.error("Error closing playbackContext:", e);
      }
      playbackContextRef.current = null;
    }
    
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.error("Error closing session:", e);
      }
      sessionRef.current = null;
    }
    
    if (reason !== "reconnect") {
      nextPlayTimeRef.current = 0;
      isFallbackModeRef.current = false;
      setIsFallbackMode(false);
      reconnectCountRef.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    }
  };

  const speakText = async (text: string, lang?: string, retryCount = 0) => {
    if (!('speechSynthesis' in window)) return;
    if (!text.trim()) return;
    
    // 檢查音訊輸出設定
    if (!isAudioOutputEnabledRef.current || audioOutputMode === 'None') {
      console.log(`[TTS] Skipping: output disabled or mode is ${audioOutputMode}`);
      return;
    }
    
    const isSelf = isRecordingRef.current;
    if (audioOutputMode === 'Myself' && !isSelf) {
      console.log(`[TTS] Skipping: mode is Myself but source is Others`);
      return;
    }
    if (audioOutputMode === 'Others' && isSelf) {
      console.log(`[TTS] Skipping: mode is Others but source is Myself`);
      return;
    }

    // 取得目標語言
    const targetLang = lang || clientLangRef.current;
    
    // Google Cloud TTS 語音模型對應表
    const CLOUD_VOICE_MAP: { [key: string]: string } = {
      'zh-TW': 'zh-TW-Neural2-A',
      'zh-CN': 'zh-CN-Neural2-A',
      'en-US': 'en-US-Neural2-F',
      'en-GB': 'en-GB-Neural2-B',
      'ja-JP': 'ja-JP-Neural2-B',
      'ko-KR': 'ko-KR-Neural2-A',
      'fr-FR': 'fr-FR-Neural2-A',
      'de-DE': 'de-DE-Neural2-D',
      'es-ES': 'es-ES-Neural2-C',
      'vi-VN': 'vi-VN-Neural2-A',
      'th-TH': 'th-TH-Neural2-A',
      'id-ID': 'id-ID-Neural2-A'
    };

    const speakWithCloudTTS = async (text: string, langCode: string) => {
      const apiKey = userGoogleCloudApiKey || userApiKey; 
      if (!apiKey) return false;

      try {
        const body = {
          input: { text },
          voice: { 
            languageCode: langCode,
            name: CLOUD_VOICE_MAP[langCode] || `${langCode.split('-')[0]}-Standard-A` 
          },
          audioConfig: { audioEncoding: 'MP3' }
        };

        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error('TTS API request failed');

        const data = await response.json();
        if (data.audioContent) {
          const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
          audio.play();
          return true;
        }
        return false;
      } catch (e) {
        console.error("[TTS] Cloud TTS error:", e);
        return false;
      }
    };

    // 優先嘗試雲端高品質 TTS
    if (userGoogleCloudApiKey || userApiKey) {
      console.log(`[TTS] Attempting Cloud TTS for: ${targetLang}`);
      const success = await speakWithCloudTTS(text, targetLang);
      if (success) return;
      console.warn("[TTS] Cloud TTS failed, falling back to local SpeechSynthesis");
    }
    
    // 取得語音清單
    let voices = window.speechSynthesis.getVoices();
    
    // 如果清單為空且尚未重試過，則等待一小段時間後重試
    if (voices.length === 0 && retryCount < 2) {
      console.warn(`[TTS] Voice list empty, retrying... (${retryCount + 1})`);
      setTimeout(() => speakText(text, lang, retryCount + 1), 100);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    utterance.rate = 1.1; 
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // 語音選擇邏輯優化
    const findVoice = () => {
      if (voices.length === 0) return null;
      // 1. 精確匹配 (例如 zh-TW)
      let voice = voices.find(v => v.lang === targetLang);
      if (voice) return voice;
      
      // 2. 基礎語言匹配 (例如 zh)
      const baseLang = targetLang.split('-')[0];
      voice = voices.find(v => v.lang.startsWith(baseLang));
      if (voice) return voice;
      
      // 3. 特殊回退：搜尋關鍵字
      if (baseLang === 'zh') {
        const keywords = ['Chinese', 'Taiwan', 'Hong Kong', 'Mandarin', 'Cantonese'];
        voice = voices.find(v => keywords.some(k => v.name.includes(k)));
        if (voice) return voice;
      }
      
      return voices[0];
    };

    const selectedVoice = findVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log(`[TTS] Speaking with voice: ${selectedVoice.name} (${selectedVoice.lang})`);
    } else {
      console.warn(`[TTS] No suitable voice found for ${targetLang}, using default browser voice.`);
    }

    utterance.onstart = () => {
      console.log(`[TTS] Started speaking: "${text.substring(0, 30)}..."`);
    };

    utterance.onend = () => {
      console.log(`[TTS] Finished speaking.`);
    };

    utterance.onerror = (event) => {
      console.error(`[TTS] Error speaking text: ${event.error}`, event);
    };

    try {
      // 修復 Chrome/Safari 死鎖 Bug：在 cancel 與 speak 之間增加一個短暫延遲
      window.speechSynthesis.cancel();
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 50);
    } catch (e) {
      console.error("[TTS] Failed to execute speak():", e);
    }
  };


  const setupSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = localLangRef.current || 'zh-TW';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // 處理最終結果 (當 Live API 斷線時接管)
      if (finalTranscript.trim() && isFallbackModeRef.current) {
        console.log("[Fallback] Final STT detected, manual processing...");
        const processedText = convertToTwIfNeeded(finalTranscript);
        
        // 模擬 handleSendText 的邏輯，但從語音過來
        const msgId = "fallback-" + Date.now();
        const sourceId = localLangRef.current;
        const targetId = clientLangRef.current;

        // 建立正式項目
        setTranscripts(prev => {
          // 移除舊的預覽 (如果有)
          const filtered = prev.filter(t => !t.isLocalStt);
          return [...filtered, {
            id: msgId,
            original: processedText,
            translated: "",
            isFinal: true,
            isTranslating: true,
            sourceLang: sourceId,
            targetLang: targetId,
            createdAt: Date.now(),
            isLocal: true,
            ...(userName ? { speakerName: userName } : {})
          }];
        });

        // 觸發翻譯與 Firestore 同步
        (async () => {
          try {
            const effectiveKey = (user && roomCreatorId && user.uid === roomCreatorId) ? userApiKey : (roomApiKey || userApiKey);
            const translated = await translateTextFree(processedText, sourceId, targetId);
            
            setTranscripts(prev => prev.map(t => 
              t.id === msgId ? { ...t, translated, isTranslating: false } : t
            ));

            // 同步到 Firestore
            if (roomId) {
              await setDoc(doc(db, 'rooms', roomId, 'transcripts', msgId), {
                original: processedText,
                translated,
                isFinal: true,
                sourceLang: sourceId,
                targetLang: targetId,
                createdAt: serverTimestamp(),
                speakerId: auth.currentUser?.uid,
                speakerName: userName || '匿名'
              });
            }

            // 觸發備援語音
            speakText(translated, targetId);
          } catch (e) {
            console.error("[Fallback] Translation failed:", e);
          }
        })();
      }

      // 處理即時預覽
      if (interimTranscript.trim()) {
        const processedText = convertToTwIfNeeded(interimTranscript);
        setTranscripts(prev => {
          const last = prev[prev.length - 1];
          if (last && !last.isFinal && (last.isLocalStt || (last.isLocal && !last.original))) {
            const newTranscripts = [...prev];
            newTranscripts[prev.length - 1] = { 
              ...last, 
              original: processedText,
              isLocalStt: true 
            };
            return newTranscripts;
          } else if (!last || last.isFinal) {
            return [...prev, {
              id: "local-stt-" + Date.now().toString(),
              original: processedText,
              translated: "",
              isFinal: false,
              isTranslating: true,
              sourceLang: "Auto",
              targetLang: "Auto",
              createdAt: Date.now(),
              isLocal: true,
              isLocalStt: true,
              ...(userName ? { speakerName: userName } : {})
            }];
          }
          return prev;
        });
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Local Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      // 如果還在錄音，則重啟辨識以維持連貫
      if (isRecordingRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.lang = localLangRef.current || 'zh-TW'; // 確保閉包不會卡在舊語系
          recognitionRef.current.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {}
  };

  const startLiveSession = async () => {
    if (isLiveRef.current || isInitializingRef.current) return;
    const effectiveApiKey = (user && roomCreatorId && user.uid === roomCreatorId) ? userApiKey : (roomApiKey || userApiKey);
    
    if (!effectiveApiKey) {
      if (user && roomCreatorId && user.uid === roomCreatorId) {
        setErrorMsg('請先在管理者設定中配置您的 API 金鑰。');
        setShowAdminSettings(true);
      } else {
        setErrorMsg('無法取得房間的 API 金鑰，請聯繫建立者。');
      }
      return;
    }

    isInitializingRef.current = true;
    setErrorMsg(null);
    lastMessageTimeRef.current = Date.now();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("您的瀏覽器不支援麥克風，請嘗試使用 Safari 或 Chrome 瀏覽器開啟此網頁。");
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      let audioCtx = audioContextRef.current;
      
      if (!audioCtx || audioCtx.state === 'closed') {
        try {
          audioCtx = new AudioContextClass({ latencyHint: 'interactive', sampleRate: 16000 });
        } catch(e) {
          audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
        }
        audioContextRef.current = audioCtx;
      }
      
      if (audioCtx.state === 'suspended') {
        try {
          await audioCtx.resume();
        } catch (e) {
          console.warn("Could not resume AudioContext:", e);
        }
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation,
            noiseSuppression,
            autoGainControl,
            channelCount: 1,
          } 
        });
      } catch (err: any) {
        console.warn("初次嘗試麥克風存取失敗，嘗試使用基礎參數重試...", err);
        try {
          // 降級為最基礎的存取請求
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (retryErr: any) {
          console.error("麥克風存取完全失敗:", retryErr);
          throw new Error("無法存取麥克風：" + retryErr.message);
        }
      }
      mediaStreamRef.current = stream;
      
      try {
        await audioCtx.audioWorklet.addModule('/audio-processor.js?v=2.0');
      } catch (e) {
        console.warn("[Audio] AudioWorklet addModule error (might be already added):", e);
      }

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const workletNode = new AudioWorkletNode(audioCtx, 'audio-processor');
      processorRef.current = workletNode;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 150;
      filterRef.current = filter;

      source.connect(filter);
      filter.connect(workletNode);
      workletNode.connect(audioCtx.destination);

      let chunkCount = 0;
      workletNode.port.onmessage = (e) => {
        chunkCount++;
        if (!isLiveRef.current || !sessionRef.current) return;
        
        const inputData = e.data;
        const inputSampleRate = audioCtx.sampleRate;
        const targetSampleRate = 16000;
        
        let resampledData = inputData;
        if (inputSampleRate !== targetSampleRate) {
          const ratio = inputSampleRate / targetSampleRate;
          const outputLength = Math.round(inputData.length / ratio);
          resampledData = new Float32Array(outputLength);
          for (let i = 0; i < outputLength; i++) {
            const index = i * ratio;
            const index1 = Math.floor(index);
            const index2 = Math.min(index1 + 1, inputData.length - 1);
            const fraction = index - index1;
            resampledData[i] = inputData[index1] * (1 - fraction) + inputData[index2] * fraction;
          }
        }

        const pcm16 = new Int16Array(resampledData.length);
        for (let i = 0; i < resampledData.length; i++) {
          pcm16[i] = Math.max(-1, Math.min(1, resampledData[i])) * 32767;
        }
        
        let binary = "";
        const bytes = new Uint8Array(pcm16.buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        
        if (sessionRef.current && isLiveRef.current) {
          try {
            // [FIX] 移除先前錯誤的 .socket 內部狀態檢查，恢復正常發送
            sessionRef.current.sendRealtimeInput({ audio: { mimeType: "audio/pcm;rate=16000", data: base64 } });
          } catch (e) {
            // 如果連線已斷開，標記停止發送，避免後續 chunk 重複報錯
            if (isLiveRef.current) {
              console.warn("[Audio] Session stream error (WebSocket closed?):", e);
              isLiveRef.current = false;
            }
          }
        }
      };


      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.warn("[Track] MediaStreamTrack ended (possibly background/lockscreen).");
          // 不直接硬停止，改為嘗試軟性恢復
          if (isRecordingRef.current && isLiveRef.current) {
            // 關閉 Live 但保留錄音狀態，讓系統自動重連
            stopLiveSession("reconnect");
            isFallbackModeRef.current = true;
            setIsFallbackMode(true);
            
            // 嘗試重新取得麥克風（使用者回到前景時）
            const retryMic = setTimeout(async () => {
              if (isRecordingRef.current) {
                try {
                  const newStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                      echoCancellation: true,
                      noiseSuppression: true,
                      autoGainControl: true
                    }
                  });
                  mediaStreamRef.current = newStream;
                  console.log("[Track] Microphone re-acquired after track ended.");
                  startLiveSession();
                } catch (e) {
                  console.error("[Track] Failed to re-acquire microphone:", e);
                  setIsRecording(false);
                  stopLiveSession("mic_lost");
                  toast('麥克風已中斷，請重新啟動錄音。', {
                    id: 'mic-lost',
                    icon: '🎙️',
                    duration: 5000
                  });
                }
              }
            }, 2000); // 等待 2 秒讓瀏覽器回到前景
          } else {
            stopLiveSession("track_ended");
          }
        };
      });

      setIsRecording(true);
      console.log("[Diagnostic] setIsRecording(true) from startLiveSession");

      const ai = new GoogleGenAI({ apiKey: effectiveApiKey });
      const localName = LANGUAGES.find(l => l.id === localLangRef.current)?.name || localLangRef.current;
      const clientName = LANGUAGES.find(l => l.id === clientLangRef.current)?.name || clientLangRef.current;

      const systemInstructionContent = `You are a rapid real-time simultaneous interpreter.
The two authorized languages are: ${localName} and ${clientName}.
CRITICAL: Translate user's speech immediately without filler. Output only translated text.`;

      updateApiUsage('request');

      sessionRef.current = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          // [FIX 1011] 統一使用 AUDIO 模式配合轉錄，避免極速模式（TEXT）在部分模型上引發伺服器內部錯誤
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceType === 'Men' ? "Puck" : "Aoede" } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {}, // 始終開啟轉錄以支援極速模式的文字朗讀
          systemInstruction: `${systemInstructionContent}\n\n[重要指示]：請以「連續翻譯模式」運作。當使用者在翻譯過程中持續說話時，請務必處理並翻譯所有輸入的語句，不得因中斷而遺漏任何語句。`
        },

        callbacks: {
          onopen: async () => {
            console.warn("[Diagnostic] Live API SOCKET OPENED!");
            isLiveRef.current = true; 
            isFallbackModeRef.current = false;
            setIsFallbackMode(false);
            reconnectCountRef.current = 0;
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
            setupSpeechRecognition();
            // 重連成功後清除備援提示
            toast.dismiss('voice-fallback');
            if (reconnectCountRef.current > 0) {
              toast.success("雲端連線已恢復，已切換回高品質即時翻譯模式。", { id: 'voice-restored', duration: 3000 });
            } 
          },
          onmessage: (message: any) => {
            console.log("[Diagnostic] Live API onmessage received:", JSON.stringify(message).substring(0, 500));
            lastMessageTimeRef.current = Date.now();
            
            // 移除了內部的 convertToTwIfNeeded 與 filterUnsupportedScripts 宣告，改用元件頂層的 useCallback 版本


            const inTranscript = message.serverContent?.inputTranscription;
            if (inTranscript?.text) {
              let cleanedText = filterUnsupportedScripts(inTranscript.text);
              if (!cleanedText && inTranscript.text.trim()) cleanedText = inTranscript.text.trim();
              
              if (cleanedText) {
                const processedText = convertToTwIfNeeded(cleanedText);
                setTranscripts(prev => {
                  const lastIndex = prev.length - 1;
                  const last = prev[lastIndex];
                  if (last && !last.isFinal && last.isLocal) {
                    const newTranscripts = [...prev];
                    newTranscripts[lastIndex] = { 
                      ...last, 
                      original: processedText,
                      isLocalStt: false // 由 AI 提供的精準結果接管，移除「極速預覽」標記
                    };
                    return newTranscripts;
                  } else {
                    return [...prev, {
                      id: "local-" + Date.now().toString(),
                      original: processedText,
                      translated: "",
                      isFinal: false,
                      isTranslating: true,
                      sourceLang: "Auto",
                      targetLang: "Auto",
                      createdAt: Date.now(),
                      isLocal: true,
                      ...(userName ? { speakerName: userName } : {})
                    }];
                  }
                });
              }
            }

            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              let textContent = "";
              for (const part of parts) {
                // 高品質模式：播放雲端 AI 渲染的擬人音訊
                if (part.inlineData?.data && isAudioOutputEnabledRef.current && audioOutputMode !== 'None') {
                  const isSelf = isRecordingRef.current; 
                  if (audioOutputMode === 'ALL' || (audioOutputMode === 'Myself' && isSelf) || (audioOutputMode === 'Others' && !isSelf)) {
                    console.log("[Diagnostic] Playing AI high-quality audio chunk...");
                    playAudioChunk(part.inlineData.data);
                  }
                }

                if (part.text) {
                  textContent += convertToTwIfNeeded(part.text);
                }
              }

              if (textContent) {
                console.log("[Diagnostic] modelTurn text content:", textContent);
                setTranscripts(prev => {
                  const newTranscripts = [...prev];
                  const lastIndex = newTranscripts.length - 1;
                  if (lastIndex >= 0 && !newTranscripts[lastIndex].isFinal) {
                    newTranscripts[lastIndex] = { 
                      ...newTranscripts[lastIndex], 
                      translated: (newTranscripts[lastIndex].translated || "") + textContent,
                      isTranslating: false 
                    };
                  } else {
                    newTranscripts.push({
                      id: "ai-" + Date.now().toString(),
                      original: "",
                      translated: textContent,
                      isFinal: false,
                      isTranslating: false,
                      sourceLang: "Auto",
                      targetLang: "Auto",
                      createdAt: Date.now(),
                      speakerName: "AI"
                    });
                  }
                  return newTranscripts;
                });
              }
            }

            const outTranscript = message.serverContent?.outputTranscription;
            if (outTranscript?.text) {
              console.log("[Diagnostic] outputTranscription text:", outTranscript.text);
              const processedOutText = convertToTwIfNeeded(outTranscript.text);
              setTranscripts(prev => {
                const newTranscripts = [...prev];
                const lastIndex = newTranscripts.length - 1;
                if (lastIndex >= 0) {
                  newTranscripts[lastIndex] = { 
                    ...newTranscripts[lastIndex], 
                    translated: newTranscripts[lastIndex].translated + processedOutText,
                    isTranslating: false 
                  };
                }
                return newTranscripts;
              });
            }

            if (message.serverContent?.turnComplete) {
              setTranscripts(prev => {
                const last = prev[prev.length - 1];
                if (last && !last.isFinal) {
                  if (!last.translated.trim() && (!last.original.trim() || last.original === "(...)")) return prev.slice(0, -1);
                  return prev.map((t, i) => i === prev.length - 1 ? { ...t, isFinal: true, isTranslating: false } : t);
                }
                return prev;
              });

              console.log("[Diagnostic] Live API turnComplete received");
            }

            if (message.serverContent?.interrupted) {
              nextPlayTimeRef.current = 0;
              if (playbackContextRef.current) {
                playbackContextRef.current.close();
                playbackContextRef.current = null;
              }
              setTranscripts(prev => {
                const last = prev[prev.length - 1];
                if (last && !last.isFinal) {
                  return prev.map((t, i) => i === prev.length - 1 ? { ...t, isFinal: true, isTranslating: false } : t);
                }
                return prev;
              });
            }
          },
          onclose: (event: any) => {
            const closeCode = event?.code || 0;
            const closeReason = event?.reason || '';
            console.log(`[Live API] WebSocket closed. Code: ${closeCode}, Reason: ${closeReason}`);
            
            if (!isLiveRef.current) return; // 已被其他流程處理
            
            // 依據 close code 分類處理
            let toastMessage = '';
            let toastIcon = '⚡';
            let shouldReconnect = true;
            
            if (closeCode === 1000) {
              // 正常關閉：Session 到期或伺服器主動結束
              toastMessage = '翻譯工作階段已結束，系統正在自動重新建立連線。';
              toastIcon = '🔄';
            } else if (closeCode === 1011) {
              // 伺服器內部錯誤：Rate Limit 或容量不足
              toastMessage = 'API 暫時不可用（可能已達使用上限），已切換至本地模式。';
              toastIcon = '⏳';
            } else if (closeCode === 1006) {
              // 異常斷線：實際的網路不穩定
              toastMessage = '連線暫時中斷，已切換至本地模式。語音與文字輸入仍可正常使用。';
              toastIcon = '⚡';
            } else {
              // 其他未知原因
              toastMessage = `連線已關閉（代碼 ${closeCode}），已切換至本地模式。`;
              toastIcon = '⚡';
            }
            
            isFallbackModeRef.current = true;
            setIsFallbackMode(true);
            stopLiveSession("reconnect");
            
            // 確保本地 STT 持續運行
            if (isRecordingRef.current && !recognitionRef.current) {
              console.log("[Fallback] Re-initializing local STT after disconnect...");
              setupSpeechRecognition();
            }
            
            // 如果使用者還在錄音模式，實作指數退避重連
            if (isRecordingRef.current && shouldReconnect) {
              const backoffMs = Math.min(1000 * Math.pow(2, reconnectCountRef.current), 30000);
              reconnectCountRef.current++;
              
              console.log(`[Fallback] Retrying in ${backoffMs}ms (Attempt ${reconnectCountRef.current}, Code: ${closeCode})`);
              
              // 僅在第一次斷線時提示
              if (reconnectCountRef.current === 1) {
                toast(toastMessage, {
                  id: 'voice-fallback',
                  icon: toastIcon,
                  duration: 6000,
                  style: { background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B' }
                });
              }

              reconnectTimeoutRef.current = setTimeout(() => {
                if (isRecordingRef.current) {
                  startLiveSession();
                }
              }, backoffMs);
            }
          },
          onerror: (err: any) => {
            console.error("Live API Error:", err);
            isFallbackModeRef.current = true;
            setIsFallbackMode(true);
            // onerror 通常會伴隨 onclose，這裡僅作紀錄與標記
          }
        }
      });
      
      console.warn("[Diagnostic] Live API SESSION ESTABLISHED & ACTIVE!");
    } catch (err: any) {
      console.error("Failed to start Live API:", err);
      let errorMessage = err.message || "啟動失敗";
      setErrorMsg(errorMessage);
      setCustomAlert({ message: errorMessage, type: 'alert' });
      stopLiveSession("initialization_failure");
    } finally {
      isInitializingRef.current = false;
    }
  };

  // 切換錄音狀態 (同步到 Firestore)
  const toggleRecording = async () => {
    console.trace("[Diagnostic] toggleRecording called");
    // 【解決 Chrome Web Audio Autoplay Policy 限制】
    // 必須在使用者發生「實際點擊事件」的 Call Stack 中立刻實例化或啟動所有的 AudioContext
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      // [FIX] 為符合瀏覽器自動播放政策，必須在 User Gesture (onClick) 中立即 resume 並建立上下文
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new AudioContextClass({ latencyHint: 'interactive', sampleRate: 16000 });
        } catch(e) {
          audioContextRef.current = new AudioContextClass({ latencyHint: 'interactive' });
        }
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      if (!playbackContextRef.current) {
        try {
          playbackContextRef.current = new AudioContextClass({ sampleRate: 24000 });
        } catch(e) {
          playbackContextRef.current = new AudioContextClass();
        }
      }
      if (playbackContextRef.current.state === 'suspended') {
        playbackContextRef.current.resume();
      }

      // 播放一段極短的靜音音訊以「永久解鎖」此 Session 的播放權限
      const silentBuffer = playbackContextRef.current.createBuffer(1, 1, 22050);
      const silentSource = playbackContextRef.current.createBufferSource();
      silentSource.buffer = silentBuffer;
      silentSource.connect(playbackContextRef.current.destination);
      silentSource.start();

      // 解鎖 SpeechSynthesis (本地極速模式使用)
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // 先清除可能卡住的隊列
        const unlockUtterance = new SpeechSynthesisUtterance("");
        unlockUtterance.volume = 0;
        window.speechSynthesis.speak(unlockUtterance);
        window.speechSynthesis.resume();
      }
    } catch (e) {
      console.warn("[Gesture] Audio/TTS wakeup failed:", e);
    }


    // 啟動錄音時，如果處於靜音模式，提醒使用者或自動切換
    if (audioOutputMode === 'None' || !isAudioOutputEnabled) {
      setCustomAlert({ message: "目前處於靜音模式，已自動為您開啟語音朗讀。", type: 'alert' });
      setIsAudioOutputEnabled(true);
      setAudioOutputMode('ALL');
      localStorage.setItem('audio_output_mode', 'ALL');
    }

    const newState = !isRecording;
    console.log(`[Diagnostic] setIsRecording(${newState}) from toggleRecording`);
    setIsRecording(newState);

    // [iOS/WebKit CRITICAL FIX] 必須在使用者點擊的同一個 Call Stack 中觸發 getUserMedia
    if (newState) {
      startLiveSession();
    } else {
      stopLiveSession("user_stop");
    }
    
    if (roomId) {
      try {
        await updateDoc(doc(db, 'rooms', roomId), {
          isSpeakingEnabled: newState
        });
      } catch (e) {
        console.error("Failed to sync recording state to Firestore:", e);
      }
    }
  };

  // 監聽語言變更，同步更新本地辨識語系與雲端 Session
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isRecordingRef.current) {
      // 1. 重啟本地語音辨識
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }

      // 2. 重啟 Gemini Live Session 以套用新的 System Instruction
      if (isLiveRef.current) {
        console.log("[Diagnostic] Language changed, restarting Live session...");
        stopLiveSession("language_changed");
        
        // 給系統一個極短的時間清理資源，再自動重啟以綁定新語系
        timer = setTimeout(() => {
          if (isRecordingRef.current) {
            startLiveSession();
          }
        }, 800);
      }
    }

    return () => clearTimeout(timer);
  }, [localLang, clientLang]);

  return (
    <div className={cn("h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col overflow-hidden transition-colors duration-300", isDarkMode && "dark")}>
      <Toaster position="top-center" />
      {/* QR Code Modal */}
      {showQrCode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-4" onClick={() => setShowQrCode(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-8 text-center relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowQrCode(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-100">掃描加入房間</h3>
            <div className="bg-white p-4 rounded-xl inline-block shadow-sm border border-slate-100">
              <QRCodeSVG value={`${window.location.origin}/?room=${roomId}`} size={240} level="H" includeMargin={true} />
            </div>
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400 break-all max-w-[280px] mx-auto">
              {`${window.location.origin}/?room=${roomId}`}
            </p>
          </div>
        </div>
      )}

      {/* Time Prompt Modal */}
      {showTimePrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 p-6 text-center">
            <h3 className="text-lg font-bold mb-4">系統提示</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">連線已逾1 hr，請問是否繼續</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  stopLiveSession();
                  setShowTimePrompt(false);
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
              >
                Off-line
              </button>
              <button
                onClick={() => setShowTimePrompt(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert/Confirm Dialog */}
      {customAlert && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 p-6 text-center">
            <h3 className="text-lg font-bold mb-4">{customAlert.type === 'confirm' ? '請確認' : '系統提示'}</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">{customAlert.message}</p>
            <div className="flex justify-center gap-3 flex-wrap">
              {customAlert.type === 'custom' && customAlert.buttons ? (
                customAlert.buttons.map((btn, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      btn.onClick();
                      setCustomAlert(null);
                    }}
                    className={cn(
                      "px-4 py-2 font-medium rounded-lg transition-colors",
                      btn.variant === 'danger' ? "bg-red-600 hover:bg-red-700 text-white" :
                      btn.variant === 'secondary' ? "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300" :
                      "bg-blue-600 hover:bg-blue-700 text-white"
                    )}
                  >
                    {btn.label}
                  </button>
                ))
              ) : (
                <>
                  {customAlert.type === 'confirm' && (
                    <button
                      onClick={() => setCustomAlert(null)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
                    >
                      取消
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (customAlert.onConfirm) customAlert.onConfirm();
                      setCustomAlert(null);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    確定
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Name Dialog */}
      {showNameDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-2xl font-bold mb-2 text-center">{getUiText('welcome')}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-8">
              {getUiText('enterSpeakerId')}
            </p>
            <div className="space-y-4">
              <input
                type="text"
                placeholder={getUiText('enterSpeakerId').split('，')[0]}
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <div className="space-y-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Gemini API Key</label>
                        <input
                          type="password"
                          value={userApiKey}
                          onChange={(e) => setUserApiKey(e.target.value)}
                          placeholder="AIza..."
                          className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      {/* 依據需求已移除登入畫面的 Google Cloud API Key (高品質語音) 輸入欄位 */}
                    </div>
              <button
                disabled={!tempName.trim()}
                onClick={() => {
                  setUserName(tempName);
                  localStorage.setItem('user_name', tempName);
                  setShowNameDialog(false);
                  // Directly join the room if a room ID is already in the URL
                  if (joinRoomIdInput.trim()) {
                    handleJoinRoom();
                  } else {
                    setShowRoomDialog(true);
                  }
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {getUiText('confirmAndEnter')}
              </button>
              <button
                onClick={() => { setManualLang(getManualLangForLocale(uiLang)); setShowManual(true); }}
                className="w-full py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800"
              >
                <Info className="w-4 h-4" /> User Manual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Dialog */}
      {!showNameDialog && showRoomDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <div className="flex justify-end mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{getUiText('uiInterface')}</span>
                  <div className="relative inline-block w-32">
                    <Globe2 className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={uiLang}
                      onChange={(e) => setUiLang(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all appearance-none dark:text-slate-200"
                    >
                      {LANGUAGES.map(lang => {
                        const countryCode = lang.id.split('-')[1];
                        const flagEmoji = countryCode ? getFlagEmoji(countryCode) : '';
                        return (
                          <option key={`ui-${lang.id}`} value={lang.id}>
                            {flagEmoji} {getUiText(lang.nameKey)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-center">{getUiText('roomTitle')}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-8">
                {getUiText('roomDesc')}
              </p>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {getUiText('displayNameLabel')}
                  </label>
                  <input
                    type="text"
                    placeholder="輸入您的名字或 ID"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {getUiText('apiKeyLabel')}
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      placeholder={getUiText('apiKeyLabel')}
                      value={userApiKey}
                      onChange={(e) => setUserApiKey(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-24"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => setUserApiKey('')}
                        className="p-2 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateRoom}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" /> {getUiText('createRoomBtn')}
                </button>
                <button
                  onClick={() => { setManualLang(getManualLangForLocale(uiLang)); setShowManual(true); }}
                  className="w-full py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800"
                >
                  <Info className="w-4 h-4" /> User Manual
                </button>
              </div>
              
              <div className="mt-6 text-center text-xs text-slate-500">
                {getUiText('activeConnections')}{activeConnections} / 100
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shadow-sm z-10 flex-shrink-0 transition-colors duration-300">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center min-w-[30px]">
              <span className="text-red-600 dark:text-red-500 font-bold text-xl tracking-wider">{headerTitle1}</span>
            </div>
            <h1 className="text-base font-semibold tracking-tight">{headerTitle2}</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 text-sm text-slate-500 dark:text-slate-400 font-medium overflow-x-auto pb-1 sm:pb-0">
            {roomId && (
              <div className="flex items-center gap-2 mr-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                <span className="text-xs font-medium">{getUiText('roomLabel')}{roomId}</span>
                <button 
                  onClick={handleShareUrl}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-blue-600 dark:text-blue-400 ml-2"
                  title={getUiText('copyUrl')}
                >
                  {shareSuccess ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setShowQrCode(true)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-blue-600 dark:text-blue-400"
                  title={getUiText('showQrCode')}
                >
                  <QrCode className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (user?.uid === roomCreatorId) {
                      setCustomAlert({
                        message: '您要離開房間，還是結束會議室（所有人將被登出）？',
                        type: 'custom',
                        buttons: [
                          { label: '取消', onClick: () => {}, variant: 'secondary' },
                          { label: '僅離開', onClick: () => {
                            setRoomId(null);
                            setTranscripts([]);
                            setShowRoomDialog(true);
                            window.history.replaceState({}, '', window.location.pathname);
                          }, variant: 'primary' },
                          { label: '結束會議室', onClick: async () => {
                            try {
                              await updateDoc(doc(db, 'rooms', roomId), { isClosed: true });
                            } catch (e) {
                              console.error(e);
                            }
                            setRoomId(null);
                            setTranscripts([]);
                            setShowRoomDialog(true);
                            window.history.replaceState({}, '', window.location.pathname);
                          }, variant: 'danger' }
                        ]
                      });
                    } else {
                      setRoomId(null);
                      setTranscripts([]);
                      setShowRoomDialog(true);
                      window.history.replaceState({}, '', window.location.pathname);
                    }
                  }}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-red-600 dark:text-red-400"
                  title={getUiText('leaveRoom')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-1 px-2" title={getUiText('totalConnections')}>
              <Users className="w-4 h-4" />
              <span className={cn("text-xs font-mono", activeConnections >= 90 ? "text-red-500" : "")}>
                {activeConnections}/100
              </span>
            </div>

            <button
              onClick={() => { setManualLang(getManualLangForLocale(uiLang)); setShowManual(true); }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title="User Manual"
            >
              <Info className="w-5 h-5 text-blue-500" />
            </button>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title={getUiText('darkMode')}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
            {(!roomId || (user && roomCreatorId && user.uid === roomCreatorId)) && (
              <button 
                onClick={() => setShowAdminSettings(true)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                title={getUiText('adminSettings')}
              >
                <Lock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            )}
            <span className="hidden sm:flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {getUiText('systemReady')}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 overflow-hidden relative">
        
        {/* API Key 設定區塊 */}
        {/* 管理者設定彈窗 */}
      {showAdminSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-500" /> {getUiText('adminAdvancedSettings')}
                </h3>
                <button 
                  onClick={() => setShowAdminSettings(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Quotas Limitation 面板 */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quotas Limitation</h4>
                    <button
                      onClick={() => {
                        const info = `根據 Google AI Studio 與 Google Cloud 2026 年最新規範，Gemini API 的配額與重置機制整理如下：
配額類別 (Quotas Categories)
RPM (Requests Per Minute)：每分鐘請求次數，限制瞬時併發量。
TPM (Tokens Per Minute)：每分鐘 Token 消耗量，限制資料處理吞吐量。
RPD (Requests Per Day)：每日總請求次數，限制單日總使用規模。
配額限制對比 (以 Gemini 1.5 Flash 為例)
配額類別 Free Tier (免費層級) Tier 1 (Pay-as-you-go)
RPM 15 RPM 300 RPM
TPM 1,000,000 TPM 4,000,000 TPM
RPD 1,500 RPD 無硬性限制 (受預算限制)
重置時間與邏輯
-RPM / TPM (分鐘級)：
--邏輯：採用「令牌桶演算法」(Token Bucket)。這並非固定在每分鐘的第 0 秒重置，而是隨著時間推移持續補充額度。
--恢復：若達到上限，通常需等待數秒至一分鐘即可繼續發送請求。
-RPD (日級)：
--重置時間：每日午夜 00:00 (太平洋時間 PT)。
--換算：台灣時間 (UTC+8) 為每日 15:00 (冬令) 或 16:00 (夏令) 重置。`;
                        const win = window.open('', '_blank', 'width=600,height=600');
                        win?.document.write(`<pre style="white-space: pre-wrap; font-family: sans-serif; padding: 20px;">${info}</pre>`);
                      }}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
                      title="查看配額說明"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                  {(() => {
                    const allStats = JSON.parse(localStorage.getItem('api_usage_stats') || '{}');
                    const stats = allStats[userApiKey] || { rpm: 0, tpm: 0, rpd: 0 };
                    
                    const limits = apiTier === 'paid' 
                      ? { rpm: 300, tpm: 4000000, rpd: Infinity } 
                      : { rpm: 15, tpm: 1000000, rpd: 1500 };
                    
                    const renderQuota = (label: string, used: number, limit: number) => {
                      const percentage = limit === Infinity ? 0 : Math.min((used / limit) * 100, 100);
                      const barColor = percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-blue-600';
                      return (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>{label}</span>
                            <span>{used.toLocaleString()} / {limit === Infinity ? '∞' : limit.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div className="space-y-3">
                        {renderQuota('RPM', stats.rpm || 0, limits.rpm)}
                        {renderQuota('TPM', stats.tpm || 0, limits.tpm)}
                        {renderQuota('RPD', stats.rpd || 0, limits.rpd)}
                      </div>
                    );
                  })()}
                </div>

                {/* API 金鑰設定 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-500" /> {getUiText('apiKeySetting')}
                  </h4>
                  
                  {/* API Tier 選擇 */}
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                    <button
                      onClick={() => setApiTier('free')}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all ${apiTier === 'free' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Free Tier
                    </button>
                    <button
                      onClick={() => setApiTier('paid')}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all ${apiTier === 'paid' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Tier 1 (Paid)
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={userApiKey}
                      onChange={(e) => {
                        setUserApiKey(e.target.value);
                        localStorage.setItem('gemini_api_key', e.target.value);
                      }}
                      className="w-full pl-4 pr-24 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                      placeholder="Gemini API Key"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={userGoogleCloudApiKey}
                      onChange={(e) => {
                        setUserGoogleCloudApiKey(e.target.value);
                        localStorage.setItem('google_cloud_api_key', e.target.value);
                      }}
                      className="w-full pl-4 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                      placeholder="Google Cloud API Key (高品質語音)"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    設定後，他人的譯文將以雲端 Neural 近真人音訊朗讀。
                  </p>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 語音人聲設定 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-blue-500" /> {getUiText('voiceTypeSetting')}
                  </h4>
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                    <button
                      onClick={() => setVoiceType('Men')}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all ${voiceType === 'Men' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Men
                    </button>
                    <button
                      onClick={() => setVoiceType('Women')}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all ${voiceType === 'Women' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Women
                    </button>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 頂部標題設定 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Languages className="w-4 h-4 text-purple-500" /> {getUiText('headerTitle1Setting').split(' 1')[0]}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{getUiText('headerTitle1Setting')} (預設: TUC)</label>
                      <input
                        type="text"
                        value={headerTitle1}
                        onChange={(e) => setHeaderTitle1(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{getUiText('headerTitle2Setting')} (預設: Equipment Department)</label>
                      <input
                        type="text"
                        value={headerTitle2}
                        onChange={(e) => setHeaderTitle2(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* API 費用與配額統計 (隱藏區塊) */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-red-500" /> API 費用與配額統計 (需解鎖)
                  </h4>
                  {!isCostUnlocked ? (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="輸入解鎖密碼"
                        value={costPasswordInput}
                        onChange={(e) => setCostPasswordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (costPasswordInput === '3102') setIsCostUnlocked(true);
                            else setCustomAlert({ message: '密碼錯誤', type: 'alert' });
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                      <button 
                        onClick={() => {
                          if (costPasswordInput === '3102') setIsCostUnlocked(true);
                          else setCustomAlert({ message: '密碼錯誤', type: 'alert' });
                        }}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors"
                      >
                        解鎖
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 text-sm text-slate-700 dark:text-slate-300">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">本月累積連線時間：</span>
                        <span className="font-mono bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded">
                          {Math.floor(sessionSeconds / 60)} 分 {sessionSeconds % 60} 秒
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">本月預估費用 (NTD)：</span>
                        <span className="font-mono bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded">
                          約 ${(sessionSeconds * 0.05).toFixed(2)} 元
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        *此為根據連線時間之粗略估算 (約 0.05 NTD/秒)，實際費用請以 Google Cloud 帳單為準。
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <a 
                          href="https://console.cloud.google.com/billing" 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex-1 text-center px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-lg text-blue-600 dark:text-blue-400 font-medium transition-colors"
                        >
                          查看 Billing (帳單)
                        </a>
                        <a 
                          href="https://console.cloud.google.com/iam-admin/quotas" 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex-1 text-center px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-lg text-blue-600 dark:text-blue-400 font-medium transition-colors"
                        >
                          查看 Quotas (配額)
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-8">
                <button
                  onClick={() => {
                    setShowAdminSettings(false);
                    // 立即生效：如果正在錄音，重新初始化
                    if (isRecording) {
                      stopLiveSession();
                      setTimeout(() => startLiveSession(), 500);
                    }
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                >
                  儲存並關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* 控制面板：互譯功能選擇與錄音按鈕 */}
        <div className="flex flex-col gap-2">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-2 sm:p-3 flex flex-row items-center justify-between flex-shrink-0 gap-2 transition-colors duration-300">
            
            {/* 左側國旗 (Local) */}
            <div className="flex items-center justify-center flex-shrink-0">
              <CountryFlag langId={localLang} className="w-8 h-5 sm:w-10 sm:h-7 rounded shadow-sm border border-slate-200 dark:border-slate-700 object-cover" />
            </div>

            <div className="flex flex-row items-center gap-2 w-full max-w-2xl mx-auto">
              <div className="flex-1">
                <div className="relative">
                  <Globe2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <div className="flex items-center gap-1">
                    <select 
                      value={localLang}
                      onChange={(e) => setLocalLang(e.target.value)}
                      disabled={isRecording}
                      className="w-full pl-2 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:opacity-80 appearance-none dark:text-slate-200"
                    >
                      {LANGUAGES.map(lang => {
                        const countryCode = lang.id.split('-')[1];
                        const flagEmoji = countryCode ? getFlagEmoji(countryCode) : '';
                        return (
                          <option key={`local-${lang.id}`} value={lang.id}>
                            {flagEmoji} {getUiText(lang.nameKey)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <button
                  onClick={() => {
                    if (isRecording) return;
                    const temp = localLang;
                    setLocalLang(clientLang);
                    setClientLang(temp);
                  }}
                  disabled={isRecording}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="互換語系"
                >
                  <ArrowRightLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              <div className="flex-1">
                <div className="relative">
                  <Globe2 className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <div className="flex items-center gap-1">
                    <select 
                      value={clientLang}
                      onChange={(e) => setClientLang(e.target.value)}
                      disabled={isRecording}
                      className="w-full pl-2 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:opacity-80 appearance-none dark:text-slate-200"
                    >
                      {LANGUAGES.map(lang => {
                        const countryCode = lang.id.split('-')[1];
                        const flagEmoji = countryCode ? getFlagEmoji(countryCode) : '';
                        return (
                          <option key={`client-${lang.id}`} value={lang.id}>
                            {flagEmoji} {getUiText(lang.nameKey)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* 狀態指示器 */}
                {isRecording && (
                  isFallbackMode ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg animate-pulse">
                      <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Local</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Live</span>
                    </div>
                  )
                )}
                <button
                  onClick={toggleRecording}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-300 shadow-sm h-[32px]",
                    isRecording
                      ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 animate-pulse" 
                      : "bg-blue-600 text-white hover:bg-blue-700 border border-transparent"
                  )}
                >
                  {isRecording ? (
                    <><Square className="w-3.5 h-3.5 fill-current" /> <span className="text-xs">{getUiText('stop')}</span></>
                  ) : (
                    <><Mic className="w-3.5 h-3.5" /> <span className="text-xs">{getUiText('speaking')}</span></>
                  )}
                </button>
              </div>
            </div>

            {/* 右側國旗 (Client) */}
            <div className="flex items-center justify-center flex-shrink-0">
              <CountryFlag langId={clientLang} className="w-8 h-5 sm:w-10 sm:h-7 rounded shadow-sm border border-slate-200 dark:border-slate-700 object-cover" />
            </div>
          </div>



        </div>

        {/* 錯誤訊息提示 */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 flex-shrink-0 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{errorMsg}</p>
          </div>
        )}

        {/* 翻譯對話框 (可滾動區域) */}
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col min-h-0 transition-colors duration-300">
          <div className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 px-4 sm:px-5 py-3 flex justify-between items-center flex-shrink-0 transition-colors duration-300">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-medium text-slate-600 dark:text-slate-300">{getUiText('textTranscript')}</h2>
              {isRecording && (
                <div className={cn("flex items-center gap-2 text-xs font-medium animate-pulse", isFallbackMode ? "text-amber-500" : "text-red-500")}>
                  <div className={cn("w-2 h-2 rounded-full", isFallbackMode ? "bg-amber-500" : "bg-red-500")}></div>
                  {isFallbackMode ? '本地模式聆聽中...' : '正在聆聽...'}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(!roomId || (user && roomCreatorId && user.uid === roomCreatorId)) && (
                <>
                  <button
                    onClick={handleShare}
                    disabled={transcripts.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {shareSuccess ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
                    {getUiText('share')}
                  </button>
                  <button
                    onClick={() => {
                      if (roomId) {
                        handleClearRoomChat();
                      } else {
                        setShowClearConfirm(true);
                      }
                    }}
                    disabled={transcripts.length === 0 || (!!roomId && (!user || roomCreatorId !== user?.uid))}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={roomId && (!user || roomCreatorId !== user?.uid) ? "只有房間建立者可以清除紀錄" : ""}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {getUiText('clear')}
                  </button>
                </>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden p-4 sm:p-5">
            {transcripts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-4 min-h-[200px]">
                <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                  <Languages className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm">點擊上方按鈕開始對話</p>
              </div>
            ) : (
              <Virtuoso
                ref={virtuosoRef}
                style={{ height: '100%' }}
                data={memoizedTranscripts}
                itemContent={(index, t) => (
                  <div className="mb-4">
                    <TranscriptItem key={t.id} t={t} />
                  </div>
                )}
                increaseViewportBy={1000}
                atTopStateChange={setIsAtTop}
                initialTopMostItemIndex={0}
              />
            )}
          </div>
          {/* Text Input Translation Bar */}
          <div className="border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-4">
            <div className="max-w-4xl mx-auto space-y-3">
              {/* Translation Preview (停用預覽，改為發送時串流出現) */}

              {/* Input Area */}
              <div className="flex items-end gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <button 
                  onClick={() => setTranslationDirection(prev => prev === 'localToClient' ? 'clientToLocal' : 'localToClient')}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shrink-0 flex items-center gap-2"
                  title="Switch Language Direction"
                >
                  <ArrowRightLeft className={cn("w-4 h-4 transition-transform duration-500", translationDirection === 'clientToLocal' && "rotate-180")} />
                  <span className="text-xs font-medium hidden sm:inline">
                    {translationDirection === 'localToClient' ? 'Local → Client' : 'Client → Local'}
                  </span>
                </button>
                
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type text to translate..."
                  className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2.5 px-1 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 text-[15px] min-h-[44px] max-h-32"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (inputText.trim()) {
                        handleSendText();
                      }
                    }
                  }}
                />

                <button
                  onClick={handleSendText}
                  disabled={!inputText.trim()}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all shrink-0"
                  title={!isRecording ? "錄音目前關閉，將使用文字模式" : ""}
                >
                  {isTranslatingText ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Onboarding Modal */}
        {showOnboarding && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full animate-in zoom-in-95">
              <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">歡迎使用 AI 即時翻譯</h2>
              <ul className="space-y-3 mb-6 text-sm text-slate-600 dark:text-slate-300">
                <li>1. 選擇您的語言與對方語言。</li>
                <li>2. 點擊錄音按鈕開始即時翻譯。</li>
                <li>3. 語音輸出可以從控制面板調整。</li>
              </ul>
              <button 
                onClick={() => {
                  localStorage.setItem('onboarding_completed', 'true');
                  setShowOnboarding(false);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
              >
                開始使用
              </button>
            </div>
          </div>
        )}

        {/* 懸浮式語音輸出設定按鈕 (FAB) */}
        <div className="fixed bottom-28 right-6 z-[100] flex flex-col items-end">
          {/* 展開的設定選單 */}
          {showAudioSettings && (
            <div className="mb-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl p-4 flex flex-col gap-4 min-w-[240px] animate-in fade-in zoom-in slide-in-from-bottom-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-blue-500" /> 播放設定
                </span>
                <button onClick={() => setShowAudioSettings(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* 輸出方式 */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1">
                  <Globe2 className="w-3 h-3" /> 輸出對象
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['None', 'Myself', 'ALL', 'Others'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setAudioOutputMode(mode);
                        setIsAudioOutputEnabled(mode !== 'None');
                      }}
                      className={cn(
                        "px-3 py-2 text-xs font-medium rounded-xl transition-all border",
                        audioOutputMode === mode
                          ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300"
                      )}
                    >
                      {mode === 'None' ? '靜音' : mode === 'Myself' ? '僅自己' : mode === 'ALL' ? '全部' : '僅他人'}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* 主按鈕 */}
          <button 
            onClick={() => setShowAudioSettings(!showAudioSettings)}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 border-4 border-white dark:border-slate-900 group relative",
              isAudioOutputEnabled 
                ? "bg-gradient-to-tr from-blue-600 to-purple-600 text-white" 
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600"
            )}
          >
            {isAudioOutputEnabled ? (
              <Volume2 className="w-7 h-7 animate-[pulse_2s_ease-in-out_infinite]" />
            ) : (
              <VolumeX className="w-6 h-6" />
            )}
            
            {/* Tooltip */}
            <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              語音輸出設定
            </span>
          </button>
        </div>

        {/* Clear Confirm Modal */}
        {showClearConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full animate-in zoom-in-95">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{getUiText('clearTitle')}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{getUiText('clearDesc')}</p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {getUiText('cancel')}
                </button>
                <button 
                  onClick={handleClear}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  {getUiText('confirmClear')}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* User Manual Modal */}
      {showManual && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">User Manual</h3>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={manualLang}
                  onChange={(e) => setManualLang(e.target.value as ManualLangCode)}
                  className="text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {MANUAL_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowManual(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 prose prose-slate dark:prose-invert prose-sm max-w-none
              prose-table:border-collapse prose-table:w-full
              prose-th:border prose-th:border-slate-300 dark:prose-th:border-slate-600 prose-th:px-3 prose-th:py-2 prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:text-left prose-th:text-xs prose-th:font-semibold
              prose-td:border prose-td:border-slate-300 dark:prose-td:border-slate-600 prose-td:px-3 prose-td:py-2 prose-td:text-sm
              prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:my-4 prose-blockquote:rounded-r-lg
              [&_blockquote:has(p:first-child:is([data-note]))]:border-blue-400 [&_blockquote:has(p:first-child:is([data-note]))]:bg-blue-50/50
              custom-scrollbar
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  blockquote: ({ children, ...props }) => {
                    const text = String(children);
                    let borderColor = 'border-slate-300 dark:border-slate-600';
                    let bgColor = 'bg-transparent';
                    let icon = '';
                    if (text.includes('[!NOTE]')) {
                      borderColor = 'border-blue-400'; bgColor = 'bg-blue-50 dark:bg-blue-950/30'; icon = '\u2139\uFE0F';
                    } else if (text.includes('[!IMPORTANT]')) {
                      borderColor = 'border-purple-400'; bgColor = 'bg-purple-50 dark:bg-purple-950/30'; icon = '\u2757';
                    } else if (text.includes('[!WARNING]')) {
                      borderColor = 'border-amber-400'; bgColor = 'bg-amber-50 dark:bg-amber-950/30'; icon = '\u26A0\uFE0F';
                    } else if (text.includes('[!CAUTION]')) {
                      borderColor = 'border-red-400'; bgColor = 'bg-red-50 dark:bg-red-950/30'; icon = '\uD83D\uDED1';
                    } else if (text.includes('[!TIP]')) {
                      borderColor = 'border-green-400'; bgColor = 'bg-green-50 dark:bg-green-950/30'; icon = '\uD83D\uDCA1';
                    }
                    return (
                      <blockquote className={`border-l-4 ${borderColor} ${bgColor} pl-4 pr-3 py-2 my-4 rounded-r-lg not-prose`} {...props}>
                        <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                          {icon && <span className="mr-1">{icon}</span>}
                          {React.Children.map(children, child => {
                            if (React.isValidElement(child) && child.type === 'p') {
                              const pText = String((child as any).props?.children || '');
                              const cleaned = pText.replace(/\[!(NOTE|IMPORTANT|WARNING|CAUTION|TIP)\]\s*/g, '');
                              return <p className="my-1">{cleaned}</p>;
                            }
                            return child;
                          })}
                        </div>
                      </blockquote>
                    );
                  },
                  table: ({ children, ...props }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="w-full border-collapse text-sm" {...props}>{children}</table>
                    </div>
                  ),
                }}
              >
                {manualLoading ? '' : manualMarkdown}
              </ReactMarkdown>
              {manualLoading && (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
