import React from 'react';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  isLoading = false,
  variant = 'warning'
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: '⚠️',
      confirmButton: 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
    },
    warning: {
      icon: '⚠️',
      confirmButton: 'bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300'
    },
    info: {
      icon: 'ℹ️',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
    }
  };

  const currentVariant = variantStyles[variant];

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4'>
      <div className='relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl'>
        {/* 关闭按钮 */}
        <button
          type='button'
          onClick={onClose}
          disabled={isLoading}
          className='absolute right-4 top-4 text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-50'
          aria-label='关闭'
        >
          <X className='h-5 w-5' />
        </button>

        {/* 标题 */}
        <div className='mb-4 flex items-center gap-3'>
          <span className='text-3xl'>{currentVariant.icon}</span>
          <h2 className='text-xl font-bold text-gray-900'>{title}</h2>
        </div>

        {/* 消息内容 */}
        <p className='mb-6 text-gray-600'>{message}</p>

        {/* 操作按钮 */}
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={onClose}
            disabled={isLoading}
            className='flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50'
          >
            {cancelText}
          </button>
          <button
            type='button'
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-lg px-4 py-2.5 font-medium text-white transition-colors ${currentVariant.confirmButton}`}
          >
            {isLoading ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

