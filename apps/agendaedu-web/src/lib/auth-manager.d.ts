/**
 * WPS授权管理器 - Web端
 * 处理WPS OAuth认证流程，包括直接跳转授权、token管理和自动刷新
 * 根据WPS开放平台文档实现: https://open-xz.wps.cn/pages/server/API-certificate/access-token/org-app/
 */
interface LoginSuccessData {
    code: string;
    userInfo?: {
        user_id: string;
        nickname: string;
        avatar?: string;
    };
    state: string;
}
export interface WpsAuthConfig {
    clientId: string;
    redirectUri: string;
    scope: string;
    baseUrl?: string;
    authUrl?: string;
    tokenUrl?: string;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    expiresAt: number;
}
export interface WpsUserInfo {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
}
export declare class WpsAuthManager {
    private config;
    private tokens;
    private refreshPromise;
    constructor(config: WpsAuthConfig);
    /**
     * 检查是否已认证
     */
    isAuthenticated(): boolean;
    /**
     * 检查token是否过期
     */
    private isTokenExpired;
    /**
     * 检查token是否即将过期（30分钟内）
     */
    private isTokenExpiringSoon;
    /**
     * 获取访问token
     */
    getAccessToken(): Promise<string | null>;
    /**
     * 构造授权URL - 根据WPS开放平台文档
     * https://open-xz.wps.cn/pages/server/API-certificate/access-token/org-app/
     */
    getAuthUrl(state?: string): string;
    /**
     * 直接跳转到WPS授权页面
     * 当API返回401时调用此方法
     */
    redirectToAuth(state?: string): void;
    /**
     * 获取用户信息
     */
    getUserInfo(): Promise<WpsUserInfo | null>;
    /**
     * 处理授权回调
     */
    handleAuthCallback(code: string): Promise<AuthTokens>;
    /**
     * 刷新访问token
     */
    refreshAccessToken(): Promise<AuthTokens>;
    /**
     * 执行token刷新
     */
    private doRefreshToken;
    /**
     * 设置tokens
     */
    private setTokens;
    /**
     * 清除tokens
     */
    clearTokens(): void;
    /**
     * 从localStorage加载tokens
     */
    private loadTokensFromStorage;
    /**
     * 保存tokens到localStorage
     */
    private saveTokensToStorage;
    /**
     * 处理SDK登录成功（保持向后兼容）
     */
    handleSDKLoginSuccess(data: LoginSuccessData): Promise<void>;
    /**
     * 初始化SDK监听（保持向后兼容）
     */
    initSDKListeners(): void;
    /**
     * 登出
     */
    logout(): void;
}
export declare const authManager: WpsAuthManager;
export {};
//# sourceMappingURL=auth-manager.d.ts.map