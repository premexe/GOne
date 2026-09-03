import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Siren, Mic, CheckCircle2, ArrowRight, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING } from '../../src/constants/theme';
import { useEmergencyStore } from '../../src/store/useEmergencyStore';
import { isSpeechRecognitionAvailable, startSpeechRecognition } from '../../src/services/speechRecognition';

export default function ProvideInfoScreen() {
  const { selectedSymptoms, toggleSymptom, setNotes, notes, triggerSOS } = useEmergencyStore();
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);

  const symptomChips = [
    'Chest Pain / Tightness',
    'Difficulty Breathing',
    'Severe Bleeding',
    'Trauma / Accident',
    'Allergic Reaction / Anaphylaxis',
    'Unconscious / Unresponsive',
    'High Fever / Convulsions',
    'Sudden Numbness / Stroke Risk',
    'Abdominal Pain',
    'Fracture / Dislocation',
  ];

  const handleStartEmergency = async () => {
    await triggerSOS(selectedSymptoms, notes);
    router.push('/sos/emergency');
  };

  const handleVoiceRecordToggle = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    if (!isSpeechRecognitionAvailable()) {
      setVoiceError('Live transcription is unavailable on this device. Use Chrome on web or enter symptom details below.');
      return;
    }

    setVoiceError(null);
    const recognition = startSpeechRecognition({
      onTranscript: setNotes,
      onEnd: () => {
        recognitionRef.current = null;
        setIsRecording(false);
      },
      onError: (message) => setVoiceError(message),
    });
    if (recognition) {
      recognitionRef.current = recognition;
      setIsRecording(true);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.emergencyTag}>
          <Siren size={18} color={COLORS.status.red} />
          <Text style={styles.emergencyTagText}>TRIAGE PRE-INFO</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <X size={20} color={COLORS.ink} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Tap Symptoms for AI Triage</Text>
      <Text style={styles.subtitle}>
        Select structured chips or use voice note to speed up hospital room preparation.
      </Text>

      {/* Structured Symptom Chips Grid */}
      <View style={styles.chipGrid}>
        {symptomChips.map((symptom) => {
          const isSelected = selectedSymptoms.includes(symptom);

          return (
            <TouchableOpacity
              key={symptom}
              activeOpacity={0.8}
              onPress={() => toggleSymptom(symptom)}
              style={[styles.chip, isSelected && styles.selectedChip]}
            >
              <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                {symptom}
              </Text>
              {isSelected && <CheckCircle2 size={16} color="#FFFFFF" />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Voice Note Input Box */}
      <View style={styles.voiceCard}>
        <Text style={styles.voiceTitle}>Optional Voice Note Transcriber</Text>
        <TouchableOpacity
          onPress={handleVoiceRecordToggle}
          style={[styles.micButton, isRecording && styles.recordingMic]}
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Stop voice transcription' : 'Start voice transcription'}
        >
          <Mic size={24} color="#FFFFFF" />
          <Text style={styles.micButtonText}>
            {isRecording ? 'Listening... Tap to stop' : 'Tap & Speak Symptom Details'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.voiceHint}>Uses live speech recognition. Review the text before sending an SOS.</Text>

        {voiceError ? <Text style={styles.voiceError}>{voiceError}</Text> : null}

        <View style={styles.notesOutputBox}>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Your voice transcription will appear here. You can edit it."
            placeholderTextColor={COLORS.muted}
            multiline
            accessibilityLabel="Voice note transcription"
          />
        </View>

        {notes ? (
          <View style={styles.notesOutputBox}>
            <Text style={styles.notesOutputText}>Review the transcribed details for accuracy before continuing.</Text>
          </View>
        ) : null}
      </View>

      {/* Instant Launch SOS */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handleStartEmergency}
        style={styles.launchButton}
      >
        <Siren size={22} color="#FFFFFF" />
        <Text style={styles.launchButtonText}>ENGAGE EMERGENCY MODE</Text>
        <ArrowRight size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  emergencyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(215, 38, 61, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  emergencyTagText: {
    color: COLORS.status.red,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.size.title,
    fontWeight: '900',
    color: COLORS.ink,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: 24,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedChip: {
    backgroundColor: COLORS.status.red,
    borderColor: COLORS.status.red,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
  },
  selectedChipText: {
    color: '#FFFFFF',
  },
  voiceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voiceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 12,
  },
  voiceHint: {
    marginTop: 10,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  voiceError: {
    marginTop: 10,
    color: COLORS.status.red,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  micButton: {
    backgroundColor: COLORS.brand,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  recordingMic: {
    backgroundColor: COLORS.status.red,
  },
  micButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  notesOutputBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notesInput: {
    minHeight: 56,
    color: COLORS.ink,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  notesOutputText: {
    fontSize: 12,
    color: COLORS.ink,
    fontStyle: 'italic',
  },
  launchButton: {
    backgroundColor: COLORS.status.red,
    height: 58,
    borderRadius: SPACING.buttonRadius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.status.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  launchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
