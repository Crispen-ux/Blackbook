import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { pickAndUpload } from '../../lib/upload'
import { router } from 'expo-router'

interface Profile {
  id: string
  full_name: string
  email: string
  position: string | null
  company: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
  industry: string | null
  years_experience: number
  skills: string[]
  career_goals: string[]
  interests: string[]
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/(auth)'); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut()
        router.replace('/(auth)')
      }},
    ])
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#6366f1" /></View>
  if (!profile) return null

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => router.push('/(main)/settings')} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={22} color="#94a3b8" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={() => (
          <View style={styles.content}>
            <View style={styles.profileHeader}>
              <TouchableOpacity onPress={async () => {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return
                const url = await pickAndUpload('avatars', user.id, { allowsEditing: true, aspect: [1, 1] })
                if (url) {
                  await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
                  setProfile(prev => prev ? { ...prev, avatar_url: url } : prev)
                }
              }}>
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{profile.full_name.charAt(0)}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.name}>{profile.full_name}</Text>
              {profile.position && <Text style={styles.role}>{profile.position}{profile.company ? ` at ${profile.company}` : ''}</Text>}
              {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={16} color="#94a3b8" />
                <Text style={styles.infoText}>{profile.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
                <Text style={styles.infoText}>Joined {new Date(profile.created_at).toLocaleDateString()}</Text>
              </View>
              {profile.industry && (
                <View style={styles.infoRow}>
                  <Ionicons name="briefcase-outline" size={16} color="#94a3b8" />
                  <Text style={styles.infoText}>{profile.industry} &middot; {profile.years_experience || 0}yrs</Text>
                </View>
              )}
            </View>

            {profile.skills?.length > 0 && (
              <View style={styles.aiSection}>
                <View style={styles.aiHeader}>
                  <Ionicons name="sparkles" size={14} color="#6366f1" />
                  <Text style={styles.aiTitle}>AI MATCHING PROFILE</Text>
                </View>
                <Text style={styles.aiLabel}>Skills</Text>
                <View style={styles.tagRow}>
                  {profile.skills.map(s => (
                    <View key={s} style={styles.tag}><Text style={styles.tagText}>{s}</Text></View>
                  ))}
                </View>
                {profile.career_goals?.length > 0 && (
                  <>
                    <Text style={[styles.aiLabel, { marginTop: 10 }]}>Career Goals</Text>
                    <View style={styles.tagRow}>
                      {profile.career_goals.map(g => (
                        <View key={g} style={[styles.tag, styles.goalTag]}><Text style={[styles.tagText, styles.goalTagText]}>{g}</Text></View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color="#e53e3e" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  settingsBtn: { padding: 4 },
  content: { padding: 16 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarImage: { width: 80, height: 80, borderRadius: 40, marginBottom: 16 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 32 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  role: { fontSize: 14, color: '#94a3b8', marginBottom: 8 },
  bio: { fontSize: 14, color: '#cbd5e1', textAlign: 'center', lineHeight: 20 },
  infoCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#0f3460' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  infoText: { color: '#e2e8f0', fontSize: 14 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#0f3460' },
  signOutText: { color: '#e53e3e', fontSize: 15, fontWeight: '500' },
  aiSection: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#6366f1/30' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  aiTitle: { color: '#6366f1', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  aiLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 6 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: '#0f3460', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText: { color: '#94a3b8', fontSize: 11 },
  goalTag: { backgroundColor: '#1e1b4b' },
  goalTagText: { color: '#a5b4fc' },
})
