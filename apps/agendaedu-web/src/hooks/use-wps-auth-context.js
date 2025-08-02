import { useContext } from 'react';
import { WpsAuthContext } from '@/contexts/wps-auth-context';
/**
 * 使用WPS认证Hook
 * 必须在WpsAuthProvider内部使用
 */
export function useWpsAuthContext() {
    const context = useContext(WpsAuthContext);
    if (!context) {
        throw new Error('useWpsAuthContext must be used within WpsAuthProvider');
    }
    return context;
}
//# sourceMappingURL=use-wps-auth-context.js.map