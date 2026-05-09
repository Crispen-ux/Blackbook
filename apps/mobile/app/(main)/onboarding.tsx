import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { router } from 'expo-router'
import { useAppTheme } from '../../context/ThemeContext'

const industryOptions = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Legal',
  'Consulting', 'Media', 'Real Estate', 'Manufacturing', 'Energy',
  'Retail', 'Non-Profit', 'Government', 'Arts & Entertainment', 'Other',
]

const interestOptions = [
  'Leadership', 'Entrepreneurship', 'Career Growth', 'Investing',
  'Networking', 'Mentorship', 'Public Speaking', 'DEI',
  'Tech Innovation', 'Impact Investing', 'Board Service', 'Policy',
]

export default function OnboardingScreen() {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const { colors } = useAppTheme()

  const [f, setF] = useState({
    full_name: '', company: '', position: '', bio: '',
    industry: '', years_experience: '', skills: '', career_goals: '',
  })
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  const toggleInterest = (i: string) => {
    setSelectedInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  const handleComplete = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update({
      full_name: f.full_name, company: f.company || null, position: f.position || null,
      bio: f.bio || null, industry: f.industry || null,
      years_experience: parseInt(f.years_experience) || 0,
      skills: f.skills.split(',').map(s => s.trim()).filter(Boolean),
      career_goals: f.career_goals.split(',').map(s => s.trim()).filter(Boolean),
      interests: selectedInterests,
      onboarded: true,
    }).eq('id', user.id)
    setSaving(false)
    if (!error) router.replace('/(main)/feed')
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '50' }]}>
              <Ionicons name="rocket-outline" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Welcome to BlackBook</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Set up your profile to start connecting with Africa's top professionals.</Text>
            <View style={styles.checklist}>
              {['Create your profile', 'Set your preferences', 'AI matching setup', 'Start networking'].map(item => (
                <View key={item} style={styles.checkItem}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <Text style={[styles.checkText, { color: colors.textSecondary }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.title, { color: colors.text }]}>Tell us about yourself</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Help other professionals get to know you.</Text>
            <Field label="Full Name *" value={f.full_name} onChange={v => setF(p => ({ ...p, full_name: v }))} colors={colors} />
            <Field label="Company" value={f.company} onChange={v => setF(p => ({ ...p, company: v }))} colors={colors} placeholder="e.g. Acme Corp" />
            <Field label="Position" value={f.position} onChange={v => setF(p => ({ ...p, position: v }))} colors={colors} placeholder="e.g. CEO" />
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Bio</Text>
              <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} value={f.bio} onChangeText={v => setF(p => ({ ...p, bio: v }))} multiline maxLength={500} placeholderTextColor={colors.textMuted} placeholder="Tell your story..." />
            </View>
          </View>
        )
      case 2:
        return (
          <View style={styles.stepContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Ionicons name="sparkles" size={22} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>AI Matching</Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.textMuted, marginBottom: 16 }]}>Helps our AI find the best mentors and events for you.</Text>

            <Text style={[styles.label, { color: colors.textMuted }]}>Industry</Text>
            <View style={styles.industryRow}>
              {industryOptions.slice(0, 5).map(o => (
                <TouchableOpacity key={o} onPress={() => setF(p => ({ ...p, industry: o }))}
                  style={[styles.chip, { backgroundColor: colors.background, borderColor: f.industry === o ? colors.primary : colors.border }]}>
                  <Text style={{ color: f.industry === o ? colors.primary : colors.textMuted, fontSize: 13 }}>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Field label="Years Experience" value={f.years_experience} onChange={v => setF(p => ({ ...p, years_experience: v }))} keyboardType="numeric" colors={colors} />
            <Field label="Skills (comma-separated)" value={f.skills} onChange={v => setF(p => ({ ...p, skills: v }))} colors={colors} placeholder="Leadership, Python, Negotiation" />
            <Field label="Career Goals (comma-separated)" value={f.career_goals} onChange={v => setF(p => ({ ...p, career_goals: v }))} colors={colors} placeholder="Executive promotion, Fundraising" />

            <Text style={[styles.label, { color: colors.textMuted, marginTop: 8 }]}>Interests</Text>
            <View style={styles.industryRow}>
              {interestOptions.map(i => (
                <TouchableOpacity key={i} onPress={() => toggleInterest(i)}
                  style={[styles.chip, { backgroundColor: selectedInterests.includes(i) ? colors.primary + '20' : colors.background, borderColor: selectedInterests.includes(i) ? colors.primary : colors.border }]}>
                  <Text style={{ color: selectedInterests.includes(i) ? colors.primary : colors.textMuted, fontSize: 13 }}>{i}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )
      case 3:
        return (
          <View style={styles.stepContent}>
            <View style={[styles.iconBox, { backgroundColor: '#22c55e20', borderColor: '#22c55e50' }]}>
              <Ionicons name="checkmark-circle" size={36} color="#22c55e" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>You're all set!</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your profile is ready. Start exploring your network.</Text>
            <TouchableOpacity onPress={handleComplete} disabled={saving}
              style={[styles.completeBtn, { backgroundColor: colors.primary }]}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.completeText}>Go to Feed</Text>}
            </TouchableOpacity>
          </View>
        )
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.progressRow}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={[styles.dot, { backgroundColor: i === step ? colors.primary : i < step ? '#22c55e' : colors.border }]} />
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {renderStep()}
      </ScrollView>

      {step < 3 && (
        <View style={[styles.navRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
            style={[styles.navBtn, { opacity: step === 0 ? 0.3 : 1 }]}>
            <Ionicons name="arrow-back" size={20} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontWeight: '500' }}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep(s => s + 1)}
            style={[styles.continueBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.continueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

function Field({ label, value, onChange, placeholder, keyboardType, colors }: any) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.textMuted} keyboardType={keyboardType || 'default'} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  stepContent: { alignItems: 'center', gap: 16 },
  iconBox: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  checklist: { width: '100%', gap: 12, marginTop: 8 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkText: { fontSize: 15 },
  field: { width: '100%', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  industryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  continueBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  continueText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  completeBtn: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, marginTop: 16, width: '100%' },
  completeText: { color: '#fff', fontWeight: '600', fontSize: 17, textAlign: 'center' },
})
