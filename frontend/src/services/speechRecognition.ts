type SpeechRecognitionModule = {
  isRecognitionAvailable: () => boolean;
  requestMicrophonePermissionsAsync: () => Promise<{ granted: boolean }>;
  androidTriggerOfflineModelDownload?: (options: { locale: string }) => Promise<unknown>;
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (event: string, listener: (event: any) => void) => { remove: () => void };
};

let offlineModelRequested = false;

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
  return getSpeechRecognitionModule()?.isRecognitionAvailable() ?? false;
}

export async function startSpeechRecognition(options: {
  language?: string;
  onTranscript: (transcript: string) => void;
  onEnd: () => void;
  onError: (message: string) => void;
}): Promise<{ stop: () => void; abort: () => void } | null> {
  const speechRecognition = getSpeechRecognitionModule();
  if (!speechRecognition?.isRecognitionAvailable()) return null;

  const permission = await speechRecognition.requestMicrophonePermissionsAsync();
  if (!permission.granted) {
    options.onError('Microphone permission is required to transcribe a voice note. Allow it in Settings and try again.');
    return null;
  }

  const subscriptions = [
    speechRecognition.addListener('result', (event) => {
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

  // Prefer Android's downloaded on-device model. This avoids the unreliable
  // network recognizer used by some phones and keeps emergency answers local.
  // Android 13+ will show its system model-download dialog the first time.
  if (!offlineModelRequested && speechRecognition.androidTriggerOfflineModelDownload) {
    offlineModelRequested = true;
    try {
      await speechRecognition.androidTriggerOfflineModelDownload({ locale: options.language || 'en-IN' });
    } catch (error) {
      console.warn('Could not request Android offline speech model:', error);
    }
  }

  speechRecognition.start({
    lang: options.language || 'en-IN',
    continuous: false,
    interimResults: true,
    requiresOnDeviceRecognition: true,
    addsPunctuation: false,
    contextualStrings: ['chest pain', 'breathing difficulty', 'bleeding', 'accident', 'unconscious'],
  });

  return { stop: () => speechRecognition.stop(), abort: () => speechRecognition.abort() };
}
