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

let offlineModelRequested = false;

function isLocaleInstalled(installedLocales: string[], locale: string) {
  const requested = locale.toLowerCase();
  const language = requested.split('-')[0];
  return installedLocales.some((installed) => {
    const normalized = installed.toLowerCase();
    return normalized === requested || normalized.split('-')[0] === language;
  });
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

  // Prefer Android's downloaded on-device model. This avoids the unreliable
  // network recognizer used by some phones and keeps emergency answers local.
  // Android 13+ will show its system model-download dialog the first time.
  // en-US is the reliably downloadable Google on-device model across Android
  // devices; it still handles Indian-English emergency responses well.
  const locale = options.language || 'en-US';
  if (speechRecognition.getSupportedLocales) {
    try {
      const supported = await speechRecognition.getSupportedLocales({});
      if (!isLocaleInstalled(supported.installedLocales || [], locale)) {
        if (!offlineModelRequested && speechRecognition.androidTriggerOfflineModelDownload) {
          offlineModelRequested = true;
          await speechRecognition.androidTriggerOfflineModelDownload({ locale });
        }
        options.onError('Downloading the offline English speech model. Complete the Android download, then start the call again.');
        return null;
      }
    } catch (error) {
      console.warn('Could not check Android offline speech model:', error);
      options.onError('Android speech recognition is unavailable. Install or update the Google speech services, then try again.');
      return null;
    }
  }

  speechRecognition.start({
    lang: locale,
    continuous: false,
    interimResults: true,
    requiresOnDeviceRecognition: true,
    addsPunctuation: false,
    contextualStrings: ['chest pain', 'breathing difficulty', 'bleeding', 'accident', 'unconscious'],
  });

  return { stop: () => speechRecognition.stop(), abort: () => speechRecognition.abort() };
}
