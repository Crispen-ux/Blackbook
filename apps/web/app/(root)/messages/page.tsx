'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import { MessageSquare, Plus, Loader2, X, Search } from 'lucide-react'

interface Chat {
  id: string
  type: string
  name: string | null
  last_message_at: string | null
  members: { user_id: string; user: { id: string; full_name: string; avatar_url: string | null } }[]
  last_message?: { content: string; created_at: string }
}

export default function MessagesPage() {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const handleStartChat = useCallback(async () => {
    if (!email.trim()) return
    setSearching(true)
    setError('')

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', email.trim())
      .single()

    if (profileError || !profile) {
      setError('User not found with that email')
      setSearching(false)
      return
    }

    if (profile.id === currentUserId) {
      setError('You cannot start a chat with yourself')
      setSearching(false)
      return
    }

    const { data: chatId, error: rpcError } = await supabase.rpc('get_or_create_direct_chat', {
      other_user_id: profile.id,
    })

    setSearching(false)

    if (rpcError) {
      setError('Failed to create chat')
      return
    }

    setDialogOpen(false)
    setEmail('')
    router.push(`/messages/${chatId}`)
  }, [email, currentUserId, supabase, router])

  useEffect(() => {
    const init = async () => {
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
          if (!chatMap.has(chat.id)) {
            chatMap.set(chat.id, { ...chat, members: [] })
          }
          chatMap.get(chat.id)!.members.push(item.user as any)
        }

        const chatIds = Array.from(chatMap.keys())
        if (chatIds.length > 0) {
          const { data: messages } = await supabase
            .from('messages')
            .select('chat_id, content, created_at')
            .in('chat_id', chatIds)
            .order('created_at', { ascending: false })

          if (messages) {
            const latestMsg = new Map<string, { content: string; created_at: string }>()
            for (const msg of messages) {
              if (!latestMsg.has(msg.chat_id)) latestMsg.set(msg.chat_id, msg)
            }
            for (const [chatId, msg] of latestMsg) {
              const c = chatMap.get(chatId)
              if (c) c.last_message = msg
            }
          }
        }

        setChats(Array.from(chatMap.values()).sort((a, b) => {
          if (!a.last_message_at) return 1
          if (!b.last_message_at) return -1
          return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        }))
      }
      setLoading(false)
    }
    init()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  const getChatName = (chat: Chat) => {
    if (chat.name) return chat.name
    const other = chat.members.find(m => m.user_id !== currentUserId)
    return other?.user?.full_name || 'Unknown'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-1">Messages</h1>
        <button
          onClick={() => setDialogOpen(true)}
          className="p-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white transition"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-2">
        {chats.map(chat => (
          <Link
            key={chat.id}
            href={`/messages/${chat.id}`}
            className="flex items-center gap-3 p-4 bg-dark-2 rounded-xl border border-dark-4 hover:border-primary-500/50 transition"
          >
            <div className="w-12 h-12 rounded-full bg-dark-4 flex items-center justify-center text-light-1 font-bold shrink-0">
              <MessageSquare size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-light-1">{getChatName(chat)}</span>
                {chat.last_message_at && (
                  <span className="text-light-4 text-xs">{formatRelativeTime(chat.last_message_at)}</span>
                )}
              </div>
              <p className="text-light-4 text-sm truncate mt-0.5">
                {chat.last_message?.content || 'No messages yet'}
              </p>
            </div>
          </Link>
        ))}
        {chats.length === 0 && (
          <p className="text-light-4 text-center py-10">No conversations yet. Start one!</p>
        )}
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md mx-4 bg-dark-2 rounded-2xl border border-dark-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-light-1">New Conversation</h2>
              <button
                onClick={() => { setDialogOpen(false); setError(''); setEmail('') }}
                className="p-1 text-light-4 hover:text-light-1 transition"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-light-4 mb-4">
              Enter the email address of the person you want to message.
            </p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              onKeyDown={e => e.key === 'Enter' && handleStartChat()}
              className="w-full px-4 py-3 bg-dark-3 border border-dark-4 rounded-xl text-light-1 placeholder:text-light-4 outline-none focus:border-primary-500 transition mb-4"
            />
            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}
            <button
              onClick={handleStartChat}
              disabled={searching || !email.trim()}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition flex items-center justify-center gap-2"
            >
              {searching ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Search size={18} />
              )}
              {searching ? 'Searching...' : 'Start Chat'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
