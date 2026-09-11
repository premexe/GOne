import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { MapPin, Siren, X } from 'lucide-react-native';
import { AdminSOSAlert, api } from '../../src/services/api';
import { COLORS, SPACING } from '../../src/constants/theme';

export default function AdminDashboard() {
  const [alerts, setAlerts] = useState<AdminSOSAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hospitalId, setHospitalId] = useState(process.env.EXPO_PUBLIC_HOSPITAL_ID || '1');

  const loadAlerts = useCallback(async () => {
    try {
      setError(null);
      setAlerts(await api.getAdminSOSAlerts(hospitalId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load live SOS alerts.');
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    loadAlerts();
    const timer = setInterval(loadAlerts, 2500);
    return () => clearInterval(timer);
  }, [loadAlerts]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Emergency Admin</Text>
          <Text style={styles.subtitle}>Live SOS queue · refreshes every 2.5 seconds</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}><X color={COLORS.ink} /></TouchableOpacity>
      </View>

      <View style={styles.hospitalSelector}>
        <Text style={styles.selectorLabel}>THIS HOSPITAL ID</Text>
        <TextInput value={hospitalId} onChangeText={setHospitalId} keyboardType="number-pad" style={styles.hospitalInput} />
        <TouchableOpacity onPress={loadAlerts} style={styles.refreshButton}><Text style={styles.refreshText}>REFRESH</Text></TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={alerts}
        keyExtractor={(alert) => alert.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadAlerts} />}
        ListEmptyComponent={loading ? <ActivityIndicator color={COLORS.brand} /> : <Text style={styles.empty}>No active SOS alerts.</Text>}
        renderItem={({ item }) => <SOSCard alert={item} hospitalId={hospitalId} onChange={loadAlerts} />}
      />
    </View>
  );
}

function SOSCard({ alert, hospitalId, onChange }: { alert: AdminSOSAlert; hospitalId: string; onChange: () => Promise<void> }) {
  const hasLocation = Number.isFinite(alert.latitude) && Number.isFinite(alert.longitude);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Siren size={19} color={COLORS.status.red} />
        <Text style={styles.patient}>{alert.patientName}</Text>
        <Text style={styles.status}>{alert.dispatchStatus || alert.status}</Text>
      </View>
      {alert.patientPhone ? <Text style={styles.phone}>{alert.patientPhone}</Text> : null}
      <Text style={styles.label}>PATIENT NOTE / SYMPTOMS</Text>
      <Text style={styles.note}>{alert.description || 'No note entered.'}</Text>
      <View style={styles.locationRow}>
        <MapPin size={17} color={COLORS.brand} />
        <View>
          <Text style={styles.label}>CURRENT LOCATION</Text>
          <Text style={styles.coordinates}>{hasLocation ? `${alert.latitude!.toFixed(6)}, ${alert.longitude!.toFixed(6)}` : 'Location pending permission'}</Text>
        </View>
      </View>
      <Text style={styles.time}>SOS received {new Date(alert.createdAt).toLocaleString()}</Text>
      {alert.status === 'ACTIVE' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.acceptButton} onPress={async () => { await api.acceptSOSAlert(alert.id, hospitalId); await onChange(); }}><Text style={styles.actionText}>ACCEPT</Text></TouchableOpacity>
          <TouchableOpacity style={styles.rejectButton} onPress={async () => { await api.rejectSOSAlert(alert.id, hospitalId); await onChange(); }}><Text style={styles.actionText}>REJECT</Text></TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 54 },
  header: { paddingHorizontal: 20, paddingBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: COLORS.border },
  title: { color: COLORS.ink, fontSize: 25, fontWeight: '900' },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  iconButton: { padding: 8, backgroundColor: COLORS.surface, borderRadius: 18 },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: SPACING.cardRadius, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  patient: { color: COLORS.ink, fontWeight: '800', fontSize: 17, flex: 1 },
  status: { color: COLORS.status.red, fontSize: 11, fontWeight: '900' },
  phone: { color: COLORS.muted, marginTop: 5 },
  label: { color: COLORS.muted, fontSize: 10, fontWeight: '800', letterSpacing: .6, marginTop: 15 },
  note: { color: COLORS.ink, fontSize: 14, lineHeight: 20, marginTop: 4 },
  locationRow: { flexDirection: 'row', gap: 9, marginTop: 4, alignItems: 'center' },
  coordinates: { color: COLORS.brand, fontWeight: '700', fontSize: 14, marginTop: 3 },
  time: { color: COLORS.muted, fontSize: 11, marginTop: 15 },
  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 32 },
  error: { color: COLORS.status.red, paddingHorizontal: 20, paddingTop: 12, fontSize: 12 },
  hospitalSelector: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderColor: COLORS.border },
  selectorLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '800' },
  hospitalInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, width: 52, paddingHorizontal: 10, height: 34, color: COLORS.ink, fontWeight: '700' },
  refreshButton: { backgroundColor: COLORS.brand, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9 },
  refreshText: { color: '#FFFFFF', fontWeight: '800', fontSize: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  acceptButton: { flex: 1, alignItems: 'center', backgroundColor: COLORS.status.green, borderRadius: 10, paddingVertical: 11 },
  rejectButton: { flex: 1, alignItems: 'center', backgroundColor: COLORS.status.red, borderRadius: 10, paddingVertical: 11 },
  actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
});
