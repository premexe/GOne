import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FileText, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../src/constants/theme';
import { DetailHeader } from '../../src/components/DetailHeader';
import { useRecordStore } from '../../src/store/useRecordStore';

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const documents = useRecordStore((s) => s.documents);
  const doc = documents.find((d) => d.id === id) || documents[0];

  if (!doc) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DetailHeader title="Document Details" />

      {/* Header Info Banner */}
      <View style={styles.docHeaderCard}>
        <View style={styles.iconCircle}>
          <FileText size={24} color={COLORS.brand} />
        </View>
        <Text style={styles.docTitle}>{doc.title}</Text>
        <Text style={styles.docTypeBadge}>{doc.docType.toUpperCase()} DOCUMENT</Text>
        <Text style={styles.uploadedDate}>
          Uploaded on {new Date(doc.uploadedAt).toLocaleDateString()}
        </Text>
      </View>

      {/* AI Extraction Analysis */}
      {doc.aiSummary && (
        <View style={styles.sectionCard}>
          <View style={styles.aiBadgeRow}>
            <ShieldCheck size={18} color={COLORS.brand} />
            <Text style={styles.aiSectionTitle}>AI Natural Language Analysis</Text>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {Math.round(doc.aiSummary.confidence * 100)}% Confidence
              </Text>
            </View>
          </View>

          <Text style={styles.overviewText}>{doc.aiSummary.overview}</Text>

          {/* Key Findings List */}
          <Text style={styles.subHeading}>Extracted Key Findings</Text>
          {doc.aiSummary.keyFindings.map((finding, idx) => (
            <View key={idx} style={styles.findingRow}>
              <CheckCircle2 size={16} color={COLORS.status.green} />
              <Text style={styles.findingText}>{finding}</Text>
            </View>
          ))}

          {/* Flagged Allergies / Conditions */}
          {doc.aiSummary.allergies.length > 0 && (
            <View style={styles.alertBox}>
              <AlertCircle size={16} color={COLORS.status.amber} />
              <Text style={styles.alertText}>
                Flagged Allergy: {doc.aiSummary.allergies.join(', ')}
              </Text>
            </View>
          )}
        </View>
      )}
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
  docHeaderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  docTitle: {
    fontSize: TYPOGRAPHY.size.subheading,
    fontWeight: '800',
    color: COLORS.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  docTypeBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.brand,
    backgroundColor: 'rgba(14, 124, 134, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  uploadedDate: {
    fontSize: 12,
    color: COLORS.muted,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  aiSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.ink,
    flex: 1,
    marginLeft: 8,
  },
  confidenceBadge: {
    backgroundColor: COLORS.readiness.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.readiness.accent,
  },
  overviewText: {
    fontSize: 14,
    color: COLORS.ink,
    lineHeight: 20,
    marginBottom: 16,
  },
  subHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  findingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  findingText: {
    fontSize: 13,
    color: COLORS.ink,
    fontWeight: '500',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(232, 163, 61, 0.12)',
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  alertText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.status.amber,
  },
});
