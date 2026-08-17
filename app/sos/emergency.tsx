import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Siren, Phone, Navigation, AlertTriangle, ShieldCheck, XCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, SPACING } from '../../src/constants/theme';
import { TimelineStepper, StepItem } from '../../src/components/TimelineStepper';
import { useEmergencyStore } from '../../src/store/useEmergencyStore';
import { useProfileStore } from '../../src/store/useProfileStore';

export default function EmergencyModeScreen() {
  const { activeRequest, endEmergency } = useEmergencyStore();
  const profile = useProfileStore((s) => s.profile);

  const status = activeRequest?.status || 'connected';
  const hospital = activeRequest?.matchedHospital;
  const eta = activeRequest?.responderEtaMinutes || 6;

  const steps: StepItem[] = [
    {
      id: 's1',
      title: 'Locating Emergency Position',
      subtitle: 'GPS coordinates broadcasted to dispatch system',
      time: '17:35:10',
      status: 'complete',
    },
    {
      id: 's2',
      title: 'AI Hospital Matching',
      subtitle: 'Evaluating bed availability, specialties & distance',
      time: '17:35:12',
      status: status === 'locating' ? 'active' : 'complete',
    },
    {
      id: 's3',
      title: 'Hospital & ER Desk Connected',
      subtitle: hospital ? `${hospital.name} accepted payload` : 'Connecting to ER desk...',
      time: '17:35:15',
      status: status === 'matching' ? 'active' : status === 'locating' ? 'pending' : 'complete',
    },
  ];

  const handleCallICE = () => {
    const icePhone = profile?.emergencyContacts[0]?.phone || '+1 (555) 987-6543';
    Linking.openURL(`tel:${icePhone}`);
  };

  const handleEndEmergency = () => {
    endEmergency();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Emergency Status Header */}
        <View style={styles.topAlertHeader}>
          <View style={styles.redBadge}>
            <View style={styles.redDotPulse} />
            <Text style={styles.redBadgeText}>ACTIVE EMERGENCY MODE</Text>
          </View>

          <TouchableOpacity onPress={handleEndEmergency} style={styles.exitButton}>
            <Text style={styles.exitButtonText}>END SOS</Text>
          </TouchableOpacity>
        </View>

        {/* Monospace ETA Counter Block */}
        <View style={styles.monoReadoutBlock}>
          <Text style={styles.monoTitle}>ESTIMATED RESPONDER ETA</Text>
          <Text style={styles.monoTimeValue}>0{eta}:42</Text>
          <Text style={styles.monoSubtext}>CRITICAL TRIAGE PRIORITY HIGH</Text>
        </View>

        {/* Realtime Stepper Sequence */}
        <View style={styles.stepperContainer}>
          <TimelineStepper steps={steps} isDark={true} />
        </View>

        {/* Matched Hospital Summary Card */}
        {hospital && (
          <View style={styles.matchedHospitalCard}>
            <View style={styles.hospHeader}>
              <ShieldCheck size={20} color={COLORS.emergency.pulseGreen} />
              <Text style={styles.hospTag}>CONFIRMED HOSPITAL MATCH</Text>
            </View>

            <Text style={styles.hospName}>{hospital.name}</Text>
            <Text style={styles.hospDetails}>
              {hospital.address} · {hospital.distanceKm} km away
            </Text>

            {hospital.recommendationReason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonText}>{hospital.recommendationReason}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.trackActionBtn}
                onPress={() => router.push('/sos/track')}
              >
                <Navigation size={18} color="#FFFFFF" />
                <Text style={styles.trackActionText}>Track Responder</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.callIceBtn} onPress={handleCallICE}>
                <Phone size={18} color="#FFFFFF" />
                <Text style={styles.callIceText}>Call ICE Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Patient Emergency Wallet Quick Summary */}
        <View style={styles.walletQuickCard}>
          <Text style={styles.walletTitle}>TRANSMITTED EMERGENCY WALLET DATA</Text>
          <View style={styles.walletRow}>
            <Text style={styles.walletLabel}>Allergies:</Text>
            <Text style={styles.walletVal}>
              {profile?.allergies.join(', ') || 'Penicillin'}
            </Text>
          </View>
          <View style={styles.walletRow}>
            <Text style={styles.walletLabel}>Blood Group:</Text>
            <Text style={[styles.walletVal, { color: COLORS.emergency.pulseRed }]}>
              O+
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.emergency.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 40,
  },
  topAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  redBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 59, 78, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 78, 0.4)',
  },
  redDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.emergency.pulseRed,
  },
  redBadgeText: {
    color: COLORS.emergency.pulseRed,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  exitButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  exitButtonText: {
    color: COLORS.emergency.text,
    fontSize: 12,
    fontWeight: '800',
  },
  monoReadoutBlock: {
    backgroundColor: COLORS.emergency.cardBg,
    borderRadius: SPACING.cardRadius,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.emergency.border,
  },
  monoTitle: {
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.emergency.pulseAmber,
    letterSpacing: 1,
    marginBottom: 6,
  },
  monoTimeValue: {
    fontFamily: 'Courier',
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.emergency.text,
    letterSpacing: -1,
    marginBottom: 4,
  },
  monoSubtext: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: 'rgba(245, 247, 250, 0.5)',
  },
  stepperContainer: {
    backgroundColor: COLORS.emergency.cardBg,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.emergency.border,
  },
  matchedHospitalCard: {
    backgroundColor: COLORS.emergency.cardBg,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 219, 122, 0.3)',
  },
  hospHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  hospTag: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.emergency.pulseGreen,
    letterSpacing: 0.6,
  },
  hospName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.emergency.text,
    marginBottom: 2,
  },
  hospDetails: {
    fontSize: 13,
    color: 'rgba(245, 247, 250, 0.6)',
    marginBottom: 12,
  },
  reasonBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  reasonText: {
    fontSize: 12,
    color: COLORS.emergency.text,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  trackActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  trackActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  callIceBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 59, 78, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.emergency.pulseRed,
  },
  callIceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  walletQuickCard: {
    backgroundColor: COLORS.emergency.cardBg,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    borderWidth: 1,
    borderColor: COLORS.emergency.border,
  },
  walletTitle: {
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(245, 247, 250, 0.6)',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  walletLabel: {
    fontSize: 13,
    color: 'rgba(245, 247, 250, 0.6)',
  },
  walletVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.emergency.text,
  },
});
