import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../lib/supabase'
import { Alert, Platform } from 'react-native'

export async function pickImage(options?: { allowsEditing?: boolean; aspect?: [number, number] }) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Please grant camera roll access to upload images.')
    return null
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: options?.allowsEditing ?? true,
    aspect: options?.aspect ?? [1, 1],
    quality: 0.8,
  })

  if (result.canceled) return null
  return result.assets[0]
}

export async function uploadImage(
  bucket: 'avatars' | 'posts' | 'events',
  uri: string,
  userId: string
): Promise<string | null> {
  try {
    const response = await fetch(uri)
    const blob = await response.blob()
    const fileExt = uri.split('.').pop() || 'jpg'
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        cacheControl: '3600',
      })

    if (error) throw error

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return publicUrl
  } catch (error: any) {
    Alert.alert('Upload failed', error.message)
    return null
  }
}

export async function pickAndUpload(
  bucket: 'avatars' | 'posts' | 'events',
  userId: string,
  options?: { allowsEditing?: boolean; aspect?: [number, number] }
): Promise<string | null> {
  const image = await pickImage(options)
  if (!image) return null
  return uploadImage(bucket, image.uri, userId)
}
