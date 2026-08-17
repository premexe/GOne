import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { TrendingUp, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING } from '../../src/constants/theme';
import { DetailHeader } from '../../src/components/DetailHeader';
import { TrendChart } from '../../src/components/TrendChart';
import { useProfileStore } from '../../src/store/useProfileStore';
import { useRecordStore } from '../../src/store/useRecordStore';

export default function ReadinessDetailScreen() {
  const { profile, readinessScore } = useProfileStore();
  const { documents } = useRecordStore();
  const [selectedRange, setSelectedRange] = useState('W');

  const score = readinessScore?.score || 82;
  const history = readinessScore?.history || [
    { date: 'Mon', score: 65 },
    { date: 'Tue', score: 70 },
    { date: 'Wed', score: 70 },
    { date: 'Thu', score: 78 },
    { date: 'Fri', score: 78 },
    { date: 'Sat', score: 82 },
    { date: 'Sun', score: 82 },
  ];

  const checklist = [
    {
      id: 'bloodGroup',
      label: 'Blood Group Specified',
      value: profile?.userId ? 'Specified (O+)' : 'Missing',
      complete: true,
      route: '/(tabs)/profile',
    },
    {
      id: 'allergies',
      label: 'Allergies & Sensitivities',
      value: profile?.allergies && profile.allergies.length > 0 ? `${profile.allergies.length} Recorded` : 'Missing',
      complete: !!(profile?.allergies && profile.allergies.length > 0),
      route: '/(tabs)/profile',
    },
    {
      id: 'medications',
      label: 'Active Medications',
      value: profile?.medications && profile.medications.length > 0 ? `${profile.medications.length} Prescribed` : 'Missing',
      complete: !!(profile?.medications && profile.medications.length > 0),
      route: '/(tabs)/profile',
    },
    {
      id: 'conditions',
      label: 'Pre-existing Conditions',
      value: profile?.conditions && profile.conditions.length > 0 ? `${profile.conditions.length} Documented` : 'Missing',
      complete: !!(profile?.conditions && profile.conditions.length > 0),
      route: '/(tabs)/profile',
    },
    {
      id: 'contacts',
      label: 'Emergency Contacts (ICE)',
      value: profile?.emergencyContacts && profile.emergencyContacts.length >= 1 ? `${profile.emergencyContacts.length} Added` : 'Missing Primary Contact',
      complete: !!(profile?.emergencyContacts && profile.emergencyContacts.length >= 1),
      route: '/(tabs)/profile',
    },
    {
      id: 'documents',
      label: 'Recent Medical Document Uploaded',
      value: documents.length > 0 ? `${documents.length} Uploaded` : 'Missing Document',
      complete: documents.length > 0,
      route: '/records',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DetailHeader
        title="Readiness Score"
        actionText="Edit Profile"
        onActionPress={() => router.push('/(tabs)/profile')}
        selectedRange={selectedRange}
        onRangeSelect={setSelectedRange}
      />

      {/* Big Stat Block */}
      <View style={styles.statBlock}>
        <Text style={styles.statLabel}>EMERGENCY READINESS INDEX</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreNumber}>{score}%</Text>
          <View style={styles.trendBadge}>
            <TrendingUp size={16} color={COLORS.status.green} />
            <Text style={styles.trendText}>+17% this week</Text>
          </View>
        </View>
        <Text style={styles.statDescription}>
          Your emergency profile is well-prepared. Completing missing records reduces triage delays during SOS dispatch.
        </Text>
      </View>

      {/* Trend Chart */}
      <TrendChart data={history} height={180} />

      {/* Required Fields Checklist */}
      <Text style={styles.sectionTitle}>Readiness Checklist</Text>
      <View style={styles.checklistCard}>
        {checklist.map((item, idx) => {
          const isLast = idx === checklist.length - 1;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
              style={[styles.checkItemRow, !isLast && styles.borderBottom]}
            >
              <View style={styles.checkLeft}>
                {item.complete ? (
                  <CheckCircle2 size={20} color={COLORS.status.green} />
                ) : (
                  <AlertCircle size={20} color={COLORS.status.amber} />
                )}
                <View>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={[styles.itemValue, !item.complete && { color: COLORS.status.amber }]}>
                    {item.value}
                  </Text>
                </View>
              </View>

              <ChevronRight size={18} color={COLORS.muted} />
            </TouchableOpacity>
          );
        })}
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
  statBlock: {
    backgroundColor: COLORS.readiness.bg,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(46, 158, 91, 0.2)',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.readiness.accent,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scoreNumber: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.ink,
    letterSpacing: -1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.status.green,
  },
  statDescription: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.heading,
    fontWeight: '800',
    color: COLORS.ink,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: SPACING.cardRadius,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
  itemValue: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 1,
  },
});
