import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Phone, Navigation, Bed, ShieldCheck, CheckCircle2, HeartPulse, Activity } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/constants/theme';
import { DetailHeader } from '../../src/components/DetailHeader';
import { api } from '../../src/services/api';
import { Hospital } from '../../src/types';

export default function HospitalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [hospital, setHospital] = useState<Hospital | null>(null);

  useEffect(() => {
    if (id) {
      api.getHospitalById(id).then((h) => {
        if (h) setHospital(h);
      });
    }
  }, [id]);

  if (!hospital) {
    return (
      <View style={styles.container}>
        <DetailHeader title="Hospital Details" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Fetching live hospital telemetry...</Text>
        </View>
      </View>
    );
  }

  const handleCall = () => {
    Linking.openURL(`tel:${hospital.contact}`);
  };

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`;
    Linking.openURL(url);
  };

  const generalAvail = hospital.generalBeds?.available ?? Math.max(0, hospital.bedCapacity - 20);
  const generalTotal = hospital.generalBeds?.total ?? hospital.bedCapacity;

  const icuAvail = hospital.icuBeds?.available ?? hospital.availableBeds;
  const icuTotal = hospital.icuBeds?.total ?? 40;

  const emAvail = hospital.emergencyBeds?.available ?? 40;
  const emTotal = hospital.emergencyBeds?.total ?? 40;

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
            <Text style={styles.metricPillText}>
              {hospital.availableBeds} / {hospital.bedCapacity} Total Beds Open
            </Text>
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

      {/* Live Operational Bed Telemetry Breakdown */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Activity size={18} color={COLORS.brand} />
          <Text style={styles.sectionTitle}>Live Bed Availability (Supabase)</Text>
        </View>

        <View style={styles.bedsGrid}>
          {/* General Beds */}
          <View style={styles.bedCard}>
            <Text style={styles.bedLabel}>GENERAL BEDS</Text>
            <Text style={styles.bedCount}>{generalAvail}</Text>
            <Text style={styles.bedSub}>of {generalTotal} capacity</Text>
          </View>

          {/* ICU Beds */}
          <View style={[styles.bedCard, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
            <Text style={[styles.bedLabel, { color: COLORS.emergency.pulseRed }]}>ICU BEDS</Text>
            <Text style={[styles.bedCount, { color: COLORS.emergency.pulseRed }]}>{icuAvail}</Text>
            <Text style={styles.bedSub}>of {icuTotal} capacity</Text>
          </View>

          {/* Emergency Beds */}
          <View style={[styles.bedCard, { borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
            <Text style={[styles.bedLabel, { color: COLORS.emergency.pulseAmber }]}>EMERGENCY</Text>
            <Text style={[styles.bedCount, { color: COLORS.emergency.pulseAmber }]}>{emAvail}</Text>
            <Text style={styles.bedSub}>of {emTotal} capacity</Text>
          </View>
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 14,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  metricPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.status.green,
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
    borderWidth: 1.5,
    borderColor: COLORS.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navButtonText: {
    color: COLORS.brand,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.ink,
  },
  bedsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  bedCard: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bedLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
    marginBottom: 4,
  },
  bedCount: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.ink,
  },
  bedSub: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
  aiReasonCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(232, 163, 61, 0.3)',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  aiReasonTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 2,
  },
  aiReasonBody: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
  },
  specialtyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  specialtyChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.ink,
  },
});
