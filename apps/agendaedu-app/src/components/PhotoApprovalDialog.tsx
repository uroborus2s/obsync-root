import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { icaLinkApiClient } from '@/lib/icalink-api-client';
import { AlertTriangle, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StudentAttendanceDetail {
  student_id: string;
  student_name: string | null;
  class_name: string | null;
  major_name: string | null;
  absence_type: string;
  checkin_time?: string | Date | null;
  attendance_record_id?: number | null;
  checkin_location?: string | null;
  checkin_latitude?: number | null;
  checkin_longitude?: number | null;
  checkin_accuracy?: number | null;
  metadata?: {
    photo_url?: string;
    location_offset_distance?: number;
    reason?: string;
  } | null;
}

interface PhotoApprovalDialogProps {
  isOpen: boolean;
  student: StudentAttendanceDetail;
  onClose: () => void;
  onApprove: () => Promise<void>;
  isSubmitting: boolean;
}

export default function PhotoApprovalDialog({
  isOpen,
  student,
  onClose,
  onApprove,
  isSubmitting
}: PhotoApprovalDialogProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  console.log('学生信息:', student);
  console.log('photo_url:', student.metadata?.photo_url);

  // 当对话框打开时，加载图片
  useEffect(() => {
    const loadImage = async () => {
      // 如果没有图片URL，直接返回
      if (!student.metadata?.photo_url) {
        console.log('❌ 没有图片URL');
        setImageLoading(false);
        setImageError(true);
        return;
      }

      console.log('🔄 开始加载图片:', student.metadata.photo_url);
      setImageLoading(true);
      setImageError(false);

      try {
        // 使用 icaLinkApiClient.getBlob 方法获取图片
        // 参考 LeaveApprovalDialog.tsx 的实现
        const response = await icaLinkApiClient.getBlob(
          `/icalink/v1/oss/view/${student.metadata.photo_url}`
        );

        console.log('📥 图片请求响应:', response);

        if (response.success && response.data) {
          // 将 Blob 转换为 URL
          const url = URL.createObjectURL(response.data);
          console.log('✅ 成功创建 Blob URL:', url);
          setBlobUrl(url);
          setImageError(false);
        } else {
          console.error('❌ 加载图片失败:', response.message);
          setImageError(true);
        }
      } catch (error) {
        console.error('❌ 加载图片异常:', error);
        setImageError(true);
      } finally {
        setImageLoading(false);
      }
    };

    if (isOpen) {
      console.log('📂 对话框打开，准备加载图片');
      loadImage();
    }

    // 清理函数：释放 Blob URL
    return () => {
      if (blobUrl) {
        console.log('🗑️ 释放 Blob URL:', blobUrl);
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
    };
  }, [isOpen, student.metadata?.photo_url]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl'>
        <DialogTitle className='text-xl font-semibold text-gray-900'>
          照片签到审核
        </DialogTitle>

        <div className='space-y-4'>
          {/* 照片展示 */}
          <div className='rounded-lg bg-gray-50 p-4'>
            <h3 className='mb-3 text-sm font-medium text-gray-700'>签到照片</h3>
            <div className='relative overflow-hidden rounded-lg bg-white'>
              {imageLoading ? (
                <div className='flex h-96 items-center justify-center'>
                  <div className='text-center'>
                    <div className='mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500'></div>
                    <p className='text-sm text-gray-500'>加载照片中...</p>
                  </div>
                </div>
              ) : imageError || !blobUrl ? (
                <div className='flex h-96 items-center justify-center bg-gray-100'>
                  <div className='text-center'>
                    <AlertTriangle className='mx-auto mb-2 h-12 w-12 text-gray-400' />
                    <p className='text-sm text-gray-500'>
                      {!student.metadata?.photo_url
                        ? '暂无签到照片'
                        : '照片加载失败'}
                    </p>
                  </div>
                </div>
              ) : (
                <img
                  src={blobUrl}
                  alt='签到照片'
                  className='w-full object-contain'
                  style={{ maxHeight: '400px' }}
                />
              )}
            </div>
          </div>

          {/* 位置信息 */}
          <div className='rounded-lg bg-gray-50 p-4'>
            <h3 className='mb-3 flex items-center text-sm font-medium text-gray-700'>
              <MapPin className='mr-2 h-4 w-4' />
              位置信息
            </h3>
            <div className='space-y-2 text-sm'>
              <div>
                <span className='text-gray-500'>签到位置：</span>
                <span className='font-medium text-gray-900'>
                  {student.checkin_location || '未知'}
                </span>
              </div>
              <div>
                <span className='text-gray-500'>位置偏移距离：</span>
                <span className='font-medium text-red-600'>
                  {student.metadata?.location_offset_distance !== undefined
                    ? `${student.metadata.location_offset_distance.toFixed(1)} 米`
                    : '未知'}
                </span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className='grid grid-cols-2 gap-3 border-t pt-4'>
            <button
              type='button'
              onClick={onClose}
              disabled={isSubmitting}
              className='rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
            >
              取消
            </button>
            <button
              type='button'
              onClick={onApprove}
              disabled={isSubmitting || imageError}
              className='rounded-md bg-[#07C160] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#06AD56] active:bg-[#059048] disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isSubmitting ? '审批中...' : '确认'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
