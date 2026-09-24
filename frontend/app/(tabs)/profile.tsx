import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Modal, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Phone, Plus, Trash2, Edit2, ShieldCheck, Heart, AlertTriangle, Pill, LogOut } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useProfileStore } from '../../src/store/useProfileStore';
import { useEmergencyStore } from '../../src/store/useEmergencyStore';
import { request } from '../../src/services/http';
import { startSpeechRecognition } from '../../src/services/speechRecognition';
import { createEmergencyAgoraEngine } from '../../src/services/agora';

const profilePhoto = require('../../assets/profile-photo.jpg');

export default function ProfileScreen() {
  const { user, updateUser, logout } = useAuthStore();
  const { profile, updateProfile, addEmergencyContact, removeEmergencyContact } = useProfileStore();
  const { activeRequest } = useEmergencyStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPatientInfoModalOpen, setIsPatientInfoModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactRelation, setContactRelation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const [allergyInput, setAllergyInput] = useState('');
  const [medInput, setMedInput] = useState('');
  const [fullName, setFullName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCallLoading, setIsCallLoading] = useState(false);
  const [showCallPopup, setShowCallPopup] = useState(false);
  const [voiceQuestions, setVoiceQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [callStatus, setCallStatus] = useState('Preparing secure voice connection...');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const engineRef = useRef<any>(null);
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const voiceSessionRef = useRef(false);

  useEffect(() => {
    return () => {
      Speech.stop();
      if (engineRef.current) {
        try {
          engineRef.current.leaveChannel?.();
          engineRef.current.release?.();
        } catch (_) {}
        engineRef.current = null;
      }
      recognitionRef.current?.abort();
    };
  }, []);

  const completeVoiceFlow = async (transcript: string) => {
    voiceSessionRef.current = false;
    Speech.stop();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (engineRef.current) {
      try {
        engineRef.current.leaveChannel?.();
        engineRef.current.release?.();
      } catch (err) {
        console.warn('Error releasing Agora engine in completeVoiceFlow:', err);
      }
      engineRef.current = null;
    }

    if (!activeRequest?.id) {
      Alert.alert('Emergency assistant complete', 'The call ended. No active SOS was linked, so the transcript stayed local to this session.');
      return;
    }

    try {
      await AsyncStorage.setItem(`lifelink_voice_transcript_${activeRequest.id}`, transcript);
    } catch (error) {
      console.warn('Could not save the voice transcript on this device:', error);
    }

    try {
      await request('/voice/agora-finish', {
        method: 'POST',
        body: JSON.stringify({
          sosId: activeRequest.id,
          uid: Number(user?.id || Date.now()),
          transcript,
          summary: `Emergency AI self-check complete. Transcript captured: ${transcript.slice(0, 240) || 'No transcript captured.'}`,
        }),
      });
      Alert.alert('Emergency assistant complete', 'Your response has been captured and the transcript was submitted for review.');
    } catch (error) {
      console.warn('Could not finalize emergency voice transcript:', error);
      Alert.alert('Transcript saved locally', 'The AI voice conversation ended, but the SOS transcript could not be finalized with the backend.');
    }
  };

  const cancelVoiceFlow = () => {
    voiceSessionRef.current = false;
    Speech.stop();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (engineRef.current) {
      try {
        engineRef.current.leaveChannel?.();
        engineRef.current.release?.();
      } catch (error) {
        console.warn('Error releasing Agora engine while cancelling:', error);
      }
      engineRef.current = null;
    }
    setShowCallPopup(false);
    setIsCallLoading(false);
  };

  const askNextQuestion = async (questions: string[], nextIndex: number) => {
    if (!questions.length) {
      setShowCallPopup(false);
      setIsCallLoading(false);
      await completeVoiceFlow(voiceTranscript || 'No spoken response recorded.');
      return;
    }

    if (nextIndex >= questions.length) {
      setShowCallPopup(false);
      setIsCallLoading(false);
      await completeVoiceFlow(voiceTranscript || 'No spoken response recorded.');
      return;
    }

    const nextQuestion = questions[nextIndex];
    setCurrentQuestionIndex(nextIndex);
    setVoiceTranscript((previous) => `${previous ? `${previous}\n` : ''}AI: ${nextQuestion}`);
    setCallStatus(`Listening for your response (${nextIndex + 1} of ${questions.length})...`);
    setVoiceError(null);
    // Android only permits one reliable microphone owner at a time. Keep the
    // Agora channel connected, but release its local microphone for speech-to-text.
    engineRef.current?.setLocalAudioEnabled?.(false);

    const startListening = async () => {
      try {
        let recognitionFailed = false;
        const recognition = await startSpeechRecognition({
          onTranscript: (transcript) => {
            setVoiceTranscript((prev) => {
              const nextValue = `${prev ? `${prev}\n` : ''}Patient: ${transcript}`;
              return nextValue;
            });
          },
          onEnd: async () => {
            recognitionRef.current = null;
            if (!recognitionFailed) await askNextQuestion(questions, nextIndex + 1);
          },
          onError: (message) => {
            console.warn('Voice capture error:', message);
            recognitionFailed = true;
            recognitionRef.current?.abort();
            recognitionRef.current = null;
            setVoiceError(message);
            setCallStatus('Voice recognition is unavailable on this device/network.');
          },
        });

        recognitionRef.current = recognition;
      } catch (error) {
        console.warn('Could not start voice recognition:', error);
        setVoiceError('Could not start Android speech recognition.');
        setCallStatus('Voice recognition could not start on this device.');
      }
    };

    try {
      Speech.stop();
      Speech.speak(nextQuestion, {
        language: 'en-US',
        rate: 0.9,
        onDone: () => { void startListening(); },
        onError: () => { void startListening(); },
      });
    } catch (error) {
      console.warn('Could not speak emergency question:', error);
      void startListening();
    }
  };

  const handleStartSecureCall = async () => {
    if (voiceSessionRef.current) return;
    const isExpoGoBuild = Constants.appOwnership === 'expo';

    if (Platform.OS === 'web' || isExpoGoBuild) {
      setIsCallLoading(false);
      setShowCallPopup(false);
      Alert.alert(
        'Secure voice call unavailable',
        'Agora voice calls require a custom native development build. Please run the app with an Expo dev client or native build on iOS/Android.',
      );
      return;
    }

    voiceSessionRef.current = true;
    setIsCallLoading(true);
    setShowCallPopup(true);
    setVoiceTranscript('');
    setVoiceQuestions([]);
    setCurrentQuestionIndex(0);
    setCallStatus('Preparing secure voice connection...');
    setVoiceError(null);
    recognitionRef.current?.abort();

    try {
      const channelName = `lifelink-call-${user?.id || 'demo'}`;
      const uid = Number(user?.id || Date.now());
      const appId = process.env.EXPO_PUBLIC_AGORA_APP_ID;

      if (!appId) {
        throw new Error('Missing EXPO_PUBLIC_AGORA_APP_ID in frontend/.env');
      }

      const tokenResponse = await request('/voice/agora-token', {
        method: 'POST',
        body: JSON.stringify({ channelName, uid }),
      });

      if (!tokenResponse?.token) {
        throw new Error('No Agora token was returned by the backend.');
      }

      engineRef.current = await createEmergencyAgoraEngine({
        appId,
        token: tokenResponse.token,
        channelName,
        uid,
      });
      setCallStatus('Secure voice channel connected. Starting emergency check-in...');

      const questionsResponse = await request('/voice/agent-questions', {
        method: 'POST',
        body: JSON.stringify({
          patientName: user?.name || 'Patient',
          emergencyDescription: profile?.allergies?.join(', ') || 'Emergency check-in',
        }),
      });

      const questions = questionsResponse?.questions || [
        'Can you tell me exactly what happened and how you are feeling right now?',
        'Are you conscious and breathing normally right now?',
        'Do you have chest pain, severe bleeding, or trouble speaking or moving?',
        'Please stay in a safe position and tell me if anyone is with you or if you need immediate help.',
      ];

      setVoiceQuestions(questions);
      await askNextQuestion(questions, 0);

      const isLiveAgora = engineRef.current?.isNative;
      Alert.alert(
        'AI emergency voice assistant active',
        isLiveAgora
          ? 'Connected to the secure Agora voice channel. Emergency check-in started.'
          : 'Emergency check-in is active. Please speak your answers clearly.',
      );
    } catch (error) {
      console.error('Error initiating Agora voice call:', error);
      voiceSessionRef.current = false;
      setShowCallPopup(false);
      setIsCallLoading(false);
      Alert.alert('Call Failed', error instanceof Error ? error.message : 'Unable to start the in-app voice call.');
    }
  };

  const openPatientInfoEditor = () => {
    setFullName(user?.name || '');
    setBloodGroup(user?.bloodGroup || profile?.bloodGroup || '');
    setDateOfBirth(user?.dob || '');
    setPhoneNumber(user?.phone || '');
    setIsPatientInfoModalOpen(true);
  };

  const handleSavePatientInfo = async () => {
    if (!fullName.trim() || !phoneNumber.trim()) {
      Alert.alert('Missing Fields', 'Please enter your full name and phone number.');
      return;
    }

    await updateUser({
      name: fullName.trim(),
      bloodGroup: bloodGroup.trim(),
      dob: dateOfBirth.trim(),
      phone: phoneNumber.trim(),
    });
    if (profile) await updateProfile({ bloodGroup: bloodGroup.trim() });
    setIsPatientInfoModalOpen(false);
  };

  const handleAddContact = async () => {
    if (!contactName || !contactPhone) {
      Alert.alert('Missing Fields', 'Please enter contact name and phone number.');
      return;
    }
    await addEmergencyContact(contactName, contactRelation || 'Family', contactPhone, contactEmail.trim() || undefined);
    setContactName('');
    setContactRelation('');
    setContactPhone('');
    setContactEmail('');
    setIsModalOpen(false);
  };

  const handleAddAllergy = async () => {
    if (!allergyInput || !profile) return;
    const updated = [...profile.allergies, allergyInput.trim()];
    await updateProfile({ allergies: updated });
    setAllergyInput('');
  };

  const handleRemoveAllergy = async (allergy: string) => {
    if (!profile) return;
    const updated = profile.allergies.filter((a) => a !== allergy);
    await updateProfile({ allergies: updated });
  };

  const handleAddMedication = async () => {
    if (!medInput || !profile) return;
    const updated = [...profile.medications, medInput.trim()];
    await updateProfile({ medications: updated });
    setMedInput('');
  };

  const handleRemoveMedication = async (med: string) => {
    if (!profile) return;
    const updated = profile.medications.filter((m) => m !== med);
    await updateProfile({ medications: updated });
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Do you want to sign out from LifeLink AI+ on this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Emergency Profile</Text>
        <ShieldCheck size={24} color={COLORS.brand} />
      </View>

      {/* Patient Demographic Card */}
      <View style={styles.sectionCard}>
        <View style={styles.patientInfoHeader}>
          <View style={styles.avatarRow}>
            <Image
              source={user?.avatarUrl ? { uri: user.avatarUrl } : profilePhoto}
              style={styles.profileAvatar}
              accessibilityLabel="Profile photo"
            />
            <Text style={styles.sectionTitle}>Basic Patient Info</Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={openPatientInfoEditor}
            accessibilityRole="button"
            accessibilityLabel="Edit basic patient information"
          >
            <Edit2 size={15} color={COLORS.brand} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <Text style={styles.fieldValue}>{user?.name || 'Alex Johnson'}</Text>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Blood Group</Text>
          <Text style={[styles.fieldValue, { color: COLORS.status.red, fontWeight: '800' }]}>
            {user?.bloodGroup || 'O+'}
          </Text>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Date of Birth</Text>
          <Text style={styles.fieldValue}>{user?.dob || '1992-06-15'}</Text>
        </View>

        <View style={styles.fieldRowNoBorder}>
          <Text style={styles.fieldLabel}>Phone Number</Text>
          <Text style={styles.fieldValue}>{user?.phone || '+1 (555) 234-5678'}</Text>
        </View>
      </View>

      {/* Critical Allergies Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={18} color={COLORS.status.amber} />
            <Text style={styles.sectionTitle}>Severe Allergies</Text>
          </View>
        </View>

        <View style={styles.tagWrap}>
          {profile?.allergies.map((allergy) => (
            <TouchableOpacity
              key={allergy}
              onPress={() => handleRemoveAllergy(allergy)}
              style={styles.allergyTag}
            >
              <Text style={styles.allergyTagText}>{allergy}</Text>
              <Trash2 size={12} color={COLORS.status.red} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.addInputRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Add new allergy (e.g. Latex)"
            value={allergyInput}
            onChangeText={setAllergyInput}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddAllergy}>
            <Plus size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Medications Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pill size={18} color={COLORS.records.accent} />
            <Text style={styles.sectionTitle}>Active Medications</Text>
          </View>
        </View>

        <View style={styles.tagWrap}>
          {profile?.medications.map((med) => (
            <TouchableOpacity
              key={med}
              onPress={() => handleRemoveMedication(med)}
              style={styles.medTag}
            >
              <Text style={styles.medTagText}>{med}</Text>
              <Trash2 size={12} color={COLORS.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.addInputRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Add medication (e.g. Aspirin 81mg)"
            value={medInput}
            onChangeText={setMedInput}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddMedication}>
            <Plus size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Phone size={18} color={COLORS.brand} />
            <Text style={styles.sectionTitle}>Cybersecurity Assistant</Text>
          </View>
        </View>

        <Text style={styles.callDescription}>
          Our AI cybersecurity expert will call you to provide real-time assistance with your security concerns.
        </Text>

        <Text style={styles.fieldLabel}>Your Phone Number</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="Add a phone number to your profile"
          keyboardType="phone-pad"
          value={phoneNumber}
          maxLength={10}
          editable={false}
        />

        <TouchableOpacity
          style={[styles.callButton, isCallLoading && styles.callButtonDisabled]}
          onPress={handleStartSecureCall}
          disabled={isCallLoading}
        >
          {isCallLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.callButtonText}>Start Secure Call</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Emergency Contacts (ICE) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>ICE Emergency Contacts</Text>
          <TouchableOpacity style={styles.addContactBadge} onPress={() => setIsModalOpen(true)}>
            <Plus size={14} color="#FFFFFF" />
            <Text style={styles.addContactBadgeText}>Add ICE</Text>
          </TouchableOpacity>
        </View>

        {profile?.emergencyContacts.map((contact) => (
          <View key={contact.id || contact.name} style={styles.contactRow}>
            <View>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactSub}>
                {contact.relation} · {contact.phone}
              </Text>
              {contact.email ? (
                <Text style={[styles.contactSub, { color: '#60a5fa', fontSize: 11 }]}>
                  ✉ {contact.email}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => removeEmergencyContact(contact.id || '')}>
              <Trash2 size={16} color={COLORS.status.red} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <LogOut size={18} color={COLORS.status.red} />
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>

      {/* Add Contact Modal */}
      <Modal visible={isPatientInfoModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Basic Patient Info</Text>
            <TextInput style={styles.modalInput} placeholder="Full name" value={fullName} onChangeText={setFullName} />
            <TextInput style={styles.modalInput} placeholder="Blood group (e.g. O+)" value={bloodGroup} onChangeText={setBloodGroup} autoCapitalize="characters" />
            <TextInput style={styles.modalInput} placeholder="Date of birth (YYYY-MM-DD)" value={dateOfBirth} onChangeText={setDateOfBirth} />
            <TextInput style={styles.modalInput} placeholder="Phone number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setIsPatientInfoModalOpen(false)}>
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveModalBtn} onPress={handleSavePatientInfo}>
                <Text style={styles.saveModalText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={isModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Emergency Contact</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Contact Name (e.g. Sarah Johnson)"
              value={contactName}
              onChangeText={setContactName}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Relationship (e.g. Spouse / Parent)"
              value={contactRelation}
              onChangeText={setContactRelation}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Phone Number (+91 9876543210)"
              keyboardType="phone-pad"
              value={contactPhone}
              onChangeText={setContactPhone}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Email (for emergency transcript) — optional"
              keyboardType="email-address"
              autoCapitalize="none"
              value={contactEmail}
              onChangeText={setContactEmail}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveModalBtn} onPress={handleAddContact}>
                <Text style={styles.saveModalText}>Save Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showCallPopup} transparent animationType="fade">
        <View style={styles.callModalOverlay}>
          <View style={styles.callPopupContainer}>
            <View style={styles.callPopupHeader}>
              <Phone size={28} color={COLORS.ink} />
            </View>

            <View style={styles.callPopupContent}>
              <Text style={styles.callPopupTitle}>Emergency Voice Assistant</Text>
              <Text style={styles.callPopupMessage}>
                {voiceError
                  ? 'The secure channel is connected, but Android speech recognition could not start.'
                  : voiceQuestions[currentQuestionIndex] || 'Connecting you to the emergency check-in assistant.'}
              </Text>

              <View style={styles.callStatusContainer}>
                {!voiceError && <ActivityIndicator color={COLORS.ink} size="small" style={styles.callStatusIcon} />}
                <Text style={styles.callStatusText}>{callStatus}</Text>
              </View>

              <TouchableOpacity
                style={styles.okButton}
                onPress={() => {
                  if (voiceError) {
                    setShowCallPopup(false);
                    setIsCallLoading(false);
                    void completeVoiceFlow(voiceTranscript || 'Voice recognition unavailable; no spoken response captured.');
                    return;
                  }
                  cancelVoiceFlow();
                }}
              >
                <Text style={styles.okButtonText}>{voiceError ? 'CONTINUE WITHOUT VOICE' : 'END CALL'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 20,
  },
  title: {
    fontSize: TYPOGRAPHY.size.title,
    fontWeight: '900',
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.subheading,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 12,
  },
  patientInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  editButtonText: {
    color: COLORS.brand,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  fieldRowNoBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  fieldLabel: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  allergyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(215, 38, 61, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  allergyTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.status.red,
  },
  medTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  medTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.ink,
  },
  addInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.ink,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addContactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.brand,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  addContactBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  callDescription: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 20,
    marginBottom: 14,
  },
  callButton: {
    backgroundColor: COLORS.ink,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  callButtonDisabled: {
    opacity: 0.7,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  callModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  callPopupContainer: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  callPopupHeader: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(67, 176, 115, 0.12)',
  },
  callPopupContent: {
    padding: 20,
    alignItems: 'center',
  },
  callPopupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 10,
    textAlign: 'center',
  },
  callPopupMessage: {
    fontSize: 14,
    color: COLORS.ink,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  callStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(67, 176, 115, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  callStatusIcon: {
    marginRight: 8,
  },
  callStatusText: {
    fontSize: 14,
    color: COLORS.ink,
  },
  okButton: {
    backgroundColor: COLORS.ink,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  okButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  contactSub: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: SPACING.cardRadius,
    padding: 24,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.size.heading,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.ink,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  cancelModalText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted,
  },
  saveModalBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.brand,
  },
  saveModalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(215, 38, 61, 0.35)',
    borderRadius: SPACING.buttonRadius,
    backgroundColor: 'rgba(215, 38, 61, 0.06)',
    paddingVertical: 14,
    marginBottom: 20,
  },
  signOutText: {
    color: COLORS.status.red,
    fontSize: 14,
    fontWeight: '800',
  },
});
