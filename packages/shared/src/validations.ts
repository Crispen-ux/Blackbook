import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  company: z.string().optional(),
  position: z.string().optional(),
})

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  company: z.string().optional(),
  position: z.string().optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  years_experience: z.number().int().min(0).optional(),
  skills: z.array(z.string()).optional(),
  career_goals: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
})

export const postSchema = z.object({
  content: z.string().min(1, 'Post cannot be empty').max(2000),
  image_url: z.string().url().optional(),
})

export const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(500),
})

export const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000),
})

export const eventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().max(2000).optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  type: z.enum(['virtual', 'in-person']),
  location: z.string().optional(),
  max_participants: z.number().int().positive().optional(),
  price: z.number().min(0).default(0),
  currency: z.string().default('ZAR'),
})

export const mentorshipSessionSchema = z.object({
  mentor_id: z.string().uuid(),
  scheduled_time: z.string().datetime(),
  duration_minutes: z.number().int().min(15).max(180),
  notes: z.string().max(1000).optional(),
})

export const mentorProfileSchema = z.object({
  expertise: z.array(z.string()).min(1),
  bio: z.string().min(10).max(1000),
  hourly_rate: z.number().min(0),
  currency: z.string().default('ZAR'),
  industry: z.array(z.string()).optional(),
  years_experience: z.number().int().min(0).optional(),
  languages: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  target_mentee_profile: z.string().max(500).optional(),
  mentee_goals: z.array(z.string()).optional(),
})
