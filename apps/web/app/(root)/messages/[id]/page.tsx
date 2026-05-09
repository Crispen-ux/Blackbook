'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import { Send, Loader2, ImagePlus, X } from 'lucide-react'

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
  sender?: { full_name: string }
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
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
      if (data) {
        setMessages(data)
        generateSignedUrls(data)
      }
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
        const msg = payload.new as Message
        setMessages(prev => [...prev, msg])
        generateSignedUrls([msg])
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const generateSignedUrls = async (msgs: Message[]) => {
    const paths: { storage_path: string; msg_id: string }[] = []
    for (const msg of msgs) {
      if (msg.attachments?.length) {
        for (const att of msg.attachments) {
          if (att.storage_path && !signedUrls[att.storage_path]) {
            paths.push({ storage_path: att.storage_path, msg_id: msg.id })
          }
        }
      }
    }
    if (!paths.length) return
    const urls: Record<string, string> = {}
    for (const { storage_path } of paths) {
      const { data } = await supabase.storage
        .from('chat_attachments')
        .createSignedUrl(storage_path, 3600)
      if (data) urls[storage_path] = data.signedUrl
    }
    setSignedUrls(prev => ({ ...prev, ...urls }))
  }

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let attachments: Attachment[] = []

    if (selectedFile) {
      setUploading(true)
      const fileExt = selectedFile.name.split('.').pop()
      const storagePath = `${id}/${crypto.randomUUID()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(storagePath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        })

      if (uploadError) {
        setUploading(false)
        return
      }

      attachments = [{
        name: selectedFile.name,
        storage_path: storagePath,
        mime_type: selectedFile.type,
        size: selectedFile.size,
      }]

      setSelectedFile(null)
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }

    await supabase.from('messages').insert({
      chat_id: id,
      sender_id: user.id,
      content: newMessage.trim(),
      attachments: attachments.length ? attachments : [],
    })
    await supabase.from('chats').update({ last_message_at: new Date().toISOString() }).eq('id', id)
    setNewMessage('')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10485760) {
      alert('File too large. Max size: 10MB')
      return
    }
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Only images and PDFs are allowed')
      return
    }
    setSelectedFile(file)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={32} /></div>
  }

  return (
    <div className="-m-4 lg:-m-6 flex flex-col h-[calc(100dvh-6rem)]">
      <div className="flex-1 overflow-y-auto space-y-2 p-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-xl px-4 py-2 ${
              msg.sender_id === currentUserId
                ? 'bg-primary-600 text-white'
                : 'bg-dark-3 text-light-1'
            }`}>
              {msg.content && <p className="text-sm">{msg.content}</p>}
              {msg.attachments?.map((att, i) => (
                <div key={i} className="mt-1">
                  {att.mime_type.startsWith('image/') ? (
                    signedUrls[att.storage_path] ? (
                      <img
                        src={signedUrls[att.storage_path]}
                        alt={att.name}
                        className="max-w-full max-h-64 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-xs opacity-70">
                        <Loader2 size={12} className="animate-spin" />
                        Loading image...
                      </div>
                    )
                  ) : (
                    <a
                      href={signedUrls[att.storage_path] || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
                    >
                      {att.name}
                    </a>
                  )}
                </div>
              ))}
              <p className="text-xs mt-1 opacity-70">{formatRelativeTime(msg.created_at)}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-dark-4 bg-dark-2">
        {selectedFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-dark-3 rounded-lg border border-dark-4">
            <span className="text-sm text-light-3 truncate flex-1">{selectedFile.name}</span>
            <button
              onClick={() => { setSelectedFile(null); if (inputRef.current) inputRef.current.value = '' }}
              className="p-1 text-light-4 hover:text-light-1 transition"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="p-2 text-light-4 hover:text-primary-500 disabled:opacity-50 transition"
          >
            <ImagePlus size={20} />
          </button>
          <input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 bg-dark-3 border border-dark-4 rounded-lg text-light-1 placeholder-light-4 outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={handleSend}
            disabled={(!newMessage.trim() && !selectedFile) || uploading}
            className="p-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg text-white transition"
          >
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  )
}
