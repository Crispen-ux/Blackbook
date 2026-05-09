'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import { Send, Loader2 } from 'lucide-react'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  sender?: { full_name: string }
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const { data } = await supabase
        .from('messages')
        .select('*, sender:sender_id(full_name)')
        .eq('chat_id', id)
        .order('created_at', { ascending: true })
      if (data) setMessages(data)
      setLoading(false)
    }
    init()
  }, [id, supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('messages').insert({
      chat_id: id,
      sender_id: user.id,
      content: newMessage.trim(),
    })
    await supabase.from('chats').update({ last_message_at: new Date().toISOString() }).eq('id', id)
    setNewMessage('')
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={32} /></div>
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex-1 overflow-y-auto space-y-2 p-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-xl px-4 py-2 ${
              msg.sender_id === currentUserId
                ? 'bg-primary-600 text-white'
                : 'bg-dark-3 text-light-1'
            }`}>
              <p className="text-sm">{msg.content}</p>
              <p className="text-xs mt-1 opacity-70">{formatRelativeTime(msg.created_at)}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-dark-4 bg-dark-2">
        <div className="flex items-center gap-2">
          <input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-dark-3 border border-dark-4 rounded-lg text-light-1 placeholder-light-4 outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="p-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg text-white transition"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
