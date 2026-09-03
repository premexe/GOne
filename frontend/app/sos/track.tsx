import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Navigation, Phone, ShieldCheck, MapPin, CheckCircle2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, SPACING } from '../../src/constants/theme';
import { DetailHeader } from '../../src/components/DetailHeader';
import { TimelineStepper, StepItem } from '../../src/components/TimelineStepper';
import { useEmergencyStore } from '../../src/store/useEmergencyStore';

export default function TrackEmergencyScreen() {
  const activeRequest = useEmergencyStore((s) => s.activeRequest);
  const refreshActiveEmergency = useEmergencyStore((s) => s.refreshActiveEmergency);
  const hospital = activeRequest?.matchedHospital;

  useEffect(() => {
    refreshActiveEmergency();
    const timer = setInterval(refreshActiveEmergency, 10000);
    return () => clearInterval(timer);
  }, [refreshActiveEmergency]);

  const isResolved = activeRequest?.status === 'closed';

  const timelineSteps: StepItem[] = [
    {
      id: 't1',
      title: 'SOS Alert Triggered',
      subtitle: 'Patient GPS & Emergency Wallet broadcasted',
      time: '17:35:00',
      status: 'complete',
    },
    {
      id: 't2',
      title: 'Hospital Notified',
      subtitle: `${hospital?.name || 'Palghar Trauma Center'} ER desk alerted`,
      time: '17:35:05',
      status: 'complete',
    },
    {
      id: 't3',
      title: 'Hospital Accepted Admission',
      subtitle: 'Trauma Bay #4 reserved & blood prep ordered',
      time: '17:35:12',
      status: 'complete',
    },
    {
      id: 't4',
      title: 'Responder Unit Assigned',
      subtitle: 'Mobile Intensive Care Unit #104 en-route',
      time: '17:35:20',
      status: isResolved ? 'complete' : 'active',
    },
    {
      id: 't5',
      title: 'Arrived at Location',
      subtitle: 'Paramedics on scene for stabilization',
      time: '17:41:00',
      status: isResolved ? 'complete' : 'pending',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DetailHeader title="Live Responder Tracking" isDark={true} />

        {/* Live GPS Map Simulation Container */}
        <View style={styles.mapSimulationBox}>
          <View style={styles.mapPinRow}>
            <View style={styles.pinBubble}>
              <MapPin size={20} color={COLORS.emergency.pulseRed} />
              <Text style={styles.pinLabel}>Responder Unit #104</Text>
            </View>
            <View style={styles.pinBubbleGreen}>
              <CheckCircle2 size={16} color={COLORS.emergency.pulseGreen} />
              <Text style={styles.pinLabelGreen}>{hospital?.name || 'Hospital'}</Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <Text style={styles.mapEtaText}>04:18 ETA · 1.8 KM REMAINING</Text>
        </View>

        {/* Timeline Stepper */}
        <View style={styles.stepperCard}>
          <Text style={styles.stepperHeaderTitle}>EMERGENCY PROGRESS TIMELINE</Text>
          <TimelineStepper steps={timelineSteps} isDark={true} />
        </View>

        {/* Contact Responder Bar */}
        <View style={styles.contactBar}>
          <View>
            <Text style={styles.responderName}>Paramedic Unit #104</Text>
            <Text style={styles.responderSub}>Driver: Capt. D. Miller · MICU Unit</Text>
          </View>

          <TouchableOpacity
            style={styles.callDispatchBtn}
            onPress={() => Linking.openURL('tel:+18005550199')}
          >
            <Phone size={18} color="#FFFFFF" />
            <Text style={styles.callDispatchText}>Call Dispatch</Text>
          </TouchableOpacity>
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
    paddingBottom: 40,
  },
  mapSimulationBox: {
    height: 180,
    backgroundColor: COLORS.emergency.cardBg,
    borderRadius: SPACING.cardRadius,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.emergency.border,
  },
  mapPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  pinBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 59, 78, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pinLabel: {
    color: COLORS.emergency.pulseRed,
    fontSize: 12,
    fontWeight: '700',
  },
  pinBubbleGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 219, 122, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pinLabelGreen: {
    color: COLORS.emergency.pulseGreen,
    fontSize: 12,
    fontWeight: '700',
  },
  routeLine: {
    width: '80%',
    height: 3,
    backgroundColor: COLORS.brand,
    borderRadius: 2,
    marginBottom: 16,
  },
  mapEtaText: {
    fontFamily: 'Courier',
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.emergency.text,
    letterSpacing: 0.5,
  },
  stepperCard: {
    backgroundColor: COLORS.emergency.cardBg,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.emergency.border,
  },
  stepperHeaderTitle: {
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.emergency.pulseAmber,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  contactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.emergency.cardBg,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.emergency.border,
  },
  responderName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.emergency.text,
  },
  responderSub: {
    fontSize: 11,
    color: 'rgba(245, 247, 250, 0.6)',
    marginTop: 2,
  },
  callDispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.status.green,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  callDispatchText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
