'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@blackbook/shared'

const TYPE_LABELS: Record<string, string> = {
  message: 'Messages',
  like: 'Likes',
  comment: 'Comments',
  event: 'Events',
  mentorship: 'Mentorship',
  payment: 'Payments',
  connection: 'Connections',
}

const TYPE_ICONS: Record<string, string> = {
  message: '💬',
  like: '❤️',
  comment: '💭',
  event: '📅',
  mentorship: '🎓',
  payment: '💰',
  connection: '🤝',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (activeFilter) {
      query = query.eq('type', activeFilter)
    }

    const { data } = await query.limit(50)
    if (data) setNotifications(data)
    setLoading(false)
  }, [supabase, activeFilter])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase.rpc('mark_notifications_read', { p_notification_ids: unreadIds })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const handleMarkRead = async (id: string) => {
    await supabase.rpc('mark_notifications_read', { p_notification_ids: [id] })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const filters = ['all', ...Object.keys(TYPE_LABELS)]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-light-1">Notifications</h1>
        <button
          onClick={handleMarkAllRead}
          className="text-sm text-primary-500 hover:underline"
        >
          Mark all as read
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter === 'all' ? null : filter)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              (filter === 'all' && !activeFilter) || activeFilter === filter
                ? 'bg-primary-500 text-white'
                : 'bg-dark-3 text-light-4 hover:text-light-1'
            }`}
          >
            {filter === 'all' ? 'All' : TYPE_LABELS[filter]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-light-4">
          <p className="text-4xl mb-3">🔔</p>
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => (
            <button
              key={notification.id}
              onClick={() => { if (!notification.is_read) handleMarkRead(notification.id) }}
              className={`w-full text-left p-4 rounded-xl border transition flex items-start gap-4 ${
                !notification.is_read
                  ? 'bg-primary-500/5 border-primary-500/20'
                  : 'bg-dark-3 border-dark-4 hover:border-dark-5'
              }`}
            >
              <span className="text-2xl">{TYPE_ICONS[notification.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm ${notification.is_read ? 'text-light-4' : 'text-light-1 font-semibold'}`}>
                    {notification.title}
                  </p>
                  {!notification.is_read && (
                    <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-light-5 mt-0.5">{notification.body}</p>
                <p className="text-xs text-light-5 mt-2">
                  {new Date(notification.created_at).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
