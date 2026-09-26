import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Speech from 'expo-speech';
import { Mic, Phone } from 'lucide-react-native';
import { request } from '../services/http';
import { startSpeechRecognition } from '../services/speechRecognition';

type Props = { sosId: string; patientName: string; emergencyDescription: string };
type RecognitionHandle = { stop: () => void; abort: () => void };

export function EmergencyVoiceCall({ sosId, patientName, emergencyDescription }: Props) {
  const [visible, setVisible] = useState(false);
  const [starting, setStarting] = useState(false);
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const transcript = useRef<string[]>([]);
  const recognition = useRef<RecognitionHandle | null>(null);
  const stopped = useRef(false);

  const finish = async () => {
    stopped.current = true;
    Speech.stop();
    recognition.current?.abort();
    recognition.current = null;
    const text = transcript.current.join('\n') || 'No spoken response recorded.';
    setVisible(false);
    setStarting(false);
    try {
      await request('/voice/agora-finish', {
        method: 'POST',
        body: JSON.stringify({ sosId, uid: Number(sosId), transcript: text, summary: `Emergency voice check-in: ${text.slice(0, 240)}` }),
      });
      Alert.alert('Voice check-in saved', 'Your transcript has been attached to this SOS and will be emailed to registered recipients.');
    } catch (cause) {
      Alert.alert('Transcript not sent', cause instanceof Error ? cause.message : 'Could not save the voice check-in.');
    }
  };

  const ask = async (questions: string[], index: number): Promise<void> => {
    if (stopped.current) return;
    if (index >= questions.length) return finish();
    const next = questions[index];
    transcript.current.push(`AI: ${next}`);
    setQuestion(next);
    setStatus(`Question ${index + 1} of ${questions.length}`);
    const listen = async () => {
      const handle = await startSpeechRecognition({
        onTranscript: (answer) => transcript.current.push(`Patient: ${answer}`),
        onEnd: () => { recognition.current = null; void ask(questions, index + 1); },
        onError: (message) => { setError(message); setStatus('Voice recognition needs microphone permission.'); },
      });
      if (!handle) { setError('Speech recognition is unavailable. Use Chrome or Edge and allow microphone access.'); return; }
      recognition.current = handle;
      setStatus(`Listening — question ${index + 1} of ${questions.length}`);
    };
    Speech.stop();
    Speech.speak(next, { language: 'en-US', rate: 0.9, onDone: () => void listen(), onError: () => void listen() });
  };

  const start = async () => {
    setStarting(true); setVisible(true); setError(null); stopped.current = false; transcript.current = [];
    try {
      const response = await request('/voice/agent-questions', { method: 'POST', body: JSON.stringify({ patientName, emergencyDescription }) });
      const questions: string[] = response?.questions || ['What happened and how are you feeling?', 'Are you conscious and breathing normally?', 'Do you have chest pain, severe bleeding, or trouble speaking?'];
      await ask(questions, 0);
    } catch (cause) {
      setVisible(false); setStarting(false);
      Alert.alert('Voice check-in unavailable', cause instanceof Error ? cause.message : 'Could not start the emergency voice check-in.');
    }
  };

  return <>
    <TouchableOpacity style={[styles.start, starting && styles.disabled]} onPress={start} disabled={starting}>
      {starting ? <ActivityIndicator color="#fff" /> : <Mic size={19} color="#fff" />}
      <Text style={styles.startText}>{starting ? 'STARTING VOICE CHECK-IN…' : 'START SECURE VOICE CHECK-IN'}</Text>
    </TouchableOpacity>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={finish}>
      <View style={styles.overlay}><View style={styles.dialog}>
        <Phone size={28} color="#0B2545" /><Text style={styles.title}>Emergency Voice Assistant</Text>
        <Text style={styles.question}>{error || question || 'Preparing your emergency check-in…'}</Text>
        <Text style={styles.status}>{status}</Text>
        <TouchableOpacity style={styles.end} onPress={finish}><Text style={styles.endText}>{error ? 'SAVE WITHOUT VOICE' : 'END & SAVE CHECK-IN'}</Text></TouchableOpacity>
      </View></View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  start: { minHeight: 54, borderRadius: 14, backgroundColor: '#D7263D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 20 },
  disabled: { opacity: 0.7 }, startText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.68)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 440, borderRadius: 18, backgroundColor: '#fff', padding: 24, alignItems: 'center' },
  title: { color: '#0B2545', fontSize: 19, fontWeight: '900', marginTop: 12 }, question: { color: '#172033', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 18 },
  status: { color: '#536176', fontSize: 13, textAlign: 'center', marginVertical: 16 }, end: { width: '100%', borderRadius: 12, backgroundColor: '#0B2545', paddingVertical: 13, alignItems: 'center' }, endText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
