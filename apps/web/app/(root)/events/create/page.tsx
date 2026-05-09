'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FileUpload } from '@/components/shared/FileUpload'
import { Calendar, MapPin, Video, Loader2, ImageIcon, X, ArrowLeft, Tag } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const categories = [
  'Business', 'Tech', 'Networking', 'Workshop', 'Social', 'Conference', 'Webinar', 'Other',
] as const

export default function CreateEventPage() {
  const [form, setForm] = useState({
    title: '', description: '', start_time: '', end_time: '',
    type: 'virtual' as 'virtual' | 'in-person', location: '',
    max_participants: '', price: '', currency: 'ZAR',
    image_url: '', category: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.title || !form.start_time || !form.end_time) {
      setError('Title, start and end time are required')
      return
    }

    if (new Date(form.end_time) <= new Date(form.start_time)) {
      setError('End time must be after start time')
      return
    }

    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    const priceVal = form.price ? parseFloat(form.price) : 0

    const { error: err } = await supabase.from('events').insert({
      title: form.title,
      description: form.description || null,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      type: form.type,
      location: form.location || null,
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      price: priceVal,
      currency: form.currency,
      image_url: form.image_url || null,
      category: form.category || null,
      created_by: user.id,
    })

    setSubmitting(false)

    if (err) {
      setError(err.message)
      return
    }
    router.push('/events')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-light-4 hover:text-light-1 transition">
        <ArrowLeft size={16} /> All Events
      </Link>

      {/* Header */}
      <div className="bg-dark-2 rounded-2xl border border-dark-4 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary-600/30 via-primary-500/15 to-purple-600/20 flex items-center px-6">
          <div>
            <h1 className="text-xl font-bold text-light-1">Create Event</h1>
            <p className="text-sm text-light-4 mt-0.5">Fill in the details to create a new event</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image */}
        <div className="bg-dark-2 rounded-2xl border border-dark-4 p-5 sm:p-6 space-y-3">
          <h2 className="text-sm font-semibold text-light-3">Cover Image</h2>
          {form.image_url ? (
            <div className="relative rounded-xl overflow-hidden border border-dark-4">
              <img src={form.image_url} alt="" className="w-full h-44 object-cover" />
              <button
                type="button"
                onClick={() => set('image_url', '')}
                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <FileUpload
              bucket="events"
              path="events"
              onUpload={(url) => set('image_url', url)}
              maxSize={8388608}
            >
              <div className="flex flex-col items-center justify-center h-36 bg-dark-1 border-2 border-dashed border-dark-4 rounded-xl hover:border-primary-500/50 transition cursor-pointer">
                <ImageIcon size={28} className="text-dark-4 mb-2" />
                <p className="text-sm text-light-4 font-medium">Click to upload cover image</p>
                <p className="text-xs text-light-5 mt-1">Max 8MB</p>
              </div>
            </FileUpload>
          )}
        </div>

        {/* Basic Info */}
        <div className="bg-dark-2 rounded-2xl border border-dark-4 p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-light-3">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-light-3 mb-1.5">Event Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Give your event a great title"
              className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-xl text-light-1 placeholder:text-light-5 outline-none focus:border-primary-500 transition" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-light-3 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Describe what your event is about..."
              className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-xl text-light-1 placeholder:text-light-5 outline-none focus:border-primary-500 transition min-h-[120px] resize-none"
              maxLength={2000} />
            <p className={cn('text-xs mt-1.5 text-right', form.description.length > 1900 ? 'text-amber-400' : 'text-light-5')}>
              {form.description.length}/2000
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-3 mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => set('category', form.category === cat ? '' : cat)}
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-xs font-medium border transition',
                    form.category === cat
                      ? 'bg-primary-600/20 border-primary-500 text-primary-400'
                      : 'bg-dark-1 border-dark-4 text-light-4 hover:border-primary-500/30 hover:text-light-2'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="bg-dark-2 rounded-2xl border border-dark-4 p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-light-3 flex items-center gap-2">
            <Calendar size={15} className="text-primary-500" /> Date & Time
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-light-3 mb-1.5">Start Time *</label>
              <input type="datetime-local" value={form.start_time} onChange={e => set('start_time', e.target.value)}
                className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-xl text-light-1 outline-none focus:border-primary-500 transition" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-light-3 mb-1.5">End Time *</label>
              <input type="datetime-local" value={form.end_time} onChange={e => set('end_time', e.target.value)}
                className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-xl text-light-1 outline-none focus:border-primary-500 transition" required />
            </div>
          </div>
        </div>

        {/* Location & Type */}
        <div className="bg-dark-2 rounded-2xl border border-dark-4 p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-light-3">Location & Format</h2>

          <div>
            <label className="block text-sm font-medium text-light-3 mb-1.5">Format</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => set('type', 'virtual')}
                className={cn(
                  'flex items-center gap-2 flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition',
                  form.type === 'virtual'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                    : 'bg-dark-1 border-dark-4 text-light-4 hover:border-primary-500/30'
                )}
              >
                <Video size={16} />
                Virtual
              </button>
              <button
                type="button"
                onClick={() => set('type', 'in-person')}
                className={cn(
                  'flex items-center gap-2 flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition',
                  form.type === 'in-person'
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-dark-1 border-dark-4 text-light-4 hover:border-primary-500/30'
                )}
              >
                <MapPin size={16} />
                In-Person
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-light-3 mb-1.5">
              {form.type === 'virtual' ? 'Meeting Link' : 'Location'}
            </label>
            <input value={form.location} onChange={e => set('location', e.target.value)}
              placeholder={form.type === 'virtual' ? 'https://meet.google.com/...' : '123 Main St, City'}
              className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-xl text-light-1 placeholder:text-light-5 outline-none focus:border-primary-500 transition" />
          </div>
        </div>

        {/* Capacity & Pricing */}
        <div className="bg-dark-2 rounded-2xl border border-dark-4 p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-light-3">Capacity & Pricing</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-light-3 mb-1.5">Max Participants</label>
              <input type="number" min="1" value={form.max_participants} onChange={e => set('max_participants', e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-4 py-3 bg-dark-1 border border-dark-4 rounded-xl text-light-1 placeholder:text-light-5 outline-none focus:border-primary-500 transition" />
              <p className="text-xs text-light-5 mt-1">Leave blank for unlimited</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-light-3 mb-1.5">Price</label>
              <div className="flex gap-2">
                <input type="number" step="0.01" min="0" value={form.price} onChange={e => set('price', e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-4 py-3 bg-dark-1 border border-dark-4 rounded-xl text-light-1 placeholder:text-light-5 outline-none focus:border-primary-500 transition" />
                <select value={form.currency} onChange={e => set('currency', e.target.value)}
                  className="px-3 py-3 bg-dark-1 border border-dark-4 rounded-xl text-light-1 outline-none focus:border-primary-500 transition">
                  <option value="ZAR">ZAR</option>
                  <option value="USD">USD</option>
                  <option value="NGN">NGN</option>
                  <option value="KES">KES</option>
                  <option value="GHS">GHS</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              {(!form.price || parseFloat(form.price) === 0) && (
                <p className="text-xs text-green-400 mt-1">Free event</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
            <p className="text-sm text-accent">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
          {submitting ? 'Creating Event...' : 'Create Event'}
        </button>
      </form>
    </div>
  )
}
