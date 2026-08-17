import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MapPin, Phone, Navigation, Bed, ShieldCheck, CheckCircle2 } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../src/constants/theme';
import { DetailHeader } from '../../src/components/DetailHeader';
import { useHospitalStore } from '../../src/store/useHospitalStore';

export default function HospitalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const hospitals = useHospitalStore((s) => s.hospitals);
  const hospital = hospitals.find((h) => h.id === id) || hospitals[0];

  if (!hospital) return null;

  const handleCall = () => {
    Linking.openURL(`tel:${hospital.contact}`);
  };

  const handleNavigate = () => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DetailHeader title="Hospital Details" />

      {/* Hospital Banner Card */}
      <View style={styles.bannerCard}>
        <Text style={styles.hospitalName}>{hospital.name}</Text>
        <Text style={styles.addressText}>{hospital.address}</Text>

        <View style={styles.quickMetricsRow}>
          <View style={styles.metricPill}>
            <Navigation size={14} color={COLORS.brand} />
            <Text style={styles.metricPillText}>{hospital.distanceKm || 2.1} km away</Text>
          </View>
          <View style={styles.metricPill}>
            <Bed size={14} color={COLORS.status.green} />
            <Text style={styles.metricPillText}>{hospital.availableBeds} / {hospital.bedCapacity} Beds Open</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.callButton} onPress={handleCall}>
            <Phone size={18} color="#FFFFFF" />
            <Text style={styles.callButtonText}>Call ER Desk</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navButton} onPress={handleNavigate}>
            <Navigation size={18} color={COLORS.brand} />
            <Text style={styles.navButtonText}>Navigate GPS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Recommendation Reasoning */}
      {hospital.recommendationReason && (
        <View style={styles.aiReasonCard}>
          <ShieldCheck size={20} color={COLORS.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiReasonTitle}>AI Triage Recommendation</Text>
            <Text style={styles.aiReasonBody}>{hospital.recommendationReason}</Text>
          </View>
        </View>
      )}

      {/* Specialties & Facilities */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Accredited Specialties</Text>
        <View style={styles.specialtyGrid}>
          {hospital.specialties.map((spec) => (
            <View key={spec} style={styles.specialtyChip}>
              <CheckCircle2 size={14} color={COLORS.status.green} />
              <Text style={styles.specialtyChipText}>{spec.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingBottom: 40,
  },
  bannerCard: {
    backgroundColor: COLORS.hospitals.bg,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(232, 163, 61, 0.3)',
  },
  hospitalName: {
    fontSize: TYPOGRAPHY.size.heading,
    fontWeight: '900',
    color: COLORS.ink,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
  },
  quickMetricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  metricPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  callButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.status.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  navButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.brand,
  },
  navButtonText: {
    color: COLORS.brand,
    fontSize: 14,
    fontWeight: '700',
  },
  aiReasonCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiReasonTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 2,
  },
  aiReasonBody: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 12,
  },
  specialtyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specialtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  specialtyChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },
});
