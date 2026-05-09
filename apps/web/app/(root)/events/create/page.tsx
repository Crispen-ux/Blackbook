'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FileUpload } from '@/components/shared/FileUpload'

export default function CreateEventPage() {
  const [form, setForm] = useState({
    title: '', description: '', start_time: '', end_time: '',
    type: 'virtual', location: '', max_participants: '', price: '0', currency: 'ZAR', image_url: '',
  })
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.title || !form.start_time || !form.end_time) {
      setError('Title, start and end time are required')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: err } = await supabase.from('events').insert({
      title: form.title,
      description: form.description || null,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      type: form.type,
      location: form.location || null,
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      price: parseFloat(form.price) || 0,
      currency: form.currency,
      image_url: form.image_url || null,
      created_by: user.id,
    })

    if (err) {
      setError(err.message)
      return
    }
    router.push('/events')
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-light-1">Create Event</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-light-3 mb-1">Event Image</label>
          <FileUpload
            bucket="events"
            path="events"
            onUpload={(url) => setForm(f => ({ ...f, image_url: url }))}
            maxSize={8388608}
          />
          {form.image_url && (
            <img src={form.image_url} alt="" className="mt-2 max-h-40 rounded-lg" />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-light-3 mb-1">Title *</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-light-3 mb-1">Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1 min-h-[100px]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Start Time *</label>
            <input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">End Time *</label>
            <input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1">
              <option value="virtual">Virtual</option>
              <option value="in-person">In-Person</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Location</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Max Participants</label>
            <input type="number" value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Price</label>
            <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-light-3 mb-1">Currency</label>
            <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              className="w-full px-4 py-3 bg-dark-2 border border-dark-4 rounded-lg text-light-1">
              <option value="ZAR">ZAR</option>
              <option value="USD">USD</option>
              <option value="NGN">NGN</option>
              <option value="KES">KES</option>
              <option value="GHS">GHS</option>
            </select>
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition">
          Create Event
        </button>
      </form>
    </div>
  )
}
