import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'

interface Mentor {
  user_id: string
  expertise: string[]
  bio: string
  hourly_rate: number
  currency: string
  rating: number
  user: { id: string; full_name: string; position: string | null }
}

export default function MentorshipScreen() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMentors = useCallback(async () => {
    const { data } = await supabase
      .from('mentor_profiles')
      .select('*, user:user_id(id, full_name, position)')
      .eq('is_available', true)
    if (data) setMentors(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchMentors() }, [fetchMentors])

  const requestSession = async (mentorId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('mentorship_sessions').insert({
      mentor_id: mentorId, mentee_id: user.id,
      scheduled_time: new Date(Date.now() + 86400000).toISOString(),
      duration_minutes: 30, status: 'pending',
    })
    Alert.alert('Request Sent', 'The mentor will confirm your session.')
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#6366f1" /></View>

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Mentorship</Text>

      <FlatList
        data={mentors}
        keyExtractor={item => item.user_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.user.full_name.charAt(0)}</Text></View>
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{item.user.full_name}</Text>
                {item.user.position && <Text style={styles.role}>{item.user.position}</Text>}
              </View>
              <View style={styles.rating}>
                <Ionicons name="star" size={14} color="#facc15" />
                <Text style={styles.ratingText}>{item.rating?.toFixed(1) || 'New'}</Text>
              </View>
            </View>
            <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>
            <View style={styles.tags}>
              {item.expertise.map(skill => (
                <View key={skill} style={styles.tag}><Text style={styles.tagText}>{skill}</Text></View>
              ))}
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.rate}>R{item.hourly_rate}/hr</Text>
              <TouchableOpacity style={styles.requestBtn} onPress={() => requestSession(item.user_id)}>
                <Text style={styles.requestBtnText}>Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No mentors available</Text>}
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  cardInfo: { flex: 1 },
  name: { color: '#fff', fontWeight: '600', fontSize: 15 },
  role: { color: '#94a3b8', fontSize: 12 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { color: '#fff', fontSize: 13 },
  bio: { color: '#cbd5e1', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: { backgroundColor: '#0f3460', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText: { color: '#94a3b8', fontSize: 11 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#0f3460' },
  rate: { color: '#6366f1', fontWeight: '600', fontSize: 15 },
  requestBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  requestBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 60 },
})
