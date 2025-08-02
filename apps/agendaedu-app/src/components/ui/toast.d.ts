import * as React from 'react';
interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    description?: string;
    duration?: number;
}
interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}
export declare const ToastProvider: ({ children }: {
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const useToastContext: () => ToastContextType;
export declare const Toaster: () => React.JSX.Element;
export {};
//# sourceMappingURL=toast.d.ts.map