import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { router } from 'expo-router'

interface Chat {
  id: string
  type: string
  name: string | null
  last_message_at: string | null
  members: { user_id: string; user: { id: string; full_name: string } }[]
}

export default function MessagesScreen() {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [searching, setSearching] = useState(false)
  const supabaseClient = supabase

  const fetchChats = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    const { data } = await supabase
      .from('chat_members')
      .select('chat:chat_id(id, type, name, last_message_at), user:user_id!inner(id, full_name, avatar_url)')
      .eq('user_id', user.id)

    if (data) {
      const chatMap = new Map<string, Chat>()
      for (const item of data) {
        const chat = item.chat as any
        if (!chatMap.has(chat.id)) chatMap.set(chat.id, { ...chat, members: [] })
        chatMap.get(chat.id)!.members.push(item.user as any)
      }
      setChats(Array.from(chatMap.values()))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchChats() }, [fetchChats])

  const startNewChat = async () => {
    if (!email.trim()) return
    setSearching(true)
    const { data: user, error } = await supabase.from('profiles').select('id').eq('email', email.trim()).single()
    if (error || !user) {
      Alert.alert('Error', 'User not found with that email')
      setSearching(false)
      return
    }
    const { data } = await supabase.rpc('get_or_create_direct_chat', { other_user_id: user.id })
    setSearching(false)
    setModalVisible(false)
    setEmail('')
    if (data) router.push(`/(main)/chat/${data}`)
  }

  const getChatName = (chat: Chat) => {
    if (chat.name) return chat.name
    const other = chat.members.find(m => m.user_id !== currentUserId)
    return other?.user?.full_name || 'Unknown'
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#6366f1" /></View>

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Messages</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle" size={28} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatCard} onPress={() => router.push(`/(main)/chat/${item.id}` as any)}>
            <View style={styles.chatAvatar}>
              <Ionicons name="chatbubble" size={20} color="#fff" />
            </View>
            <View style={styles.chatInfo}>
              <Text style={styles.chatName}>{getChatName(item)}</Text>
              <Text style={styles.chatPreview}>No messages yet</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No conversations yet</Text>}
      />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Conversation</Text>
            <Text style={styles.modalSubtitle}>Enter the email address of the person you want to message.</Text>
            <TextInput
              style={styles.modalInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setModalVisible(false); setEmail('') }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.startBtn, (!email.trim() || searching) && styles.startBtnDisabled]}
                onPress={startNewChat}
                disabled={!email.trim() || searching}
              >
                <Text style={styles.startBtnText}>{searching ? 'Searching...' : 'Start Chat'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  chatCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1a1a2e', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#0f3460' },
  chatAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0f3460', justifyContent: 'center', alignItems: 'center' },
  chatInfo: { flex: 1 },
  chatName: { color: '#fff', fontWeight: '600', fontSize: 15 },
  chatPreview: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 60 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#1a1a2e', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#0f3460' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 16 },
  modalInput: { backgroundColor: '#0f3460', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#fff', fontSize: 15, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#0f3460', alignItems: 'center' },
  cancelBtnText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
  startBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center' },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
