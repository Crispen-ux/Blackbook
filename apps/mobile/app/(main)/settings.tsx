import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { pickAndUpload } from '../../lib/upload'
import { router } from 'expo-router'

interface Profile {
  id: string; full_name: string; email: string; role: string
  company: string | null; position: string | null; bio: string | null
  avatar_url: string | null; phone: string | null
  industry: string | null; years_experience: number
  skills: string[]; career_goals: string[]; interests: string[]
  created_at: string
}

export default function SettingsScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'matching' | 'account'>('profile')

  const [f, setF] = useState({
    full_name: '', company: '', position: '', bio: '', phone: '', avatar_url: '',
    industry: '', skills: '', career_goals: '', interests: '', years_experience: '',
  })

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/(auth)'); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setF({
        full_name: data.full_name || '', company: data.company || '', position: data.position || '',
        bio: data.bio || '', phone: data.phone || '', avatar_url: data.avatar_url || '',
        industry: data.industry || '', skills: (data.skills || []).join(', '),
        career_goals: (data.career_goals || []).join(', '), interests: (data.interests || []).join(', '),
        years_experience: data.years_experience?.toString() || '',
      })
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('profiles').update({
      full_name: f.full_name, company: f.company || null, position: f.position || null,
      bio: f.bio || null, phone: f.phone || null, avatar_url: f.avatar_url || null,
      industry: f.industry || null,
      skills: f.skills.split(',').map(s => s.trim()).filter(Boolean),
      career_goals: f.career_goals.split(',').map(s => s.trim()).filter(Boolean),
      interests: f.interests.split(',').map(s => s.trim()).filter(Boolean),
      years_experience: parseInt(f.years_experience) || 0,
    }).eq('id', user.id)

    setSaving(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleAvatarUpdate = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const url = await pickAndUpload('avatars', user.id, { allowsEditing: true, aspect: [1, 1] })
    if (url) {
      setF(p => ({ ...p, avatar_url: url }))
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
    }
  }

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#e2e8f0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[styles.saveText, saved && { color: '#22c55e' }]}>{saved ? 'Saved' : 'Save'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {([
          { id: 'profile', label: 'Profile', icon: 'person-outline' as const },
          { id: 'matching', label: 'AI Matching', icon: 'sparkles-outline' as const },
          { id: 'account', label: 'Account', icon: 'shield-outline' as const },
        ] as const).map(tab => (
          <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}>
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.id ? '#6366f1' : '#94a3b8'} />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'profile' && (
          <View style={styles.section}>
            <View style={styles.avatarRow}>
              <TouchableOpacity onPress={handleAvatarUpdate}>
                {f.avatar_url ? (
                  <Image source={{ uri: f.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{f.full_name?.charAt(0) || '?'}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAvatarUpdate} style={styles.changePhotoBtn}>
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            </View>

            <Field label="Full Name" value={f.full_name} onChange={v => setF(p => ({ ...p, full_name: v }))} />
            <Field label="Company" value={f.company} onChange={v => setF(p => ({ ...p, company: v }))} />
            <Field label="Position" value={f.position} onChange={v => setF(p => ({ ...p, position: v }))} />
            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <TextInput style={[styles.input, styles.textArea]} value={f.bio} onChangeText={v => setF(p => ({ ...p, bio: v }))} multiline maxLength={500} placeholderTextColor="#64748b" />
            </View>
            <Field label="Phone" value={f.phone} onChange={v => setF(p => ({ ...p, phone: v }))} keyboardType="phone-pad" />
          </View>
        )}

        {activeTab === 'matching' && (
          <View style={styles.section}>
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles" size={14} color="#6366f1" />
              <Text style={styles.aiTitle}>AI MATCHING PROFILE</Text>
            </View>
            <Text style={styles.aiDesc}>These fields help our AI find the best mentors, events, and connections for you.</Text>

            <Field label="Industry" value={f.industry} onChange={v => setF(p => ({ ...p, industry: v }))} placeholder="e.g. Technology, Finance" />
            <Field label="Years Experience" value={f.years_experience} onChange={v => setF(p => ({ ...p, years_experience: v }))} keyboardType="numeric" />
            <Field label="Skills (comma-separated)" value={f.skills} onChange={v => setF(p => ({ ...p, skills: v }))} placeholder="Leadership, Python, Negotiation" />
            <Field label="Career Goals (comma-separated)" value={f.career_goals} onChange={v => setF(p => ({ ...p, career_goals: v }))} placeholder="Executive promotion, Career transition" />
            <Field label="Interests (comma-separated)" value={f.interests} onChange={v => setF(p => ({ ...p, interests: v }))} placeholder="AI, Fintech, Impact investing" />
          </View>
        )}

        {activeTab === 'account' && profile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member since</Text>
              <Text style={styles.infoValue}>{new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </View>

            <View style={styles.dangerZone}>
              <View style={styles.dangerHeader}>
                <Ionicons name="warning-outline" size={18} color="#e53e3e" />
                <Text style={styles.dangerTitle}>Danger Zone</Text>
              </View>
              <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={20} color="#e53e3e" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Field({ label, value, onChange, placeholder, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' | 'phone-pad'
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#64748b" keyboardType={keyboardType || 'default'} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  saveBtn: { padding: 4 },
  saveText: { fontSize: 15, fontWeight: '600', color: '#6366f1' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#6366f1' },
  tabLabel: { fontSize: 13, fontWeight: '500', color: '#94a3b8' },
  tabLabelActive: { color: '#6366f1' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  section: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#0f3460' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 28 },
  changePhotoBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#0f3460', borderRadius: 8 },
  changePhotoText: { color: '#6366f1', fontSize: 13, fontWeight: '500' },
  field: { marginBottom: 16 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: { backgroundColor: '#000', borderWidth: 1, borderColor: '#0f3460', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 15 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aiTitle: { color: '#6366f1', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  aiDesc: { color: '#94a3b8', fontSize: 12, marginBottom: 16, lineHeight: 18 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  infoLabel: { color: '#94a3b8', fontSize: 14 },
  infoValue: { color: '#e2e8f0', fontSize: 14, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  dangerZone: { marginTop: 24, padding: 16, backgroundColor: '#1a1a2e', borderRadius: 12, borderWidth: 1, borderColor: '#e53e3e40' },
  dangerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dangerTitle: { color: '#e53e3e', fontSize: 15, fontWeight: '600' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#e53e3e15', borderRadius: 10, padding: 14 },
  signOutText: { color: '#e53e3e', fontSize: 15, fontWeight: '500' },
})
