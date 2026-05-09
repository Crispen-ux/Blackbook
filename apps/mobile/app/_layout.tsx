import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { PaperProvider, MD3DarkTheme } from 'react-native-paper'
import { View, ActivityIndicator } from 'react-native'
import * as Notifications from 'expo-notifications'
import { supabase } from '../lib/supabase'
import { registerForPushNotifications } from '../lib/push'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#6366f1',
    primaryContainer: '#4f46e5',
    background: '#000000',
    surface: '#1a1a2e',
    surfaceVariant: '#16213e',
    onSurface: '#ffffff',
    onSurfaceVariant: '#94a3b8',
  },
}

export default function RootLayout() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      setLoading(false)
      registerForPushNotifications()
    })

    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data
      // Future: navigate based on notification data
    })

    return () => sub.remove()
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    )
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </PaperProvider>
  )
}
