import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Siren, Phone, Navigation, AlertTriangle, ShieldCheck, XCircle, Truck, UserCheck } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, SPACING } from '../../src/constants/theme';
import { TimelineStepper, StepItem } from '../../src/components/TimelineStepper';
import { useEmergencyStore } from '../../src/store/useEmergencyStore';
import { useProfileStore } from '../../src/store/useProfileStore';

export default function EmergencyModeScreen() {
  const { activeRequest, isEmergencyActive, endEmergency } = useEmergencyStore();
  const profile = useProfileStore((s) => s.profile);

  // Guard: if no active SOS, go back to home
  if (!isEmergencyActive || !activeRequest) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D1117', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 16, marginBottom: 16 }}>No active emergency</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const hospital = activeRequest?.acceptedHospital || activeRequest?.matchedHospital;
  const ambulance = activeRequest?.assignedAmbulance;
  const doctor = activeRequest?.assignedDoctor;
  const eta = activeRequest?.responderEtaMinutes || 5;

  const normDispatch = ((activeRequest as any)?.dispatchStatus || '').toUpperCase();
  const isAccepted = Boolean(activeRequest?.acceptedHospital || activeRequest?.hospitalId || normDispatch === 'ACCEPTED' || normDispatch === 'AMBULANCE_ASSIGNED' || normDispatch === 'EN_ROUTE');
  const isAmbulanceAssigned = Boolean(ambulance || normDispatch === 'AMBULANCE_ASSIGNED' || normDispatch === 'EN_ROUTE');
  const isArrived = activeRequest?.status === 'arrived' || normDispatch === 'ARRIVED' || normDispatch === 'PATIENT_PICKED_UP';
  const isEnRoute = activeRequest?.status === 'en_route' || normDispatch === 'EN_ROUTE' || normDispatch === 'AMBULANCE_ASSIGNED';

  const steps: StepItem[] = [
    {
      id: 's1',
      title: 'Locating Emergency Position',
      subtitle: 'GPS coordinates broadcasted to hospital dispatch network',
      time: 'Live',
      status: 'complete',
    },
    {
      id: 's2',
      title: 'Hospital ER Desk Alerted',
      subtitle: isAccepted
        ? `${hospital?.name || 'Hospital'} accepted your emergency admission!`
        : 'Alerting on-duty emergency desks at nearby partner hospitals...',
      time: 'Live',
      status: isAccepted ? 'complete' : 'active',
    },
    {
      id: 's3',
      title: 'Ambulance & Paramedic Dispatch',
      subtitle: ambulance
        ? `${ambulance.vehicleNumber} dispatched · Driver: ${ambulance.driverName}`
        : isAccepted
        ? 'Hospital assigning ready ambulance from fleet...'
        : 'Awaiting hospital assignment...',
      time: 'Live',
      status: isArrived ? 'complete' : isAmbulanceAssigned ? (isEnRoute ? 'active' : 'complete') : isAccepted ? 'active' : 'pending',
    },
    {
      id: 's4',
      title: normDispatch === 'PATIENT_PICKED_UP' ? 'Patient Picked Up' : 'Arrived at Location',
      subtitle: isArrived
        ? 'Paramedics on scene providing emergency care'
        : 'Ambulance moving to patient location',
      time: isArrived ? 'On Scene' : 'Pending',
      status: isArrived ? 'active' : 'pending',
    },
  ];

  const handleCallICE = () => {
    const icePhone = profile?.emergencyContacts[0]?.phone || '+1 (555) 987-6543';
    Linking.openURL(`tel:${icePhone}`);
  };

  const handleCallAmbulance = () => {
    const ambPhone = ambulance?.driverPhone || hospital?.contact || '+1 800-555-0199';
    Linking.openURL(`tel:${ambPhone}`);
  };

  const handleEndEmergency = async () => {
    try {
      await endEmergency();
    } catch (error) {
      console.warn('Notice while ending SOS:', error);
    } finally {
      router.replace('/(tabs)');
    }
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
          <Text style={styles.monoTimeValue}>0{eta}:30</Text>
          <Text style={styles.monoSubtext}>
            {isAccepted
              ? `ADMISSION CONFIRMED BY ${hospital?.name?.toUpperCase() || 'HOSPITAL'}`
              : 'BROADCASTING EMERGENCY TO ACTIVE HOSPITALS'}
          </Text>
        </View>

        {/* Realtime Stepper Sequence */}
        <View style={styles.stepperContainer}>
          <TimelineStepper steps={steps} isDark={true} />
        </View>

        {/* Matched / Accepted Hospital Summary Card */}
        {hospital && (
          <View style={[styles.matchedHospitalCard, isAccepted && styles.acceptedCardBorder]}>
            <View style={styles.hospHeader}>
              <ShieldCheck size={20} color={COLORS.emergency.pulseGreen} />
              <Text style={styles.hospTag}>
                {isAccepted ? 'CONFIRMED ADMISSION ACCEPTED' : 'NEARBY PARTNER HOSPITAL'}
              </Text>
            </View>

            <Text style={styles.hospName}>{hospital.name}</Text>
            <Text style={styles.hospDetails}>
              {hospital.address} · {hospital.distanceKm ?? 2.4} km away
            </Text>

            {/* Ambulance Dispatch Information Box */}
            {ambulance && (
              <View style={styles.dispatchBox}>
                <View style={styles.dispatchHeader}>
                  <Truck size={18} color={COLORS.brand} />
                  <Text style={styles.dispatchTitle}>ASSIGNED RESPONDER VEHICLE</Text>
                </View>
                <Text style={styles.dispatchVehicle}>{ambulance.vehicleNumber}</Text>
                <Text style={styles.dispatchDriver}>
                  Driver: {ambulance.driverName} · Status: {ambulance.status}
                </Text>
              </View>
            )}

            {/* Assigned Doctor Box */}
            {doctor && (
              <View style={styles.doctorBox}>
                <View style={styles.dispatchHeader}>
                  <UserCheck size={16} color={COLORS.emergency.pulseGreen} />
                  <Text style={styles.doctorTitle}>ASSIGNED ADMITTING DOCTOR</Text>
                </View>
                <Text style={styles.doctorName}>{doctor.name}</Text>
                <Text style={styles.doctorSub}>{doctor.specialization}</Text>
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

              <TouchableOpacity
                style={ambulance ? styles.callAmbulanceBtn : styles.callIceBtn}
                onPress={ambulance ? handleCallAmbulance : handleCallICE}
              >
                <Phone size={18} color="#FFFFFF" />
                <Text style={styles.callIceText}>
                  {ambulance ? 'Call Driver' : 'Call ICE Contact'}
                </Text>
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
              {profile?.bloodGroup || 'O+'}
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
    color: 'rgba(245, 247, 250, 0.7)',
    textAlign: 'center',
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
  acceptedCardBorder: {
    borderColor: COLORS.emergency.pulseGreen,
    backgroundColor: 'rgba(16, 36, 26, 0.95)',
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
  dispatchBox: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.4)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  dispatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dispatchTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#93C5FD',
    letterSpacing: 0.5,
  },
  dispatchVehicle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dispatchDriver: {
    fontSize: 12,
    color: 'rgba(245, 247, 250, 0.8)',
    marginTop: 2,
  },
  doctorBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  doctorTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.emergency.pulseGreen,
    letterSpacing: 0.5,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doctorSub: {
    fontSize: 11,
    color: 'rgba(245, 247, 250, 0.7)',
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
  callAmbulanceBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 219, 122, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.emergency.pulseGreen,
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
