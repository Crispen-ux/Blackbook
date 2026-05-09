'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronUp, Send, User } from 'lucide-react'

export default function QAQuestionPage() {
  const { id } = useParams()
  const [question, setQuestion] = useState<any>(null)
  const [answers, setAnswers] = useState<any[]>([])
  const [answerContent, setAnswerContent] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetch = async () => {
      const { data: q } = await supabase.from('qa_questions').select('*').eq('id', id).single()
      if (q) setQuestion(q)

      const { data: a } = await supabase
        .from('qa_answers')
        .select('*, author:profiles(full_name, avatar_url, position, company)')
        .eq('question_id', id)
        .order('upvotes', { ascending: false })
      if (a) setAnswers(a)

      setLoading(false)
    }
    fetch()
  }, [id, supabase])

  const handleAnswer = async () => {
    if (!answerContent.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('qa_answers').insert({ question_id: id, author_id: user.id, content: answerContent })
    setAnswerContent('')
    const { data: a } = await supabase
      .from('qa_answers')
      .select('*, author:profiles(full_name, avatar_url, position, company)')
      .eq('question_id', id)
      .order('upvotes', { ascending: false })
    if (a) setAnswers(a)
    setQuestion((prev: any) => prev ? { ...prev, is_answered: true } : prev)
  }

  const handleUpvote = async (targetType: 'question' | 'answer', targetId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('qa_upvotes').insert({ user_id: user.id, target_type: targetType, target_id: targetId })
    if (targetType === 'question') {
      setQuestion((prev: any) => prev ? { ...prev, upvotes: prev.upvotes + 1 } : prev)
    } else {
      setAnswers(prev => prev.map(a => a.id === targetId ? { ...a, upvotes: a.upvotes + 1 } : a))
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={32} /></div>
  if (!question) return <div className="text-center py-20 text-light-4">Question not found</div>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-dark-2 rounded-xl p-6 border border-dark-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => handleUpvote('question', question.id)}
            className="flex flex-col items-center gap-0.5 p-2 rounded-lg hover:bg-dark-3 transition"
          >
            <ChevronUp size={22} className="text-light-4" />
            <span className="text-sm font-medium text-light-2">{question.upvotes}</span>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-light-1">{question.title}</h1>
            <p className="text-light-3 mt-2">{question.content}</p>
            <div className="flex items-center gap-2 mt-3 text-xs text-light-5">
              <User size={12} />
              <span>{question.is_anonymous ? 'Asking anonymously' : 'Known member'}</span>
              <span className="ml-auto">{new Date(question.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-light-1 mb-4">{answers.length} Answer{answers.length !== 1 ? 's' : ''}</h2>

        <div className="space-y-4">
          {answers.map(answer => (
            <div key={answer.id} className="bg-dark-2 rounded-xl p-5 border border-dark-4">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleUpvote('answer', answer.id)}
                  className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-dark-3 transition"
                >
                  <ChevronUp size={16} className="text-light-4" />
                  <span className="text-xs font-medium text-light-2">{answer.upvotes}</span>
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs">
                      {answer.author?.full_name?.charAt(0) || '?'}
                    </div>
                    <span className="text-sm text-light-2 font-medium">{answer.author?.full_name}</span>
                    <span className="text-xs text-light-5">
                      {answer.author?.position}{answer.author?.company ? ` at ${answer.author.company}` : ''}
                    </span>
                    {answer.is_accepted && (
                      <span className="text-xs text-green-400 font-medium ml-auto">Accepted</span>
                    )}
                  </div>
                  <p className="text-sm text-light-3 leading-relaxed">{answer.content}</p>
                  <p className="text-xs text-light-5 mt-2">{new Date(answer.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-dark-2 rounded-xl p-4 border border-dark-4">
          <h3 className="text-sm font-semibold text-light-1 mb-2">Your Answer</h3>
          <textarea
            value={answerContent}
            onChange={e => setAnswerContent(e.target.value)}
            placeholder="Write your answer..."
            className="w-full bg-dark-3 border border-dark-5 rounded-lg p-3 text-sm text-light-1 min-h-[100px] resize-none"
          />
          <div className="flex justify-end mt-2">
            <button onClick={handleAnswer} className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm">
              <Send size={14} />
              Submit Answer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
