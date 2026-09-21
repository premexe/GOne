import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  MapPin,
  Siren,
  X,
  CheckCircle2,
  Clock,
  Truck,
  Building2,
  CheckCheck,
} from 'lucide-react-native';
import { AdminSOSAlert, api } from '../../src/services/api';
import { COLORS, SPACING } from '../../src/constants/theme';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [activeAlerts, setActiveAlerts] = useState<AdminSOSAlert[]>([]);
  const [completedAlerts, setCompletedAlerts] = useState<AdminSOSAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hospitalId, setHospitalId] = useState(
    process.env.EXPO_PUBLIC_HOSPITAL_ID || '1'
  );

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [live, comp] = await Promise.all([
        api.getAdminSOSAlerts(hospitalId),
        api.getCompletedSOSAlerts(hospitalId),
      ]);
      setActiveAlerts(live);
      setCompletedAlerts(comp);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load emergency alerts.'
      );
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 3000);
    return () => clearInterval(timer);
  }, [loadData]);

  const displayedList = activeTab === 'ACTIVE' ? activeAlerts : completedAlerts;

  const handleUpdateStatus = async (sosId: string, nextStatus: string) => {
    setUpdatingId(sosId);
    try {
      await api.updateSOSDispatchStatus(sosId, nextStatus);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update case status.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Emergency Admin</Text>
          <Text style={styles.subtitle}>
            Triage Control & Case Lifecycle Dispatch
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconButton}
        >
          <X color={COLORS.ink} size={20} />
        </TouchableOpacity>
      </View>

      {/* Hospital ID Selector Bar */}
      <View style={styles.hospitalSelector}>
        <Text style={styles.selectorLabel}>HOSPITAL ID:</Text>
        <TextInput
          value={hospitalId}
          onChangeText={setHospitalId}
          keyboardType="number-pad"
          style={styles.hospitalInput}
        />
        <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
          <Text style={styles.refreshText}>SYNC</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Switcher: Live Queue vs Completed Cases */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ACTIVE' && styles.tabItemActive]}
          onPress={() => setActiveTab('ACTIVE')}
        >
          <View style={styles.tabBadgeRow}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'ACTIVE' && styles.tabTextActive,
              ]}
            >
              ACTIVE QUEUE
            </Text>
            {activeAlerts.length > 0 && (
              <View style={styles.countBadgeRed}>
                <Text style={styles.countBadgeText}>{activeAlerts.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'COMPLETED' && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab('COMPLETED')}
        >
          <View style={styles.tabBadgeRow}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'COMPLETED' && styles.tabTextActive,
              ]}
            >
              COMPLETED CASES
            </Text>
            {completedAlerts.length > 0 && (
              <View style={styles.countBadgeGreen}>
                <Text style={styles.countBadgeText}>
                  {completedAlerts.length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Alert Feed */}
      <FlatList
        data={displayedList}
        keyExtractor={(alert) => alert.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={COLORS.brand} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <CheckCheck size={42} color={COLORS.muted} />
              <Text style={styles.empty}>
                {activeTab === 'ACTIVE'
                  ? 'No active emergencies pending in queue.'
                  : 'No completed cases recorded for this hospital yet.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <SOSAdminCard
            alert={item}
            hospitalId={hospitalId}
            isUpdating={updatingId === item.id}
            onUpdateStatus={handleUpdateStatus}
            onChange={loadData}
          />
        )}
      />
    </View>
  );
}

function SOSAdminCard({
  alert,
  hospitalId,
  isUpdating,
  onUpdateStatus,
  onChange,
}: {
  alert: AdminSOSAlert;
  hospitalId: string;
  isUpdating: boolean;
  onUpdateStatus: (sosId: string, nextStatus: string) => Promise<void>;
  onChange: () => Promise<void>;
}) {
  const normDispatch = (alert.dispatchStatus || alert.status || '').toUpperCase();
  const hasLocation =
    Number.isFinite(alert.latitude) && Number.isFinite(alert.longitude);

  const isAccepted =
    alert.status === 'ACCEPTED' ||
    alert.status === 'IN_PROGRESS' ||
    normDispatch === 'ACCEPTED' ||
    normDispatch === 'AMBULANCE_ASSIGNED' ||
    normDispatch === 'EN_ROUTE' ||
    normDispatch === 'PICKED_UP' ||
    normDispatch === 'PATIENT_PICKED_UP' ||
    normDispatch === 'ARRIVED_AT_HOSPITAL' ||
    normDispatch === 'ARRIVED' ||
    normDispatch === 'COMPLETED' ||
    alert.status === 'RESOLVED';

  const isPickedUp =
    normDispatch === 'PICKED_UP' ||
    normDispatch === 'PATIENT_PICKED_UP' ||
    normDispatch === 'ARRIVED_AT_HOSPITAL' ||
    normDispatch === 'ARRIVED' ||
    normDispatch === 'COMPLETED' ||
    alert.status === 'RESOLVED';

  const isArrivedHospital =
    normDispatch === 'ARRIVED_AT_HOSPITAL' ||
    normDispatch === 'ARRIVED' ||
    normDispatch === 'COMPLETED' ||
    alert.status === 'RESOLVED';

  const isCompleted =
    normDispatch === 'COMPLETED' || alert.status === 'RESOLVED';

  return (
    <View
      style={[
        styles.card,
        isCompleted && styles.cardCompleted,
      ]}
    >
      {/* Top Patient & Status Banner */}
      <View style={styles.cardHeader}>
        <View style={styles.patientInfo}>
          <Siren
            size={20}
            color={isCompleted ? COLORS.status.green : COLORS.status.red}
          />
          <Text style={styles.patient}>{alert.patientName}</Text>
        </View>
        <View
          style={[
            styles.badge,
            isCompleted
              ? styles.badgeCompleted
              : isArrivedHospital
              ? styles.badgeArrived
              : isPickedUp
              ? styles.badgePickup
              : isAccepted
              ? styles.badgeAccepted
              : styles.badgeAlert,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              isCompleted
                ? styles.textGreen
                : isArrivedHospital
                ? styles.textPurple
                : isPickedUp
                ? styles.textBlue
                : isAccepted
                ? styles.textGreen
                : styles.textRed,
            ]}
          >
            {isCompleted
              ? 'COMPLETED'
              : isArrivedHospital
              ? 'AT HOSPITAL'
              : isPickedUp
              ? 'PICKED UP'
              : isAccepted
              ? 'ACCEPTED'
              : 'NEW SOS'}
          </Text>
        </View>
      </View>

      {alert.patientPhone ? (
        <Text style={styles.phone}>📞 {alert.patientPhone}</Text>
      ) : null}

      {/* Patient Symptoms / Note */}
      <Text style={styles.label}>EMERGENCY DETAILS / SYMPTOMS</Text>
      <Text style={styles.note}>
        {alert.description || 'Immediate emergency signal triggered.'}
      </Text>

      {/* Location */}
      <View style={styles.locationRow}>
        <MapPin size={16} color={COLORS.brand} />
        <Text style={styles.coordinates}>
          {hasLocation
            ? `${alert.latitude!.toFixed(5)}, ${alert.longitude!.toFixed(5)}`
            : 'GPS location pending'}
        </Text>
      </View>

      {/* Case Activity Stepper */}
      <View style={styles.activityBox}>
        <Text style={styles.activityHeader}>CASE ACTIVITY & MILESTONES</Text>

        <View style={styles.stepRow}>
          <View
            style={[styles.stepDot, styles.stepDotDone]}
          />
          <Text style={styles.stepLabelDone}>1. SOS Broadcast Received</Text>
          <Text style={styles.stepTime}>
            {new Date(alert.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <View style={styles.stepRow}>
          <View
            style={[
              styles.stepDot,
              isAccepted ? styles.stepDotDone : styles.stepDotPending,
            ]}
          />
          <Text
            style={isAccepted ? styles.stepLabelDone : styles.stepLabelPending}
          >
            2. Hospital Admission Accepted
          </Text>
          <Text style={styles.stepTime}>
            {isAccepted ? 'Confirmed' : 'Pending'}
          </Text>
        </View>

        <View style={styles.stepRow}>
          <View
            style={[
              styles.stepDot,
              isPickedUp ? styles.stepDotDone : styles.stepDotPending,
            ]}
          />
          <Text
            style={isPickedUp ? styles.stepLabelDone : styles.stepLabelPending}
          >
            3. Patient Picked Up by Ambulance
          </Text>
          <Text style={styles.stepTime}>
            {isPickedUp ? 'Completed' : isAccepted ? 'En Route' : 'Pending'}
          </Text>
        </View>

        <View style={styles.stepRow}>
          <View
            style={[
              styles.stepDot,
              isArrivedHospital ? styles.stepDotDone : styles.stepDotPending,
            ]}
          />
          <Text
            style={
              isArrivedHospital
                ? styles.stepLabelDone
                : styles.stepLabelPending
            }
          >
            4. Arrived at Hospital Emergency Bay
          </Text>
          <Text style={styles.stepTime}>
            {isArrivedHospital ? 'On Site' : isPickedUp ? 'In Transit' : 'Pending'}
          </Text>
        </View>

        <View style={styles.stepRow}>
          <View
            style={[
              styles.stepDot,
              isCompleted ? styles.stepDotDone : styles.stepDotPending,
            ]}
          />
          <Text
            style={
              isCompleted ? styles.stepLabelDone : styles.stepLabelPending
            }
          >
            5. Case Completed & Patient Admitted
          </Text>
          <Text style={styles.stepTime}>
            {isCompleted ? 'Resolved' : 'Pending'}
          </Text>
        </View>
      </View>

      {/* Action Buttons for Progression */}
      {isUpdating ? (
        <ActivityIndicator
          color={COLORS.brand}
          style={{ marginTop: 16 }}
        />
      ) : alert.status === 'ACTIVE' ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={async () => {
              await api.acceptSOSAlert(alert.id, hospitalId);
              await onChange();
            }}
          >
            <Text style={styles.actionText}>ACCEPT EMERGENCY</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={async () => {
              await api.rejectSOSAlert(alert.id, hospitalId);
              await onChange();
            }}
          >
            <Text style={styles.actionText}>REJECT</Text>
          </TouchableOpacity>
        </View>
      ) : !isCompleted ? (
        <View style={styles.progressionActions}>
          {!isPickedUp ? (
            <TouchableOpacity
              style={styles.stageButtonPickup}
              onPress={() => onUpdateStatus(alert.id, 'PICKED_UP')}
            >
              <Truck size={16} color="#FFFFFF" />
              <Text style={styles.stageButtonText}>CONFIRM PATIENT PICKUP</Text>
            </TouchableOpacity>
          ) : !isArrivedHospital ? (
            <TouchableOpacity
              style={styles.stageButtonArrived}
              onPress={() => onUpdateStatus(alert.id, 'ARRIVED_AT_HOSPITAL')}
            >
              <Building2 size={16} color="#FFFFFF" />
              <Text style={styles.stageButtonText}>MARK ARRIVED AT HOSPITAL</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.stageButtonComplete}
              onPress={() => onUpdateStatus(alert.id, 'COMPLETED')}
            >
              <CheckCircle2 size={16} color="#FFFFFF" />
              <Text style={styles.stageButtonText}>COMPLETE EMERGENCY CASE</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.completedNotice}>
          <CheckCircle2 size={16} color={COLORS.status.green} />
          <Text style={styles.completedNoticeText}>
            Case Closed · Medical Records Synced
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 54 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  title: { color: COLORS.ink, fontSize: 24, fontWeight: '900' },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  iconButton: {
    padding: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hospitalSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  selectorLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '800' },
  hospitalInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    width: 50,
    paddingHorizontal: 10,
    height: 32,
    color: COLORS.ink,
    fontWeight: '700',
    fontSize: 13,
  },
  refreshButton: {
    backgroundColor: COLORS.brand,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: COLORS.brand,
  },
  tabBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: COLORS.ink,
  },
  countBadgeRed: {
    backgroundColor: COLORS.status.red,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countBadgeGreen: {
    backgroundColor: COLORS.status.green,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  list: { padding: 16, gap: 14, flexGrow: 1 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 12,
  },
  empty: { color: COLORS.muted, fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  error: {
    color: COLORS.status.red,
    paddingHorizontal: 20,
    paddingTop: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SPACING.cardRadius,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardCompleted: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: '#FAFDFB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  patient: { color: COLORS.ink, fontWeight: '800', fontSize: 16 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeAlert: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  badgeAccepted: { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
  badgePickup: { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
  badgeArrived: { backgroundColor: 'rgba(168, 85, 247, 0.12)' },
  badgeCompleted: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  textRed: { color: COLORS.status.red },
  textGreen: { color: COLORS.status.green },
  textBlue: { color: '#2563EB' },
  textPurple: { color: '#7C3AED' },
  phone: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
  label: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 12,
  },
  note: { color: COLORS.ink, fontSize: 13, lineHeight: 18, marginTop: 3 },
  locationRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  coordinates: { color: COLORS.brand, fontWeight: '700', fontSize: 12 },
  activityBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 3,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepDotDone: { backgroundColor: COLORS.status.green },
  stepDotPending: { backgroundColor: '#CBD5E1' },
  stepLabelDone: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.ink,
    flex: 1,
  },
  stepLabelPending: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.muted,
    flex: 1,
  },
  stepTime: { fontSize: 10, color: COLORS.muted },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  acceptButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.status.green,
    borderRadius: 10,
    paddingVertical: 12,
  },
  rejectButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.status.red,
    borderRadius: 10,
    paddingVertical: 12,
  },
  actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  progressionActions: { marginTop: 14 },
  stageButtonPickup: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stageButtonArrived: {
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stageButtonComplete: {
    backgroundColor: COLORS.status.green,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stageButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
  },
  completedNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.status.green,
  },
});
