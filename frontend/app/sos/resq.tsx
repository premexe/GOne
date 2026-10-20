import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { Mic, MicOff, Send, Volume2 } from 'lucide-react-native';
import { API_URL } from '../../src/services/http';
import { startSpeechRecognition } from '../../src/services/speechRecognition';
import { useAuthStore } from '../../src/store/useAuthStore';

type Message = { id: string; sender: 'assistant' | 'user'; text: string };
type RecognitionHandle = { stop: () => void; abort: () => void };
const toWsUrl = (url: string) => `${url.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:').replace(/\/$/, '')}/ws/emergency`;

/** Native ResQ client: no WebView and no external browser. */
export default function ResqVoiceScreen() {
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState('Connecting to emergency voice agent…');
  const [classification, setClassification] = useState('GENERAL EMERGENCY');
  const [severity, setSeverity] = useState('MODERATE');
  const [language, setLanguage] = useState('AUTO');
  const [provider, setProvider] = useState('');
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<RecognitionHandle | null>(null);
  const connectedRef = useRef(false);
  const listeningRef = useRef(false);
  const thinkingRef = useRef(false);
  const addMessage = (sender: Message['sender'], text: string) => setMessages((old) => [...old, { id: `${Date.now()}-${Math.random()}`, sender, text }]);
  const stopListening = () => { listeningRef.current = false; setListening(false); recognitionRef.current?.abort(); recognitionRef.current = null; };
  const sendTurn = (raw: string) => {
    const text = raw.trim();
    if (!text || !connectedRef.current || socketRef.current?.readyState !== WebSocket.OPEN) return;
    stopListening(); setInput(''); addMessage('user', text); setThinking(true); thinkingRef.current = true; setStatus('ResQ is analyzing your emergency…');
    socketRef.current.send(JSON.stringify({ type: 'USER_SPEECH', text }));
  };
  const beginListening = async () => {
    if (!connectedRef.current || listeningRef.current || thinkingRef.current) return;
    setStatus('Listening… speak naturally in your language.'); listeningRef.current = true; setListening(true);
    const handle = await startSpeechRecognition({ language: 'hi-IN', onTranscript: sendTurn, onEnd: () => { listeningRef.current = false; setListening(false); }, onError: () => { listeningRef.current = false; setListening(false); setStatus('Voice recognition is unavailable. Type your message below.'); } });
    recognitionRef.current = handle;
    if (!handle) { listeningRef.current = false; setListening(false); }
  };
  useEffect(() => {
    const socket = new WebSocket(toWsUrl(API_URL)); socketRef.current = socket;
    socket.onopen = () => { connectedRef.current = true; setConnected(true); setStatus('Connected. Tell ResQ what happened.'); socket.send(JSON.stringify({ type: 'INIT', patient_id: user?.id ? `USER-${user.id}` : 'ANONYMOUS_EMERGENCY' })); };
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data); if (data.type === 'SESSION_INITIALIZED') return;
        if (data.type === 'ASSISTANT_RESPONSE') {
          setThinking(false); thinkingRef.current = false; setClassification(String(data.emergency_type || 'general emergency').replace(/_/g, ' ').toUpperCase()); setSeverity(String(data.severity || 'moderate').toUpperCase()); setLanguage(String(data.language || 'auto').toUpperCase()); setProvider(String(data.provider_used || 'Safety protocol')); setStatus(data.handover_status === 'DISPATCHED' ? 'Emergency handover dispatched.' : 'ResQ guidance ready.'); addMessage('assistant', data.text); Speech.stop(); Speech.speak(data.text, { language: ['hi', 'hinglish'].includes(data.language) ? 'hi-IN' : 'en-IN', rate: 0.92 });
        } else if (data.type === 'ERROR') { setThinking(false); thinkingRef.current = false; setStatus(data.message || 'ResQ could not process this turn.'); }
      } catch { setStatus('Received an invalid response from ResQ.'); }
    };
    socket.onerror = () => setStatus('Cannot connect to ResQ. Confirm the backend is deployed and try again.');
    socket.onclose = () => { connectedRef.current = false; setConnected(false); };
    return () => { stopListening(); Speech.stop(); socket.close(); };
  }, []);
  return <View style={styles.container}>
    <View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹ SOS</Text></Pressable><Text style={styles.headerTitle}>G-ONE ResQ Voice Agent</Text><View style={[styles.dot, connected ? styles.online : styles.offline]} /></View>
    <View style={styles.statusCard}><Text style={styles.status}>{status}</Text><View style={styles.metrics}><Text style={styles.metric}>{classification}</Text><Text style={[styles.metric, severity === 'CRITICAL' && styles.critical]}>{severity}</Text><Text style={styles.metric}>{language}</Text></View>{provider ? <Text style={styles.provider}>AI engine: {provider}</Text> : null}</View>
    <FlatList data={messages} keyExtractor={(item) => item.id} contentContainerStyle={styles.feed} renderItem={({ item }) => <View style={[styles.message, item.sender === 'user' ? styles.userMessage : styles.agentMessage]}><Text style={styles.sender}>{item.sender === 'user' ? 'YOU' : 'G-ONE RESQ'}</Text><Text style={styles.messageText}>{item.text}</Text></View>} ListEmptyComponent={<Text style={styles.empty}>Start speaking or type your emergency. ResQ will classify it, provide protocol-bound guidance, and prepare handover information.</Text>} />
    <View style={styles.controls}><View style={styles.inputRow}><TextInput value={input} onChangeText={setInput} placeholder="Type in any language…" placeholderTextColor="#94A3B8" style={styles.input} multiline /><Pressable disabled={!connected || !input.trim()} onPress={() => sendTurn(input)} style={[styles.send, (!connected || !input.trim()) && styles.disabled]}><Send size={20} color="#FFF" /></Pressable></View><Pressable disabled={!connected || thinking} onPress={listening ? stopListening : beginListening} style={[styles.mic, (listening || thinking) && styles.micActive, !connected && styles.disabled]}>{thinking ? <ActivityIndicator color="#FFF" /> : listening ? <MicOff size={24} color="#FFF" /> : <Mic size={24} color="#FFF" />}<Text style={styles.micText}>{thinking ? 'Thinking…' : listening ? 'Stop listening' : 'Tap to speak'}</Text></Pressable><View style={styles.footer}><Volume2 size={15} color="#94A3B8" /><Text style={styles.footerText}>Replies are spoken aloud. For immediate danger, contact local emergency services.</Text></View></View>
  </View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#0B1220' }, header: { paddingTop: 54, paddingBottom: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#111827' }, back: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' }, headerTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '800', flex: 1 }, dot: { width: 10, height: 10, borderRadius: 5 }, online: { backgroundColor: '#22C55E' }, offline: { backgroundColor: '#EF4444' }, statusCard: { margin: 14, padding: 14, backgroundColor: '#172033', borderRadius: 14, borderWidth: 1, borderColor: '#26334B' }, status: { color: '#E2E8F0', fontSize: 13 }, metrics: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 }, metric: { color: '#CBD5E1', fontSize: 10, fontWeight: '800', backgroundColor: '#25334A', paddingVertical: 5, paddingHorizontal: 7, borderRadius: 7 }, critical: { color: '#FCA5A5', backgroundColor: '#7F1D1D' }, provider: { color: '#94A3B8', fontSize: 11, marginTop: 9 }, feed: { padding: 14, gap: 10 }, empty: { color: '#94A3B8', lineHeight: 20, textAlign: 'center', paddingHorizontal: 24, paddingTop: 44 }, message: { padding: 12, borderRadius: 12, maxWidth: '90%' }, agentMessage: { alignSelf: 'flex-start', backgroundColor: '#172033' }, userMessage: { alignSelf: 'flex-end', backgroundColor: '#075985' }, sender: { color: '#93C5FD', fontSize: 10, fontWeight: '900', marginBottom: 4 }, messageText: { color: '#F8FAFC', fontSize: 14, lineHeight: 20 }, controls: { borderTopWidth: 1, borderColor: '#26334B', padding: 14, backgroundColor: '#111827' }, inputRow: { flexDirection: 'row', gap: 9, alignItems: 'center' }, input: { flex: 1, maxHeight: 76, color: '#F8FAFC', borderColor: '#334155', borderWidth: 1, borderRadius: 12, padding: 11 }, send: { backgroundColor: '#DC2626', padding: 13, borderRadius: 12 }, disabled: { opacity: 0.45 }, mic: { marginTop: 10, backgroundColor: '#B91C1C', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', gap: 9, alignItems: 'center' }, micActive: { backgroundColor: '#047857' }, micText: { color: '#FFF', fontWeight: '800' }, footer: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 10 }, footerText: { flex: 1, color: '#94A3B8', fontSize: 10, textAlign: 'center' } });
