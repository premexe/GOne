import { Platform } from 'react-native';

type SpeechRecognitionModule = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
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
  if (Platform.OS === 'web') return Boolean(getBrowserRecognitionConstructor());
  return getSpeechRecognitionModule()?.isRecognitionAvailable() ?? false;
}

function preferredLanguage(): string {
  try {
    // Use the language configured on the person's device instead of forcing
    // English or Hindi for every emergency note.
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-IN';
  } catch (_error) {
    return 'en-IN';
  }
}

export async function startSpeechRecognition(options: {
  language?: string;
  onTranscript: (transcript: string) => void;
  onEnd: () => void;
  onError: (message: string) => void;
}): Promise<{ stop: () => void; abort: () => void } | null> {
  const BrowserRecognition = getBrowserRecognitionConstructor();
  if (Platform.OS === 'web' && BrowserRecognition) {
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
  if (!speechRecognition) {
    options.onError('Voice transcription is not included in this installed build. Install the latest G-ONE APK, allow Microphone permission, then try again.');
    return null;
  }

  // This requests both microphone permission and the separate iOS speech
  // recognition permission. Requesting only RECORD_AUDIO left iOS unable to
  // start transcription.
  let permission: { granted: boolean };
  try {
    permission = await speechRecognition.requestPermissionsAsync();
  } catch (error) {
    options.onError(error instanceof Error ? error.message : 'Microphone permission could not be requested.');
    return null;
  }
  if (!permission.granted) {
    options.onError('Microphone permission is required to transcribe a voice note. Allow it in Settings and try again.');
    return null;
  }

  if (!speechRecognition.isRecognitionAvailable()) {
    options.onError('No speech recognition service is available. Enable Google voice typing or install/update the Google app, then try again.');
    return null;
  }

  const subscriptions = [
    speechRecognition.addListener('result', (event) => {
      // Android emits changing interim hypotheses. Persist only a final answer
      // so the SOS transcript never contains the same sentence repeatedly.
      if (event.isFinal === false) return;
      // Keep the first final alternative. This is the Android event shape
      // used by the last known working G-ONE build.
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

  const locale = options.language || preferredLanguage();

  try {
    speechRecognition.start({
      lang: locale,
      continuous: false,
      interimResults: true,
      // Use the phone's normal recognition service. Requiring a downloaded
      // offline model prevented the first voice interview on many devices.
      requiresOnDeviceRecognition: false,
      addsPunctuation: false,
      contextualStrings: ['chest pain', 'breathing difficulty', 'bleeding', 'accident', 'unconscious'],
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
      },
    });
  } catch (error) {
    subscriptions.forEach((subscription) => subscription.remove());
    options.onError(error instanceof Error ? error.message : 'Speech recognition could not start.');
    return null;
  }

  return { stop: () => speechRecognition.stop(), abort: () => speechRecognition.abort() };
}
