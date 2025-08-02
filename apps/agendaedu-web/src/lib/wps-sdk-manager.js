export class WPSSDKManager {
    config = {
        appId: 'AK20250614WBSGPX', // 使用实际的AppID
        scope: 'user_info',
        baseAuthUrl: 'https://openapi.wps.cn/oauthapi/v2/authorize',
    };
    /**
     * 根据当前环境获取重定向URI
     */
    getRedirectUri() {
        if (typeof window === 'undefined') {
            return 'https://chat.whzhsc.cn/api/auth/authorization';
        }
        const { protocol, hostname, port } = window.location;
        // 本地开发环境
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//${hostname}${port ? `:${port}` : ''}/auth/callback`;
        }
        // 生产环境
        return 'https://chat.whzhsc.cn/api/auth/authorization';
    }
    /**
     * 构建授权URL
     */
    buildAuthUrl(state) {
        const params = {
            appid: this.config.appId,
            response_type: 'code',
            redirect_uri: this.getRedirectUri(),
            scope: this.config.scope,
            login_type: 0, // 账号登录
            state: state || 'web_login',
        };
        const urlParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
                urlParams.append(key, value.toString());
            }
        });
        return `${this.config.baseAuthUrl}?${urlParams.toString()}`;
    }
    /**
     * 生成授权二维码
     */
    generateQrCode(state) {
        if (typeof window === 'undefined') {
            throw new Error('WPS SDK只能在浏览器环境中使用');
        }
        // 检查SDK是否可用
        if (!window.qrcode?.generateQrCode ||
            typeof window.qrcode.generateQrCode !== 'function') {
            throw new Error('WPS SDK未加载或API不可用，请检查CDN是否正确引入');
        }
        const authUrl = this.buildAuthUrl(state);
        const params = {
            app_id: this.config.appId,
            auth_url: authUrl,
        };
        // 开发环境下输出调试信息
        if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log('WPS SDK 调用参数:', params);
        }
        try {
            // 调用WPS官方SDK
            window.qrcode.generateQrCode(params);
            // 开发环境下输出调试信息
            if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.log('WPS SDK generateQrCode 调用成功');
            }
        }
        catch (error) {
            // 开发环境下输出错误信息
            if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.error('WPS SDK generateQrCode 调用失败:', error);
            }
            throw new Error(`WPS SDK调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 检查SDK是否可用
     */
    isSDKReady() {
        if (typeof window === 'undefined') {
            return false;
        }
        // 优先检查明确的加载状态
        if (window.WPS_SDK_LOADED === true) {
            return true;
        }
        // 如果明确标记为加载失败，返回false
        if (window.WPS_SDK_LOADING === false && !window.WPS_SDK_LOADED) {
            return false;
        }
        // 检查WPS SDK的qrcode对象
        return window.qrcode && typeof window.qrcode.generateQrCode === 'function';
    }
    /**
     * 等待SDK加载完成
     */
    waitForSDK(timeout = 15000) {
        return new Promise((resolve, reject) => {
            if (this.isSDKReady()) {
                if (process.env.NODE_ENV === 'development') {
                    // eslint-disable-next-line no-console
                    console.log('WPS SDK 已就绪');
                }
                resolve();
                return;
            }
            // 如果SDK明确加载失败，立即拒绝
            if (window.WPS_SDK_LOADING === false && !window.WPS_SDK_LOADED) {
                reject(new Error('WPS SDK加载失败，请检查网络连接或CDN可用性'));
                return;
            }
            if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.log('等待 WPS SDK 加载...');
            }
            let resolved = false;
            // 监听SDK加载成功事件
            const handleSDKLoaded = () => {
                if (!resolved) {
                    resolved = true;
                    if (process.env.NODE_ENV === 'development') {
                        // eslint-disable-next-line no-console
                        console.log('WPS SDK 通过事件加载完成');
                    }
                    cleanup();
                    resolve();
                }
            };
            // 监听SDK加载失败事件
            const handleSDKError = () => {
                if (!resolved) {
                    resolved = true;
                    if (process.env.NODE_ENV === 'development') {
                        // eslint-disable-next-line no-console
                        console.error('WPS SDK 通过事件加载失败');
                    }
                    cleanup();
                    reject(new Error('WPS SDK加载失败，请检查网络连接'));
                }
            };
            // 清理函数
            const cleanup = () => {
                window.removeEventListener('wps-sdk-loaded', handleSDKLoaded);
                window.removeEventListener('wps-sdk-error', handleSDKError);
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                if (checkInterval) {
                    clearInterval(checkInterval);
                }
            };
            // 添加事件监听器
            window.addEventListener('wps-sdk-loaded', handleSDKLoaded);
            window.addEventListener('wps-sdk-error', handleSDKError);
            // 超时处理
            const timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    if (process.env.NODE_ENV === 'development') {
                        // eslint-disable-next-line no-console
                        console.error('WPS SDK 加载超时');
                    }
                    cleanup();
                    // 提供详细的诊断信息
                    const diagnosticInfo = this.getDiagnosticInfo();
                    reject(new Error(`WPS SDK加载超时 (${timeout}ms)\n诊断信息:\n${diagnosticInfo}`));
                }
            }, timeout);
            // 轮询检查（作为备用方案）
            const checkInterval = setInterval(() => {
                if (this.isSDKReady() && !resolved) {
                    resolved = true;
                    if (process.env.NODE_ENV === 'development') {
                        // eslint-disable-next-line no-console
                        console.log('WPS SDK 通过轮询检查加载完成');
                    }
                    cleanup();
                    resolve();
                }
            }, 100);
        });
    }
    /**
     * 获取诊断信息
     */
    getDiagnosticInfo() {
        const info = [];
        if (typeof window === 'undefined') {
            info.push('- 不在浏览器环境中');
            return info.join('\n');
        }
        // 检查加载状态
        info.push(`- WPS_SDK_LOADING: ${window.WPS_SDK_LOADING}`);
        info.push(`- WPS_SDK_LOADED: ${window.WPS_SDK_LOADED}`);
        info.push(`- window.qrcode: ${typeof window.qrcode}`);
        info.push(`- window.qrcode.generateQrCode: ${typeof window.qrcode?.generateQrCode}`);
        // 检查脚本加载
        const scripts = Array.from(document.scripts);
        const wpsScript = scripts.find((script) => script.src.includes('wpscdn.cn') || script.src.includes('qrcode'));
        info.push(`- WPS 脚本加载状态: ${wpsScript ? '已找到' : '未找到'}`);
        if (wpsScript) {
            info.push(`- WPS 脚本 URL: ${wpsScript.src}`);
            // HTMLScriptElement 可能有 readyState 属性，但不是标准的
            const readyState = wpsScript.readyState;
            info.push(`- 脚本加载状态: ${readyState || '未知'}`);
        }
        // 检查网络连接
        info.push(`- 在线状态: ${navigator.onLine ? '在线' : '离线'}`);
        info.push(`- 当前域名: ${window.location.hostname}`);
        return info.join('\n');
    }
    /**
     * 获取配置信息
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * 清理资源（保持向后兼容）
     */
    cleanup() {
        // WPS官方SDK没有清理方法，这里保持空实现以兼容现有代码
    }
}
// 创建全局实例
export const wpsSDK = new WPSSDKManager();
//# sourceMappingURL=wps-sdk-manager.js.map