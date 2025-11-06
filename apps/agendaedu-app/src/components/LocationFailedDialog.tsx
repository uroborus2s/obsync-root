import { AlertCircle, Camera, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LocationFailedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCheckin: () => void;
  onRefreshLocation: () => Promise<void>; // 新增：刷新位置回调
  isLoading?: boolean;
  distance?: number;
  windowEndTime?: string; // 新增：签到窗口结束时间（ISO 格式）
}

/**
 * 位置校验失败对话框组件
 * 当学生签到时位置校验失败，显示此对话框提供两个选项：
 * 1. 刷新位置 - 重新获取位置信息并自动校验
 * 2. 图片签到 - 上传图片进行待审批签到（需要勾选确认框）
 */
export default function LocationFailedDialog({
  isOpen,
  onClose,
  onPhotoCheckin,
  onRefreshLocation,
  isLoading = false,
  distance,
  windowEndTime
}: LocationFailedDialogProps) {
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 重置勾选框状态
  useEffect(() => {
    if (!isOpen) {
      setIsCheckboxChecked(false);
      setIsRefreshing(false);
    }
  }, [isOpen]);

  // 自动关闭机制：当超过签到窗口结束时间时自动关闭
  useEffect(() => {
    if (!isOpen || !windowEndTime) return;

    const checkWindowExpiry = () => {
      const now = new Date();
      const endTime = new Date(windowEndTime);

      if (now > endTime) {
        // 窗口已结束，自动关闭对话框
        onClose();
      }
    };

    // 立即检查一次
    checkWindowExpiry();

    // 每秒检查一次
    const interval = setInterval(checkWindowExpiry, 1000);

    return () => clearInterval(interval);
  }, [isOpen, windowEndTime, onClose]);

  // 处理刷新位置
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshLocation();
    } catch (error) {
      console.error('刷新位置失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

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
          <div className='flex items-center justify-between'>
            <p className='text-sm text-red-800'>
              您当前不在上课地点附近
              {distance && distance > 0 && (
                <span className='ml-1 font-medium'>
                  （距离约 {Math.round(distance)}米）
                </span>
              )}
            </p>
            {distance && distance > 0 && (
              <button
                type='button'
                onClick={handleRefresh}
                disabled={isLoading || isRefreshing}
                className='ml-3 inline-flex items-center justify-center rounded-full bg-blue-50 p-2 text-blue-600 transition-all hover:scale-110 hover:bg-blue-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50'
                title='点击刷新位置'
              >
                <RefreshCw
                  className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>
            )}
          </div>
          <p className='mt-2 text-sm text-red-700'>
            请点击右侧的刷新图标重新获取位置，或选择以下操作：
          </p>
        </div>

        {/* 操作按钮 */}
        <div className='space-y-3'>
          {/* 图片签到确认提示 */}
          <div className='rounded-lg border border-yellow-300 bg-yellow-50 p-3'>
            <div className='mb-2 flex items-start gap-2'>
              <span className='text-yellow-600'>⚠️</span>
              <p className='text-xs text-yellow-800'>
                <strong>温馨提示：</strong>
                图片签到需要教师审批才能完成签到，提醒老师确认。
              </p>
            </div>
            <label className='flex cursor-pointer items-start gap-2'>
              <input
                type='checkbox'
                checked={isCheckboxChecked}
                onChange={(e) => setIsCheckboxChecked(e.target.checked)}
                disabled={isLoading || isRefreshing}
                className='mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50'
              />
              <span className='text-xs text-gray-700'>
                我已知晓并同意使用图片签到
              </span>
            </label>
          </div>

          {/* 图片签到按钮 */}
          <button
            type='button'
            onClick={onPhotoCheckin}
            disabled={isLoading || isRefreshing || !isCheckboxChecked}
            className='flex w-full items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'
            style={{
              borderColor: isCheckboxChecked ? '#2563eb' : '#d1d5db',
              backgroundColor: isCheckboxChecked ? '#ffffff' : '#f3f4f6',
              color: isCheckboxChecked ? '#2563eb' : '#9ca3af'
            }}
          >
            <Camera className='h-5 w-5' />
            <span>使用图片签到</span>
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
