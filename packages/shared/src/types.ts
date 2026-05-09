// ===================== User & Profile =====================
export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'moderator' | 'member' | 'mentor'
  company?: string
  position?: string
  bio?: string
  avatar_url?: string
  phone?: string
  industry?: string
  years_experience?: number
  career_goals?: string[]
  skills?: string[]
  interests?: string[]
  created_at: string
  last_active: string
  is_verified: boolean
  onboarded: boolean
}

export interface Profile extends User {
  mentee_count?: number
  mentor_count?: number
  event_count?: number
}

// ===================== Chats & Messaging =====================
export interface Chat {
  id: string
  type: 'direct' | 'group'
  name?: string
  avatar_url?: string
  created_by: string
  created_at: string
  last_message_at?: string
  last_message?: Message
}

export interface ChatMember {
  chat_id: string
  user_id: string
  joined_at: string
  role: 'admin' | 'member'
  user?: User
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  created_at: string
  updated_at?: string
  is_edited: boolean
  attachments: MessageAttachment[]
  sender?: User
}

export interface MessageAttachment {
  type: 'image' | 'file' | 'link'
  url: string
  name?: string
  size?: number
}

// ===================== Feed / Posts =====================
export interface Post {
  id: string
  author_id: string
  content: string
  image_url?: string
  created_at: string
  updated_at?: string
  author?: User
  likes: number
  comments: number
  is_liked?: boolean
}

export interface PostLike {
  post_id: string
  user_id: string
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  content: string
  created_at: string
  author?: User
}

// ===================== Events =====================
export interface Event {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  type: 'virtual' | 'in-person'
  location?: string
  max_participants?: number
  price: number
  currency: string
  image_url?: string
  created_by: string
  created_at: string
  organizer?: User
  registration_count?: number
  is_registered?: boolean
}

export interface EventRegistration {
  event_id: string
  user_id: string
  registration_time: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_id?: string
}

// ===================== Mentorship =====================
export interface MentorshipSession {
  id: string
  mentor_id: string
  mentee_id: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending'
  scheduled_time: string
  duration_minutes: number
  price: number
  currency: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  notes?: string
  created_at: string
  mentor?: User
  mentee?: User
}

export interface MentorProfile {
  user_id: string
  expertise: string[]
  bio: string
  hourly_rate: number
  currency: string
  is_available: boolean
  rating?: number
  session_count?: number
  industry?: string[]
  years_experience?: number
  languages?: string[]
  certifications?: string[]
  target_mentee_profile?: string
  mentee_goals?: string[]
  completed_sessions?: number
  user?: User
}

export interface MentorRecommendation extends MentorProfile {
  match_score: number
  match_reason: string
}

// ===================== Payments =====================
export interface Payment {
  id: string
  user_id: string
  amount: number
  currency: string
  type: 'event' | 'mentorship' | 'subscription'
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  reference_id?: string
  metadata?: Record<string, any>
  created_at: string
}

// ===================== Notifications =====================
export interface Notification {
  id: string
  user_id: string
  type: 'message' | 'like' | 'comment' | 'event' | 'mentorship' | 'payment' | 'connection'
  title: string
  body: string
  data?: Record<string, any>
  is_read: boolean
  created_at: string
}
