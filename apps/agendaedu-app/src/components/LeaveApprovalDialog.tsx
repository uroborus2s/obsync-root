import { icaLinkApiClient } from '@/lib/icalink-api-client';
import {
  AlertCircle,
  Calendar,
  FileText,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface LeaveApplication {
  attendance_record_id: number;
  student_name: string;
  student_id: string;
  class_name: string;
  major_name: string;
  course_id: number;
  application_id: number;
  leave_type: string;
  leave_reason: string;
  application_time: string;
  approval_comment?: string;
  approver_id: string;
  approver_name: string;
  approval_result: string;
  leave_approval_id: number;
  attachments: LeaveAttachment[];
}

interface LeaveAttachment {
  id: number;
  image_name: string;
  image_size: number;
  metadata: string;
}

interface LeaveApprovalDialogProps {
  isOpen: boolean;
  studentId: string;
  courseId: number;
  onClose: () => void;
  onApprove: (approvalId: number, comment?: string) => Promise<void>;
  onReject: (approvalId: number, comment: string) => Promise<void>;
  onFetchApplication: (
    studentId: string,
    courseId: string
  ) => Promise<LeaveApplication | null>;
  isSubmitting: boolean;
}

// 请假类型映射
const LEAVE_TYPE_MAP: Record<string, string> = {
  sick: '病假',
  personal: '事假',
  emergency: '紧急事假',
  other: '其他'
};

export default function LeaveApprovalDialog({
  isOpen,
  studentId,
  courseId,
  onClose,
  onApprove,
  onReject,
  onFetchApplication,
  isSubmitting
}: LeaveApprovalDialogProps) {
  const [application, setApplication] = useState<LeaveApplication | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // 加载请假申请数据
  useEffect(() => {
    if (isOpen && studentId && courseId) {
      loadApplicationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, studentId, courseId]);

  const loadApplicationData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 获取请假申请详情
      const app = await onFetchApplication(studentId, String(courseId));

      if (!app) {
        setError('未找到待审批的请假申请');
        return;
      }

      setApplication(app);
    } catch (err) {
      console.error('加载请假申请失败:', err);
      setError(err instanceof Error ? err.message : '加载失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setApplication(null);
      setError(null);
      setShowRejectInput(false);
      setRejectComment('');
      setSelectedImage(null);
      setImageError(null);
      onClose();
    }
  };

  const handleApprove = async () => {
    if (!application) return;

    try {
      await onApprove(application.attendance_record_id);
      handleClose();
    } catch (err) {
      console.error('审批失败:', err);
    }
  };

  const handleRejectClick = () => {
    setShowRejectInput(true);
  };

  const handleRejectConfirm = async () => {
    if (!application || !rejectComment.trim()) return;

    try {
      await onReject(application.attendance_record_id, rejectComment);
      handleClose();
    } catch (err) {
      console.error('拒绝失败:', err);
    }
  };

  const handleRejectCancel = () => {
    setShowRejectInput(false);
    setRejectComment('');
  };

  // 查看附件图片
  const handleViewAttachment = async (attachmentId: number) => {
    setImageLoading(true);
    setImageError(null);

    try {
      // 调用查看附件接口
      const response = await icaLinkApiClient.getBlob(
        `/icalink/v1/attendance/attachments/${attachmentId}/image`
      );

      if (response.success && response.data) {
        // 将 Blob 转换为 URL
        const imageUrl = URL.createObjectURL(response.data);
        setSelectedImage(imageUrl);
      } else {
        throw new Error(response.message || '加载图片失败');
      }
    } catch (err) {
      console.error('加载附件图片失败:', err);
      setImageError(err instanceof Error ? err.message : '加载图片失败');
    } finally {
      setImageLoading(false);
    }
  };

  // 截断文件名
  const truncateFileName = (
    fileName: string,
    maxLength: number = 8
  ): string => {
    if (fileName.length <= maxLength) {
      return fileName;
    }
    return fileName.substring(0, maxLength) + '...';
  };

  // 获取请假类型的中文显示
  const getLeaveTypeLabel = (leaveType: string): string => {
    return LEAVE_TYPE_MAP[leaveType] || leaveType;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* 背景遮罩 */}
      <div
        className='absolute inset-0 bg-black bg-opacity-50'
        onClick={handleClose}
      />

      {/* 弹窗内容 */}
      <div className='relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl'>
        {/* 标题栏 */}
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-xl font-semibold text-gray-900'>请假审批</h2>
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

        {/* 加载状态 */}
        {isLoading && (
          <div className='flex items-center justify-center py-12'>
            <div className='text-center'>
              <div className='mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500'></div>
              <p className='text-gray-600'>加载中...</p>
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {error && !isLoading && (
          <div className='rounded-lg bg-red-50 p-4'>
            <div className='flex items-start'>
              <AlertCircle className='mr-3 h-5 w-5 flex-shrink-0 text-red-500' />
              <div className='flex-1'>
                <p className='text-sm text-red-800'>{error}</p>
                <button
                  type='button'
                  onClick={loadApplicationData}
                  className='mt-2 text-sm font-medium text-red-600 hover:text-red-700'
                >
                  重试
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 请假申请详情 */}
        {application && !isLoading && !error && (
          <>
            {/* 学生信息 */}
            <div className='mb-4 rounded-lg bg-gray-50 p-4'>
              <div className='mb-2 flex items-center justify-between'>
                <span className='text-sm text-gray-600'>学生姓名</span>
                <span className='font-medium text-gray-900'>
                  {application.student_name}
                </span>
              </div>
              <div className='mb-2 flex items-center justify-between'>
                <span className='text-sm text-gray-600'>学号</span>
                <span className='font-medium text-gray-900'>
                  {application.student_id}
                </span>
              </div>
              <div className='mb-2 flex items-center justify-between'>
                <span className='text-sm text-gray-600'>班级</span>
                <span className='font-medium text-gray-900'>
                  {application.class_name || '-'}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600'>专业</span>
                <span className='font-medium text-gray-900'>
                  {application.major_name || '-'}
                </span>
              </div>
            </div>

            {/* 请假信息 */}
            <div className='mb-4 space-y-3'>
              <div className='flex items-start'>
                <Calendar className='mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500' />
                <div className='flex-1'>
                  <p className='text-sm font-medium text-gray-700'>请假类型</p>
                  <p className='mt-1 text-sm text-gray-900'>
                    {getLeaveTypeLabel(application.leave_type)}
                  </p>
                </div>
              </div>

              <div className='flex items-start'>
                <FileText className='mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500' />
                <div className='flex-1'>
                  <p className='text-sm font-medium text-gray-700'>请假原因</p>
                  <p className='mt-1 text-sm text-gray-900'>
                    {application.leave_reason}
                  </p>
                </div>
              </div>

              <div className='flex items-start'>
                <AlertCircle className='mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500' />
                <div className='flex-1'>
                  <p className='text-sm font-medium text-gray-700'>申请时间</p>
                  <p className='mt-1 text-sm text-gray-900'>
                    {formatDateTime(application.application_time)}
                  </p>
                </div>
              </div>
            </div>

            {/* 附件列表 */}
            {application.attachments && application.attachments.length > 0 ? (
              <div className='mb-4'>
                <div className='mb-2 flex items-center'>
                  <ImageIcon className='mr-2 h-5 w-5 text-blue-500' />
                  <p className='text-sm font-medium text-gray-700'>
                    附件 ({application.attachments.length})
                  </p>
                </div>
                <div className='space-y-2'>
                  {application.attachments.map((att) => (
                    <div
                      key={att.id}
                      className='flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50'
                      onClick={() => handleViewAttachment(att.id)}
                    >
                      <div className='flex items-center space-x-2'>
                        <ImageIcon className='h-4 w-4 text-gray-400' />
                        <span className='text-sm text-gray-700'>
                          {truncateFileName(att.image_name)}
                        </span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <span className='text-xs text-gray-500'>
                          {formatFileSize(att.image_size)}
                        </span>
                        <span className='text-lg'>👀</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className='mb-4 rounded-lg bg-gray-50 p-4 text-center'>
                <ImageIcon className='mx-auto mb-2 h-8 w-8 text-gray-400' />
                <p className='text-sm text-gray-500'>暂无附件</p>
              </div>
            )}

            {/* 拒绝理由输入框 */}
            {showRejectInput && (
              <div className='mb-4 rounded-lg bg-red-50 p-4'>
                <label
                  htmlFor='reject-comment'
                  className='mb-2 block text-sm font-medium text-gray-700'
                >
                  拒绝理由 <span className='text-red-500'>*</span>
                </label>
                <textarea
                  id='reject-comment'
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:bg-gray-100'
                  placeholder='请输入拒绝理由'
                />
              </div>
            )}

            {/* 操作按钮 */}
            <div className='flex space-x-3'>
              {!showRejectInput ? (
                <>
                  <button
                    type='button'
                    onClick={handleRejectClick}
                    disabled={isSubmitting}
                    className='flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    拒绝
                  </button>
                  <button
                    type='button'
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className='flex-1 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    {isSubmitting ? '审批中...' : '同意'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type='button'
                    onClick={handleRejectCancel}
                    disabled={isSubmitting}
                    className='flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    返回
                  </button>
                  <button
                    type='button'
                    onClick={handleRejectConfirm}
                    disabled={isSubmitting || !rejectComment.trim()}
                    className='flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    {isSubmitting ? '提交中...' : '确认拒绝'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* 图片预览弹窗 */}
      {(selectedImage || imageLoading || imageError) && (
        <div
          className='fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90'
          onClick={() => {
            setSelectedImage(null);
            setImageError(null);
          }}
        >
          {/* 加载状态 */}
          {imageLoading && (
            <div className='text-center'>
              <div className='mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-white'></div>
              <p className='text-white'>加载中...</p>
            </div>
          )}

          {/* 错误状态 */}
          {imageError && !imageLoading && (
            <div className='rounded-lg bg-white p-6 text-center'>
              <AlertCircle className='mx-auto mb-4 h-12 w-12 text-red-500' />
              <p className='mb-4 text-gray-800'>{imageError}</p>
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  setImageError(null);
                  setSelectedImage(null);
                }}
                className='rounded-lg bg-gray-800 px-4 py-2 text-white transition-colors hover:bg-gray-700'
              >
                关闭
              </button>
            </div>
          )}

          {/* 图片显示 */}
          {selectedImage && !imageLoading && !imageError && (
            <>
              <img
                src={selectedImage}
                alt='预览'
                className='max-h-[90vh] max-w-[90vw] object-contain'
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type='button'
                onClick={() => {
                  setSelectedImage(null);
                  // 释放 Blob URL
                  if (selectedImage.startsWith('blob:')) {
                    URL.revokeObjectURL(selectedImage);
                  }
                }}
                className='absolute right-4 top-4 rounded-lg bg-white p-2 text-gray-800 transition-colors hover:bg-gray-200'
                aria-label='关闭预览'
              >
                <X className='h-6 w-6' />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
