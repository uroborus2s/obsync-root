import { AlertCircle, Camera, RefreshCw, X } from 'lucide-react';

interface LocationFailedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onPhotoCheckin: () => void;
  isLoading?: boolean;
  distance?: number;
}

/**
 * 位置校验失败对话框组件
 * 当学生签到时位置校验失败，显示此对话框提供两个选项：
 * 1. 重试 - 重新获取位置信息
 * 2. 图片签到 - 上传图片进行待审批签到
 */
export default function LocationFailedDialog({
  isOpen,
  onClose,
  onRetry,
  onPhotoCheckin,
  isLoading = false,
  distance
}: LocationFailedDialogProps) {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* 背景遮罩 */}
      <div
        className='absolute inset-0 bg-black bg-opacity-50'
        onClick={!isLoading ? onClose : undefined}
      />

      {/* 弹窗内容 */}
      <div className='relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl'>
        {/* 标题栏 */}
        <div className='mb-4 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-red-100'>
              <AlertCircle className='h-6 w-6 text-red-600' />
            </div>
            <h2 className='text-xl font-semibold text-gray-900'>
              位置校验失败
            </h2>
          </div>
          <button
            type='button'
            onClick={onClose}
            disabled={isLoading}
            className='rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50'
            aria-label='关闭'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* 提示信息 */}
        <div className='mb-6 rounded-lg bg-red-50 p-4'>
          <p className='text-sm text-red-800'>
            您当前不在上课地点附近
            {distance && distance > 0 && (
              <span className='ml-1 font-medium'>
                （距离约 {Math.round(distance)}米）
              </span>
            )}
          </p>
          <p className='mt-2 text-sm text-red-700'>
            请选择以下操作：
          </p>
        </div>

        {/* 操作按钮 */}
        <div className='space-y-3'>
          {/* 重试按钮 */}
          <button
            type='button'
            onClick={onRetry}
            disabled={isLoading}
            className='flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className='font-medium'>重新获取位置</span>
          </button>

          {/* 图片签到按钮 */}
          <button
            type='button'
            onClick={onPhotoCheckin}
            disabled={isLoading}
            className='flex w-full items-center justify-center gap-2 rounded-lg border-2 border-blue-600 bg-white px-4 py-3 text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50'
          >
            <Camera className='h-5 w-5' />
            <span className='font-medium'>使用图片签到</span>
          </button>
        </div>

        {/* 说明文字 */}
        <div className='mt-4 rounded-lg bg-gray-50 p-3'>
          <p className='text-xs text-gray-600'>
            <span className='font-medium'>提示：</span>
            图片签到将进入待审批状态，需要教师审核通过后才能完成签到。
          </p>
        </div>
      </div>
    </div>
  );
}

