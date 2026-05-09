import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BlackBook</Text>
      <Text style={styles.subtitle}>Africa's Premium Professional Network</Text>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 24 },
  title: { fontSize: 48, fontWeight: 'bold', color: '#6366f1', marginBottom: 8 },
  subtitle: { fontSize: 18, color: '#94a3b8', textAlign: 'center', marginBottom: 48 },
  buttons: { width: '100%', gap: 12 },
  primaryButton: { backgroundColor: '#4f46e5', paddingVertical: 16, borderRadius: 12, alignItems: 'center' as const },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { borderWidth: 1, borderColor: '#6366f1', paddingVertical: 16, borderRadius: 12, alignItems: 'center' as const },
  secondaryButtonText: { color: '#6366f1', fontSize: 16, fontWeight: '600' },
})
