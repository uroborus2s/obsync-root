import { X } from 'lucide-react';
import { useState } from 'react';

interface StudentAttendanceDetail {
  student_id: string;
  student_name: string | null;
  class_name?: string | null;
  major_name?: string | null;
  absence_type: string;
}

interface ManualCheckinDialogProps {
  isOpen: boolean;
  student: StudentAttendanceDetail | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isSubmitting: boolean;
}

export default function ManualCheckinDialog({
  isOpen,
  student,
  onClose,
  onConfirm,
  isSubmitting
}: ManualCheckinDialogProps) {
  const [reason, setReason] = useState('教师补卡');

  if (!isOpen || !student) return null;

  const handleSubmit = async () => {
    await onConfirm(reason);
    setReason('教师补卡'); // 重置原因
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('教师补卡'); // 重置原因
      onClose();
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* 背景遮罩 */}
      <div
        className='absolute inset-0 bg-black bg-opacity-50'
        onClick={handleClose}
      />

      {/* 弹窗内容 */}
      <div className='relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl'>
        {/* 标题栏 */}
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-xl font-semibold text-gray-900'>学生补卡</h2>
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

        {/* 学生信息 */}
        <div className='mb-6 rounded-lg bg-gray-50 p-4'>
          <div className='mb-2 flex items-center justify-between'>
            <span className='text-sm text-gray-600'>学生姓名</span>
            <span className='font-medium text-gray-900'>
              {student.student_name || '未知'}
            </span>
          </div>
          <div className='mb-2 flex items-center justify-between'>
            <span className='text-sm text-gray-600'>学号</span>
            <span className='font-medium text-gray-900'>
              {student.student_id}
            </span>
          </div>
          {student.class_name && (
            <div className='mb-2 flex items-center justify-between'>
              <span className='text-sm text-gray-600'>班级</span>
              <span className='font-medium text-gray-900'>
                {student.class_name}
              </span>
            </div>
          )}
          {student.major_name && (
            <div className='flex items-center justify-between'>
              <span className='text-sm text-gray-600'>专业</span>
              <span className='font-medium text-gray-900'>
                {student.major_name}
              </span>
            </div>
          )}
        </div>

        {/* 补卡原因 */}
        <div className='mb-6'>
          <label
            htmlFor='reason'
            className='mb-2 block text-sm font-medium text-gray-700'
          >
            补卡原因
          </label>
          <textarea
            id='reason'
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isSubmitting}
            rows={3}
            className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100'
            placeholder='请输入补卡原因（可选）'
          />
          <p className='mt-1 text-xs text-gray-500'>
            补卡后，学生的考勤状态将变为"已签到"
          </p>
        </div>

        {/* 操作按钮 */}
        <div className='flex space-x-3'>
          <button
            type='button'
            onClick={handleClose}
            disabled={isSubmitting}
            className='flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
          >
            取消
          </button>
          <button
            type='button'
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            className='flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50'
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
                补卡中...
              </span>
            ) : (
              '确认补卡'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
