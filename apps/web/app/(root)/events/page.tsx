'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Calendar, MapPin, Loader2 } from 'lucide-react'

interface Event {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  type: string
  location: string | null
  price: number
  currency: string
  image_url: string | null
  created_by: string
  registration_count: number
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('*, registration_count:event_registrations(count)')
        .order('start_time', { ascending: true })
      if (data) {
        setEvents(data.map(e => ({ ...e, registration_count: (e.registration_count as any)?.[0]?.count || 0 })))
      }
      setLoading(false)
    }
    fetchEvents()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-1">Events</h1>
        <Link
          href="/events/create"
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition"
        >
          Create Event
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {events.map(event => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="bg-dark-2 rounded-xl border border-dark-4 hover:border-primary-500/50 transition overflow-hidden"
          >
            {event.image_url && (
              <img src={event.image_url} alt="" className="w-full h-40 object-cover" />
            )}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-light-1">{event.title}</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  event.type === 'virtual' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                }`}>
                  {event.type}
                </span>
              </div>
              <div className="space-y-1 text-sm text-light-4">
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>{formatDate(event.start_time)}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-dark-4">
                <span className="text-light-4 text-sm">{event.registration_count} registered</span>
                {event.price > 0 ? (
                  <span className="text-primary-500 font-semibold">{formatCurrency(event.price, event.currency)}</span>
                ) : (
                  <span className="text-green-400 text-sm font-medium">Free</span>
                )}
              </div>
            </div>
          </Link>
        ))}
        {events.length === 0 && (
          <p className="text-light-4 text-center py-10 col-span-2">No events yet.</p>
        )}
      </div>
    </div>
  )
}
