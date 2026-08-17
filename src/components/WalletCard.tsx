import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { ShieldCheck, AlertTriangle, Phone, Droplet } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { User, EmergencyProfile } from '../types';

interface WalletCardProps {
  user: User;
  profile: EmergencyProfile;
}

export const WalletCard: React.FC<WalletCardProps> = ({ user, profile }) => {
  // Generate JSON payload for emergency responders to scan
  const qrData = JSON.stringify({
    name: user.name,
    bloodGroup: user.bloodGroup,
    allergies: profile.allergies,
    contacts: profile.emergencyContacts.map((c) => ({ n: c.name, p: c.phone })),
    updatedAt: new Date().toISOString().split('T')[0],
  });

  return (
    <View style={styles.card}>
      {/* Top Banner Header */}
      <View style={styles.headerRow}>
        <View style={styles.brandBadge}>
          <ShieldCheck size={18} color="#FFFFFF" />
          <Text style={styles.brandTitle}>LIFELINK EMERGENCY ID</Text>
        </View>
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineBadgeText}>OFFLINE CACHED</Text>
        </View>
      </View>

      {/* Main Info Body */}
      <View style={styles.bodyRow}>
        <View style={styles.leftFields}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userDob}>DOB: {user.dob || '1992-06-15'}</Text>

          <View style={styles.bloodPill}>
            <Droplet size={14} color={COLORS.status.red} fill={COLORS.status.red} />
            <Text style={styles.bloodText}>Blood Type: {user.bloodGroup || 'O+'}</Text>
          </View>

          {/* Allergies list */}
          <View style={styles.sectionMargin}>
            <View style={styles.labelRow}>
              <AlertTriangle size={13} color="#FFB03B" />
              <Text style={styles.sectionLabel}>CRITICAL ALLERGIES</Text>
            </View>
            <Text style={styles.sectionValue}>
              {profile.allergies.length > 0 ? profile.allergies.join(', ') : 'None Reported'}
            </Text>
          </View>

          {/* Primary Emergency Contact */}
          <View style={styles.sectionMargin}>
            <View style={styles.labelRow}>
              <Phone size={13} color="#3BDB7A" />
              <Text style={styles.sectionLabel}>ICE CONTACT</Text>
            </View>
            {profile.emergencyContacts[0] ? (
              <Text style={styles.sectionValue}>
                {profile.emergencyContacts[0].name} ({profile.emergencyContacts[0].relation}):{' '}
                {profile.emergencyContacts[0].phone}
              </Text>
            ) : (
              <Text style={styles.sectionValue}>No contact added</Text>
            )}
          </View>
        </View>

        {/* QR Code Container */}
        <View style={styles.qrContainer}>
          <View style={styles.qrBox}>
            <QRCode value={qrData} size={90} backgroundColor="#FFFFFF" color="#0B2545" />
          </View>
          <Text style={styles.qrCaption}>Scan for Medical Info</Text>
        </View>
      </View>

      {/* Card Footer */}
      <View style={styles.footerRow}>
        <Text style={styles.footerCaption}>
          Available offline. Show this to first responders during emergency.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.ink,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  offlineBadge: {
    backgroundColor: 'rgba(59, 219, 122, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 219, 122, 0.4)',
  },
  offlineBadgeText: {
    color: '#3BDB7A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  leftFields: {
    flex: 1,
    paddingRight: 12,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.size.heading,
    fontWeight: '800',
    marginBottom: 2,
  },
  userDob: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 10,
  },
  bloodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(215, 38, 61, 0.18)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(215, 38, 61, 0.3)',
  },
  bloodText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionMargin: {
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionValue: {
    color: '#F5F7FA',
    fontSize: 13,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  qrCaption: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
  footerRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerCaption: {
    color: 'rgba(245, 247, 250, 0.65)',
    fontSize: 11,
    textAlign: 'center',
  },
});
