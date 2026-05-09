import { useEffect, useState, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { pickAndUpload } from '../../lib/upload'

interface Post {
  id: string
  content: string
  image_url: string | null
  created_at: string
  author_id: string
  author: { id: string; full_name: string; avatar_url: string | null; position: string | null }
  likes: { user_id: string }[]
  comments: { id: string }[]
}

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState('')
  const [postImage, setPostImage] = useState<string | null>(null)
  const [postingImage, setPostingImage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)

    const { data } = await supabase
      .from('posts')
      .select('*, author:author_id(id, full_name, avatar_url, position), likes:post_likes(user_id), comments:comments(id)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setPosts(data as any)
    setLoading(false)
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const handlePost = async () => {
    if (!newPost.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('posts').insert({ author_id: user.id, content: newPost.trim(), image_url: postImage })
    setNewPost('')
    setPostImage(null)
    fetchPosts()
  }

  const handleLike = async (postId: string, isLiked: boolean) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newLiked = !isLiked

    setPosts(prev => prev.map(p =>
      p.id === postId
        ? {
            ...p,
            likes: newLiked
              ? [...p.likes, { user_id: user.id }]
              : p.likes.filter(l => l.user_id !== user.id),
          }
        : p
    ))

    supabase.rpc('toggle_post_like', { p_post_id: postId }).then()
  }

  const handleDelete = async (postId: string) => {
    await supabase.from('posts').delete().match({ id: postId })
    fetchPosts()
  }

  const renderPost = ({ item }: { item: Post }) => {
    const isLiked = item.likes?.some(l => l.user_id === currentUserId) ?? false
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.author?.full_name?.charAt(0) || '?'}</Text>
          </View>
          <View style={styles.postMeta}>
            <Text style={styles.authorName}>{item.author?.full_name}</Text>
            {item.author?.position && <Text style={styles.authorRole} numberOfLines={1}>{item.author.position}</Text>}
          </View>
        </View>
        <Text style={styles.postContent}>{item.content}</Text>
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.postImage} resizeMode="cover" />
        )}
        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id, isLiked)}>
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={18} color={isLiked ? '#e53e3e' : '#94a3b8'} />
            <Text style={[styles.actionText, isLiked && { color: '#e53e3e' }]}>{item.likes?.length || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/(main)/post/${item.id}` as any)}>
            <Ionicons name="chatbubble-outline" size={18} color="#94a3b8" />
            <Text style={styles.actionText}>{item.comments?.length || 0} Reply</Text>
          </TouchableOpacity>
          {currentUserId === item.author_id && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
              <Ionicons name="trash-outline" size={18} color="#e53e3e" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#6366f1" /></View>

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Feed</Text>

      <View style={styles.inputCard}>
        <TextInput
          style={styles.input}
          value={newPost}
          onChangeText={setNewPost}
          placeholder="Share your thoughts..."
          placeholderTextColor="#94a3b8"
          multiline
          maxLength={2000}
        />
        {postImage && <Image source={{ uri: postImage }} style={styles.postImagePreview} />}
        <View style={styles.inputActions}>
          <TouchableOpacity onPress={async () => {
            setPostingImage(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const url = await pickAndUpload('posts', user.id, { allowsEditing: false, aspect: [16, 9] })
            if (url) setPostImage(url)
            setPostingImage(false)
          }} style={styles.imageBtn}>
            <Ionicons name={postImage ? 'image' : 'image-outline'} size={20} color={postImage ? '#6366f1' : '#94a3b8'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.postButton} onPress={handlePost} disabled={!newPost.trim() || postingImage}>
            <Text style={styles.postButtonText}>{postingImage ? 'Uploading...' : 'Post'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No posts yet. Be the first!</Text>}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#fff', padding: 16 },
  inputCard: { backgroundColor: '#1a1a2e', marginHorizontal: 16, marginBottom: 16, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#0f3460' },
  input: { color: '#fff', fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  inputActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  imageBtn: { padding: 8 },
  postImagePreview: { width: '100%', height: 150, borderRadius: 8, marginTop: 8, backgroundColor: '#0f3460' },
  postButton: { backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  postButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  postCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#0f3460' },
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
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 60, fontSize: 14 },
})
