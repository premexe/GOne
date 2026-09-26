type SpeechRecognitionModule = {
  isRecognitionAvailable: () => boolean;
  requestMicrophonePermissionsAsync: () => Promise<{ granted: boolean }>;
  androidTriggerOfflineModelDownload?: (options: { locale: string }) => Promise<unknown>;
  getSupportedLocales?: (options: Record<string, never>) => Promise<{ installedLocales: string[] }>;
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (event: string, listener: (event: any) => void) => { remove: () => void };
};

type BrowserRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript?: string }> & { isFinal?: boolean }>;
};

type BrowserRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: BrowserRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type BrowserRecognitionConstructor = new () => BrowserRecognition;

function getBrowserRecognitionConstructor(): BrowserRecognitionConstructor | null {
  const browserGlobal = globalThis as typeof globalThis & {
    SpeechRecognition?: BrowserRecognitionConstructor;
    webkitSpeechRecognition?: BrowserRecognitionConstructor;
  };
  return browserGlobal.SpeechRecognition || browserGlobal.webkitSpeechRecognition || null;
}

// Expo Go does not contain third-party native modules. Loading this lazily
// keeps every screen usable there, while development/production builds use
// the installed native recognizer.
function getSpeechRecognitionModule(): SpeechRecognitionModule | null {
  try {
    return require('expo-speech-recognition').ExpoSpeechRecognitionModule as SpeechRecognitionModule;
  } catch (_error) {
    return null;
  }
}

export function isSpeechRecognitionAvailable(): boolean {
  if (typeof window !== 'undefined') return Boolean(getBrowserRecognitionConstructor());
  return getSpeechRecognitionModule()?.isRecognitionAvailable() ?? false;
}

export async function startSpeechRecognition(options: {
  language?: string;
  onTranscript: (transcript: string) => void;
  onEnd: () => void;
  onError: (message: string) => void;
}): Promise<{ stop: () => void; abort: () => void } | null> {
  const BrowserRecognition = getBrowserRecognitionConstructor();
  if (typeof window !== 'undefined' && BrowserRecognition) {
    const recognition = new BrowserRecognition();
    let active = true;

    recognition.lang = options.language || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      if (!result?.isFinal) return;
      const transcript = result[0]?.transcript?.trim();
      if (transcript) options.onTranscript(transcript);
    };
    recognition.onerror = (event) => {
      if (active && event.error !== 'aborted') {
        options.onError(event.message || `Browser speech recognition failed${event.error ? `: ${event.error}` : '.'}`);
      }
    };
    recognition.onend = () => {
      if (active) options.onEnd();
    };

    try {
      recognition.start();
    } catch (error) {
      options.onError(error instanceof Error ? error.message : 'Browser speech recognition could not start.');
      return null;
    }

    return {
      stop: () => recognition.stop(),
      abort: () => {
        active = false;
        recognition.abort();
      },
    };
  }

  const speechRecognition = getSpeechRecognitionModule();
  if (!speechRecognition?.isRecognitionAvailable()) return null;

  const permission = await speechRecognition.requestMicrophonePermissionsAsync();
  if (!permission.granted) {
    options.onError('Microphone permission is required to transcribe a voice note. Allow it in Settings and try again.');
    return null;
  }

  const subscriptions = [
    speechRecognition.addListener('result', (event) => {
      // Android emits changing interim hypotheses. Persist only a final answer
      // so the SOS transcript never contains the same sentence repeatedly.
      if (event.isFinal === false) return;
      const transcript = event.results[0]?.transcript?.trim();
      if (transcript) options.onTranscript(transcript);
    }),
    speechRecognition.addListener('error', (event) => {
      if (event.error !== 'aborted') options.onError(event.message || 'Speech recognition could not transcribe this recording.');
    }),
    speechRecognition.addListener('end', () => {
      subscriptions.forEach((subscription) => subscription.remove());
      options.onEnd();
    }),
  ];

  const locale = options.language || 'en-US';

  speechRecognition.start({
    lang: locale,
    continuous: false,
    interimResults: true,
    // Use the phone's normal recognition service. Requiring a downloaded
    // offline model prevented the first voice interview on many devices.
    requiresOnDeviceRecognition: false,
    addsPunctuation: false,
    contextualStrings: ['chest pain', 'breathing difficulty', 'bleeding', 'accident', 'unconscious'],
  });

  return { stop: () => speechRecognition.stop(), abort: () => speechRecognition.abort() };
}
