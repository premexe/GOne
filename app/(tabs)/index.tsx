import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Bell, ShieldCheck, FileText, MapPin, Wallet, BookOpen } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, TYPOGRAPHY } from '../../src/constants/theme';
import { SummaryCard } from '../../src/components/SummaryCard';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useProfileStore } from '../../src/store/useProfileStore';
import { useRecordStore } from '../../src/store/useRecordStore';
import { useHospitalStore } from '../../src/store/useHospitalStore';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { profile, readinessScore, fetchProfileAndReadiness } = useProfileStore();
  const { documents, fetchDocuments } = useRecordStore();
  const { hospitals, fetchHospitals } = useHospitalStore();

  useEffect(() => {
    fetchProfileAndReadiness();
    fetchDocuments();
    fetchHospitals();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const missingCount = readinessScore?.missingFields.length || 0;
  const scoreVal = readinessScore?.score || 82;
  const topHospital = hospitals[0]?.name || 'Palghar General & Trauma Center';
  const docCount = documents.length || 3;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.userGroup}>
          <Image
            source={{
              uri:
                user?.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
            }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.userNameText}>{user?.name || 'Alex Johnson'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => router.push('/learn')}
        >
          <Bell size={20} color={COLORS.ink} />
          <View style={styles.bellDot} />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <TouchableOpacity
          onPress={() => router.push('/learn')}
          style={styles.learnBadge}
        >
          <BookOpen size={14} color={COLORS.brand} />
          <Text style={styles.learnBadgeText}>Safety Feed</Text>
        </TouchableOpacity>
      </View>

      {/* 1. Readiness SummaryCard (Green tint) */}
      <SummaryCard
        category="readiness"
        title="Readiness Score"
        value={`${scoreVal}%`}
        subtitle={missingCount > 0 ? `${missingCount} fields missing` : 'Profile complete'}
        icon={<ShieldCheck size={24} color={COLORS.readiness.accent} />}
        sparklineData={readinessScore?.history.map((h) => h.score) || [65, 70, 70, 78, 78, 82, 82]}
        onPress={() => router.push('/readiness')}
      />

      {/* 2. Records SummaryCard (Blue tint) */}
      <SummaryCard
        category="records"
        title="Medical Records"
        value={`${docCount} File${docCount === 1 ? '' : 's'}`}
        subtitle="AI Summaries cached on-device"
        icon={<FileText size={24} color={COLORS.records.accent} />}
        sparklineData={[1, 1, 2, 2, 3, 3, 3]}
        onPress={() => router.push('/records')}
      />

      {/* 3. Hospitals SummaryCard (Amber tint) */}
      <SummaryCard
        category="hospitals"
        title="Nearby Hospitals"
        value={`${hospitals.length || 4} Available`}
        subtitle={`Top match: ${topHospital}`}
        icon={<MapPin size={24} color={COLORS.hospitals.accent} />}
        sparklineData={[4, 4, 3, 4, 5, 4, 4]}
        onPress={() => router.push('/(tabs)/hospitals')}
      />

      {/* 4. Wallet SummaryCard (Violet tint) */}
      <SummaryCard
        category="wallet"
        title="Emergency Wallet"
        value="Ready Offline"
        subtitle={`${profile?.allergies.length || 1} allergies · ${profile?.emergencyContacts.length || 2} contacts`}
        icon={<Wallet size={24} color={COLORS.wallet.accent} />}
        sparklineData={[100, 100, 100, 100, 100, 100, 100]}
        onPress={() => router.push('/(tabs)/wallet')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  userGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
  },
  greetingText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '500',
  },
  userNameText: {
    fontSize: TYPOGRAPHY.size.subheading,
    fontWeight: '800',
    color: COLORS.ink,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.status.red,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.size.title,
    fontWeight: '900',
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  learnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(14, 124, 134, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  learnBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brand,
  },
});
