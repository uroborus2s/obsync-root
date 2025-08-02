import { useToastContext } from '@/components/ui/toast';
export const useToast = () => {
    const { addToast } = useToastContext();
    return {
        toast: {
            success: (message, options) => {
                addToast({
                    type: 'success',
                    title: message,
                    description: options?.description,
                    duration: options?.duration || 3000
                });
            },
            error: (message, options) => {
                addToast({
                    type: 'error',
                    title: message,
                    description: options?.description,
                    duration: options?.duration || 4000
                });
            },
            info: (message, options) => {
                addToast({
                    type: 'info',
                    title: message,
                    description: options?.description,
                    duration: options?.duration || 3000
                });
            },
            warning: (message, options) => {
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
//# sourceMappingURL=use-toast.js.map