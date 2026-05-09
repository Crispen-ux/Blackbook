import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import type { Notification } from '@blackbook/shared'

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  message: 'chatbubble',
  like: 'heart',
  comment: 'chatbox',
  event: 'calendar',
  mentorship: 'school',
  payment: 'card',
  connection: 'people',
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter) query = query.eq('type', filter)

    const { data } = await query.limit(50)
    if (data) setNotifications(data)
    setLoading(false)
  }, [filter])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  useEffect(() => {
    const channel = supabase
      .channel('notifications-mobile')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => { fetchNotifications() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchNotifications])

  const handleMarkRead = async (id: string) => {
    await supabase.rpc('mark_notifications_read', { p_notification_ids: [id] })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const filters = ['all', 'message', 'like', 'comment', 'event', 'mentorship', 'payment']

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.is_read && styles.unread]}
      onPress={() => { if (!item.is_read) handleMarkRead(item.id) }}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={TYPE_ICONS[item.type] || 'notifications'} size={22} color="#6366f1" />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.is_read && styles.unreadTitle]}>
            {item.title}
          </Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notificationBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.notificationTime}>
          {new Date(item.created_at).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <FlatList
        horizontal
        data={filters}
        keyExtractor={f => f}
        showsHorizontalScrollIndicator={false}
        style={styles.filterList}
        contentContainerStyle={styles.filterContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, (item === 'all' && !filter) || filter === item ? styles.filterActive : null]}
            onPress={() => setFilter(item === 'all' ? null : item)}
          >
            <Text style={[styles.filterText, (item === 'all' && !filter) || filter === item ? styles.filterTextActive : null]}>
              {item === 'all' ? 'All' : item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={styles.loader} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderNotification}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color="#4a5568" />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySubtitle}>You're all caught up!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#f1f5f9' },
  filterList: { maxHeight: 44, marginBottom: 8 },
  filterContent: { paddingHorizontal: 20, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e1e3a' },
  filterActive: { backgroundColor: '#6366f1' },
  filterText: { color: '#94a3b8', fontSize: 14 },
  filterTextActive: { color: '#ffffff', fontWeight: '600' },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  notificationItem: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  unread: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: { flex: 1 },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationTitle: { color: '#cbd5e1', fontSize: 14, fontWeight: '500', flex: 1 },
  unreadTitle: { color: '#f1f5f9', fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1' },
  notificationBody: { color: '#64748b', fontSize: 13, marginTop: 2, lineHeight: 18 },
  notificationTime: { color: '#475569', fontSize: 11, marginTop: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center' },
  emptyTitle: { color: '#94a3b8', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },
})
