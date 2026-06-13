import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Loader2, RefreshCw, RotateCcw, X } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function isLiveCameraSupported() {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && !!navigator.mediaDevices?.getUserMedia
}

function getCameraErrorMessage(error: unknown) {
  if (!window.isSecureContext) {
    return '当前页面无法访问摄像头，请使用 HTTPS 或 localhost 后重试'
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return '当前浏览器不支持实时拍照，请使用系统相机或相册选择图片'
  }

  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return '摄像头权限被拒绝，请在浏览器设置中允许访问摄像头'
    }
    if (error.name === 'NotFoundError') {
      return '未检测到可用摄像头'
    }
    if (error.name === 'NotReadableError' || error.name === 'AbortError') {
      return '摄像头可能被其他应用占用，请关闭后重试'
    }
    if (error.name === 'SecurityError') {
      return '当前页面无法访问摄像头，请使用 HTTPS 或 localhost 后重试'
    }
  }

  return '无法打开摄像头，请稍后重试'
}

function canvasToFile(canvas: HTMLCanvasElement) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('拍照失败，请重试'))
        return
      }
      resolve(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.92)
  })
}

interface CameraCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  uploading?: boolean
  initialFacingMode?: 'user' | 'environment'
  onCaptureFile: (file: File) => Promise<unknown>
}

export function CameraCaptureDialog({
  open,
  onOpenChange,
  title,
  description,
  uploading,
  initialFacingMode = 'environment',
  onCaptureFile,
}: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [starting, setStarting] = useState(false)
  const [ready, setReady] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(initialFacingMode)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null)

  const clearCaptured = useCallback(() => {
    setCapturedFile(null)
    setCapturedPreviewUrl((previewUrl) => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      return null
    })
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setReady(false)
  }, [])

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    if (!isLiveCameraSupported()) {
      setErrorMessage(getCameraErrorMessage(null))
      return
    }

    setStarting(true)
    setErrorMessage(null)
    setReady(false)
    stopCamera()
    clearCaptured()

    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'OverconstrainedError') {
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
        } else {
          throw error
        }
      }

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (error) {
      console.error('打开摄像头失败', error)
      setErrorMessage(getCameraErrorMessage(error))
    } finally {
      setStarting(false)
    }
  }, [clearCaptured, stopCamera])

  useEffect(() => {
    if (!open) {
      stopCamera()
      clearCaptured()
      setErrorMessage(null)
      setFacingMode(initialFacingMode)
      return
    }

    setFacingMode(initialFacingMode)
    void startCamera(initialFacingMode)

    return () => {
      stopCamera()
    }
  }, [clearCaptured, initialFacingMode, open, startCamera, stopCamera])

  useEffect(() => clearCaptured, [clearCaptured])

  const handleCapture = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !ready) return

    setCapturing(true)
    setErrorMessage(null)
    try {
      const width = video.videoWidth || 1280
      const height = video.videoHeight || 720
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('当前浏览器不支持拍照')
      }
      context.drawImage(video, 0, 0, width, height)
      const file = await canvasToFile(canvas)
      const previewUrl = URL.createObjectURL(file)
      clearCaptured()
      setCapturedFile(file)
      setCapturedPreviewUrl(previewUrl)
      stopCamera()
    } catch (error) {
      console.error('拍照失败', error)
      setErrorMessage(error instanceof Error ? error.message : '拍照失败，请重试')
    } finally {
      setCapturing(false)
    }
  }

  const handleRetake = () => {
    clearCaptured()
    void startCamera(facingMode)
  }

  const handleSwitchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextMode)
    void startCamera(nextMode)
  }

  const handleUseCapture = async () => {
    if (!capturedFile) return
    await onCaptureFile(capturedFile)
    onOpenChange(false)
  }

  const busy = starting || capturing || uploading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-lg p-4 sm:max-w-lg">
        <div className="space-y-1 pr-8">
          <DialogTitle className="text-base">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-xs leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black">
          {capturedPreviewUrl ? (
            <img
              src={capturedPreviewUrl}
              alt="拍摄预览"
              className="h-full w-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => setReady(true)}
              className="h-full w-full object-cover"
            />
          )}

          {starting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">正在打开摄像头...</span>
            </div>
          )}

          {errorMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 p-5 text-center text-white">
              <Camera className="h-7 w-7 opacity-80" />
              <p className="text-sm leading-relaxed">{errorMessage}</p>
              {isLiveCameraSupported() && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => startCamera(facingMode)}
                >
                  重试
                </Button>
              )}
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            <X className="h-4 w-4" />
            取消
          </Button>

          {capturedFile ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleRetake}
                disabled={busy}
              >
                <RotateCcw className="h-4 w-4" />
                重拍
              </Button>
              <Button
                type="button"
                onClick={handleUseCapture}
                disabled={busy}
                className="gradient-gold text-primary-foreground"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadIcon />}
                使用并上传
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSwitchCamera}
                disabled={busy || !!errorMessage}
              >
                <RefreshCw className="h-4 w-4" />
                切换
              </Button>
              <Button
                type="button"
                onClick={handleCapture}
                disabled={busy || !ready || !!errorMessage}
                className="gradient-gold text-primary-foreground"
              >
                {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                拍照
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function UploadIcon() {
  return <Camera className="h-4 w-4" />
}
