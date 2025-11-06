import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ImagePreviewDialogProps {
  isOpen: boolean;
  imageUrl: string;
  originalSize: number;
  compressedSize: number;
  onConfirm: () => void;
  onClose: () => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 计算压缩率
 */
function calculateCompressionRate(
  original: number,
  compressed: number
): number {
  if (original === 0) return 0;
  return Math.round(((original - compressed) / original) * 100);
}

export function ImagePreviewDialog({
  isOpen,
  imageUrl,
  originalSize,
  compressedSize,
  onConfirm,
  onClose,
  isUploading = false,
  uploadProgress = 0
}: ImagePreviewDialogProps) {
  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const compressionRate = calculateCompressionRate(
    originalSize,
    compressedSize
  );

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4'>
      <div className='relative w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl'>
        {/* 头部 */}
        <div className='flex items-center justify-between border-b bg-white px-4 py-3'>
          <h3 className='text-lg font-semibold text-gray-900'>图片预览</h3>
          <button
            type='button'
            onClick={onClose}
            disabled={isUploading}
            className='rounded-lg p-1 transition-colors hover:bg-gray-100 disabled:opacity-50'
            aria-label='关闭'
          >
            <X className='h-5 w-5 text-gray-500' />
          </button>
        </div>

        {/* 图片预览区域 */}
        <div className='max-h-[60vh] overflow-auto bg-gray-50 p-4'>
          <img
            src={imageUrl}
            alt='预览'
            className='mx-auto max-h-[50vh] w-auto rounded-lg object-contain shadow-md'
          />
        </div>

        {/* 文件信息 */}
        <div className='border-t bg-gray-50 px-4 py-3'>
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div>
              <span className='text-gray-600'>原始大小：</span>
              <span className='font-medium text-gray-900'>
                {formatFileSize(originalSize)}
              </span>
            </div>
            <div>
              <span className='text-gray-600'>压缩后：</span>
              <span className='font-medium text-gray-900'>
                {formatFileSize(compressedSize)}
              </span>
            </div>
            <div className='col-span-2'>
              <span className='text-gray-600'>压缩率：</span>
              <span className='font-medium text-green-600'>
                {compressionRate}%
              </span>
              <span className='ml-2 text-xs text-gray-500'>
                (节省 {formatFileSize(originalSize - compressedSize)})
              </span>
            </div>
          </div>
        </div>

        {/* 上传进度条 */}
        {isUploading && (
          <div className='border-t bg-white px-4 py-3'>
            <div className='mb-2 flex items-center justify-between text-sm'>
              <span className='text-gray-600'>上传进度</span>
              <span className='font-medium text-blue-600'>
                {uploadProgress}%
              </span>
            </div>
            <div className='h-2 w-full overflow-hidden rounded-full bg-gray-200'>
              <div
                className='h-full bg-blue-600 transition-all duration-300'
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className='border-t bg-white px-4 py-4'>
          <button
            type='button'
            onClick={onConfirm}
            disabled={isUploading}
            className='w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300'
          >
            {isUploading ? (
              <span className='flex items-center justify-center gap-2'>
                <svg
                  className='h-5 w-5 animate-spin'
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
                上传中 {uploadProgress}%
              </span>
            ) : (
              '确认上传'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
