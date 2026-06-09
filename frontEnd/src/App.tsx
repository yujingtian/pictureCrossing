import { useState, useEffect, useRef } from 'react'
import { TopHeader } from '@/components/top-header'
import { MainCanvas } from '@/components/main-canvas'
import { InputSection } from '@/components/input-section'
import { BottomActionBar } from '@/components/bottom-action-bar'
import { AccessoryPanel, ModelPanel } from '@/components/step-panels'
import type { AccessoryInput, AccessoryType, ModelInput } from '@/types/api'
import { createGeneration, getTaskStatus } from '@/services/api'
import { useToast } from '@/hooks/use-toast'

export default function App() {
  const { toast } = useToast()
  // 面板状态
  const [accessoryPanelOpen, setAccessoryPanelOpen] = useState(false)
  const [modelPanelOpen, setModelPanelOpen] = useState(false)

  // 选中的内容
  const [selectedAccessoryType, setSelectedAccessoryType] = useState<AccessoryType>('bracelet')
  const [selectedAccessory, setSelectedAccessory] = useState<AccessoryInput | null>(null)
  const [selectedModel, setSelectedModel] = useState<ModelInput | null>(null)

  // 生成状态
  const [isLoading, setIsLoading] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)

  // 轮询相关
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 检查是否所有步骤都已完成
  const uploadedItems = {
    accessory: !!selectedAccessory,
    model: !!selectedModel,
  }
  const isAllCompleted = uploadedItems.accessory && uploadedItems.model

  // 点击步骤卡片打开对应面板
  const handleStepSelect = (step: number) => {
    if (step === 1) setAccessoryPanelOpen(true)
    else if (step === 2) setModelPanelOpen(true)
  }

  // 处理配饰选择确认
  const handleAccessoryConfirm = (type: AccessoryType, selection: AccessoryInput | null) => {
    setSelectedAccessoryType(type)
    setSelectedAccessory(selection)
  }

  // 处理模特选择确认
  const handleModelConfirm = (selection: ModelInput | null) => {
    setSelectedModel(selection)
  }

  // 清理轮询
  const clearPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => clearPolling()
  }, [])

  // 生成 AI 效果图
  const handleGenerate = async () => {
    if (!isAllCompleted || !selectedAccessory || !selectedModel) return

    setIsLoading(true)
    setGeneratedImage(null)
    clearPolling()

    try {
      // 调用创建任务接口
      const response = await createGeneration({
        accessory_type: selectedAccessoryType,
        accessory: selectedAccessory,
        model: selectedModel,
      })

      if (!response.success || !response.data) {
        throw new Error(response.message || '创建生成任务失败')
      }

      const newTaskId = response.data.task_id

      // 开始轮询任务状态
      let pollCount = 0
      const maxPolls = 80 // 大约 2 分钟

      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollResponse = await getTaskStatus(newTaskId)

          if (pollResponse.success && pollResponse.data) {
            const taskStatus = pollResponse.data

            if (taskStatus.status === 'completed') {
              // 任务完成
              setGeneratedImage(taskStatus.result_url || null)
              setIsLoading(false)
              clearPolling()
              toast({ title: '生成成功！', description: '您的试戴效果图已生成' })
            } else if (taskStatus.status === 'failed') {
              // 任务失败
              setIsLoading(false)
              clearPolling()
              toast({
                title: '生成失败',
                description: taskStatus.error || '请稍后重试',
                variant: 'destructive',
              })
            }
            // pending 或 processing 状态继续轮询
          }

          pollCount++
          if (pollCount >= maxPolls) {
            setIsLoading(false)
            clearPolling()
            toast({
              title: '生成超时',
              description: '请稍后重试',
              variant: 'destructive',
            })
          }
        } catch (error) {
          console.error('轮询任务状态失败', error)
          setIsLoading(false)
          clearPolling()
          toast({
            title: '获取任务状态失败',
            description: error instanceof Error ? error.message : '请稍后重试',
            variant: 'destructive',
          })
        }
      }, 1500)

    } catch (error) {
      console.error('生成失败', error)
      setIsLoading(false)
      toast({
        title: '生成失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive',
      })
    }
  }

  return (
    <main className="h-dvh flex flex-col overflow-hidden">
      {/* 顶部导航 */}
      <TopHeader />

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col pt-14 pb-24 overflow-hidden">
        {/* 主画布区域 */}
        <div className="flex-1 min-h-0 pt-3 pb-2">
          <MainCanvas
            imageUrl={generatedImage}
            isLoading={isLoading}
          />
        </div>

        {/* 步骤输入区域 */}
        <InputSection
          onStepSelect={handleStepSelect}
          uploadedItems={uploadedItems}
          accessoryImage={selectedAccessory?.url}
          modelImage={selectedModel?.url}
          accessoryType={selectedAccessoryType}
        />

        {/* 状态提示 */}
        {isAllCompleted && !generatedImage && !isLoading && (
          <div className="px-4">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-[11px] text-center text-primary/90">
                太棒了！所有元素已就绪，点击下方按钮生成试戴效果
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <BottomActionBar
        isActive={isAllCompleted}
        isLoading={isLoading}
        onGenerate={handleGenerate}
      />

      {/* 配置面板 */}
      <AccessoryPanel
        open={accessoryPanelOpen}
        onOpenChange={setAccessoryPanelOpen}
        onConfirm={handleAccessoryConfirm}
        selectedType={selectedAccessoryType}
        selectedImage={selectedAccessory?.url}
        selectedSelection={selectedAccessory}
      />
      <ModelPanel
        open={modelPanelOpen}
        onOpenChange={setModelPanelOpen}
        onConfirm={handleModelConfirm}
        selectedImage={selectedModel?.url}
        selectedSelection={selectedModel}
        accessoryType={selectedAccessoryType}
      />
    </main>
  )
}
