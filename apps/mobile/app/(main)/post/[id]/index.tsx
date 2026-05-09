import { useEffect, useState, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../../lib/supabase'

interface Comment {
  id: string
  content: string
  author_id: string
  created_at: string
  author: { id: string; full_name: string; avatar_url: string | null } | null
}

interface PostDetail {
  id: string
  content: string
  image_url: string | null
  created_at: string
  author_id: string
  author: { id: string; full_name: string; avatar_url: string | null; position: string | null } | null
  likes: { user_id: string }[]
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [post, setPost] = useState<PostDetail | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      const { data: postData } = await supabase
        .from('posts')
        .select('*, author:author_id(id, full_name, avatar_url, position), likes:post_likes(user_id)')
        .eq('id', id)
        .single()

      if (postData) setPost(postData as any)

      const { data: commentData } = await supabase
        .from('comments')
        .select('*, author:author_id(id, full_name, avatar_url)')
        .eq('post_id', id)
        .order('created_at', { ascending: true })

      if (commentData) setComments(commentData as any)
      setLoading(false)
    }
    fetchData()
  }, [id])

  const handleLike = async () => {
    if (!post || !currentUserId) return
    const newLiked = !post.likes?.some(l => l.user_id === currentUserId)

    if (newLiked) {
      setPost({ ...post, likes: [...post.likes, { user_id: currentUserId }] })
      try { await supabase.from('post_likes').insert({ post_id: id, user_id: currentUserId }) } catch {}
    } else {
      setPost({ ...post, likes: post.likes.filter(l => l.user_id !== currentUserId) })
      try { await supabase.from('post_likes').delete().match({ post_id: id, user_id: currentUserId }) } catch {}
    }
  }

  const handleComment = async () => {
    if (!commentText.trim() || !currentUserId || !post) return
    setSubmitting(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: id, author_id: currentUserId, content: commentText.trim() })
      .select('*, author:author_id(id, full_name, avatar_url)')
      .single()

    if (error || !data) {
      setSubmitting(false)
      return
    }

    setComments(prev => [...prev, data as any])
    setCommentText('')
    setSubmitting(false)
  }

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('comments').delete().match({ id: commentId })
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#6366f1" /></View>
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Post not found</Text>
      </SafeAreaView>
    )
  }

  const isLiked = post.likes?.some(l => l.user_id === currentUserId) ?? false

  const renderHeader = () => (
    <>
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{post.author?.full_name?.charAt(0) || '?'}</Text>
          </View>
          <View style={styles.postMeta}>
            <Text style={styles.authorName}>{post.author?.full_name}</Text>
            {post.author?.position && <Text style={styles.authorRole} numberOfLines={1}>{post.author.position}</Text>}
          </View>
        </View>
        <Text style={styles.postContent}>{post.content}</Text>
        {post.image_url && (
          <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
        )}
        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={18} color={isLiked ? '#e53e3e' : '#94a3b8'} />
            <Text style={[styles.actionText, isLiked && { color: '#e53e3e' }]}>{post.likes?.length || 0}</Text>
          </TouchableOpacity>
          <View style={styles.actionBtn}>
            <Ionicons name="chatbubble" size={18} color="#94a3b8" />
            <Text style={styles.actionText}>{comments.length} replies</Text>
          </View>
        </View>
        <View style={styles.commentsHeader}>
          <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
        </View>
      </View>
      {comments.length === 0 && (
        <Text style={styles.emptyComments}>No comments yet. Write one below!</Text>
      )}
    </>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#94a3b8" />
        </TouchableOpacity>

        <FlatList
          ref={flatListRef}
          data={comments}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>{item.author?.full_name?.charAt(0) || '?'}</Text>
              </View>
              <View style={styles.commentBody}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{item.author?.full_name}</Text>
                  <Text style={styles.commentTime}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  {currentUserId === item.author_id && (
                    <TouchableOpacity onPress={() => handleDeleteComment(item.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={14} color="#e53e3e" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.commentText}>{item.content}</Text>
              </View>
            </View>
          )}
        />

        <View style={styles.replySection}>
          <Text style={styles.replyLabel}>Write a reply</Text>
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Type your reply..."
              placeholderTextColor="#94a3b8"
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleComment} disabled={!commentText.trim() || submitting}>
              <Ionicons name="send" size={18} color={commentText.trim() ? '#fff' : '#64748b'} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  notFound: { color: '#94a3b8', textAlign: 'center', marginTop: 60, fontSize: 16 },
  backBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  listContent: { paddingBottom: 16 },
  postCard: { backgroundColor: '#1a1a2e', margin: 16, marginBottom: 0, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#0f3460' },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  postMeta: { flex: 1 },
  authorName: { color: '#fff', fontWeight: '600', fontSize: 14 },
  authorRole: { color: '#94a3b8', fontSize: 12 },
  postContent: { color: '#e2e8f0', fontSize: 14, lineHeight: 20 },
  postImage: { width: '100%', height: 200, borderRadius: 8, marginTop: 10, backgroundColor: '#0f3460' },
  postActions: { flexDirection: 'row', gap: 24, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#0f3460' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { color: '#94a3b8', fontSize: 12 },
  commentsHeader: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#0f3460' },
  commentsTitle: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyComments: { color: '#94a3b8', textAlign: 'center', padding: 40, fontSize: 14 },
  commentRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#0f3460' },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAuthor: { color: '#fff', fontWeight: '600', fontSize: 13 },
  commentTime: { color: '#94a3b8', fontSize: 11 },
  deleteBtn: { marginLeft: 'auto', padding: 2 },
  commentText: { color: '#e2e8f0', fontSize: 13, marginTop: 2, lineHeight: 18 },
  replySection: { borderTopWidth: 1, borderTopColor: '#0f3460', backgroundColor: '#1a1a2e', paddingTop: 8 },
  replyLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600', paddingHorizontal: 12, marginBottom: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingTop: 4 },
  input: { flex: 1, backgroundColor: '#0f3460', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 14, maxHeight: 80, marginRight: 8 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center' },
})
