'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import {
  Calendar, MapPin, Clock, Users, Loader2, ArrowLeft, Share2,
  Video, ExternalLink, Sparkles, ChevronRight,
} from 'lucide-react'

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

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<any>(null)
  const [attendees, setAttendees] = useState<any[]>([])
  const [relatedEvents, setRelatedEvents] = useState<any[]>([])
  const [isRegistered, setIsRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
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

      const { data: atts } = await supabase
        .from('event_registrations')
        .select('user_id, profiles!inner(id, full_name, avatar_url, position, company)')
        .eq('event_id', id)
        .limit(20)
      if (atts) setAttendees(atts as any)

      if (ev) {
        const { data: related } = await supabase
          .from('events')
          .select('id, title, start_time, type, location, price, currency, image_url, registration_count:event_registrations(count)')
          .neq('id', id)
          .eq('created_by', ev.created_by)
          .order('start_time', { ascending: true })
          .limit(3)
        if (related) {
          setRelatedEvents(related.map(e => ({ ...e, registration_count: (e.registration_count as any)?.[0]?.count || 0 })))
        }
      }

      setLoading(false)
    }
    fetch()
  }, [id, supabase])

  const handleRegister = async () => {
    setRegistering(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setRegistering(false); return }
    await supabase.from('event_registrations').insert({
      event_id: id,
      user_id: user.id,
      payment_status: event.price > 0 ? 'pending' : 'completed',
    })
    setIsRegistered(true)
    setEvent((prev: any) => ({ ...prev, registration_count: prev.registration_count + 1 }))
    setRegistering(false)
  }

  const handleUnregister = async () => {
    setRegistering(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setRegistering(false); return }
    await supabase.from('event_registrations').delete().match({ event_id: id, user_id: user.id })
    setIsRegistered(false)
    setEvent((prev: any) => ({ ...prev, registration_count: Math.max(0, prev.registration_count - 1) }))
    setRegistering(false)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/events/${id}`
    if (navigator.share) {
      navigator.share({ title: event?.title || 'BlackBook Event', url })
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  const countdown = useMemo(() => event ? getStartsIn(event.start_time) : { label: '', live: false }, [event])

  const progress = useMemo(() => {
    if (!event || !event.max_participants) return null
    return Math.min(100, Math.round((event.registration_count / event.max_participants) * 100))
  }, [event])

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={32} /></div>
  }
  if (!event) return <p className="text-light-4 text-center py-10">Event not found</p>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-light-4 hover:text-light-1 transition">
        <ArrowLeft size={16} /> All Events
      </Link>

      {/* Hero */}
      <div className="bg-dark-2 rounded-2xl border border-dark-4 overflow-hidden">
        <div className={cn(
          'h-44 sm:h-56 relative',
          event.image_url
            ? 'bg-dark-3'
            : 'bg-gradient-to-r from-primary-600/30 via-primary-500/15 to-purple-600/20'
        )}>
          {event.image_url && (
            <img src={event.image_url} alt="" className="w-full h-full object-cover" />
          )}

          {/* Gradient overlay for image */}
          {event.image_url && (
            <div className="absolute inset-0 bg-gradient-to-t from-dark-2 via-transparent to-transparent" />
          )}

          {/* Type badge */}
          <div className="absolute top-3 right-3">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm border',
              event.type === 'virtual'
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/20'
                : 'bg-green-500/20 text-green-300 border-green-500/20'
            )}>
              {event.type === 'virtual' ? <Video size={12} /> : <MapPin size={12} />}
              {event.type === 'virtual' ? 'Virtual' : 'In-Person'}
            </span>
          </div>

          {/* Title at bottom of hero */}
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">{event.title}</h1>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Countdown + Quick stats row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold',
              countdown.live
                ? 'bg-green-500/15 text-green-400'
                : countdown.label === 'Ended'
                  ? 'bg-dark-4/50 text-light-4'
                  : 'bg-primary-500/15 text-primary-400'
            )}>
              <Clock size={16} />
              {countdown.label}
            </div>
            <div className="flex items-center gap-4 text-sm text-light-4">
              <span className="flex items-center gap-1.5">
                <Calendar size={15} />
                {formatDate(event.start_time)}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} />
                  {event.location}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-light-2 text-sm leading-relaxed">{event.description}</p>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 bg-dark-1 rounded-xl border border-dark-4">
              <Calendar size={18} className="text-primary-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-light-4">Date</p>
                <p className="text-sm text-light-1 font-medium">{formatDate(event.start_time)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-dark-1 rounded-xl border border-dark-4">
              <Clock size={18} className="text-primary-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-light-4">End Time</p>
                <p className="text-sm text-light-1 font-medium">{formatDate(event.end_time)}</p>
              </div>
            </div>
            {event.location && (
              <div className="flex items-center gap-3 p-3 bg-dark-1 rounded-xl border border-dark-4">
                <MapPin size={18} className="text-primary-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-light-4">Location</p>
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(event.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-light-1 font-medium hover:text-primary-500 transition flex items-center gap-1"
                  >
                    {event.location} <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-dark-1 rounded-xl border border-dark-4">
              <Users size={18} className="text-primary-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-light-4">Capacity</p>
                <p className="text-sm text-light-1 font-medium">
                  {event.registration_count} registered{event.max_participants ? ` / ${event.max_participants}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {event.max_participants && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className={cn(
                  'font-medium',
                  progress !== null && progress >= 90 ? 'text-green-400' :
                  progress !== null && progress >= 50 ? 'text-amber-400' :
                  'text-primary-500'
                )}>
                  {progress}% full
                </span>
                {progress !== null && progress >= 80 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-full font-medium">
                    <Sparkles size={10} /> Almost full
                  </span>
                )}
              </div>
              <div className="w-full h-2 bg-dark-4 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    progress !== null && progress >= 90 ? 'bg-green-500' :
                    progress !== null && progress >= 50 ? 'bg-amber-500' :
                    'bg-primary-500'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Registration + Price */}
      <div className="bg-dark-2 rounded-2xl border border-dark-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-light-4 mb-1">Price</p>
            <p className="text-2xl font-bold text-light-1">
              {event.price > 0 ? formatCurrency(event.price, event.currency) : (
                <span className="text-green-400 text-lg font-semibold">Free</span>
              )}
            </p>
            {event.registration_count > 0 && (
              <p className="text-xs text-light-4 mt-1">
                {event.registration_count} {event.registration_count === 1 ? 'person' : 'people'} registered
              </p>
            )}
          </div>
          <button
            onClick={isRegistered ? handleUnregister : handleRegister}
            disabled={registering || (countdown.label === 'Ended')}
            className={cn(
              'px-6 py-3 rounded-xl font-semibold transition flex items-center gap-2',
              isRegistered
                ? 'bg-dark-3 border border-dark-4 text-light-1 hover:border-accent/50 hover:text-accent'
                : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/20',
              (registering || countdown.label === 'Ended') && 'opacity-50 cursor-not-allowed'
            )}
          >
            {registering ? <Loader2 size={16} className="animate-spin" /> : null}
            {countdown.label === 'Ended' ? 'Event Ended' :
             isRegistered ? 'Unregister' : 'Register Now'}
          </button>
        </div>
      </div>

      {/* Organizer */}
      {event.organizer && (
        <div className="bg-dark-2 rounded-2xl border border-dark-4 p-5 sm:p-6">
          <p className="text-xs font-semibold text-light-4 uppercase tracking-wider mb-3">Organized by</p>
          <Link href={`/profile/${event.organizer.id}`} className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
              {event.organizer.full_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-light-1 group-hover:text-primary-500 transition">{event.organizer.full_name}</p>
              {event.organizer.position && (
                <p className="text-sm text-light-4 truncate">
                  {event.organizer.position}{event.organizer.company ? ` at ${event.organizer.company}` : ''}
                </p>
              )}
            </div>
            <ChevronRight size={16} className="text-light-5 group-hover:text-primary-500 transition shrink-0" />
          </Link>
        </div>
      )}

      {/* Attendees */}
      <div className="bg-dark-2 rounded-2xl border border-dark-4 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-light-1">
            Attendees {event.registration_count > 0 && `(${event.registration_count})`}
          </h2>
        </div>
        {attendees.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {attendees.slice(0, 15).map((att: any) => (
              <Link
                key={att.user_id}
                href={`/profile/${att.user_id}`}
                className="flex items-center gap-2 px-3 py-2 bg-dark-1 rounded-xl border border-dark-4 hover:border-primary-500/30 transition group"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {att.profiles?.full_name?.charAt(0) || '?'}
                </div>
                <span className="text-xs text-light-2 group-hover:text-light-1 transition truncate max-w-[100px]">
                  {att.profiles?.full_name}
                </span>
              </Link>
            ))}
            {attendees.length > 15 && (
              <div className="flex items-center px-3 py-2 bg-dark-1 rounded-xl border border-dark-4">
                <span className="text-xs text-light-4">+{attendees.length - 15} more</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <Users size={24} className="mx-auto text-dark-4 mb-2" />
            <p className="text-sm text-light-4">No attendees yet. Be the first!</p>
          </div>
        )}
      </div>

      {/* Share */}
      <div className="bg-dark-2 rounded-2xl border border-dark-4 p-4">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2.5 bg-dark-3 hover:bg-dark-4 border border-dark-4 rounded-xl text-sm text-light-3 hover:text-light-1 transition font-medium"
        >
          <Share2 size={16} />
          Share Event
        </button>
      </div>

      {/* Related Events */}
      {relatedEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-light-1">More from this organizer</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedEvents.map((re: any) => (
              <Link
                key={re.id}
                href={`/events/${re.id}`}
                className="group bg-dark-2 rounded-xl border border-dark-4 overflow-hidden hover:border-primary-500/30 transition"
              >
                <div className={cn(
                  'h-20 bg-gradient-to-r from-primary-600/20 via-primary-500/10 to-dark-4 relative',
                  re.image_url && 'bg-dark-3'
                )}>
                  {re.image_url && <img src={re.image_url} alt="" className="w-full h-full object-cover" />}
                  <div className={cn(
                    'absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium',
                    re.type === 'virtual'
                      ? 'bg-blue-500/30 text-blue-200'
                      : 'bg-green-500/30 text-green-200'
                  )}>
                    {re.type}
                  </div>
                </div>
                <div className="p-3 space-y-1.5">
                  <h3 className="text-sm font-semibold text-light-1 group-hover:text-primary-500 transition line-clamp-1">{re.title}</h3>
                  <p className="text-xs text-light-4">{formatDate(re.start_time)}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-light-5">{re.registration_count} registered</span>
                    {re.price > 0 ? (
                      <span className="text-primary-400 font-medium">{formatCurrency(re.price, re.currency)}</span>
                    ) : (
                      <span className="text-green-400">Free</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
