import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckCheck, Bell } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/constants/theme';
import { DetailHeader } from '../../src/components/DetailHeader';

type Notification = {
  notification_id: number;
  message: string;
  status: string;
  channel: string;
  created_at: string;
};

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setItems(await api.getNotifications());
    } catch (error) {
      console.warn('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (item: Notification) => {
    if (item.status === 'READ') return;
    try {
      await api.markNotificationRead(item.notification_id);
      setItems((current) => current.map((entry) => entry.notification_id === item.notification_id ? { ...entry, status: 'READ' } : entry));
    } catch (error) {
      console.warn('Failed to mark notification read:', error);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <DetailHeader title="Notifications" />
      {loading && items.length === 0 ? <ActivityIndicator color={COLORS.brand} /> : null}
      {!loading && items.length === 0 ? (
        <View style={styles.empty}>
          <Bell size={28} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>Emergency alerts and delivery updates will appear here.</Text>
        </View>
      ) : null}
      {items.map((item) => (
        <TouchableOpacity key={item.notification_id} style={[styles.card, item.status !== 'READ' && styles.unread]} onPress={() => markRead(item)}>
          <View style={styles.cardTop}>
            <Text style={styles.channel}>{item.channel} ALERT</Text>
            {item.status === 'READ' ? <CheckCheck size={18} color={COLORS.status.green} /> : <Text style={styles.new}>NEW</Text>}
          </View>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 54, gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.border, borderRadius: SPACING.cardRadius, padding: SPACING.padding },
  unread: { borderColor: COLORS.brand, backgroundColor: COLORS.surface },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  channel: { color: COLORS.brand, fontSize: 11, fontWeight: '800', letterSpacing: .6 },
  new: { color: COLORS.status.red, fontSize: 10, fontWeight: '900' },
  message: { color: COLORS.ink, fontSize: 14, lineHeight: 20 },
  date: { color: COLORS.muted, fontSize: 11, marginTop: 10 },
  empty: { alignItems: 'center', paddingTop: 90, paddingHorizontal: 30 },
  emptyTitle: { color: COLORS.ink, fontSize: TYPOGRAPHY.size.heading, fontWeight: '800', marginTop: 12 },
  emptyText: { color: COLORS.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
