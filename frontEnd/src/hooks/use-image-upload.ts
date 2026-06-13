import { useState, type ChangeEvent } from 'react'

import { useToast } from '@/hooks/use-toast'
import { uploadImage } from '@/services/api'
import type { UploadAssetInput, UploadType } from '@/types/api'

interface UseImageUploadOptions {
  type: UploadType
  onUploaded: (selection: UploadAssetInput) => void
  errorTitle?: string
}

export function useImageUpload({
  type,
  onUploaded,
  errorTitle = '上传图片失败',
}: UseImageUploadOptions) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const response = await uploadImage(file, type)
      if (!response.success || !response.data) {
        throw new Error(response.error || response.message || '上传失败')
      }

      const selection: UploadAssetInput = {
        source: 'upload',
        id: response.data.file_id,
        url: response.data.url,
      }
      onUploaded(selection)
      return selection
    } catch (error) {
      console.error(errorTitle, error)
      toast({
        title: errorTitle,
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive',
      })
      throw error
    } finally {
      setUploading(false)
    }
  }

  const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      await uploadFile(file)
    } finally {
      event.target.value = ''
    }
  }

  return {
    uploading,
    uploadFile,
    handleFileInputChange,
  }
}
