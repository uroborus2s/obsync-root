import { AlertCircle, X } from 'lucide-react';

interface VerificationConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

/**
 * 验签确认对话框组件
 * 用于教师点击验签按钮后的二次确认
 */
export default function VerificationConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting
}: VerificationConfirmDialogProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* 背景遮罩 */}
      <div
        className='absolute inset-0 bg-black bg-opacity-50'
        onClick={handleClose}
      />

      {/* 弹窗内容 */}
      <div className='relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl'>
        {/* 标题栏 */}
        <div className='mb-4 flex items-center justify-between'>
          <div className='flex items-center'>
            <AlertCircle className='mr-2 h-6 w-6 text-orange-500' />
            <h2 className='text-xl font-semibold text-gray-900'>
              验签(非补签，补签打卡在签到情况里补打)
            </h2>
          </div>
          <button
            type='button'
            onClick={handleClose}
            disabled={isSubmitting}
            className='rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50'
            aria-label='关闭'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* 提示内容 */}
        <div className='mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4'>
          <div className='space-y-3 text-sm text-gray-700'>
            <p className='font-medium text-orange-800'>
              <strong>注意:</strong>{' '}
              本功能是用来课中(上课十分钟后到课程结束)验证学生是否旷课。
            </p>
            <p>
              点<strong>【确认】</strong>
              后，学生需在2分钟内再次签到，未签到者视为旷课。
            </p>
            <p>开启本功能前，请告知学生准备好，2分钟后签到自动结束。</p>
            <p>
              点<strong>【取消】</strong>不开启验签。
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className='flex space-x-3'>
          <button
            type='button'
            onClick={handleClose}
            disabled={isSubmitting}
            className='flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
          >
            取消
          </button>
          <button
            type='button'
            onClick={handleConfirm}
            disabled={isSubmitting}
            className='flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {isSubmitting ? (
              <span className='flex items-center justify-center'>
                <svg
                  className='mr-2 h-4 w-4 animate-spin'
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'
                  />
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  />
                </svg>
                开启中...
              </span>
            ) : (
              '确认'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
