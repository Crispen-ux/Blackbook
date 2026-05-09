'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime, cn } from '@/lib/utils'
import { Send, Loader2, ImagePlus, X, ArrowLeft, Paperclip, ImageIcon } from 'lucide-react'
import { ImageLightbox } from '@/components/shared/ImageLightbox'

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
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [chatName, setChatName] = useState('')
  const [chatAvatar, setChatAvatar] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const generateSignedUrls = useCallback(async (msgs: Message[]) => {
    const paths: string[] = []
    for (const msg of msgs) {
      if (msg.attachments?.length) {
        for (const att of msg.attachments) {
          if (att.storage_path && !signedUrls[att.storage_path]) {
            paths.push(att.storage_path)
          }
        }
      }
    }
    if (!paths.length) return
    const urls: Record<string, string> = {}
    for (const storage_path of paths) {
      const { data } = await supabase.storage
        .from('chat_attachments')
        .createSignedUrl(storage_path, 3600)
      if (data) urls[storage_path] = data.signedUrl
    }
    if (Object.keys(urls).length > 0) setSignedUrls(prev => ({ ...prev, ...urls }))
  }, [supabase, signedUrls])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      // Get chat info
      const { data: members } = await supabase
        .from('chat_members')
        .select('user_id, user:user_id!inner(id, full_name, avatar_url)')
        .eq('chat_id', id)
      if (members) {
        const other = members.find(m => m.user_id !== user.id)
        if (other) {
          const u = other.user as any
          setChatName(u.full_name || 'Unknown')
          setChatAvatar(u.full_name?.charAt(0) || '?')
        }
      }

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
      scrollToBottom()
    }
    init()
  }, [id, supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${id}`,
      }, (payload) => {
        const msg = payload.new as Message
        setMessages(prev => [...prev, msg])
        generateSignedUrls([msg])
        setTimeout(scrollToBottom, 50)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, supabase])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages])

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
        .upload(storagePath, selectedFile, { contentType: selectedFile.type, upsert: false })
      if (uploadError) { setUploading(false); return }
      attachments = [{ name: selectedFile.name, storage_path: storagePath, mime_type: selectedFile.type, size: selectedFile.size }]
      setSelectedFile(null)
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }

    await supabase.from('messages').insert({
      chat_id: id, sender_id: user.id, content: newMessage.trim(),
      attachments: attachments.length ? attachments : [],
    })
    await supabase.from('chats').update({ last_message_at: new Date().toISOString() }).eq('id', id)
    setNewMessage('')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10485760) { alert('File too large. Max size: 10MB'); return }
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') { alert('Only images and PDFs are allowed'); return }
    setSelectedFile(file)
  }

  // Group consecutive messages from the same sender
  const groupedMessages = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1]
    const isSameSender = prev && prev.sender_id === msg.sender_id
    const timeDiff = prev ? new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() : Infinity
    if (isSameSender && timeDiff < 300000) {
      acc[acc.length - 1].push(msg)
    } else {
      acc.push([msg])
    }
    return acc
  }, [] as Message[][])

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={32} /></div>
  }

  return (
    <div className="-m-4 lg:-m-6 flex flex-col h-[calc(100dvh-6rem)]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-4 bg-dark-2 shrink-0">
        <button onClick={() => router.push('/messages')}
          className="p-1.5 text-light-4 hover:text-light-1 hover:bg-dark-3 rounded-lg transition">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {chatAvatar}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-2 bg-green-500" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-light-1 text-sm truncate">{chatName}</p>
            <p className="text-xs text-green-400">Online</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {groupedMessages.map((group, gi) => {
          const first = group[0]
          const isMine = first.sender_id === currentUserId
          return (
            <div key={gi} className={cn('flex flex-col', isMine ? 'items-end' : 'items-start')}>
              {!isMine && (
                <div className="flex items-center gap-2 mb-1 ml-1">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-[8px] font-bold">
                    {chatAvatar}
                  </div>
                  <span className="text-[10px] text-light-5">{chatName}</span>
                </div>
              )}
              {group.map((msg, mi) => (
                <div key={msg.id} className={cn(
                  'flex flex-col', isMine ? 'items-end' : 'items-start',
                  mi > 0 && 'mt-1'
                )}>
                  <div className={cn(
                    'max-w-[75%] px-3.5 py-2',
                    isMine
                      ? 'bg-primary-600 text-white rounded-2xl rounded-br-md'
                      : 'bg-dark-3 text-light-1 rounded-2xl rounded-bl-md'
                  )}>
                    {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
                    {msg.attachments?.map((att, ai) => (
                      <div key={ai} className={msg.content ? 'mt-2' : ''}>
                        {att.mime_type.startsWith('image/') ? (
                          signedUrls[att.storage_path] ? (
                            <button onClick={() => setLightboxImg(signedUrls[att.storage_path])} className="block">
                              <img src={signedUrls[att.storage_path]} alt={att.name}
                                className="max-w-full max-h-64 rounded-xl object-cover hover:opacity-90 transition" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 text-xs opacity-70 py-2">
                              <Loader2 size={12} className="animate-spin" /> Loading image...
                            </div>
                          )
                        ) : (
                          <a href={signedUrls[att.storage_path] || '#'} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg text-xs underline underline-offset-2 hover:bg-white/20 transition">
                            <Paperclip size={12} />
                            {att.name}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  {mi === group.length - 1 && (
                    <span className="text-[10px] text-light-5 mt-0.5 px-1">
                      {formatRelativeTime(msg.created_at)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-dark-4 bg-dark-2">
        {selectedFile && (
          <div className="flex items-center gap-2 mx-4 mt-3 px-3 py-2 bg-dark-3 rounded-xl border border-dark-4">
            {selectedFile.type.startsWith('image/') ? (
              <img src={URL.createObjectURL(selectedFile)} alt="" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <Paperclip size={16} className="text-light-4" />
            )}
            <span className="text-sm text-light-3 truncate flex-1">{selectedFile.name}</span>
            <button onClick={() => { setSelectedFile(null); if (inputRef.current) inputRef.current.value = '' }}
              className="p-1 text-light-4 hover:text-light-1 transition">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 p-4">
          <input ref={inputRef} type="file" accept="image/*,application/pdf" onChange={handleFileSelect} className="hidden" />
          <button onClick={() => inputRef.current?.click()} disabled={uploading}
            className="p-2.5 text-light-4 hover:text-primary-500 hover:bg-dark-3 disabled:opacity-50 rounded-xl transition">
            <ImagePlus size={20} />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-2.5 bg-dark-3 border border-dark-4 rounded-xl text-light-1 placeholder-light-4 outline-none focus:border-primary-500 transition text-sm resize-none"
              style={{ minHeight: '42px', maxHeight: '120px' }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }}
            />
          </div>
          <button onClick={handleSend} disabled={(!newMessage.trim() && !selectedFile) || uploading}
            className="p-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white transition flex items-center justify-center">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>

      {lightboxImg && <ImageLightbox src={lightboxImg} onClose={() => setLightboxImg(null)} />}
    </div>
  )
}