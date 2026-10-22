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
    let latestTranscript = '';
    let delivered = false;

    const deliver = (text: string) => {
      const clean = text.trim();
      if (clean && !delivered) {
        delivered = true;
        options.onTranscript(clean);
      }
    };

    recognition.lang = options.language || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0]?.transcript?.trim();
      if (transcript) latestTranscript = transcript;
      if (result?.isFinal && transcript) {
        deliver(transcript);
      }
    };
    recognition.onerror = (event) => {
      if (active && !['aborted', 'no-speech'].includes(event.error || '')) {
        options.onError(event.message || `Browser speech recognition failed${event.error ? `: ${event.error}` : '.'}`);
      }
    };
    recognition.onend = () => {
      if (active && latestTranscript && !delivered) {
        deliver(latestTranscript);
      }
      if (active) options.onEnd();
    };

    try {
      recognition.start();
    } catch (error) {
      options.onError(error instanceof Error ? error.message : 'Browser speech recognition could not start.');
      return null;
    }

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {}
      },
      abort: () => {
        active = false;
        latestTranscript = '';
        try {
          recognition.abort();
        } catch {}
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

  let latestTranscript = '';
  let delivered = false;

  const deliver = (text: string) => {
    const clean = text.trim();
    if (clean && !delivered) {
      delivered = true;
      options.onTranscript(clean);
    }
  };

  const subscriptions = [
    speechRecognition.addListener('result', (event) => {
      const transcript =
        event.results?.[0]?.transcript?.trim() ||
        event.results
          ?.map((r: { transcript?: string }) => r.transcript?.trim())
          .find(Boolean) ||
        '';

      if (transcript) {
        latestTranscript = transcript;
      }

      if (event.isFinal && transcript) {
        deliver(transcript);
      }
    }),
    speechRecognition.addListener('error', (event) => {
      if (!['aborted', 'no-speech', 'speech-timeout'].includes(event.error)) {
        options.onError(event.message || 'Speech recognition could not transcribe this recording.');
      }
    }),
    speechRecognition.addListener('end', () => {
      subscriptions.forEach((subscription) => subscription.remove());
      if (latestTranscript && !delivered) {
        deliver(latestTranscript);
      }
      options.onEnd();
    }),
  ];

  const locale = options.language || preferredLanguage();

  try {
    speechRecognition.start({
      lang: locale,
      continuous: false,
      interimResults: true,
      requiresOnDeviceRecognition: false,
      addsPunctuation: false,
      contextualStrings: ['chest pain', 'breathing difficulty', 'bleeding', 'accident', 'unconscious'],
    });
  } catch (error) {
    subscriptions.forEach((subscription) => subscription.remove());
    options.onError(error instanceof Error ? error.message : 'Speech recognition could not start.');
    return null;
  }

  return {
    stop: () => {
      try {
        speechRecognition.stop();
      } catch {}
    },
    abort: () => {
      try {
        latestTranscript = '';
        speechRecognition.abort();
      } catch {}
    },
  };
}
