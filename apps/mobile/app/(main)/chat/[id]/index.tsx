import { useEffect, useState, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../../lib/supabase'
import { pickImageAllowingAll, uploadChatAttachment, getSignedUrl } from '../../../../lib/upload'

interface Attachment {
  name: string
  storage_path: string
  mime_type: string
  size: number
}

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  attachments: Attachment[]
}

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
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
      if (data) {
        setMessages(data)
        generateSignedUrls(data)
      }
    }
    init()

    const channel = supabase
      .channel(`chat:${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${id}`,
      }, (payload) => {
        const msg = payload.new as Message
        setMessages(prev => [...prev, msg])
        generateSignedUrls([msg])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  const generateSignedUrls = async (msgs: Message[]) => {
    const newUrls: Record<string, string> = {}
    for (const msg of msgs) {
      if (msg.attachments?.length) {
        for (const att of msg.attachments) {
          if (att.storage_path && !signedUrls[att.storage_path]) {
            const url = await getSignedUrl(att.storage_path)
            if (url) newUrls[att.storage_path] = url
          }
        }
      }
    }
    if (Object.keys(newUrls).length) {
      setSignedUrls(prev => ({ ...prev, ...newUrls }))
    }
  }

  const handleSend = async (attachment?: { name: string; storage_path: string; mime_type: string; size: number }) => {
    if (!newMessage.trim() && !attachment) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const msgData: any = { chat_id: id, sender_id: user.id, content: newMessage.trim() }
    if (attachment) msgData.attachments = [attachment]

    await supabase.from('messages').insert(msgData)
    await supabase.from('chats').update({ last_message_at: new Date().toISOString() }).eq('id', id)
    setNewMessage('')
  }

  const handlePickImage = async () => {
    const image = await pickImageAllowingAll()
    if (!image) return
    setUploading(true)
    const attachment = await uploadChatAttachment(image.uri, id as string)
    setUploading(false)
    if (attachment) {
      await handleSend(attachment)
    }
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.sender_id === currentUserId
    return (
      <View style={[styles.messageRow, isMine ? styles.myMessage : styles.theirMessage]}>
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          {item.content ? <Text style={[styles.messageText, isMine && styles.myMessageText]}>{item.content}</Text> : null}
          {item.attachments?.map((att, i) => (
            <View key={i} style={item.content ? { marginTop: 6 } : undefined}>
              {att.mime_type.startsWith('image/') && signedUrls[att.storage_path] ? (
                <Image
                  source={{ uri: signedUrls[att.storage_path] }}
                  style={styles.attachmentImage}
                  resizeMode="cover"
                />
              ) : att.mime_type.startsWith('image/') ? (
                <Text style={styles.loadingText}>Loading image...</Text>
              ) : null}
            </View>
          ))}
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
          <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage} disabled={uploading}>
            <Ionicons name={uploading ? 'hourglass' : 'image-outline'} size={22} color="#94a3b8" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            multiline
          />
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={() => handleSend()}
            disabled={!newMessage.trim() && !uploading}
          >
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
  loadingText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  attachmentImage: { width: 200, height: 150, borderRadius: 10 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#0f3460', backgroundColor: '#1a1a2e' },
  input: { flex: 1, backgroundColor: '#0f3460', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 100, marginRight: 8 },
  attachBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
})
