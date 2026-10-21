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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { profile, fetchProfileAndReadiness } = useProfileStore();

  useEffect(() => {
    fetchProfileAndReadiness();
  }, []);

  const walletProfile = profile || {
    bloodGroup: user?.bloodGroup || '',
    organDonor: false,
    emergencyNotes: '',
    allergies: [],
    medications: [],
    conditions: [],
    emergencyContacts: [],
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

      {isAuthenticated && user ? (
        <WalletCard user={user} profile={walletProfile} />
      ) : (
        <View style={styles.signInCard}>
          <Text style={styles.signInTitle}>Sign in to create your emergency QR card</Text>
          <Text style={styles.signInText}>A QR code is generated only for a real G-ONE account, never demo medical data.</Text>
          <TouchableOpacity style={styles.signInButton} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.signInButtonText}>Sign in</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Instructions Card */}
      <View style={styles.instructionCard}>
        <View style={styles.instHeaderRow}>
          <ShieldAlert size={20} color={COLORS.wallet.accent} />
          <Text style={styles.instTitle}>Offline Response Protocol</Text>
        </View>

        <Text style={styles.instText}>
          Your wallet is cached on this device for you to show responders. The QR code opens your secure emergency card in a browser, so the responder&apos;s phone needs an internet connection.
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
  signInCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  signInTitle: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  signInText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  signInButton: {
    marginTop: 16,
    backgroundColor: COLORS.brand,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
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
