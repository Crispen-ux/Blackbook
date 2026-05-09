import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper'
import { View, ActivityIndicator } from 'react-native'
import * as Notifications from 'expo-notifications'
import { supabase } from '../lib/supabase'
import { registerForPushNotifications } from '../lib/push'
import { ThemeProvider, useAppTheme } from '../context/ThemeContext'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

function ThemedApp() {
  const { colors, isDark } = useAppTheme()

  const paperTheme = isDark
    ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: colors.primary,
          primaryContainer: '#4f46e5',
          background: colors.background,
          surface: colors.surface,
          surfaceVariant: colors.surfaceAlt,
          onSurface: colors.text,
          onSurfaceVariant: colors.textMuted,
        },
      }
    : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: colors.primary,
          primaryContainer: '#c7d2fe',
          background: colors.background,
          surface: colors.surface,
          surfaceVariant: colors.surfaceAlt,
          onSurface: colors.text,
          onSurfaceVariant: colors.textMuted,
        },
      }

  return (
    <PaperProvider theme={paperTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </PaperProvider>
  )
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
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  )
}
