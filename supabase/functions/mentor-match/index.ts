import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

interface MatchRequest {
  user_id: string
  limit?: number
  use_ai?: boolean
}

interface MentorProfile {
  user_id: string
  full_name: string
  position: string | null
  company: string | null
  avatar_url: string | null
  bio: string
  expertise: string[]
  industry: string[]
  hourly_rate: number
  currency: string
  rating: number
  session_count: number
  years_experience: number
  languages: string[]
  certifications: string[]
}

serve(async (req) => {
  try {
    const { user_id, limit = 10, use_ai = true } = await req.json() as MatchRequest
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch user profile
    const { data: user } = await supabase
      .from('profiles')
      .select('id, industry, years_experience, career_goals, skills, interests, full_name, position, company')
      .eq('id', user_id)
      .single()

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
    }

    // Fetch all available mentors
    const { data: mentors } = await supabase
      .from('mentor_profiles')
      .select(`
        user_id,
        expertise,
        industry,
        bio,
        hourly_rate,
        currency,
        rating,
        years_experience,
        languages,
        certifications,
        target_mentee_profile,
        mentee_goals,
        completed_sessions,
        user:user_id!inner(
          id, full_name, position, company, avatar_url
        )
      `)
      .eq('is_available', true)
      .neq('user_id', user_id)

    if (!mentors || mentors.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let recommendations: Array<MentorProfile & { match_score: number; match_reason: string }>

    if (use_ai && Deno.env.get('DEEPSEEK_API_KEY')) {
      // AI-powered matching with DeepSeek
      const prompt = `You are a mentor matching AI. Given a mentee profile and a list of mentors, rank the top ${limit} mentors by compatibility.

MENTEE:
- Name: ${user.full_name}
- Position: ${user.position || 'N/A'}
- Company: ${user.company || 'N/A'}
- Industry: ${user.industry || 'N/A'}
- Years Experience: ${user.years_experience || 0}
- Skills: ${(user.skills || []).join(', ')}
- Career Goals: ${(user.career_goals || []).join(', ')}
- Interests: ${(user.interests || []).join(', ')}

MENTORS:
${mentors.slice(0, 50).map((m: any, i: number) => `
${i + 1}. ${m.user.full_name} (${m.user.position || 'N/A'} at ${m.user.company || 'N/A'})
   Expertise: ${m.expertise.join(', ')}
   Industry: ${(m.industry || []).join(', ')}
   Experience: ${m.years_experience || 0} years
   Bio: ${m.bio}
   Languages: ${(m.languages || []).join(', ')}
   Certifications: ${(m.certifications || []).join(', ')}
   Sessions Completed: ${m.completed_sessions || 0}
   Rating: ${m.rating || 'N/A'}
`).join('\n')}

Return ONLY a valid JSON array of objects, each with:
- user_id: string
- match_score: number (0-100)
- match_reason: string (1 sentence explaining why this is a good match)

Sort by match_score descending. Return top ${limit}.`

      const aiResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'system', content: 'You are a mentor matching expert.' }, { role: 'user', content: prompt }],
          temperature: 0.3,
        }),
      })

      const aiData = await aiResponse.json()
      let aiMatches: Array<{ user_id: string; match_score: number; match_reason: string }> = []

      try {
        const content = aiData.choices?.[0]?.message?.content || '[]'
        aiMatches = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim())
      } catch {
        // Fallback to algorithm if AI parsing fails
        use_ai = false
      }

      if (aiMatches.length > 0) {
        recommendations = aiMatches.slice(0, limit).map(aiMatch => {
          const mentor = mentors.find((m: any) => m.user_id === aiMatch.user_id) as any
          if (!mentor) return null
          return {
            user_id: mentor.user_id,
            full_name: mentor.user.full_name,
            position: mentor.user.position,
            company: mentor.user.company,
            avatar_url: mentor.user.avatar_url,
            bio: mentor.bio,
            expertise: mentor.expertise,
            industry: mentor.industry,
            hourly_rate: mentor.hourly_rate,
            currency: mentor.currency,
            rating: mentor.rating,
            session_count: mentor.completed_sessions,
            years_experience: mentor.years_experience,
            languages: mentor.languages,
            certifications: mentor.certifications,
            match_score: aiMatch.match_score,
            match_reason: aiMatch.match_reason,
          } as MentorProfile & { match_score: number; match_reason: string }
        }).filter(Boolean)
      }
    }

    if (!use_ai || !Deno.env.get('DEEPSEEK_API_KEY')) {
      // Algorithm-based fallback matching
      const userSkills = (user.skills || []).map((s: string) => s.toLowerCase())
      const userGoals = (user.career_goals || []).map((g: string) => g.toLowerCase())
      const userIndustry = (user.industry || '').toLowerCase()

      const scored = mentors.map((m: any) => {
        let score = 0
        const reasons: string[] = []

        // Industry match (+25)
        const mentorIndustries = (m.industry || []).map((i: string) => i.toLowerCase())
        if (mentorIndustries.some((i: string) => i === userIndustry)) {
          score += 25
          reasons.push('Same industry')
        }

        // Skill overlap (+30)
        const mentorExpertise = (m.expertise || []).map((e: string) => e.toLowerCase())
        const overlap = userSkills.filter((s: string) => mentorExpertise.includes(s)).length
        if (overlap > 0) {
          score += Math.min(overlap * 10, 30)
          reasons.push(`Expertise in ${overlap} of your skill areas`)
        }

        // Seniority (+15)
        if (m.years_experience > (user.years_experience || 0)) {
          const gap = m.years_experience - (user.years_experience || 0)
          score += Math.min(gap * 3, 15)
          reasons.push(`${gap} years more experience`)
        }

        // Goal alignment (+20)
        const mentorGoals = (m.mentee_goals || []).map((g: string) => g.toLowerCase())
        const commonGoals = userGoals.filter((g: string) => mentorGoals.includes(g)).length
        if (commonGoals > 0) {
          score += Math.min(commonGoals * 10, 20)
          reasons.push('Aligned with your career goals')
        }

        // Track record (+10)
        if (m.completed_sessions > 0) {
          score += Math.min(m.completed_sessions * 2, 10)
        }

        return {
          user_id: m.user_id,
          full_name: m.user.full_name,
          position: m.user.position,
          company: m.user.company,
          avatar_url: m.user.avatar_url,
          bio: m.bio,
          expertise: m.expertise,
          industry: m.industry,
          hourly_rate: m.hourly_rate,
          currency: m.currency,
          rating: m.rating,
          session_count: m.completed_sessions,
          years_experience: m.years_experience,
          languages: m.languages,
          certifications: m.certifications,
          match_score: Math.round((score / 100) * 100),
          match_reason: reasons.join('. ') || 'Potential good fit',
        }
      })

      recommendations = scored.sort((a: any, b: any) => b.match_score - a.match_score).slice(0, limit)
    }

    return new Response(JSON.stringify({ recommendations }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
