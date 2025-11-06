import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Camera, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

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

  // 格式化签到时间
  const formatCheckinTime = (time?: string | Date | null) => {
    if (!time) return '未知';
    const date = new Date(time);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // 判断位置偏移距离是否超过阈值
  const isOffsetExcessive = (distance?: number) => {
    if (!distance) return false;
    return distance > 100; // 超过100米视为异常
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl'>
        <DialogTitle className='text-xl font-semibold text-gray-900'>
          照片签到审核
        </DialogTitle>

        <div className='space-y-6'>
          {/* 学生信息 */}
          <div className='rounded-lg bg-gray-50 p-4'>
            <h3 className='mb-3 text-sm font-medium text-gray-700'>学生信息</h3>
            <div className='grid grid-cols-2 gap-3 text-sm'>
              <div>
                <span className='text-gray-500'>姓名：</span>
                <span className='font-medium text-gray-900'>
                  {student.student_name || '未知'}
                </span>
              </div>
              <div>
                <span className='text-gray-500'>学号：</span>
                <span className='font-medium text-gray-900'>
                  {student.student_id}
                </span>
              </div>
              <div className='col-span-2'>
                <span className='text-gray-500'>班级：</span>
                <span className='font-medium text-gray-900'>
                  {student.class_name || '未知'}
                </span>
              </div>
            </div>
          </div>

          {/* 照片展示 */}
          <div className='rounded-lg bg-gray-50 p-4'>
            <h3 className='mb-3 flex items-center text-sm font-medium text-gray-700'>
              <Camera className='mr-2 h-4 w-4' />
              签到照片
            </h3>
            <div className='relative overflow-hidden rounded-lg bg-white'>
              {imageLoading && !imageError && (
                <div className='flex h-96 items-center justify-center'>
                  <div className='text-center'>
                    <div className='mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500'></div>
                    <p className='text-sm text-gray-500'>加载照片中...</p>
                  </div>
                </div>
              )}
              {imageError ? (
                <div className='flex h-96 items-center justify-center bg-gray-100'>
                  <div className='text-center'>
                    <AlertTriangle className='mx-auto mb-2 h-12 w-12 text-gray-400' />
                    <p className='text-sm text-gray-500'>照片加载失败</p>
                  </div>
                </div>
              ) : (
                <img
                  src={student.metadata?.photo_url}
                  alt='签到照片'
                  className={`w-full object-contain ${imageLoading ? 'hidden' : ''}`}
                  style={{ maxHeight: '400px' }}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
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
                <span
                  className={`font-medium ${
                    isOffsetExcessive(student.metadata?.location_offset_distance)
                      ? 'text-red-600'
                      : 'text-gray-900'
                  }`}
                >
                  {student.metadata?.location_offset_distance !== undefined
                    ? `${student.metadata.location_offset_distance.toFixed(1)} 米`
                    : '未知'}
                </span>
                {isOffsetExcessive(student.metadata?.location_offset_distance) && (
                  <span className='ml-2 text-xs text-red-500'>
                    (超过100米)
                  </span>
                )}
              </div>
              {student.checkin_latitude && student.checkin_longitude && (
                <div className='text-xs text-gray-500'>
                  坐标：{student.checkin_latitude.toFixed(6)},{' '}
                  {student.checkin_longitude.toFixed(6)}
                  {student.checkin_accuracy && (
                    <span className='ml-2'>
                      (精度: {student.checkin_accuracy.toFixed(1)}米)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 签到时间 */}
          <div className='rounded-lg bg-gray-50 p-4'>
            <h3 className='mb-3 flex items-center text-sm font-medium text-gray-700'>
              <Clock className='mr-2 h-4 w-4' />
              签到时间
            </h3>
            <div className='text-sm'>
              <span className='font-medium text-gray-900'>
                {formatCheckinTime(student.checkin_time)}
              </span>
            </div>
          </div>

          {/* 备注信息 */}
          {student.metadata?.reason && (
            <div className='rounded-lg bg-gray-50 p-4'>
              <h3 className='mb-3 text-sm font-medium text-gray-700'>备注</h3>
              <div className='text-sm text-gray-900'>
                {student.metadata.reason}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className='flex justify-end space-x-3 border-t pt-4'>
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
              {isSubmitting ? '审批中...' : '批准'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

