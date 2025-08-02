interface ToastOptions {
    description?: string;
    duration?: number;
}
export declare const useToast: () => {
    toast: {
        success: (message: string, options?: ToastOptions) => void;
        error: (message: string, options?: ToastOptions) => void;
        info: (message: string, options?: ToastOptions) => void;
        warning: (message: string, options?: ToastOptions) => void;
    };
};
export {};
//# sourceMappingURL=use-toast.d.ts.map