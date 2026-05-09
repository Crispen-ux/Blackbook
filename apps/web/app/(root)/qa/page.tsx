'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, MessageSquare, ChevronUp, Plus, Send } from 'lucide-react'

export default function QAPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAsk, setShowAsk] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [anonymous, setAnonymous] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('qa_questions')
      .select('*')
      .order('upvotes', { ascending: false })
    if (data) setQuestions(data)
    setLoading(false)
  }

  useEffect(() => { fetchQuestions() }, [])

  const handleAsk = async () => {
    if (!title.trim() || !content.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('qa_questions').insert({
      author_id: user.id, title, content, is_anonymous: anonymous,
    })
    setTitle('')
    setContent('')
    setShowAsk(false)
    fetchQuestions()
  }

  const handleUpvote = async (qId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('qa_upvotes').insert({ user_id: user.id, target_type: 'question', target_id: qId })
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, upvotes: q.upvotes + 1 } : q))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-light-1">Q&A</h1>
        <button
          onClick={() => setShowAsk(!showAsk)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm"
        >
          <Plus size={16} />
          Ask Question
        </button>
      </div>

      {showAsk && (
        <div className="bg-dark-3 border border-dark-4 rounded-xl p-5 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Question title" className="w-full bg-dark-4 border border-dark-5 rounded-lg px-3 py-2 text-sm text-light-1" />
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Details..." className="w-full bg-dark-4 border border-dark-5 rounded-lg px-3 py-2 text-sm text-light-1 min-h-[80px]" />
          <label className="flex items-center gap-2 text-sm text-light-4">
            <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} className="rounded" />
            Ask anonymously
          </label>
          <button onClick={handleAsk} className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm">
            <Send size={14} />
            Submit
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={32} /></div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 text-light-4">No questions yet</div>
      ) : (
        <div className="space-y-3">
          {questions.map(q => (
            <Link
              key={q.id}
              href={`/qa/${q.id}`}
              className="block bg-dark-2 border border-dark-4 rounded-xl p-5 hover:border-primary-500/30 transition"
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={e => { e.preventDefault(); handleUpvote(q.id) }}
                  className="flex flex-col items-center gap-0.5 p-2 rounded-lg hover:bg-dark-3 transition"
                >
                  <ChevronUp size={18} className="text-light-4" />
                  <span className="text-xs font-medium text-light-2">{q.upvotes}</span>
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="text-light-1 font-medium">{q.title}</h3>
                  <p className="text-sm text-light-4 mt-1 line-clamp-2">{q.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-light-5">
                    <span>{q.is_anonymous ? 'Anonymous' : 'Someone'}</span>
                    <span className="flex items-center gap-1"><MessageSquare size={12} /> {q.is_answered ? 'Answered' : 'Open'}</span>
                    {q.tags?.length > 0 && q.tags.map((t: string) => (
                      <span key={t} className="px-1.5 py-0.5 bg-dark-4 rounded text-xs">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
