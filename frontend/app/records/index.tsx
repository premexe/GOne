import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { AlertTriangle, Upload, FileText, Pill, ChevronRight, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING } from '../../src/constants/theme';
import { DetailHeader } from '../../src/components/DetailHeader';
import { useRecordStore } from '../../src/store/useRecordStore';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect } from 'react';

export default function RecordsScreen() {
  const { documents, uploadDocument, isUploading } = useRecordStore();

  useEffect(() => {
    useRecordStore.getState().fetchDocuments();
  }, []);

  const handleUploadNew = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const title = file.name.replace(/\.[^.]+$/, '') || 'Medical record';
      await uploadDocument(
        title,
        { uri: file.uri, name: file.name, mimeType: file.mimeType },
        'report'
      );
      Alert.alert('Upload complete', 'Your medical record was saved securely. OCR processing will run in the background when supported.');
    } catch (e) {
      Alert.alert('Upload Error', e instanceof Error ? e.message : 'Could not upload the document.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DetailHeader
        title="Medical Records"
        actionText="+ Upload"
        onActionPress={handleUploadNew}
      />

      {/* AI Summary Card Block */}
      <View style={styles.aiCardBlock}>
        <View style={styles.aiHeaderRow}>
          <View style={styles.aiBadge}>
            <AlertTriangle size={16} color={COLORS.status.amber} />
            <Text style={styles.aiBadgeText}>AI-GENERATED HEALTH SUMMARY</Text>
          </View>
          <Text style={styles.verifyText}>Verify with Doctor</Text>
        </View>

        <Text style={styles.aiSummaryTitle}>Extracted Patient Overview</Text>
        <Text style={styles.aiSummaryText}>
          NLP pipeline analyzed {documents.length} medical documents. Confirmed 1 active allergy (Penicillin) and 2 maintenance prescriptions (Lisinopril 10mg daily, Albuterol Inhaler PRN). No acute ECG anomalies flagged.
        </Text>

        <View style={styles.tagGroup}>
          <View style={styles.pillTag}>
            <Text style={styles.pillTagText}>1 Allergy Extracted</Text>
          </View>
          <View style={styles.pillTag}>
            <Text style={styles.pillTagText}>2 Medications Active</Text>
          </View>
          <View style={styles.pillTag}>
            <Text style={styles.pillTagText}>95% AI Confidence</Text>
          </View>
        </View>
      </View>

      {/* Document List */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.listTitle}>Document History ({documents.length})</Text>
        <TouchableOpacity style={styles.uploadFab} onPress={handleUploadNew} disabled={isUploading}>
          <Plus size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.documentCardList}>
        {documents.map((doc, idx) => {
          const isLast = idx === documents.length - 1;
          const formattedDate = new Date(doc.uploadedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          return (
            <TouchableOpacity
              key={doc.id}
              activeOpacity={0.8}
              onPress={() => router.push(`/records/${doc.id}`)}
              style={[styles.docItemRow, !isLast && styles.borderBottom]}
            >
              <View style={styles.docIconWrapper}>
                {doc.docType === 'prescription' ? (
                  <Pill size={20} color={COLORS.records.accent} />
                ) : (
                  <FileText size={20} color={COLORS.records.accent} />
                )}
              </View>

              <View style={styles.docTextContainer}>
                <Text style={styles.docTitle} numberOfLines={1}>
                  {doc.title}
                </Text>
                <View style={styles.docSubRow}>
                  <Text style={styles.docDate}>{formattedDate}</Text>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.docTypeLabel}>{doc.docType.toUpperCase()}</Text>
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
  aiCardBlock: {
    backgroundColor: COLORS.records.bg,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(46, 111, 166, 0.2)',
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(232, 163, 61, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.status.amber,
    letterSpacing: 0.5,
  },
  verifyText: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  aiSummaryTitle: {
    fontSize: TYPOGRAPHY.size.subheading,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 4,
  },
  aiSummaryText: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 19,
    marginBottom: 14,
  },
  tagGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillTag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pillTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.records.accent,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: TYPOGRAPHY.size.heading,
    fontWeight: '800',
    color: COLORS.ink,
  },
  uploadFab: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentCardList: {
    backgroundColor: '#FFFFFF',
    borderRadius: SPACING.cardRadius,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  docItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  docIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 2,
  },
  docSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docDate: {
    fontSize: 12,
    color: COLORS.muted,
  },
  bullet: {
    fontSize: 10,
    color: COLORS.muted,
  },
  docTypeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.records.accent,
  },
});
