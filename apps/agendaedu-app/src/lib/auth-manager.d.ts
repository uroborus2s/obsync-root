/**
 * WPS授权管理器
 * 处理用户授权流程和token管理
 */
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
export declare class WpsAuthManager {
    private config;
    private tokens;
    private refreshPromise;
    constructor(config: WpsAuthConfig);
    /**
     * 检查是否已授权
     */
    isAuthenticated(): boolean;
    /**
     * 检查token是否过期
     */
    private isTokenExpired;
    /**
     * 检查token是否即将过期（5分钟内）
     */
    private isTokenExpiringSoon;
    /**
     * 获取有效的访问token
     */
    getAccessToken(): Promise<string | null>;
    /**
     * 构造授权URL
     */
    getAuthUrl(state?: string): string;
    /**
     * 跳转到授权页面
     */
    redirectToAuth(state?: string): void;
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
     * 登出
     */
    logout(): void;
}
export declare const authManager: WpsAuthManager;
//# sourceMappingURL=auth-manager.d.ts.map