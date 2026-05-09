import { useEffect, useState, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../../lib/supabase'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
}

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', id)
        .order('created_at', { ascending: true })
      if (data) setMessages(data)
    }
    init()

    const channel = supabase
      .channel(`chat:${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  const handleSend = async () => {
    if (!newMessage.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('messages').insert({ chat_id: id, sender_id: user.id, content: newMessage.trim() })
    await supabase.from('chats').update({ last_message_at: new Date().toISOString() }).eq('id', id)
    setNewMessage('')
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.sender_id === currentUserId
    return (
      <View style={[styles.messageRow, isMine ? styles.myMessage : styles.theirMessage]}>
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMine && styles.myMessageText]}>{item.content}</Text>
          <Text style={[styles.time, isMine && styles.myTime]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={!newMessage.trim()}>
            <Ionicons name="send" size={20} color={newMessage.trim() ? '#fff' : '#64748b'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 8 },
  messageRow: { marginBottom: 8, flexDirection: 'row' },
  myMessage: { justifyContent: 'flex-end' },
  theirMessage: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  myBubble: { backgroundColor: '#4f46e5', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#1a1a2e', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#0f3460' },
  messageText: { color: '#fff', fontSize: 15 },
  myMessageText: { color: '#fff' },
  time: { fontSize: 10, color: '#94a3b8', marginTop: 4, alignSelf: 'flex-end' },
  myTime: { color: '#c7d2fe' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#0f3460', backgroundColor: '#1a1a2e' },
  input: { flex: 1, backgroundColor: '#0f3460', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 100, marginRight: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
})
