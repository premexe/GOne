export type SpeechRecognitionState = 'idle' | 'listening' | 'unavailable' | 'error';

type RecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;

  const browserWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };
  return browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionAvailable(): boolean {
  return getRecognitionConstructor() !== null;
}

export function startSpeechRecognition(options: {
  language?: string;
  onTranscript: (transcript: string) => void;
  onEnd: () => void;
  onError: (message: string) => void;
}): BrowserSpeechRecognition | null {
  const Recognition = getRecognitionConstructor();
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = options.language || 'en-IN';
  recognition.maxAlternatives = 3;

  recognition.onresult = (event) => {
    let transcript = '';
    for (let index = 0; index < event.results.length; index += 1) {
      transcript += event.results[index][0]?.transcript || '';
    }
    options.onTranscript(transcript.trim());
  };
  recognition.onerror = ({ error }) => {
    const message = error === 'not-allowed'
      ? 'Microphone access was denied. Allow microphone access and try again.'
      : error === 'no-speech'
        ? 'No speech was detected. Please try again.'
        : 'Speech recognition could not transcribe this recording. Please try again or type the details.';
    options.onError(message);
  };
  recognition.onend = options.onEnd;
  recognition.start();
  return recognition;
}
