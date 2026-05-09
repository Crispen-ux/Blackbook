'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import {
  Calendar, MapPin, Loader2, Video, Sparkles, Search, Plus,
  Users, Clock,
} from 'lucide-react'

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
  max_participants: number | null
  registration_count: number
  category: string | null
}

type FilterTab = 'upcoming' | 'past' | 'virtual' | 'in-person' | 'all'

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'virtual', label: 'Virtual' },
  { key: 'in-person', label: 'In-Person' },
]

function getStartsIn(date: string): { label: string; live: boolean } {
  const now = new Date()
  const start = new Date(date)
  const diff = start.getTime() - now.getTime()

  if (diff < -86400000) return { label: 'Ended', live: false }
  if (diff < 0) return { label: 'Started', live: true }
  if (diff < 60000) return { label: 'Starting soon', live: true }

  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)

  if (days > 0) return { label: `Starts in ${days}d ${hours}h`, live: false }
  if (hours > 0) return { label: `Starts in ${hours}h ${minutes}m`, live: false }
  return { label: `Starts in ${minutes}m`, live: false }
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
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

  const filtered = useMemo(() => {
    let list = events

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q) ||
        (e.category || '').toLowerCase().includes(q)
      )
    }

    switch (activeTab) {
      case 'upcoming':
        return list.filter(e => new Date(e.start_time) >= new Date())
      case 'past':
        return list.filter(e => new Date(e.start_time) < new Date())
      case 'virtual':
        return list.filter(e => e.type === 'virtual')
      case 'in-person':
        return list.filter(e => e.type === 'in-person')
      default:
        return list
    }
  }, [events, activeTab, search])

  const upcoming = useMemo(() => filtered.filter(e => new Date(e.start_time) >= new Date()), [filtered])
  const past = useMemo(() => filtered.filter(e => new Date(e.start_time) < new Date()), [filtered])

  const progress = (event: Event) => {
    if (!event.max_participants) return null
    return Math.min(100, Math.round((event.registration_count / event.max_participants) * 100))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-light-1">Events</h1>
          <p className="text-sm text-light-4 mt-0.5">Discover and connect at events near you</p>
        </div>
        <Link
          href="/events/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-primary-600/20"
        >
          <Plus size={16} />
          Create Event
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-light-4" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search events by title, location, or category..."
          className="w-full pl-10 pr-4 py-3 bg-dark-2 border border-dark-4 rounded-xl text-light-1 placeholder:text-light-5 outline-none focus:border-primary-500 transition text-sm"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-dark-2 rounded-xl p-1 border border-dark-4 overflow-x-auto">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-light-4 hover:text-light-1'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Event cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-dark-2 rounded-2xl border border-dark-4">
          <div className="w-16 h-16 mx-auto bg-dark-3 rounded-2xl flex items-center justify-center mb-4">
            <Calendar size={32} className="text-dark-4" />
          </div>
          <h3 className="text-lg font-semibold text-light-1 mb-1">No events found</h3>
          <p className="text-sm text-light-4 mb-4">
            {search ? 'Try a different search term' : 'There are no events in this category yet'}
          </p>
          {!search && (
            <Link
              href="/events/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition"
            >
              <Plus size={16} />
              Create the first event
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-light-4 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={14} className="text-primary-500" />
                Upcoming Events ({upcoming.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {upcoming.map(event => (
                  <EventCard key={event.id} event={event} progress={progress(event)} />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-light-4 uppercase tracking-wider flex items-center gap-2">
                <Clock size={14} className="text-light-4" />
                Past Events ({past.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {past.map(event => (
                  <EventCard key={event.id} event={event} progress={progress(event)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EventCard({ event, progress }: { event: Event; progress: number | null }) {
  const countdown = useMemo(() => getStartsIn(event.start_time), [event.start_time])
  const isEnded = countdown.label === 'Ended'

  return (
    <Link
      href={`/events/${event.id}`}
      className="group bg-dark-2 rounded-2xl border border-dark-4 hover:border-primary-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/5 overflow-hidden flex flex-col"
    >
      {/* Cover */}
      <div className={cn(
        'h-28 sm:h-36 relative overflow-hidden',
        event.image_url
          ? 'bg-dark-3'
          : 'bg-gradient-to-r from-primary-600/20 via-primary-500/10 to-purple-600/20'
      )}>
        {event.image_url && (
          <img src={event.image_url} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
        )}

        {/* Type badge */}
        <div className="absolute top-2.5 right-2.5">
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm border',
            event.type === 'virtual'
              ? 'bg-blue-500/25 text-blue-300 border-blue-500/20'
              : 'bg-green-500/25 text-green-300 border-green-500/20'
          )}>
            {event.type === 'virtual' ? <Video size={10} /> : <MapPin size={10} />}
            {event.type === 'virtual' ? 'Virtual' : 'In-Person'}
          </span>
        </div>

        {/* Category */}
        {event.category && (
          <div className="absolute top-2.5 left-2.5">
            <span className="px-2 py-1 bg-dark-2/70 backdrop-blur rounded-full text-[10px] text-light-3 font-medium border border-dark-4/50">
              {event.category}
            </span>
          </div>
        )}

        {/* Countdown label */}
        {!isEnded && (
          <div className={cn(
            'absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold backdrop-blur-sm',
            countdown.live
              ? 'bg-green-500/25 text-green-300'
              : 'bg-primary-500/25 text-primary-300'
          )}>
            {countdown.label}
          </div>
        )}
        {isEnded && (
          <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 bg-dark-2/70 backdrop-blur rounded-lg text-[10px] font-medium text-light-4">
            Ended
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-light-1 group-hover:text-primary-500 transition line-clamp-1">{event.title}</h3>
          {event.description && (
            <p className="text-xs text-light-4 mt-1 line-clamp-2">{event.description}</p>
          )}
        </div>

        <div className="space-y-1.5 text-xs text-light-4 mt-auto">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} />
            <span>{formatDate(event.start_time)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5">
              <MapPin size={12} />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {progress !== null && (
          <div className="space-y-1">
            <div className="w-full h-1.5 bg-dark-4 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  progress >= 90 ? 'bg-green-500' :
                  progress >= 50 ? 'bg-amber-500' :
                  'bg-primary-500'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-light-5">{event.registration_count} registered</span>
              {progress >= 80 && (
                <span className="text-[10px] text-amber-400 font-medium">Almost full</span>
              )}
            </div>
          </div>
        )}

        {/* Price */}
        <div className="pt-2 border-t border-dark-4 flex items-center justify-between">
          <span className="text-xs text-light-4">
            <Users size={12} className="inline mr-1" />
            {event.registration_count} {event.registration_count === 1 ? 'going' : 'going'}
          </span>
          {event.price > 0 ? (
            <span className="text-sm font-semibold text-primary-400">{formatCurrency(event.price, event.currency)}</span>
          ) : (
            <span className="text-xs font-semibold text-green-400">Free</span>
          )}
        </div>
      </div>
    </Link>
  )
}
