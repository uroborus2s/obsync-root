import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useState } from 'react';

interface RejectReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  studentName: string;
  isLoading?: boolean;
}

export function RejectReasonDialog({
  isOpen,
  onClose,
  onConfirm,
  studentName,
  isLoading = false
}: RejectReasonDialogProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      return;
    }
    onConfirm(reason.trim());
    setReason('');
  };

  const handleCancel = () => {
    setReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className='mx-4 w-[95vw] max-w-[400px] sm:max-w-[425px]'>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>拒绝请假申请</DialogTitle>
            <DialogDescription>
              请输入拒绝 {studentName} 请假申请的理由
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <label htmlFor='reason' className='text-sm font-medium'>
                拒绝理由 <span className='text-red-500'>*</span>
              </label>
              <textarea
                id='reason'
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder='请输入拒绝理由...'
                className='min-h-[100px] w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <DialogFooter className='flex-col gap-2 sm:flex-row sm:gap-0'>
            <button
              type='button'
              onClick={handleCancel}
              disabled={isLoading}
              className='w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto'
            >
              取消
            </button>
            <button
              type='submit'
              disabled={isLoading || !reason.trim()}
              className='w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto'
            >
              {isLoading ? '处理中...' : '确认拒绝'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
