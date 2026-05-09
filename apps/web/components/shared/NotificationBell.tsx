'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'
import type { Notification } from '@blackbook/shared'

const NOTIFICATION_ICONS: Record<string, string> = {
  message: '💬',
  like: '❤️',
  comment: '💭',
  event: '📅',
  mentorship: '🎓',
  payment: '💰',
  connection: '🤝',
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    }
  }, [supabase])

  useEffect(() => {
    fetchNotifications()

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${supabase.auth.getUser().then(({ data }) => data.user?.id)}` },
        () => { fetchNotifications() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchNotifications])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkRead = async (id: string) => {
    await supabase.rpc('mark_notifications_read', { p_notification_ids: [id] })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const handleViewAll = () => {
    setIsOpen(false)
    router.push('/notifications')
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-light-4 hover:text-light-1 transition"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-dark-3 border border-dark-4 rounded-xl shadow-xl overflow-hidden">
          <div className="p-3 border-b border-dark-4 flex items-center justify-between">
            <h3 className="text-light-1 font-semibold text-sm">Notifications</h3>
            <button onClick={handleViewAll} className="text-primary-500 text-xs hover:underline">View all</button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-light-4 text-sm">No notifications yet</div>
            ) : (
              notifications.map(notification => (
                <button
                  key={notification.id}
                  onClick={() => {
                    if (!notification.is_read) handleMarkRead(notification.id)
                  }}
                  className={`w-full text-left p-3 border-b border-dark-4 hover:bg-dark-4 transition flex items-start gap-3 ${!notification.is_read ? 'bg-primary-500/5' : ''}`}
                >
                  <span className="text-lg mt-0.5">{NOTIFICATION_ICONS[notification.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${notification.is_read ? 'text-light-4' : 'text-light-1 font-medium'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-light-5 mt-0.5 truncate">{notification.body}</p>
                    <p className="text-xs text-light-5 mt-1">
                      {new Date(notification.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <span className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
