'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Calendar, MapPin, Users, Clock, Loader2 } from 'lucide-react'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<any>(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: ev } = await supabase
        .from('events')
        .select('*, organizer:created_by(id, full_name, avatar_url, position, company), registrations:event_registrations(count)')
        .eq('id', id)
        .single()
      if (ev) {
        setEvent({ ...ev, registration_count: (ev.registrations as any)?.[0]?.count || 0 })
        if (user) {
          const { data: reg } = await supabase
            .from('event_registrations')
            .select('*')
            .eq('event_id', id)
            .eq('user_id', user.id)
            .maybeSingle()
          setIsRegistered(!!reg)
        }
      }
      setLoading(false)
    }
    fetch()
  }, [id, supabase])

  const handleRegister = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('event_registrations').insert({
      event_id: id,
      user_id: user.id,
      payment_status: event.price > 0 ? 'pending' : 'completed',
    })
    setIsRegistered(true)
  }

  const handleUnregister = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('event_registrations').delete().match({ event_id: id, user_id: user.id })
    setIsRegistered(false)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={32} /></div>
  }
  if (!event) return <p className="text-light-4 text-center py-10">Event not found</p>

  return (
    <div className="max-w-2xl space-y-6">
      {event.image_url && <img src={event.image_url} alt="" className="w-full h-64 object-cover rounded-xl" />}
      <div>
        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-bold text-light-1">{event.title}</h1>
          <span className={`px-3 py-1 rounded text-sm font-medium ${
            event.type === 'virtual' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
          }`}>{event.type}</span>
        </div>
        {event.description && <p className="mt-3 text-light-2">{event.description}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-dark-2 rounded-xl p-4 border border-dark-4">
        <div className="flex items-center gap-2 text-light-4">
          <Calendar size={16} /><span className="text-sm">{formatDate(event.start_time)}</span>
        </div>
        <div className="flex items-center gap-2 text-light-4">
          <Clock size={16} /><span className="text-sm">{formatDate(event.end_time)}</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-2 text-light-4">
            <MapPin size={16} /><span className="text-sm">{event.location}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-light-4">
          <Users size={16} /><span className="text-sm">{event.registration_count} registered{event.max_participants ? `/ ${event.max_participants}` : ''}</span>
        </div>
      </div>

      <div className="flex items-center justify-between bg-dark-2 rounded-xl p-4 border border-dark-4">
        <div>
          <p className="text-sm text-light-4">Price</p>
          <p className="text-2xl font-bold text-light-1">
            {event.price > 0 ? formatCurrency(event.price, event.currency) : 'Free'}
          </p>
        </div>
        <button
          onClick={isRegistered ? handleUnregister : handleRegister}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            isRegistered
              ? 'bg-dark-4 text-light-1 hover:bg-accent hover:text-white'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          }`}
        >
          {isRegistered ? 'Unregister' : 'Register Now'}
        </button>
      </div>

      {event.organizer && (
        <div className="bg-dark-2 rounded-xl p-4 border border-dark-4">
          <p className="text-sm text-light-4 mb-2">Organized by</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
              {event.organizer.full_name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-light-1">{event.organizer.full_name}</p>
              {event.organizer.position && (
                <p className="text-sm text-light-4">{event.organizer.position}{event.organizer.company ? ` at ${event.organizer.company}` : ''}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
