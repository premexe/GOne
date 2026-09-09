import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { WalletCard } from '../../src/components/WalletCard';
import { COLORS, TYPOGRAPHY, SPACING } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useProfileStore } from '../../src/store/useProfileStore';
import { router } from 'expo-router';
import { RefreshCw, Edit2, ShieldAlert } from 'lucide-react-native';

export default function WalletScreen() {
  const user = useAuthStore((s) => s.user);
  const { profile, fetchProfileAndReadiness } = useProfileStore();

  useEffect(() => {
    fetchProfileAndReadiness();
  }, []);

  const defaultUser = user || {
    id: 'u101',
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    phone: '+1 (555) 234-5678',
    bloodGroup: 'O+',
    dob: '1992-06-15',
  };

  const defaultProfile = profile || {
    id: 'ep101',
    userId: 'u101',
    bloodGroup: 'O+',
    organDonor: true,
    emergencyNotes: 'Allergic to penicillin',
    allergies: ['Penicillin', 'Peanuts'],
    medications: ['Lisinopril 10mg daily'],
    conditions: ['Mild Asthma'],
    emergencyContacts: [
      { id: 'c1', name: 'Sarah Johnson', relation: 'Spouse', phone: '+1 (555) 987-6543' },
    ],
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Screen Title Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Emergency Wallet</Text>
          <Text style={styles.subtitle}>Offline Medical Identity & QR Code</Text>
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={fetchProfileAndReadiness}>
          <RefreshCw size={18} color={COLORS.brand} />
        </TouchableOpacity>
      </View>

      {/* Main Dark Ink Wallet Card Component */}
      <WalletCard user={defaultUser} profile={defaultProfile} />

      {/* Instructions Card */}
      <View style={styles.instructionCard}>
        <View style={styles.instHeaderRow}>
          <ShieldAlert size={20} color={COLORS.wallet.accent} />
          <Text style={styles.instTitle}>Offline Response Protocol</Text>
        </View>

        <Text style={styles.instText}>
          This digital card is automatically saved to encrypted local storage on your device. First responders can scan the QR code using any camera or QR scanner to view your vital medical data without requiring an active internet connection.
        </Text>

        <TouchableOpacity
          style={styles.editProfileRow}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Text style={styles.editProfileText}>Update Allergies & Contacts</Text>
          <Edit2 size={16} color={COLORS.brand} />
        </TouchableOpacity>
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
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionCard: {
    backgroundColor: COLORS.wallet.bg,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    borderWidth: 1,
    borderColor: 'rgba(107, 79, 160, 0.2)',
  },
  instHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  instTitle: {
    fontSize: TYPOGRAPHY.size.subheading,
    fontWeight: '800',
    color: COLORS.ink,
  },
  instText: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 19,
    marginBottom: 16,
  },
  editProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brand,
  },
});
