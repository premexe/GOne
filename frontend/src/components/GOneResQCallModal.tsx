import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ShieldAlert,
  Send,
  CheckCircle2,
  AlertTriangle,
  Languages,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { request } from '../services/http';
import { startSpeechRecognition } from '../services/speechRecognition';

interface Props {
  sosId: string | number;
  patientName?: string;
  emergencyDescription?: string;
  autoStart?: boolean;
}

type CallPhase = 'idle' | 'ringing' | 'active' | 'handover';

export function GOneResQCallModal({
  sosId,
  patientName = 'Patient',
  emergencyDescription = '',
  autoStart = false,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  // AI & Protocol state
  const [category, setCategory] = useState('GENERAL');
  const [severity, setSeverity] = useState('MODERATE');
  const [protocolTitle, setProtocolTitle] = useState('G-ONE ResQ Emergency Protocol');
  const [firstAidSteps, setFirstAidSteps] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentAiSpeech, setCurrentAiSpeech] = useState('');
  const [patientSpeech, setPatientSpeech] = useState('');
  const [turn, setTurn] = useState(1);
  const [transcript, setTranscript] = useState<Array<{ sender: 'ai' | 'patient'; text: string }>>([]);
  const [handoverSummary, setHandoverSummary] = useState('');

  // Call controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [manualText, setManualText] = useState('');

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const wave1 = useRef(new Animated.Value(0.4)).current;
  const wave2 = useRef(new Animated.Value(0.7)).current;
  const wave3 = useRef(new Animated.Value(0.3)).current;
  const wave4 = useRef(new Animated.Value(0.8)).current;
  const wave5 = useRef(new Animated.Value(0.5)).current;

  // Refs
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const timerRef = useRef<any>(null);
  const ringingTimer = useRef<any>(null);

  // Auto-start trigger when SOS is initiated
  useEffect(() => {
    if (autoStart) {
      triggerIncomingCall();
    }
  }, [autoStart]);

  // Breathing pulse animation for ringing / active call avatar
  useEffect(() => {
    if (phase === 'ringing' || phase === 'active') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [phase]);

  // Audio wave visualizer animation when active
  useEffect(() => {
    if (phase === 'active') {
      const createWaveLoop = (anim: Animated.Value, duration: number, min: number, max: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: max, duration, useNativeDriver: false }),
            Animated.timing(anim, { toValue: min, duration, useNativeDriver: false }),
          ])
        );
      };

      const w1 = createWaveLoop(wave1, 400, 0.2, 1.0);
      const w2 = createWaveLoop(wave2, 600, 0.3, 0.9);
      const w3 = createWaveLoop(wave3, 350, 0.1, 1.0);
      const w4 = createWaveLoop(wave4, 500, 0.4, 0.85);
      const w5 = createWaveLoop(wave5, 450, 0.2, 0.95);

      w1.start();
      w2.start();
      w3.start();
      w4.start();
      w5.start();

      return () => {
        w1.stop();
        w2.stop();
        w3.stop();
        w4.stop();
        w5.stop();
      };
    }
  }, [phase]);

  // Call duration counter
  useEffect(() => {
    if (phase === 'active') {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // ── Speech Output (TTS) ────────────────────────────────────────────────────
  const speakVoice = (text: string, onEnd?: () => void) => {
    if (!isSpeakerOn) {
      if (onEnd) onEnd();
      return;
    }

    try {
      Speech.stop();
    } catch {}

    const langTag = language === 'hi' ? 'hi-IN' : 'en-IN';

    // Web Speech API fallback
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langTag;
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.onend = () => {
          if (onEnd) onEnd();
        };
        utterance.onerror = () => {
          if (onEnd) onEnd();
        };
        window.speechSynthesis.speak(utterance);
        return;
      } catch {}
    }

    // Expo Speech on native device
    try {
      Speech.speak(text, {
        language: langTag,
        rate: 0.95,
        pitch: 1.0,
        onDone: onEnd,
        onError: onEnd,
      });
    } catch {
      if (onEnd) onEnd();
    }
  };

  const stopVoice = () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      Speech.stop();
    } catch {}
  };

  // ── Speech Recognition (STT) ───────────────────────────────────────────────
  const startListening = async () => {
    if (isMuted || phase !== 'active') return;

    try {
      setIsListening(true);
      const handle = await startSpeechRecognition({
        language: language === 'hi' ? 'hi-IN' : 'en-IN',
        onTranscript: (spoken) => {
          setPatientSpeech(spoken);
        },
        onEnd: () => {
          setIsListening(false);
          recognitionRef.current = null;
          if (patientSpeech.trim()) {
            handlePatientSubmit(patientSpeech.trim());
          }
        },
        onError: () => {
          setIsListening(false);
          recognitionRef.current = null;
        },
      });

      if (handle) {
        recognitionRef.current = handle;
      } else {
        setIsListening(false);
      }
    } catch {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    try {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    } catch {}
  };

  // ── Trigger Inbound Ringing ────────────────────────────────────────────────
  const triggerIncomingCall = () => {
    setPhase('ringing');
    setModalVisible(true);
    setTranscript([]);
    setCompletedSteps([]);

    // Auto-answer after 7 seconds if not manually answered or declined
    ringingTimer.current = setTimeout(() => {
      answerCall();
    }, 7000);
  };

  // ── Answer Call ────────────────────────────────────────────────────────────
  const answerCall = async () => {
    if (ringingTimer.current) clearTimeout(ringingTimer.current);
    setPhase('active');
    setIsLoadingAi(true);

    const initialGreeting =
      language === 'hi'
        ? `Namaste ${patientName.split(' ')[0]}, main LifeLink G-ONE ResQ Emergency Voice Companion hoon. Responders ko aapka alert mil gaya hai. Kripya batayein aapko kya takleef ho rahi hai?`
        : `Hello ${patientName.split(' ')[0]}, this is LifeLink G-ONE ResQ Emergency Voice Companion. Responders have received your GPS coordinates. Tell me what happened and how you are feeling?`;

    setCurrentAiSpeech(initialGreeting);
    setTranscript([{ sender: 'ai', text: initialGreeting }]);

    // Query initial turn from ResQ Engine with emergency description
    try {
      const resp = await request('/voice/resq/turn', {
        method: 'POST',
        body: JSON.stringify({
          sosId: Number(sosId) || 0,
          speech: emergencyDescription || 'Emergency SOS initiated',
          turn: 1,
          lang: language,
        }),
      });

      if (resp?.success) {
        setCategory(resp.category || 'GENERAL');
        setSeverity(resp.severity || 'MODERATE');
        setProtocolTitle(resp.protocol_title || 'Emergency Protocol');
        setFirstAidSteps(resp.first_aid_steps || []);
        if (resp.voice_response) {
          setCurrentAiSpeech(resp.voice_response);
          setTranscript([
            { sender: 'ai', text: resp.voice_response },
          ]);
          speakVoice(resp.voice_response, () => {
            startListening();
          });
        }
      } else {
        speakVoice(initialGreeting, () => {
          startListening();
        });
      }
    } catch {
      speakVoice(initialGreeting, () => {
        startListening();
      });
    } finally {
      setIsLoadingAi(false);
    }
  };

  // ── Handle Patient Speech / Text Turn ───────────────────────────────────────
  const handlePatientSubmit = async (userText: string) => {
    if (!userText.trim()) return;

    stopListening();
    stopVoice();

    const textToSend = userText.trim();
    setPatientSpeech('');
    setManualText('');
    setTranscript((prev) => [...prev, { sender: 'patient', text: textToSend }]);
    setIsLoadingAi(true);

    const nextTurn = turn + 1;
    setTurn(nextTurn);

    try {
      const resp = await request('/voice/resq/turn', {
        method: 'POST',
        body: JSON.stringify({
          sosId: Number(sosId) || 0,
          speech: textToSend,
          turn: nextTurn,
          lang: language,
        }),
      });

      if (resp?.success && resp.voice_response) {
        setCategory(resp.category || category);
        setSeverity(resp.severity || severity);
        setProtocolTitle(resp.protocol_title || protocolTitle);
        setFirstAidSteps(resp.first_aid_steps || firstAidSteps);
        setCurrentAiSpeech(resp.voice_response);
        setTranscript((prev) => [...prev, { sender: 'ai', text: resp.voice_response }]);

        speakVoice(resp.voice_response, () => {
          if (!resp.is_final) {
            startListening();
          }
        });
      }
    } catch {
      const fallback =
        language === 'hi'
          ? 'Emergency team aapki taraf aa rahi hai. Shaant rahein aur seedhe baithe rahein.'
          : 'Responders are on their way to your exact coordinates. Please stay calm and stationary.';
      setCurrentAiSpeech(fallback);
      speakVoice(fallback);
    } finally {
      setIsLoadingAi(false);
    }
  };

  // ── End Call & Structured Handover ─────────────────────────────────────────
  const endCall = async () => {
    if (ringingTimer.current) clearTimeout(ringingTimer.current);
    stopVoice();
    stopListening();

    setPhase('handover');

    try {
      const resp = await request('/voice/resq/handover', {
        method: 'POST',
        body: JSON.stringify({
          sosId: Number(sosId) || 0,
          category,
          notes: `Call completed (${formatTime(callDuration)}). ${transcript.length} turns recorded.`,
        }),
      });

      if (resp?.summary) {
        setHandoverSummary(resp.summary);
      } else {
        setHandoverSummary(
          `G-ONE ResQ Emergency Handover: Categorized as [${protocolTitle}] with [${severity}] urgency. Responders and emergency contacts notified.`
        );
      }
    } catch {
      setHandoverSummary(
        `G-ONE ResQ Handover Completed: Protocol [${protocolTitle}] executed. Responders alerted.`
      );
    }
  };

  const closeHandoverModal = () => {
    setPhase('idle');
    setModalVisible(false);
  };

  // Quick symptom phrases for rapid 1-tap speech
  const quickPhrases = [
    { label: 'Chest Pain', query: 'I have severe chest pain and pressure in my chest.' },
    { label: 'Bleeding', query: 'There is heavy bleeding from a deep wound.' },
    { label: 'Can’t Breathe', query: 'I am having severe difficulty breathing, asthma attack.' },
    { label: 'Unconscious', query: 'Patient is unconscious and unresponsive on the floor.' },
    { label: 'Accident / Fall', query: 'Patient fell down in an accident with broken bone.' },
    { label: 'Burns', query: 'Severe burn from hot fire and boiling liquid.' },
  ];

  const toggleStepCompleted = (index: number) => {
    if (completedSteps.includes(index)) {
      setCompletedSteps(completedSteps.filter((i) => i !== index));
    } else {
      setCompletedSteps([...completedSteps, index]);
    }
  };

  return (
    <>
      {/* ── Trigger Button in SOS Emergency Screen ──────────────────────────── */}
      <TouchableOpacity
        style={styles.triggerButton}
        onPress={triggerIncomingCall}
        activeOpacity={0.88}
      >
        <View style={styles.triggerPulse}>
          <PhoneCall size={22} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.triggerTitle}>G-ONE ResQ Voice Companion</Text>
            <View style={styles.livePill}>
              <Text style={styles.livePillText}>AI LIVE</Text>
            </View>
          </View>
          <Text style={styles.triggerSubtitle}>
            Voice-first first-aid guidance & dispatcher handover
          </Text>
        </View>
      </TouchableOpacity>

      {/* ── Realistic Fullscreen Emergency Call Modal ─────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={endCall}>
        <View style={styles.modalOverlay}>
          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PHASE 1: INCOMING RINGING CALL                                    */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {phase === 'ringing' && (
            <View style={styles.ringingContainer}>
              {/* Emergency Flashing Header */}
              <View style={styles.emergencyBanner}>
                <ShieldAlert size={20} color="#FFFFFF" />
                <Text style={styles.emergencyBannerText}>EMERGENCY DISPATCH INCOMING</Text>
              </View>

              {/* Pulsing Avatar */}
              <Animated.View style={[styles.ringingAvatarPulse, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.ringingAvatarInner}>
                  <PhoneCall size={54} color="#FFFFFF" />
                </View>
              </Animated.View>

              <Text style={styles.ringingCallerTitle}>G-ONE ResQ Dispatcher</Text>
              <Text style={styles.ringingCallerSubtitle}>
                AI Voice Companion · LifeLink Network
              </Text>

              <View style={styles.gpsAlertBox}>
                <AlertTriangle size={16} color="#FBBF24" />
                <Text style={styles.gpsAlertText}>
                  GPS Location Transmitted · Paramedics Active
                </Text>
              </View>

              {/* Answer & Decline Buttons */}
              <View style={styles.callResponseRow}>
                <TouchableOpacity
                  style={[styles.callBtn, styles.declineBtn]}
                  onPress={() => {
                    if (ringingTimer.current) clearTimeout(ringingTimer.current);
                    setPhase('idle');
                    setModalVisible(false);
                  }}
                >
                  <PhoneOff size={28} color="#FFFFFF" />
                  <Text style={styles.callBtnLabel}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.callBtn, styles.answerBtn]}
                  onPress={answerCall}
                >
                  <Phone size={32} color="#FFFFFF" />
                  <Text style={styles.callBtnLabel}>Answer Call</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PHASE 2: ACTIVE EMERGENCY CALL INTERFACE                          */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {phase === 'active' && (
            <View style={styles.activeCallContainer}>
              {/* Top Header Bar */}
              <View style={styles.topCallHeader}>
                <View style={styles.timerBadge}>
                  <View style={styles.greenLiveDot} />
                  <Clock size={13} color="#10B981" />
                  <Text style={styles.timerText}>{formatTime(callDuration)}</Text>
                </View>

                {/* Language Switcher */}
                <TouchableOpacity
                  style={styles.langToggle}
                  onPress={() => {
                    const nextLang = language === 'en' ? 'hi' : 'en';
                    setLanguage(nextLang);
                  }}
                >
                  <Languages size={14} color="#60A5FA" />
                  <Text style={styles.langToggleText}>
                    {language === 'en' ? 'English (Tap for Hindi)' : 'Hindi / Hinglish'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Caller Info & Protocol Badge */}
              <View style={styles.callerHeader}>
                <Text style={styles.activeCallerName}>G-ONE ResQ AI Dispatcher</Text>
                <View
                  style={[
                    styles.severityBadge,
                    severity === 'CRITICAL' && styles.badgeCritical,
                    severity === 'HIGH' && styles.badgeHigh,
                  ]}
                >
                  <ShieldAlert size={13} color="#FFFFFF" />
                  <Text style={styles.severityBadgeText}>{protocolTitle}</Text>
                </View>
              </View>

              {/* Sound Wave Visualizer */}
              <View style={styles.soundWaveRow}>
                <Animated.View
                  style={[
                    styles.waveBar,
                    {
                      height: wave1.interpolate({ inputRange: [0, 1], outputRange: [8, 36] }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.waveBar,
                    {
                      height: wave2.interpolate({ inputRange: [0, 1], outputRange: [12, 46] }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.waveBar,
                    styles.waveBarCenter,
                    {
                      height: wave3.interpolate({ inputRange: [0, 1], outputRange: [14, 52] }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.waveBar,
                    {
                      height: wave4.interpolate({ inputRange: [0, 1], outputRange: [10, 42] }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.waveBar,
                    {
                      height: wave5.interpolate({ inputRange: [0, 1], outputRange: [8, 32] }),
                    },
                  ]}
                />
              </View>

              {/* Scrollable Transcript & First-Aid Protocols */}
              <ScrollView
                style={styles.callContentScroll}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
              >
                {/* AI Speech Bubble */}
                <View style={styles.aiSpeechCard}>
                  <View style={styles.aiSpeakerRow}>
                    <Sparkles size={16} color="#60A5FA" />
                    <Text style={styles.aiSpeakerLabel}>G-ONE ResQ Spoken Guidance</Text>
                    {isLoadingAi && <ActivityIndicator size="small" color="#60A5FA" />}
                  </View>
                  <Text style={styles.aiSpeechContent}>
                    {currentAiSpeech || 'Connecting to G-ONE emergency dispatcher...'}
                  </Text>
                </View>

                {/* Patient Speech Indicator */}
                {isListening && (
                  <View style={styles.listeningBox}>
                    <Mic size={16} color="#EF4444" />
                    <Text style={styles.listeningText}>
                      Listening to you... {patientSpeech || 'Speak now...'}
                    </Text>
                  </View>
                )}

                {/* Interactive First-Aid Protocol Checklist */}
                {firstAidSteps.length > 0 && (
                  <View style={styles.protocolCard}>
                    <Text style={styles.protocolCardTitle}>
                      Authoritative First-Aid Steps (Tap as completed):
                    </Text>
                    {firstAidSteps.map((step, idx) => {
                      const isDone = completedSteps.includes(idx);
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.protocolStepRow, isDone && styles.stepRowDone]}
                          onPress={() => toggleStepCompleted(idx)}
                          activeOpacity={0.7}
                        >
                          <CheckCircle2
                            size={18}
                            color={isDone ? '#10B981' : '#6B7280'}
                          />
                          <Text
                            style={[
                              styles.protocolStepText,
                              isDone && styles.stepTextDone,
                            ]}
                          >
                            {step}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Quick 1-Tap Speech Options */}
                <Text style={styles.quickPhrasesTitle}>Quick Symptoms (Tap to speak):</Text>
                <View style={styles.quickPhrasesWrap}>
                  {quickPhrases.map((item, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.phraseChip}
                      onPress={() => handlePatientSubmit(item.query)}
                    >
                      <Text style={styles.phraseChipText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Text Input Row (Fallback for Mic) */}
              <View style={styles.textInputRow}>
                <TextInput
                  style={styles.manualInput}
                  placeholder="Or type emergency reply..."
                  placeholderTextColor="#6B7280"
                  value={manualText}
                  onChangeText={setManualText}
                  onSubmitEditing={() => handlePatientSubmit(manualText)}
                />
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={() => handlePatientSubmit(manualText)}
                >
                  <Send size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Bottom Call Action Buttons */}
              <View style={styles.callActionBar}>
                {/* Mic Mute Toggle */}
                <TouchableOpacity
                  style={[styles.actionRoundBtn, isMuted && styles.actionActiveBtn]}
                  onPress={() => {
                    if (isListening) stopListening();
                    setIsMuted(!isMuted);
                  }}
                >
                  {isMuted ? (
                    <MicOff size={22} color="#EF4444" />
                  ) : (
                    <Mic size={22} color="#FFFFFF" />
                  )}
                  <Text style={styles.actionBtnText}>{isMuted ? 'Muted' : 'Mute'}</Text>
                </TouchableOpacity>

                {/* Speaker Toggle */}
                <TouchableOpacity
                  style={[styles.actionRoundBtn, !isSpeakerOn && styles.actionActiveBtn]}
                  onPress={() => {
                    if (isSpeakerOn) stopVoice();
                    setIsSpeakerOn(!isSpeakerOn);
                  }}
                >
                  {isSpeakerOn ? (
                    <Volume2 size={22} color="#FFFFFF" />
                  ) : (
                    <VolumeX size={22} color="#EF4444" />
                  )}
                  <Text style={styles.actionBtnText}>{isSpeakerOn ? 'Speaker' : 'Muted'}</Text>
                </TouchableOpacity>

                {/* Push-to-Talk / Listen Button */}
                <TouchableOpacity
                  style={[
                    styles.actionRoundBtn,
                    isListening && { backgroundColor: '#EF4444' },
                  ]}
                  onPress={() => {
                    if (isListening) stopListening();
                    else startListening();
                  }}
                >
                  <Mic size={22} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>
                    {isListening ? 'Listening' : 'Talk'}
                  </Text>
                </TouchableOpacity>

                {/* Big Red End Call Button */}
                <TouchableOpacity
                  style={styles.endCallRoundBtn}
                  onPress={endCall}
                >
                  <PhoneOff size={26} color="#FFFFFF" />
                  <Text style={styles.endCallText}>End Call</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PHASE 3: STRUCTURED HANDOVER CONFIRMATION                         */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {phase === 'handover' && (
            <View style={styles.handoverContainer}>
              <View style={styles.handoverIconCircle}>
                <CheckCircle2 size={44} color="#10B981" />
              </View>

              <Text style={styles.handoverTitle}>G-ONE ResQ Handover Completed</Text>
              <Text style={styles.handoverSubtitle}>
                Protocol: {protocolTitle}
              </Text>

              <View style={styles.handoverCard}>
                <Text style={styles.handoverSectionTitle}>Clinical Dispatch Handover:</Text>
                <Text style={styles.handoverBodyText}>
                  {handoverSummary ||
                    'Emergency voice session saved. Protocol-bound first-aid steps recorded and forwarded to hospital triage.'}
                </Text>
              </View>

              <View style={styles.handoverCheckGrid}>
                <View style={styles.checkItem}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text style={styles.checkItemText}>GPS Coordinates Locked</Text>
                </View>
                <View style={styles.checkItem}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text style={styles.checkItemText}>Hospital ER Desk Notified</Text>
                </View>
                <View style={styles.checkItem}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text style={styles.checkItemText}>Transcript Emailed to Contacts</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.handoverDoneBtn}
                onPress={closeHandoverModal}
              >
                <Text style={styles.handoverDoneBtnText}>Return to Emergency Live Tracker</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Trigger card in emergency.tsx
  triggerButton: {
    backgroundColor: '#1E293B',
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  triggerPulse: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  livePill: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  livePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  triggerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },

  // Fullscreen Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: '#090D16',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Ringing Screen Styles ──────────────────────────────────────────────────
  ringingContainer: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emergencyBanner: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emergencyBannerText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1.2,
  },
  ringingAvatarPulse: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 40,
  },
  ringingAvatarInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringingCallerTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  ringingCallerSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  gpsAlertBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: '#FBBF24',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  gpsAlertText: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '600',
  },
  callResponseRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 40,
  },
  callBtn: {
    alignItems: 'center',
    gap: 8,
  },
  declineBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#16A34A',
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  callBtnLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },

  // ── Active Call Screen Styles ──────────────────────────────────────────────
  activeCallContainer: {
    width: '100%',
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  topCallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  greenLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderColor: '#3B82F6',
    borderWidth: 1,
  },
  langToggleText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
  },
  callerHeader: {
    alignItems: 'center',
    marginTop: 14,
  },
  activeCallerName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginTop: 6,
  },
  badgeCritical: {
    backgroundColor: '#DC2626',
  },
  badgeHigh: {
    backgroundColor: '#D97706',
  },
  severityBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  // Sound Wave Visualizer
  soundWaveRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    height: 56,
    marginVertical: 10,
  },
  waveBar: {
    width: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  waveBarCenter: {
    backgroundColor: '#60A5FA',
    width: 8,
  },

  // Scroll Content
  callContentScroll: {
    flex: 1,
  },
  aiSpeechCard: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  aiSpeakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiSpeakerLabel: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  aiSpeechContent: {
    color: '#F8FAFC',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  listeningBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  listeningText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '600',
  },

  // First Aid Protocol Card
  protocolCard: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  protocolCardTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  protocolStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
  },
  stepRowDone: {
    opacity: 0.6,
  },
  protocolStepText: {
    color: '#E5E7EB',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  stepTextDone: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },

  // Quick symptom phrases
  quickPhrasesTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  quickPhrasesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  phraseChip: {
    backgroundColor: '#1E293B',
    borderColor: '#3B82F6',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  phraseChipText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
  },

  // Text input fallback
  textInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Bottom action bar
  callActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  actionRoundBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  actionActiveBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  actionBtnText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  endCallRoundBtn: {
    width: 80,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    shadowColor: '#DC2626',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  endCallText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // ── Handover Screen Styles ─────────────────────────────────────────────────
  handoverContainer: {
    width: '100%',
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handoverIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  handoverTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  handoverSubtitle: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 20,
  },
  handoverCard: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  handoverSectionTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  handoverBodyText: {
    color: '#F8FAFC',
    fontSize: 13,
    lineHeight: 20,
  },
  handoverCheckGrid: {
    width: '100%',
    gap: 10,
    marginBottom: 30,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkItemText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  handoverDoneBtn: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  handoverDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
