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
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-IN';
  } catch (_error) {
    return 'en-IN';
  }
}

export async function startSpeechRecognition(options: {
  language?: string;
  onTranscript: (transcript: string) => void;
  onInterimTranscript?: (interim: string) => void;
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
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0]?.transcript?.trim();
      if (transcript) {
        latestTranscript = transcript;
        if (options.onInterimTranscript && !result?.isFinal) {
          options.onInterimTranscript(transcript);
        }
      }
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

  // 1. Abort any lingering native recognition session BEFORE attaching any listeners.
  // This prevents leftover abort/end events from firing into new listeners.
  try {
    speechRecognition.abort();
  } catch {}
  await new Promise((r) => setTimeout(r, 120));

  // 2. Request permissions
  let permission: { granted: boolean; status?: string };
  try {
    permission = await speechRecognition.requestPermissionsAsync();
  } catch (error) {
    options.onError(error instanceof Error ? error.message : 'Microphone permission could not be requested.');
    return null;
  }
  if (!permission.granted && permission.status !== 'granted') {
    options.onError('Microphone permission is required to transcribe a voice note. Allow it in Settings and try again.');
    return null;
  }

  if (!speechRecognition.isRecognitionAvailable()) {
    options.onError('No speech recognition service is available. Enable Google voice typing or install/update the Google app, then try again.');
    return null;
  }

  let hasStarted = false;
  let isCleanedUp = false;
  let latestTranscript = '';
  let delivered = false;

  const deliver = (text: string) => {
    const clean = text.trim();
    if (clean && !delivered) {
      delivered = true;
      options.onTranscript(clean);
    }
  };

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    subscriptions.forEach((subscription) => {
      try {
        subscription.remove();
      } catch {}
    });
  };

  const subscriptions = [
    speechRecognition.addListener('start', () => {
      hasStarted = true;
    }),
    speechRecognition.addListener('result', (event) => {
      const transcript =
        event.results?.[0]?.transcript?.trim() ||
        event.results
          ?.map((r: { transcript?: string }) => r.transcript?.trim())
          .find(Boolean) ||
        '';

      if (transcript) {
        latestTranscript = transcript;
        if (options.onInterimTranscript && !event.isFinal) {
          options.onInterimTranscript(transcript);
        }
      }

      if (event.isFinal && transcript) {
        deliver(transcript);
      }
    }),
    speechRecognition.addListener('error', (event) => {
      const errStr = typeof event.error === 'string' ? event.error : (event.error?.error || '');
      // Benign non-fatal errors on Android:
      // 'aborted' - when user or app stops recognition
      // 'no-speech' - user took a breath or paused before speaking
      // 'speech-timeout' - user paused speaking
      if (!['aborted', 'no-speech', 'speech-timeout'].includes(errStr)) {
        cleanup();
        options.onError(event.message || `Speech recognition note: ${errStr}`);
      }
    }),
    speechRecognition.addListener('end', () => {
      // Ignore end event if start was never received (e.g. echo from previous abort)
      if (!hasStarted) return;
      cleanup();
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
      continuous: true,
      interimResults: true,
      requiresOnDeviceRecognition: false,
      addsPunctuation: false,
      contextualStrings: ['chest pain', 'breathing difficulty', 'bleeding', 'accident', 'unconscious', 'asthma', 'heart attack'],
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
      },
    });
  } catch (error) {
    cleanup();
    options.onError(error instanceof Error ? error.message : 'Speech recognition could not start.');
    return null;
  }

  return {
    stop: () => {
      try {
        cleanup();
        speechRecognition.stop();
      } catch {}
    },
    abort: () => {
      try {
        cleanup();
        latestTranscript = '';
        speechRecognition.abort();
      } catch {}
    },
  };
}
