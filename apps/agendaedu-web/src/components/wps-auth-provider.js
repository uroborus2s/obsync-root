import { WpsAuthContext } from '@/contexts/wps-auth-context';
import { useWpsAuth } from '@/hooks/use-wps-auth';
export function WpsAuthProvider({ children }) {
    const auth = useWpsAuth();
    return (<WpsAuthContext.Provider value={auth}>
      {children}
      {/* 不再需要全局二维码登录弹窗，因为已在AuthenticatedLayout中处理 */}
    </WpsAuthContext.Provider>);
}
//# sourceMappingURL=wps-auth-provider.js.map