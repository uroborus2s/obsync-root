import { type WpsUserInfo } from '@/lib/auth-manager';
export interface UseWpsAuthReturn {
    isAuthenticated: boolean;
    user: WpsUserInfo | null;
    isLoading: boolean;
    showQrLogin: boolean;
    openQrLogin: () => void;
    closeQrLogin: () => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
}
export declare function useWpsAuth(): UseWpsAuthReturn;
//# sourceMappingURL=use-wps-auth.d.ts.map