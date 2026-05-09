import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'

interface Event {
  id: string
  title: string
  description: string | null
  start_time: string
  type: string
  location: string | null
  price: number
  currency: string
  registration_count: number
}

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('*, registration_count:event_registrations(count)')
      .order('start_time', { ascending: true })
    if (data) setEvents(data.map(e => ({ ...e, registration_count: (e.registration_count as any)?.[0]?.count || 0 })))
    setLoading(false)
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const handleRegister = async (eventId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('event_registrations').insert({ event_id: eventId, user_id: user.id, payment_status: 'completed' })
    fetchEvents()
  }

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-ZA', { dateStyle: 'medium' })

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#6366f1" /></View>

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Events</Text>

      <FlatList
        data={events}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={[styles.badge, item.type === 'virtual' ? styles.virtualBadge : styles.inPersonBadge]}>
                <Text style={[styles.badgeText, item.type === 'virtual' ? styles.virtualText : styles.inPersonText]}>{item.type}</Text>
              </View>
            </View>
            <View style={styles.cardMeta}>
              <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
              <Text style={styles.metaText}>{formatDate(item.start_time)}</Text>
            </View>
            {item.location && (
              <View style={styles.cardMeta}>
                <Ionicons name="location-outline" size={14} color="#94a3b8" />
                <Text style={styles.metaText}>{item.location}</Text>
              </View>
            )}
            <View style={styles.cardFooter}>
              <Text style={styles.regCount}>{item.registration_count} registered</Text>
              <TouchableOpacity style={styles.registerBtn} onPress={() => handleRegister(item.id)}>
                <Text style={styles.registerBtnText}>{item.price > 0 ? `R${item.price}` : 'Free'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No events yet</Text>}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#fff', padding: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#0f3460' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitle: { color: '#fff', fontWeight: '600', fontSize: 16, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  virtualBadge: { backgroundColor: '#1e3a5f' },
  inPersonBadge: { backgroundColor: '#1a3a2e' },
  badgeText: { fontSize: 11, fontWeight: '500' },
  virtualText: { color: '#60a5fa' },
  inPersonText: { color: '#34d399' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { color: '#94a3b8', fontSize: 13 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#0f3460' },
  regCount: { color: '#94a3b8', fontSize: 12 },
  registerBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  registerBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 60 },
})
