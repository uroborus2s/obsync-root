/**
 * WPS授权管理器
 * 处理用户授权流程和token管理
 */
export class WpsAuthManager {
    config;
    tokens = null;
    refreshPromise = null;
    constructor(config) {
        this.config = {
            baseUrl: 'https://openapi.wps.cn',
            authUrl: 'https://openapi.wps.cn/oauth2/auth',
            tokenUrl: '/oauthapi/v3/user/token',
            ...config
        };
        // 从localStorage恢复token
        this.loadTokensFromStorage();
    }
    /**
     * 检查是否已授权
     */
    isAuthenticated() {
        return this.tokens !== null && !this.isTokenExpired();
    }
    /**
     * 检查token是否过期
     */
    isTokenExpired() {
        if (!this.tokens)
            return true;
        return Date.now() >= this.tokens.expiresAt;
    }
    /**
     * 检查token是否即将过期（5分钟内）
     */
    isTokenExpiringSoon() {
        if (!this.tokens)
            return true;
        return Date.now() >= this.tokens.expiresAt - 5 * 60 * 1000;
    }
    /**
     * 获取有效的访问token
     */
    async getAccessToken() {
        if (!this.tokens)
            return null;
        // 如果token即将过期，尝试刷新
        if (this.isTokenExpiringSoon()) {
            try {
                await this.refreshAccessToken();
            }
            catch (error) {
                console.error('刷新token失败:', error);
                this.clearTokens();
                return null;
            }
        }
        return this.tokens?.accessToken || null;
    }
    /**
     * 构造授权URL
     */
    getAuthUrl(state) {
        // 使用固定的授权URL和参数
        const randomState = Math.random().toString(36).substring(2, 15);
        // 根据user_agent判断是否需要user_info权限
        const userAgent = navigator.userAgent;
        const isMobile = /Mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|android-woa|iPhone-woa/i.test(userAgent);
        if (isMobile) {
            const params = new URLSearchParams({
                response_type: 'code',
                appid: 'AK20250614WBSGPX',
                redirect_uri: 'https://chat.whzhsc.cn/api/auth/authorization',
                scope: 'user_info',
                state: btoa(`${state}||type=mobile`) || randomState
            });
            return `https://openapi.wps.cn/oauthapi/v2/authorize?${params.toString()}`;
        }
        else {
            const params = new URLSearchParams({
                response_type: 'code',
                client_id: 'AK20250614WBSGPX',
                redirect_uri: 'https://chat.whzhsc.cn/api/auth/authorization',
                scope: 'kso.user_base.read',
                state: btoa(`${state}||type=web`) || randomState
            });
            console.log('params', params.toString());
            return `https://openapi.wps.cn/oauth2/auth?${params.toString()}`;
        }
    }
    /**
     * 跳转到授权页面
     */
    redirectToAuth(state) {
        const authUrl = this.getAuthUrl(state);
        console.log('authUrl', authUrl);
        window.location.href = authUrl;
    }
    /**
     * 处理授权回调
     */
    async handleAuthCallback(code) {
        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.tokenUrl}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code,
                    client_id: this.config.clientId,
                    redirect_uri: this.config.redirectUri
                })
            });
            if (!response.ok) {
                throw new Error(`获取token失败: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            if (data.code !== 0) {
                throw new Error(`获取token失败: ${data.msg || '未知错误'}`);
            }
            const tokens = {
                accessToken: data.data.access_token,
                refreshToken: data.data.refresh_token,
                expiresIn: data.data.expires_in,
                expiresAt: Date.now() + data.data.expires_in * 1000
            };
            this.setTokens(tokens);
            return tokens;
        }
        catch (error) {
            console.error('处理授权回调失败:', error);
            throw error;
        }
    }
    /**
     * 刷新访问token
     */
    async refreshAccessToken() {
        if (!this.tokens?.refreshToken) {
            throw new Error('没有refresh token');
        }
        // 防止并发刷新
        if (this.refreshPromise) {
            return this.refreshPromise;
        }
        this.refreshPromise = this.doRefreshToken();
        try {
            const tokens = await this.refreshPromise;
            return tokens;
        }
        finally {
            this.refreshPromise = null;
        }
    }
    /**
     * 执行token刷新
     */
    async doRefreshToken() {
        try {
            const response = await fetch(`${this.config.baseUrl}/oauthapi/v3/user/token/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh_token: this.tokens.refreshToken
                })
            });
            if (!response.ok) {
                throw new Error(`刷新token失败: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            if (data.code !== 0) {
                throw new Error(`刷新token失败: ${data.msg || '未知错误'}`);
            }
            const tokens = {
                accessToken: data.data.access_token,
                refreshToken: data.data.refresh_token,
                expiresIn: data.data.expires_in,
                expiresAt: Date.now() + data.data.expires_in * 1000
            };
            this.setTokens(tokens);
            return tokens;
        }
        catch (error) {
            console.error('刷新token失败:', error);
            this.clearTokens();
            throw error;
        }
    }
    /**
     * 设置tokens
     */
    setTokens(tokens) {
        this.tokens = tokens;
        this.saveTokensToStorage();
    }
    /**
     * 清除tokens
     */
    clearTokens() {
        this.tokens = null;
        localStorage.removeItem('wps_auth_tokens');
    }
    /**
     * 从localStorage加载tokens
     */
    loadTokensFromStorage() {
        try {
            const stored = localStorage.getItem('wps_auth_tokens');
            if (stored) {
                const tokens = JSON.parse(stored);
                // 检查是否过期
                if (Date.now() < tokens.expiresAt) {
                    this.tokens = tokens;
                }
                else {
                    localStorage.removeItem('wps_auth_tokens');
                }
            }
        }
        catch (error) {
            console.error('加载tokens失败:', error);
            localStorage.removeItem('wps_auth_tokens');
        }
    }
    /**
     * 保存tokens到localStorage
     */
    saveTokensToStorage() {
        if (this.tokens) {
            try {
                localStorage.setItem('wps_auth_tokens', JSON.stringify(this.tokens));
            }
            catch (error) {
                console.error('保存tokens失败:', error);
            }
        }
    }
    /**
     * 登出
     */
    logout() {
        this.clearTokens();
    }
}
// 创建全局授权管理器实例
export const authManager = new WpsAuthManager({
    clientId: import.meta.env.VITE_WPS_CLIENT_ID || '',
    redirectUri: import.meta.env.VITE_WPS_REDIRECT_URI ||
        `${window.location.origin}/app/auth/callback`,
    scope: 'user:read,drive:read,drive:write'
});
//# sourceMappingURL=auth-manager.js.map