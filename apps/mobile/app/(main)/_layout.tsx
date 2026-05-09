import { useEffect, useState } from 'react'
import { Tabs, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'

function useOnboardingCheck() {
  const [checking, setChecking] = useState(true)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('onboarded').eq('id', user.id).single()
      if (data && !data.onboarded) {
        router.replace('/(main)/onboarding')
      } else {
        setChecking(false)
      }
    })()
  }, [])
  return checking
}

export default function MainTabLayout() {
  const [unreadCount, setUnreadCount] = useState(0)
  const checking = useOnboardingCheck()

  useEffect(() => {
    const fetchCount = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      if (count !== null) setUnreadCount(count)
    }
    if (!checking) fetchCount()

    const channel = supabase
      .channel('unread-count')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => { if (!checking) fetchCount() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [checking])

  if (checking) return null

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1a1a2e', borderTopColor: '#0f3460', borderTopWidth: 1, paddingBottom: 8, paddingTop: 8, height: 64 },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen name="feed" options={{ title: 'Feed', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts', tabBarBadge: unreadCount > 0 ? unreadCount : undefined, tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} /> }} />
      <Tabs.Screen name="events" options={{ title: 'Events', tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} /> }} />
      <Tabs.Screen name="mentorship" options={{ title: 'Mentorship', tabBarIcon: ({ color, size }) => <Ionicons name="school" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
      <Tabs.Screen name="onboarding" options={{ tabBarStyle: { display: 'none' }, tabBarItemStyle: { display: 'none' } }} />
    </Tabs>
  )
}
