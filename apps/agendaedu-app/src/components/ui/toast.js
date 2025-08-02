import * as React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';
const ToastContext = createContext(undefined);
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((toast) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast = { ...toast, id };
        setToasts((prev) => [...prev, newToast]);
        // 自动移除toast
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, toast.duration || 3000);
    }, []);
    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);
    return (<ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>);
};
export const useToastContext = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToastContext must be used within ToastProvider');
    }
    return context;
};
const ToastComponent = ({ toast }) => {
    const { removeToast } = useToastContext();
    const getToastStyles = (type) => {
        switch (type) {
            case 'success':
                return 'bg-green-600 border-green-700 text-white';
            case 'error':
                return 'bg-red-600 border-red-700 text-white';
            case 'warning':
                return 'bg-yellow-500 border-yellow-600 text-gray-900';
            case 'info':
                return 'bg-blue-600 border-blue-700 text-white';
            default:
                return 'bg-gray-800 border-gray-700 text-white';
        }
    };
    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'warning':
                return '⚠';
            case 'info':
                return 'ℹ';
            default:
                return '';
        }
    };
    return (<div className={`animate-in slide-in-from-top-2 fixed left-1/2 top-4 z-50 min-w-80 max-w-md -translate-x-1/2 transform rounded-lg border p-4 shadow-lg duration-300 ${getToastStyles(toast.type)} `}>
      <div className='flex items-start gap-3'>
        <div className='text-lg font-semibold'>{getIcon(toast.type)}</div>
        <div className='flex-1'>
          <div className='text-sm font-semibold'>{toast.title}</div>
          {toast.description && (<div className='mt-1 text-sm opacity-90'>{toast.description}</div>)}
        </div>
        <button onClick={() => removeToast(toast.id)} className='text-lg leading-none opacity-70 transition-opacity hover:opacity-100'>
          ×
        </button>
      </div>
    </div>);
};
export const Toaster = () => {
    const { toasts } = useToastContext();
    return (<>
      {toasts.map((toast) => (<ToastComponent key={toast.id} toast={toast}/>))}
    </>);
};
//# sourceMappingURL=toast.js.map