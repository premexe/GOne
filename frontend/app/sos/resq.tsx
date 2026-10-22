import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Speech from 'expo-speech';
import { router, useLocalSearchParams } from 'expo-router';
import { Mic, MicOff, PhoneOff, Send, Volume2 } from 'lucide-react-native';
import { API_URL, getToken, request } from '../../src/services/http';
import { startSpeechRecognition } from '../../src/services/speechRecognition';
import { useAuthStore } from '../../src/store/useAuthStore';

type Message = { id: string; sender: 'assistant' | 'user'; text: string };
type RecognitionHandle = { stop: () => void; abort: () => void };
const socketUrl = (url: string) => `${url.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:').replace(/\/$/, '')}/ws/emergency`;

export default function ResqVoiceScreen() {
  const user = useAuthStore((state) => state.user);
  const { sosId } = useLocalSearchParams<{ sosId?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState('Connecting to emergency voice agent...');
  const [classification, setClassification] = useState('GENERAL EMERGENCY');
  const [severity, setSeverity] = useState('MODERATE');
  const [language, setLanguage] = useState('AUTO');
  const [provider, setProvider] = useState('');
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [completing, setCompleting] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const connectedRef = useRef(false);
  const listeningRef = useRef(false);
  const thinkingRef = useRef(false);

  const addMessage = (sender: Message['sender'], text: string) => setMessages((old) => [...old, { id: `${Date.now()}-${Math.random()}`, sender, text }]);
  const stopListening = () => {
    listeningRef.current = false;
    setListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {}
    recognitionRef.current = null;
  };
  const sendTurn = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinkingRef.current || completing) return;
    stopListening(); setInput(''); addMessage('user', text); setThinking(true); thinkingRef.current = true; setStatus('ResQ is analyzing your emergency...');
    if (connectedRef.current && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'USER_SPEECH', text }));
      return;
    }

    // Render proxies may reject WebSocket upgrades on a sleeping or older
    // deployment. The REST route provides the same protocol-guided triage so
    // typed and transcribed input remain usable while the socket reconnects.
    try {
      const result = await request('/voice/resq/turn', {
        method: 'POST',
        body: JSON.stringify({
          sosId: sosId ? Number(sosId) : undefined,
          speech: text,
          turn: messages.filter((message) => message.sender === 'user').length + 1,
          history: messages.map((message) => ({ sender: message.sender, text: message.text })),
        }),
      }) as { voice_response?: string; category?: string; severity?: string; language?: string; provider?: string };
      const response = result.voice_response || 'I could not prepare guidance for that turn. Please try again.';
      setClassification(String(result.category || 'general emergency').replace(/_/g, ' ').toUpperCase());
      setSeverity(String(result.severity || 'moderate').toUpperCase());
      setLanguage(String(result.language || 'auto').toUpperCase());
      setProvider(String(result.provider || 'Safety protocol'));
      setStatus('ResQ guidance ready.');
      addMessage('assistant', response);
      void speakGuidance(response, result.language);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Cannot reach ResQ. Check the Render service and try again.');
    } finally {
      setThinking(false); thinkingRef.current = false;
    }
  };
  const startListening = async () => {
    if (listeningRef.current || thinkingRef.current || completing) return;
    setStatus('Listening... speak naturally in your language.'); listeningRef.current = true; setListening(true);
    const handle = await startSpeechRecognition({
      onTranscript: sendTurn,
      onEnd: () => { listeningRef.current = false; setListening(false); },
      onError: (message) => { listeningRef.current = false; setListening(false); setStatus(message); },
    });
    recognitionRef.current = handle;
    if (!handle) { listeningRef.current = false; setListening(false); }
  };

  const speakGuidance = async (text: string, langHint?: string) => {
    try {
      const isSpeaking = await Speech.isSpeakingAsync().catch(() => false);
      if (isSpeaking) {
        Speech.stop();
        await new Promise((r) => setTimeout(r, 120));
      }
    } catch {}

    // Allow native Android audio focus to cleanly transition from microphone to speaker
    await new Promise((r) => setTimeout(r, 200));
    if (completing) return;

    let finished = false;
    const onFinished = () => {
      if (!finished) {
        finished = true;
        if (!completing && connectedRef.current) {
          void startListening();
        }
      }
    };

    const isDevanagari = /[\u0900-\u097F]/.test(text);
    // Don't force 'en-IN' because Android devices without an en-IN voice pack will stay silent.
    // Use 'hi-IN' for Devanagari text, or undefined (system default voice) for English/Latin.
    const targetLang = isDevanagari ? 'hi-IN' : (langHint === 'hi' ? 'hi-IN' : undefined);

    try {
      Speech.speak(text, {
        language: targetLang,
        pitch: 1.0,
        rate: 0.92,
        onDone: onFinished,
        onStopped: onFinished,
        onError: (e) => {
          console.warn('Speech primary failed, falling back to system default voice:', e);
          try {
            Speech.speak(text, {
              rate: 0.92,
              onDone: onFinished,
              onStopped: onFinished,
              onError: onFinished,
            });
          } catch {
            onFinished();
          }
        },
      });
    } catch (err) {
      console.warn('Speech speak exception:', err);
      try {
        Speech.speak(text, {
          onDone: onFinished,
          onStopped: onFinished,
          onError: onFinished,
        });
      } catch {
        onFinished();
      }
    }
  };

  const completeSession = () => {
    if (!connectedRef.current || socketRef.current?.readyState !== WebSocket.OPEN || completing) return;
    stopListening(); setCompleting(true); setStatus('Saving transcript and sending emergency emails...'); socketRef.current.send(JSON.stringify({ type: 'END_SESSION' }));
  };

  useEffect(() => {
    const socket = new WebSocket(socketUrl(API_URL)); socketRef.current = socket;
    socket.onopen = () => {
      connectedRef.current = true; setConnected(true); setStatus('Connected. Tell ResQ what happened.');
      socket.send(JSON.stringify({ type: 'INIT', patient_id: user?.id ? `USER-${user.id}` : 'ANONYMOUS_EMERGENCY', sos_id: sosId ? Number(sosId) : undefined, token: getToken() || '' }));
      setTimeout(() => {
        if (!completing && connectedRef.current) {
          startListening();
        }
      }, 700);
    };
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'SESSION_INITIALIZED') return;
        if (data.type === 'ASSISTANT_RESPONSE') {
          setThinking(false); thinkingRef.current = false;
          setClassification(String(data.emergency_type || 'general emergency').replace(/_/g, ' ').toUpperCase());
          setSeverity(String(data.severity || 'moderate').toUpperCase()); setLanguage(String(data.language || 'auto').toUpperCase()); setProvider(String(data.provider_used || 'Safety protocol'));
          setStatus(data.handover_status === 'DISPATCHED' ? 'Emergency handover dispatched.' : 'ResQ guidance ready.');
          addMessage('assistant', data.text);
          void speakGuidance(data.text, data.language);
        } else if (data.type === 'SESSION_COMPLETED') {
          setCompleting(false); setStatus(data.message || (data.success ? 'Transcript emailed.' : 'Unable to email transcript.'));
          if (data.success) setTimeout(() => router.back(), 1300);
        } else if (data.type === 'ERROR') { setThinking(false); thinkingRef.current = false; setCompleting(false); setStatus(data.message || 'ResQ could not process this turn.'); }
      } catch { setStatus('Received an invalid response from ResQ.'); }
    };
    socket.onerror = () => setStatus('Cannot connect to ResQ. Confirm the backend is deployed and try again.');
    socket.onclose = () => { connectedRef.current = false; setConnected(false); };
    return () => { stopListening(); Speech.stop(); socket.close(); };
  }, []);

  return <View style={styles.container}>
    <View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.back}>Back to SOS</Text></Pressable><Text style={styles.headerTitle}>G-ONE ResQ Voice Agent</Text><View style={[styles.dot, connected ? styles.online : styles.offline]} /></View>
    <View style={styles.statusCard}><Text style={styles.status}>{status}</Text><View style={styles.metrics}><Text style={styles.metric}>{classification}</Text><Text style={[styles.metric, severity === 'CRITICAL' && styles.critical]}>{severity}</Text><Text style={styles.metric}>{language}</Text></View>{provider ? <Text style={styles.provider}>AI engine: {provider}</Text> : null}</View>
    <FlatList data={messages} keyExtractor={(item) => item.id} contentContainerStyle={styles.feed} renderItem={({ item }) => <Pressable onPress={() => item.sender === 'assistant' && speakGuidance(item.text)} style={[styles.message, item.sender === 'user' ? styles.userMessage : styles.agentMessage]}><Text style={styles.sender}>{item.sender === 'user' ? 'YOU' : 'G-ONE RESQ 🔊'}</Text><Text style={styles.messageText}>{item.text}</Text></Pressable>} ListEmptyComponent={<Text style={styles.empty}>Start speaking or type your emergency. End the voice session to email its full transcript to the patient and emergency contacts.</Text>} />
    <View style={styles.controls}><View style={styles.inputRow}><TextInput value={input} onChangeText={setInput} placeholder="Type in any language..." placeholderTextColor="#94A3B8" style={styles.input} multiline /><Pressable disabled={thinking || completing || !input.trim()} onPress={() => sendTurn(input)} style={[styles.send, (thinking || completing || !input.trim()) && styles.disabled]}><Send size={20} color="#FFF" /></Pressable></View><Pressable disabled={thinking || completing} onPress={listening ? stopListening : startListening} style={[styles.mic, (listening || thinking) && styles.micActive]}>{thinking ? <ActivityIndicator color="#FFF" /> : listening ? <MicOff size={24} color="#FFF" /> : <Mic size={24} color="#FFF" />}<Text style={styles.buttonText}>{thinking ? 'Thinking...' : listening ? 'Tap to finish speaking' : 'Tap to speak'}</Text></Pressable><Pressable disabled={!connected || completing} onPress={completeSession} style={[styles.end, (!connected || completing) && styles.disabled]}><PhoneOff size={19} color="#FFF" /><Text style={styles.buttonText}>{completing ? 'Sending transcript...' : 'End and email handover'}</Text></Pressable><View style={styles.footer}><Volume2 size={15} color="#94A3B8" /><Text style={styles.footerText}>Replies are spoken aloud. For immediate danger, contact local emergency services.</Text></View></View>
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#0B1220' }, header: { paddingTop: 54, paddingBottom: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#111827' }, back: { color: '#F8FAFC', fontSize: 13, fontWeight: '800' }, headerTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '800', flex: 1 }, dot: { width: 10, height: 10, borderRadius: 5 }, online: { backgroundColor: '#22C55E' }, offline: { backgroundColor: '#EF4444' }, statusCard: { margin: 14, padding: 14, backgroundColor: '#172033', borderRadius: 14, borderWidth: 1, borderColor: '#26334B' }, status: { color: '#E2E8F0', fontSize: 13 }, metrics: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 }, metric: { color: '#CBD5E1', fontSize: 10, fontWeight: '800', backgroundColor: '#25334A', paddingVertical: 5, paddingHorizontal: 7, borderRadius: 7 }, critical: { color: '#FCA5A5', backgroundColor: '#7F1D1D' }, provider: { color: '#94A3B8', fontSize: 11, marginTop: 9 }, feed: { padding: 14, gap: 10 }, empty: { color: '#94A3B8', lineHeight: 20, textAlign: 'center', paddingHorizontal: 24, paddingTop: 44 }, message: { padding: 12, borderRadius: 12, maxWidth: '90%' }, agentMessage: { alignSelf: 'flex-start', backgroundColor: '#172033' }, userMessage: { alignSelf: 'flex-end', backgroundColor: '#075985' }, sender: { color: '#93C5FD', fontSize: 10, fontWeight: '900', marginBottom: 4 }, messageText: { color: '#F8FAFC', fontSize: 14, lineHeight: 20 }, controls: { borderTopWidth: 1, borderColor: '#26334B', padding: 14, backgroundColor: '#111827' }, inputRow: { flexDirection: 'row', gap: 9, alignItems: 'center' }, input: { flex: 1, maxHeight: 76, color: '#F8FAFC', borderColor: '#334155', borderWidth: 1, borderRadius: 12, padding: 11 }, send: { backgroundColor: '#DC2626', padding: 13, borderRadius: 12 }, disabled: { opacity: 0.45 }, mic: { marginTop: 10, backgroundColor: '#B91C1C', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', gap: 9, alignItems: 'center' }, end: { marginTop: 9, backgroundColor: '#475569', borderRadius: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', gap: 9, alignItems: 'center' }, micActive: { backgroundColor: '#047857' }, buttonText: { color: '#FFF', fontWeight: '800' }, footer: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 10 }, footerText: { flex: 1, color: '#94A3B8', fontSize: 10, textAlign: 'center' } });
