export const APP_NAME = 'BlackBook'
export const APP_TAGLINE = 'Africa\'s Premium Professional Network'

export const ROLES = ['admin', 'member', 'mentor'] as const

export const CURRENCIES = ['ZAR', 'USD', 'NGN', 'KES', 'GHS'] as const
export const DEFAULT_CURRENCY = 'ZAR'

export const EVENT_TYPES = ['virtual', 'in-person'] as const

export const MENTORSHIP_STATUSES = ['scheduled', 'completed', 'cancelled', 'pending'] as const

export const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'] as const

export const PAYMENT_TYPES = ['event', 'mentorship', 'subscription'] as const

export const NOTIFICATION_TYPES = [
  'message', 'like', 'comment', 'event', 'mentorship', 'payment', 'connection',
] as const

export const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: 'Home' },
  { label: 'Messages', href: '/messages', icon: 'MessageSquare' },
  { label: 'Events', href: '/events', icon: 'Calendar' },
  { label: 'Mentorship', href: '/mentorship', icon: 'GraduationCap' },
  { label: 'Network', href: '/network', icon: 'Users' },
  { label: 'Profile', href: '/profile', icon: 'User' },
] as const

export const MOBILE_NAV_ITEMS = [
  { label: 'Home', href: '/', icon: 'Home' },
  { label: 'Messages', href: '/messages', icon: 'MessageSquare' },
  { label: 'Events', href: '/events', icon: 'Calendar' },
  { label: 'Mentorship', href: '/mentorship', icon: 'GraduationCap' },
  { label: 'Profile', href: '/profile', icon: 'User' },
] as const
