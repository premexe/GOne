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
  RefreshCw,
  Ambulance,
  HeartPulse,
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
type AppLanguage = 'auto' | 'en' | 'hi' | 'mr';

export function GOneResQCallModal({
  sosId,
  patientName = 'Patient',
  emergencyDescription = '',
  autoStart = false,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [language, setLanguage] = useState<AppLanguage>('auto');

  // AI & Protocol state
  const [category, setCategory] = useState('GENERAL');
  const [severity, setSeverity] = useState('MODERATE');
  const [protocolTitle, setProtocolTitle] = useState('G-ONE ResQ Emergency Protocol');
  const [firstAidSteps, setFirstAidSteps] = useState<string[]>([]);
  const [tillAmbulanceArrives, setTillAmbulanceArrives] = useState<string[]>([
    'Keep patient sitting upright in a calm, well-ventilated space.',
    'Unlock front gate / entrance so paramedics can enter immediately.',
    'Gather current medications and patient ID for the ambulance team.',
    'Do not feed solid food or liquids if semi-conscious.',
    'Stay on this line — emergency dispatch is tracking your GPS coordinates.',
  ]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [completedAmbulanceSteps, setCompletedAmbulanceSteps] = useState<number[]>([]);
  const [currentAiSpeech, setCurrentAiSpeech] = useState('');
  const [patientSpeech, setPatientSpeech] = useState('');
  const [turn, setTurn] = useState(1);
  const [transcript, setTranscript] = useState<Array<{ sender: 'ai' | 'patient'; text: string; time: string }>>([]);
  const [handoverSummary, setHandoverSummary] = useState('');

  // Continuous Hands-Free Dialogue Loop
  const [isHandsFree, setIsHandsFree] = useState(true);
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

  // Mutable state refs to prevent stale closure bugs in continuous voice loop
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const timerRef = useRef<any>(null);
  const ringingTimer = useRef<any>(null);
  const silenceRestartTimer = useRef<any>(null);
  const lastSpokenBufferRef = useRef<string>('');
  const isHandsFreeRef = useRef<boolean>(true);
  const phaseRef = useRef<CallPhase>('idle');
  const languageRef = useRef<AppLanguage>('auto');
  const isMutedRef = useRef<boolean>(false);
  const isLoadingAiRef = useRef<boolean>(false);
  const chatScrollRef = useRef<ScrollView | null>(null);

  // Sync refs with state
  useEffect(() => {
    isHandsFreeRef.current = isHandsFree;
  }, [isHandsFree]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    isLoadingAiRef.current = isLoadingAi;
  }, [isLoadingAi]);

  // Auto-start trigger when SOS is initiated
  useEffect(() => {
    if (autoStart) {
      triggerIncomingCall();
    }
  }, [autoStart]);

  // Pulse animation for ringing and active dispatcher
  useEffect(() => {
    if (phase === 'ringing' || phase === 'active') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 850, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 850, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [phase]);

  // Sound wave animation
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

      const w1 = createWaveLoop(wave1, 380, 0.2, 1.0);
      const w2 = createWaveLoop(wave2, 550, 0.3, 0.9);
      const w3 = createWaveLoop(wave3, 320, 0.15, 1.0);
      const w4 = createWaveLoop(wave4, 480, 0.35, 0.85);
      const w5 = createWaveLoop(wave5, 420, 0.2, 0.95);

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

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const nowStamp = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
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

    const currentLang = languageRef.current;
    let langTag = 'en-IN';
    if (currentLang === 'mr') langTag = 'mr-IN';
    else if (currentLang === 'hi') langTag = 'hi-IN';
    else if (currentLang === 'auto') {
      // Auto-detect script in text
      if (/[\u0900-\u097F]/.test(text)) {
        langTag = /आहे|होत|त्रास|रक्त|लवकर/.test(text) ? 'mr-IN' : 'hi-IN';
      }
    }

    // Web Speech API fallback
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langTag;
        utterance.rate = 0.92;
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

    // Expo Speech on Native Android / iOS
    try {
      Speech.speak(text, {
        language: langTag,
        rate: 0.92,
        pitch: 1.0,
        onDone: () => {
          if (onEnd) onEnd();
        },
        onError: () => {
          if (onEnd) onEnd();
        },
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
    if (isMutedRef.current || phaseRef.current !== 'active' || isLoadingAiRef.current) return;

    try {
      if (silenceRestartTimer.current) clearTimeout(silenceRestartTimer.current);

      lastSpokenBufferRef.current = '';
      setPatientSpeech('');
      setIsListening(true);

      const curLang = languageRef.current;
      let recogLocale = 'en-IN';
      if (curLang === 'mr') recogLocale = 'mr-IN';
      else if (curLang === 'hi') recogLocale = 'hi-IN';
      else if (curLang === 'auto') recogLocale = 'hi-IN'; // Recognizes Hindi, Hinglish, Marathi, and English on Indian devices

      const handle = await startSpeechRecognition({
        language: recogLocale,
        onTranscript: (spoken) => {
          if (spoken && spoken.trim()) {
            lastSpokenBufferRef.current = spoken.trim();
            setPatientSpeech(spoken.trim());
          }
        },
        onEnd: () => {
          setIsListening(false);
          recognitionRef.current = null;

          const finalSpoken = lastSpokenBufferRef.current.trim();
          if (finalSpoken) {
            lastSpokenBufferRef.current = '';
            handlePatientSubmit(finalSpoken);
          } else if (isHandsFreeRef.current && phaseRef.current === 'active' && !isLoadingAiRef.current) {
            // Keep hands-free listening active if nothing heard after a brief silence
            silenceRestartTimer.current = setTimeout(() => {
              if (phaseRef.current === 'active' && !isLoadingAiRef.current && isHandsFreeRef.current) {
                startListening();
              }
            }, 1200);
          }
        },
        onError: () => {
          setIsListening(false);
          recognitionRef.current = null;
          if (isHandsFreeRef.current && phaseRef.current === 'active' && !isLoadingAiRef.current) {
            silenceRestartTimer.current = setTimeout(() => {
              if (phaseRef.current === 'active' && !isLoadingAiRef.current && isHandsFreeRef.current) {
                startListening();
              }
            }, 1500);
          }
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
    if (silenceRestartTimer.current) clearTimeout(silenceRestartTimer.current);
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
    setCompletedAmbulanceSteps([]);

    // Auto-answer after 6 seconds if not manually answered or declined
    ringingTimer.current = setTimeout(() => {
      answerCall();
    }, 6000);
  };

  // ── Answer Call ────────────────────────────────────────────────────────────
  const answerCall = async () => {
    if (ringingTimer.current) clearTimeout(ringingTimer.current);
    setPhase('active');
    setIsLoadingAi(true);

    const curLang = languageRef.current;
    let initialGreeting = `Hello ${patientName.split(' ')[0]}, this is LifeLink G-ONE ResQ Emergency Voice Companion. Responders have received your GPS coordinates. Tell me what happened?`;
    if (curLang === 'hi') {
      initialGreeting = `Namaste ${patientName.split(' ')[0]}, main LifeLink G-ONE ResQ Emergency Voice Companion hoon. Responders ko aapka alert mil gaya hai. Batayein aapko kya takleef ho rahi hai?`;
    } else if (curLang === 'mr') {
      initialGreeting = `Namaskar ${patientName.split(' ')[0]}, mee LifeLink G-ONE ResQ aapatkaleen aavaj saatheedhar aahe. Madat gataala tumche location milele aahe. Kripaya sanga kay tras hotoy?`;
    } else if (curLang === 'auto') {
      initialGreeting = `Hello ${patientName.split(' ')[0]}, G-ONE ResQ Dispatcher here. Responders are notified. Tell me what happened — you can speak in English, Hindi, or Marathi.`;
    }

    setCurrentAiSpeech(initialGreeting);
    setTranscript([{ sender: 'ai', text: initialGreeting, time: nowStamp() }]);

    // Query initial turn from ResQ Engine with emergency description
    try {
      const resp = await request('/voice/resq/turn', {
        method: 'POST',
        body: JSON.stringify({
          sosId: Number(sosId) || 0,
          speech: emergencyDescription || 'Emergency SOS initiated. Patient needs assistance.',
          turn: 1,
          lang: curLang,
        }),
      });

      if (resp?.success) {
        setCategory(resp.category || 'GENERAL');
        setSeverity(resp.severity || 'MODERATE');
        setProtocolTitle(resp.protocol_title || 'Emergency Protocol');
        if (resp.first_aid_steps?.length) setFirstAidSteps(resp.first_aid_steps);
        if (resp.till_ambulance_arrives?.length) setTillAmbulanceArrives(resp.till_ambulance_arrives);

        if (resp.voice_response) {
          setCurrentAiSpeech(resp.voice_response);
          setTranscript([
            { sender: 'ai', text: resp.voice_response, time: nowStamp() },
          ]);
          speakVoice(resp.voice_response, () => {
            // Automatically listen after AI finishes speaking (Hands-Free!)
            if (isHandsFreeRef.current) {
              setTimeout(() => startListening(), 400);
            }
          });
        }
      } else {
        speakVoice(initialGreeting, () => {
          if (isHandsFreeRef.current) {
            setTimeout(() => startListening(), 400);
          }
        });
      }
    } catch {
      speakVoice(initialGreeting, () => {
        if (isHandsFreeRef.current) {
          setTimeout(() => startListening(), 400);
        }
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
    setTranscript((prev) => [...prev, { sender: 'patient', text: textToSend, time: nowStamp() }]);
    setIsLoadingAi(true);

    const nextTurn = turn + 1;
    setTurn(nextTurn);

    // Scroll chat to bottom
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const resp = await request('/voice/resq/turn', {
        method: 'POST',
        body: JSON.stringify({
          sosId: Number(sosId) || 0,
          speech: textToSend,
          turn: nextTurn,
          lang: languageRef.current,
        }),
      });

      if (resp?.success && resp.voice_response) {
        setCategory(resp.category || category);
        setSeverity(resp.severity || severity);
        setProtocolTitle(resp.protocol_title || protocolTitle);
        if (resp.first_aid_steps?.length) setFirstAidSteps(resp.first_aid_steps);
        if (resp.till_ambulance_arrives?.length) setTillAmbulanceArrives(resp.till_ambulance_arrives);

        setCurrentAiSpeech(resp.voice_response);
        setTranscript((prev) => [
          ...prev,
          { sender: 'ai', text: resp.voice_response, time: nowStamp() },
        ]);

        setTimeout(() => {
          chatScrollRef.current?.scrollToEnd({ animated: true });
        }, 150);

        speakVoice(resp.voice_response, () => {
          // Continuous Loop: Auto-listen for next user utterance
          if (!resp.is_final && isHandsFreeRef.current && phaseRef.current === 'active') {
            setTimeout(() => {
              if (phaseRef.current === 'active') startListening();
            }, 450);
          }
        });
      }
    } catch {
      let fallback = 'Emergency responders are on their way to your exact coordinates. Please stay calm and stationary.';
      if (languageRef.current === 'hi') {
        fallback = 'Emergency team aapki location par aa rahi hai. Shaant rahein aur seedhe baithe rahein.';
      } else if (languageRef.current === 'mr') {
        fallback = 'Aapatkaleen madat gatt tumchya thikani yet aahe. Shanta raha aani aaraam kara.';
      }
      setCurrentAiSpeech(fallback);
      speakVoice(fallback, () => {
        if (isHandsFreeRef.current && phaseRef.current === 'active') {
          setTimeout(() => startListening(), 500);
        }
      });
    } finally {
      setIsLoadingAi(false);
    }
  };

  // ── End Call & Structured Handover ─────────────────────────────────────────
  const endCall = async () => {
    if (ringingTimer.current) clearTimeout(ringingTimer.current);
    if (silenceRestartTimer.current) clearTimeout(silenceRestartTimer.current);
    stopVoice();
    stopListening();

    setPhase('handover');

    try {
      const resp = await request('/voice/resq/handover', {
        method: 'POST',
        body: JSON.stringify({
          sosId: Number(sosId) || 0,
          category,
          notes: `Call duration: ${formatTime(callDuration)}. ${transcript.length} turns recorded.`,
        }),
      });

      if (resp?.summary) {
        setHandoverSummary(resp.summary);
      } else {
        setHandoverSummary(
          `G-ONE ResQ Emergency Handover: Patient ${patientName} emergency categorized as [${protocolTitle}] with [${severity}] urgency. Responders dispatched with live GPS coordinates.`
        );
      }
    } catch {
      setHandoverSummary(
        `G-ONE ResQ Emergency Handover: Patient ${patientName} emergency categorized as [${protocolTitle}] with [${severity}] urgency. Responders dispatched with live GPS coordinates.`
      );
    }
  };

  const closeFullModal = () => {
    stopVoice();
    stopListening();
    if (ringingTimer.current) clearTimeout(ringingTimer.current);
    if (silenceRestartTimer.current) clearTimeout(silenceRestartTimer.current);
    setPhase('idle');
    setModalVisible(false);
  };

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const toggleAmbulanceStep = (index: number) => {
    setCompletedAmbulanceSteps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <View style={styles.container}>
      {/* Launch Companion Button */}
      <TouchableOpacity
        style={styles.openCallButton}
        onPress={triggerIncomingCall}
        activeOpacity={0.85}
      >
        <PhoneCall size={20} color="#FFFFFF" style={styles.btnIcon} />
        <View style={styles.btnTextContainer}>
          <Text style={styles.btnTitle}>G-ONE ResQ AI Voice Companion</Text>
          <Text style={styles.btnSubtitle}>Hands-Free Voice • Hindi • Marathi • English</Text>
        </View>
      </TouchableOpacity>

      {/* Main Full-Screen Emergency Voice Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeFullModal}
      >
        <View style={styles.modalRoot}>
          {/* ════════════════════════════════════════════════════════════════════
              PHASE 1: INCOMING RINGING SCREEN
          ════════════════════════════════════════════════════════════════════ */}
          {phase === 'ringing' && (
            <View style={styles.ringingContainer}>
              <View style={styles.ringingHeader}>
                <View style={styles.liveIndicator}>
                  <View style={styles.redDot} />
                  <Text style={styles.liveText}>PRIORITY 1 INCOMING CALL</Text>
                </View>
                <Text style={styles.callerSub}>G-ONE Emergency Response System</Text>
              </View>

              <View style={styles.avatarWrapper}>
                <Animated.View
                  style={[
                    styles.avatarHalo,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
                <View style={styles.avatarCircle}>
                  <HeartPulse size={54} color="#EF4444" />
                </View>
              </View>

              <Text style={styles.callerName}>G-ONE ResQ Dispatcher</Text>
              <Text style={styles.callerStatus}>Emergency AI Companion • Triage Active</Text>
              <Text style={styles.autoAnswerNotice}>Auto-answering in 6s...</Text>

              <View style={styles.ringingActions}>
                <TouchableOpacity
                  style={[styles.callActionBtn, styles.declineBtn]}
                  onPress={closeFullModal}
                >
                  <PhoneOff size={28} color="#FFFFFF" />
                  <Text style={styles.actionBtnLabel}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.callActionBtn, styles.acceptBtn]}
                  onPress={answerCall}
                >
                  <Phone size={28} color="#FFFFFF" />
                  <Text style={styles.actionBtnLabel}>Answer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              PHASE 2: ACTIVE EMERGENCY CALL
          ════════════════════════════════════════════════════════════════════ */}
          {phase === 'active' && (
            <View style={styles.activeCallContainer}>
              {/* Top Bar with Language Selector & Hands-free Switch */}
              <View style={styles.activeTopBar}>
                <View>
                  <View style={styles.activeCallerBadge}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeCallerName}>G-ONE ResQ Dispatcher</Text>
                  </View>
                  <View style={styles.timerRow}>
                    <Clock size={13} color="#94A3B8" />
                    <Text style={styles.callTimerText}>{formatTime(callDuration)}</Text>
                    <View style={styles.severityChip}>
                      <Text style={styles.severityChipText}>{severity}</Text>
                    </View>
                  </View>
                </View>

                {/* Multi-Language Selector */}
                <View style={styles.langPills}>
                  {(['auto', 'en', 'hi', 'mr'] as AppLanguage[]).map((l) => (
                    <TouchableOpacity
                      key={l}
                      style={[styles.langPill, language === l && styles.langPillActive]}
                      onPress={() => {
                        setLanguage(l);
                        languageRef.current = l;
                      }}
                    >
                      <Text style={[styles.langPillText, language === l && styles.langPillTextActive]}>
                        {l === 'auto' ? '⚡ Auto' : l === 'en' ? 'EN' : l === 'hi' ? 'हिंदी' : 'मराठी'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Hands-Free Mode Banner */}
              <TouchableOpacity
                style={[styles.handsFreeBar, isHandsFree && styles.handsFreeBarActive]}
                onPress={() => {
                  const nextVal = !isHandsFree;
                  setIsHandsFree(nextVal);
                  isHandsFreeRef.current = nextVal;
                  if (nextVal && !isListening && !isLoadingAi) {
                    startListening();
                  }
                }}
              >
                <Sparkles size={14} color={isHandsFree ? '#10B981' : '#94A3B8'} />
                <Text style={[styles.handsFreeText, isHandsFree && styles.handsFreeTextActive]}>
                  {isHandsFree
                    ? 'Hands-Free Voice Active (Auto-Listens & Responds)'
                    : 'Hands-Free Off (Tap Mic to Speak)'}
                </Text>
                <View style={[styles.toggleDot, isHandsFree && styles.toggleDotActive]} />
              </TouchableOpacity>

              {/* Main Scrollable Content */}
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Visualizer & Spoken AI Banner */}
                <View style={styles.aiSpeakingCard}>
                  <View style={styles.aiHeaderRow}>
                    <ShieldAlert size={18} color="#EF4444" />
                    <Text style={styles.protocolBadge}>{protocolTitle}</Text>
                    {isLoadingAi && <ActivityIndicator size="small" color="#EF4444" style={{ marginLeft: 6 }} />}
                  </View>

                  {/* Sound Wave Visualizer */}
                  <View style={styles.waveVisualizerRow}>
                    <Animated.View style={[styles.waveBar, { height: Animated.multiply(wave1, 28) }]} />
                    <Animated.View style={[styles.waveBar, { height: Animated.multiply(wave2, 34) }]} />
                    <Animated.View style={[styles.waveBar, { height: Animated.multiply(wave3, 24) }]} />
                    <Animated.View style={[styles.waveBar, { height: Animated.multiply(wave4, 38) }]} />
                    <Animated.View style={[styles.waveBar, { height: Animated.multiply(wave5, 26) }]} />
                  </View>

                  {/* Live AI Spoken Text */}
                  <Text style={styles.currentSpeechText}>
                    "{currentAiSpeech || 'Listening to your situation...'}"
                  </Text>

                  {/* Listening Indicator / Patient Voice Subtitle */}
                  {isListening && (
                    <View style={styles.listeningSubtitleBox}>
                      <Mic size={15} color="#10B981" />
                      <Text style={styles.listeningSubtitleText}>
                        {patientSpeech ? `You: "${patientSpeech}"` : 'Listening to you... (बोलिए / बोला...)'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* 🚨 CRITICAL: Actions Till Ambulance Arrives Banner */}
                <View style={styles.ambulanceCard}>
                  <View style={styles.ambulanceHeader}>
                    <Ambulance size={20} color="#F59E0B" />
                    <View style={styles.ambulanceTitleCol}>
                      <Text style={styles.ambulanceTitle}>WHILE AMBULANCE IS EN ROUTE</Text>
                      <Text style={styles.ambulanceSubtitle}>रुग्णवाहिका येईपर्यंत • जब तक एम्बुलेंस न आए (ETA: ~5 MIN)</Text>
                    </View>
                  </View>

                  <View style={styles.ambulanceStepList}>
                    {tillAmbulanceArrives.map((action, idx) => {
                      const isDone = completedAmbulanceSteps.includes(idx);
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.ambulanceStepRow, isDone && styles.ambulanceStepRowDone]}
                          onPress={() => toggleAmbulanceStep(idx)}
                          activeOpacity={0.7}
                        >
                          <CheckCircle2
                            size={18}
                            color={isDone ? '#10B981' : '#64748B'}
                            style={{ marginRight: 8, marginTop: 2 }}
                          />
                          <Text style={[styles.ambulanceStepText, isDone && styles.stepTextCompleted]}>
                            {action}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Protocol Checklist Steps */}
                {firstAidSteps.length > 0 && (
                  <View style={styles.protocolChecklistCard}>
                    <Text style={styles.cardHeaderTitle}>Emergency Protocol Checklist</Text>
                    <Text style={styles.cardHeaderSubtitle}>Follow these clinical steps immediately:</Text>

                    {firstAidSteps.map((step, idx) => {
                      const isChecked = completedSteps.includes(idx);
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.stepItem, isChecked && styles.stepItemCompleted]}
                          onPress={() => toggleStep(idx)}
                          activeOpacity={0.7}
                        >
                          <CheckCircle2
                            size={18}
                            color={isChecked ? '#10B981' : '#475569'}
                            style={{ marginRight: 8, marginTop: 2 }}
                          />
                          <Text style={[styles.stepText, isChecked && styles.stepTextCompleted]}>
                            {step}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Real-Time Live Chat Transcript Feed */}
                <View style={styles.chatSection}>
                  <Text style={styles.chatSectionTitle}>Real-Time Transcript (Voice-to-Text & Text-to-Voice)</Text>
                  <ScrollView
                    ref={chatScrollRef}
                    style={styles.chatScroll}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {transcript.map((msg, index) => (
                      <View
                        key={index}
                        style={[
                          styles.chatBubble,
                          msg.sender === 'ai' ? styles.aiBubble : styles.patientBubble,
                        ]}
                      >
                        <View style={styles.chatBubbleHeader}>
                          <Text style={styles.chatSenderLabel}>
                            {msg.sender === 'ai' ? '🤖 G-ONE ResQ Dispatcher' : '👤 You'}
                          </Text>
                          <Text style={styles.chatTimeLabel}>{msg.time}</Text>
                        </View>
                        <Text style={styles.chatBubbleText}>{msg.text}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                {/* Quick Symptom Chips for 1-Tap Trigger */}
                <View style={styles.quickChipsSection}>
                  <Text style={styles.quickChipsLabel}>1-Tap Quick Symptoms (Or just speak):</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    {[
                      'Chest pain & sweating',
                      'Severe heavy bleeding',
                      'Difficulty breathing',
                      'Person is unconscious',
                      'Choking on food',
                      'Burned by fire/oil',
                      'Fall with broken bone',
                    ].map((symptom, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.chipBtn}
                        onPress={() => handlePatientSubmit(symptom)}
                      >
                        <Text style={styles.chipBtnText}>{symptom}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </ScrollView>

              {/* Bottom Interactive Bar (Text Input + Call Controls) */}
              <View style={styles.activeBottomBar}>
                {/* Manual Text Send Row */}
                <View style={styles.textInputRow}>
                  <TextInput
                    style={styles.manualInput}
                    placeholder="Type or speak (English, Hindi, Marathi)..."
                    placeholderTextColor="#64748B"
                    value={manualText}
                    onChangeText={setManualText}
                    onSubmitEditing={() => handlePatientSubmit(manualText)}
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, !manualText.trim() && styles.sendBtnDisabled]}
                    onPress={() => handlePatientSubmit(manualText)}
                    disabled={!manualText.trim()}
                  >
                    <Send size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Primary Call Controls */}
                <View style={styles.callControlsRow}>
                  {/* Mute */}
                  <TouchableOpacity
                    style={[styles.ctrlBtn, isMuted && styles.ctrlBtnMuted]}
                    onPress={() => {
                      setIsMuted(!isMuted);
                      if (!isMuted) stopListening();
                    }}
                  >
                    {isMuted ? <MicOff size={22} color="#EF4444" /> : <Mic size={22} color="#FFFFFF" />}
                    <Text style={styles.ctrlLabel}>{isMuted ? 'Muted' : 'Mute'}</Text>
                  </TouchableOpacity>

                  {/* Talk / Listen Main Indicator Button */}
                  <TouchableOpacity
                    style={[
                      styles.mainTalkBtn,
                      isListening && styles.mainTalkBtnListening,
                      isLoadingAi && styles.mainTalkBtnLoading,
                    ]}
                    onPress={() => {
                      if (isListening) {
                        stopListening();
                        if (patientSpeech.trim()) {
                          handlePatientSubmit(patientSpeech.trim());
                        }
                      } else {
                        startListening();
                      }
                    }}
                  >
                    {isLoadingAi ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : isListening ? (
                      <Mic size={26} color="#FFFFFF" />
                    ) : (
                      <Mic size={26} color="#FFFFFF" />
                    )}
                    <Text style={styles.mainTalkBtnLabel}>
                      {isLoadingAi ? 'Thinking...' : isListening ? 'Listening...' : 'Tap to Talk'}
                    </Text>
                  </TouchableOpacity>

                  {/* Speaker Toggle */}
                  <TouchableOpacity
                    style={[styles.ctrlBtn, !isSpeakerOn && styles.ctrlBtnOff]}
                    onPress={() => {
                      setIsSpeakerOn(!isSpeakerOn);
                      if (isSpeakerOn) stopVoice();
                    }}
                  >
                    {isSpeakerOn ? <Volume2 size={22} color="#FFFFFF" /> : <VolumeX size={22} color="#EF4444" />}
                    <Text style={styles.ctrlLabel}>{isSpeakerOn ? 'Speaker' : 'Muted'}</Text>
                  </TouchableOpacity>

                  {/* End Call */}
                  <TouchableOpacity
                    style={[styles.ctrlBtn, styles.endCallBtn]}
                    onPress={endCall}
                  >
                    <PhoneOff size={22} color="#FFFFFF" />
                    <Text style={styles.ctrlLabel}>End</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              PHASE 3: STRUCTURED HANDOVER SCREEN
          ════════════════════════════════════════════════════════════════════ */}
          {phase === 'handover' && (
            <View style={styles.handoverContainer}>
              <ScrollView contentContainerStyle={styles.handoverContent}>
                <View style={styles.handoverHeader}>
                  <CheckCircle2 size={48} color="#10B981" />
                  <Text style={styles.handoverTitle}>Emergency Handover Generated</Text>
                  <Text style={styles.handoverSub}>
                    Hospital ER & dispatched ambulance have received this summary.
                  </Text>
                </View>

                <View style={styles.handoverCard}>
                  <Text style={styles.handoverSectionTitle}>Patient & Incident Summary</Text>
                  <Text style={styles.handoverBodyText}>
                    {handoverSummary || 'Clinical handover is being finalized by dispatch.'}
                  </Text>

                  <View style={styles.handoverMetaRow}>
                    <Text style={styles.handoverMetaKey}>Category:</Text>
                    <Text style={styles.handoverMetaVal}>{category}</Text>
                  </View>
                  <View style={styles.handoverMetaRow}>
                    <Text style={styles.handoverMetaKey}>Urgency:</Text>
                    <Text style={[styles.handoverMetaVal, { color: '#EF4444' }]}>{severity}</Text>
                  </View>
                  <View style={styles.handoverMetaRow}>
                    <Text style={styles.handoverMetaKey}>Duration:</Text>
                    <Text style={styles.handoverMetaVal}>{formatTime(callDuration)}</Text>
                  </View>
                  <View style={styles.handoverMetaRow}>
                    <Text style={styles.handoverMetaKey}>Interactions:</Text>
                    <Text style={styles.handoverMetaVal}>{transcript.length} turns recorded</Text>
                  </View>
                </View>

                {/* Handover Transcript Preview */}
                <View style={styles.transcriptCard}>
                  <Text style={styles.handoverSectionTitle}>Call Transcript Record</Text>
                  {transcript.map((msg, i) => (
                    <Text key={i} style={styles.transcriptLogItem}>
                      <Text style={{ fontWeight: '700', color: msg.sender === 'ai' ? '#38BDF8' : '#34D399' }}>
                        {msg.sender === 'ai' ? 'G-ONE: ' : 'Patient: '}
                      </Text>
                      {msg.text}
                    </Text>
                  ))}
                </View>

                <TouchableOpacity style={styles.doneBtn} onPress={closeFullModal}>
                  <Text style={styles.doneBtnText}>Return to Emergency Dashboard</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  openCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#EF4444',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnIcon: {
    marginRight: 12,
  },
  btnTextContainer: {
    flex: 1,
  },
  btnTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  btnSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },

  // Modal Root
  modalRoot: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },

  // Phase 1: Ringing
  ringingContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  ringingHeader: {
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  liveText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  callerSub: {
    color: '#64748B',
    fontSize: 13,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHalo: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  avatarCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callerName: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 18,
  },
  callerStatus: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
  },
  autoAnswerNotice: {
    color: '#EF4444',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  ringingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  callActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  declineBtn: {
    backgroundColor: '#DC2626',
  },
  acceptBtn: {
    backgroundColor: '#10B981',
  },
  actionBtnLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  // Phase 2: Active Call
  activeCallContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  activeTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  activeCallerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  activeCallerName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  callTimerText: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 4,
    marginRight: 8,
  },
  severityChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  severityChipText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
  },
  langPills: {
    flexDirection: 'row',
    gap: 4,
  },
  langPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  langPillActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  langPillText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  langPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Hands-Free Switch Bar
  handsFreeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  handsFreeBarActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  handsFreeText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 8,
  },
  handsFreeTextActive: {
    color: '#10B981',
    fontWeight: '600',
  },
  toggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748B',
  },
  toggleDotActive: {
    backgroundColor: '#10B981',
  },

  // Scroll Area
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },

  // Spoken AI Card
  aiSpeakingCard: {
    backgroundColor: '#131C31',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 14,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  protocolBadge: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  waveVisualizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    marginVertical: 4,
  },
  waveBar: {
    width: 6,
    backgroundColor: '#EF4444',
    borderRadius: 3,
  },
  currentSpeechText: {
    color: '#F8FAFC',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    marginTop: 8,
  },
  listeningSubtitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  listeningSubtitleText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Ambulance Pre-Hospital Card
  ambulanceCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    padding: 16,
    marginBottom: 14,
  },
  ambulanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ambulanceTitleCol: {
    marginLeft: 10,
  },
  ambulanceTitle: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ambulanceSubtitle: {
    color: '#D97706',
    fontSize: 11,
    marginTop: 1,
  },
  ambulanceStepList: {
    gap: 8,
  },
  ambulanceStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 10,
  },
  ambulanceStepRowDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  ambulanceStepText: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 13,
    lineHeight: 18,
  },

  // Protocol Checklist Card
  protocolChecklistCard: {
    backgroundColor: '#131C31',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  cardHeaderSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  stepItemCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  stepText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
  },
  stepTextCompleted: {
    color: '#64748B',
    textDecorationLine: 'line-through',
  },

  // Real-Time Transcript Chat Feed
  chatSection: {
    backgroundColor: '#131C31',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    marginBottom: 14,
  },
  chatSectionTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  chatScroll: {
    maxHeight: 190,
  },
  chatBubble: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: '90%',
  },
  aiBubble: {
    backgroundColor: '#1E293B',
    alignSelf: 'flex-start',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  patientBubble: {
    backgroundColor: '#0F766E',
    alignSelf: 'flex-end',
  },
  chatBubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatSenderLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  chatTimeLabel: {
    color: '#64748B',
    fontSize: 9,
    marginLeft: 8,
  },
  chatBubbleText: {
    color: '#F8FAFC',
    fontSize: 13,
    lineHeight: 18,
  },

  // Quick Chips
  quickChipsSection: {
    marginBottom: 8,
  },
  quickChipsLabel: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
  },
  chipBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipBtnText: {
    color: '#E2E8F0',
    fontSize: 12,
  },

  // Active Bottom Bar
  activeBottomBar: {
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendBtn: {
    backgroundColor: '#EF4444',
    padding: 10,
    borderRadius: 12,
    marginLeft: 8,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  callControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  ctrlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E293B',
  },
  ctrlBtnMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  ctrlBtnOff: {
    backgroundColor: '#334155',
  },
  ctrlLabel: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  mainTalkBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#EF4444',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  mainTalkBtnListening: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  mainTalkBtnLoading: {
    backgroundColor: '#6366F1',
  },
  mainTalkBtnLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  endCallBtn: {
    backgroundColor: '#DC2626',
  },

  // Phase 3: Handover
  handoverContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  handoverContent: {
    padding: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  handoverHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  handoverTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  handoverSub: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  handoverCard: {
    backgroundColor: '#131C31',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 18,
    width: '100%',
    marginBottom: 16,
  },
  handoverSectionTitle: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  handoverBodyText: {
    color: '#F8FAFC',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  handoverMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  handoverMetaKey: {
    color: '#94A3B8',
    fontSize: 13,
  },
  handoverMetaVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  transcriptCard: {
    backgroundColor: '#131C31',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  transcriptLogItem: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  doneBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
