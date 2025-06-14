import { useToastContext } from '@/components/ui/toast';

interface ToastOptions {
  description?: string;
  duration?: number;
}

export const useToast = () => {
  const { addToast } = useToastContext();

  return {
    toast: {
      success: (message: string, options?: ToastOptions) => {
        addToast({
          type: 'success',
          title: message,
          description: options?.description,
          duration: options?.duration || 3000
        });
      },
      error: (message: string, options?: ToastOptions) => {
        addToast({
          type: 'error',
          title: message,
          description: options?.description,
          duration: options?.duration || 4000
        });
      },
      info: (message: string, options?: ToastOptions) => {
        addToast({
          type: 'info',
          title: message,
          description: options?.description,
          duration: options?.duration || 3000
        });
      },
      warning: (message: string, options?: ToastOptions) => {
        addToast({
          type: 'warning',
          title: message,
          description: options?.description,
          duration: options?.duration || 3000
        });
      }
    }
  };
};
