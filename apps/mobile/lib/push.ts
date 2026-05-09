import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied')
    return null
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync()
    const token = tokenData.data

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    await supabase.from('push_tokens').upsert({
      user_id: user.id,
      token,
      platform: Platform.OS,
    }, { onConflict: 'user_id,token' })

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      })
    }

    return token
  } catch (error) {
    console.error('Error registering push token:', error)
    return null
  }
}
