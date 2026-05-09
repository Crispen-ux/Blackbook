'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, X } from 'lucide-react'

interface FileUploadProps {
  bucket: 'avatars' | 'posts' | 'events'
  path: string
  accept?: string
  maxSize?: number
  onUpload: (url: string) => void
  onError?: (error: string) => void
  className?: string
  children?: React.ReactNode
}

export function FileUpload({
  bucket, path, accept = 'image/*', maxSize = 4194304,
  onUpload, onError, className = '', children,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > maxSize) {
      onError?.(`File too large. Max size: ${Math.round(maxSize / 1048576)}MB`)
      return
    }

    setPreview(URL.createObjectURL(file))
    setUploading(true)

    const fileExt = file.name.split('.').pop()
    const fileName = `${path}/${crypto.randomUUID()}.${fileExt}`

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (error) {
      onError?.(error.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    onUpload(publicUrl)
    setUploading(false)
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFile}
        className="hidden"
      />
      {children ? (
        <div onClick={() => inputRef.current?.click()}>{children}</div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-dark-3 border border-dark-4 rounded-lg hover:border-primary-500/50 transition disabled:opacity-50"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'Uploading...' : 'Upload Image'}
        </button>
      )}
      {preview && !uploading && (
        <div className="relative mt-2 inline-block">
          <img src={preview} alt="Preview" className="max-h-32 rounded-lg" />
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute -top-2 -right-2 p-1 bg-dark-1 rounded-full border border-dark-4"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  )
}
