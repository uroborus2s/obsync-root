import axios from 'axios';
import { authManager } from './auth-manager';
export class ApiClient {
    client;
    isRefreshing = false;
    failedQueue = [];
    constructor(baseURL) {
        this.client = axios.create({
            baseURL: baseURL ||
                import.meta.env.VITE_API_BASE_URL ||
                'http://localhost:8091/api',
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        this.setupInterceptors();
    }
    setupInterceptors() {
        // 请求拦截器 - 添加认证token
        this.client.interceptors.request.use(async (config) => {
            // 跳过认证的请求直接返回
            if (config.metadata?.skipAuth) {
                return config;
            }
            // 添加JWT token
            const token = await authManager.getAccessToken();
            if (token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        }, (error) => Promise.reject(error));
        // 响应拦截器 - 处理401和其他错误
        this.client.interceptors.response.use((response) => response.data, async (error) => {
            const originalRequest = error.config;
            // 处理401未授权响应
            if (error.response?.status === 401 &&
                !originalRequest.metadata?.skipAuth &&
                !originalRequest._retry) {
                if (this.isRefreshing) {
                    // 如果正在刷新token，将请求加入队列
                    return new Promise((resolve, reject) => {
                        this.failedQueue.push({
                            resolve,
                            reject,
                            config: originalRequest,
                        });
                    });
                }
                originalRequest._retry = true;
                this.isRefreshing = true;
                try {
                    if (authManager.isAuthenticated()) {
                        // 尝试刷新token
                        await authManager.refreshAccessToken();
                        this.processQueue(null);
                        // 重试原请求
                        const token = await authManager.getAccessToken();
                        if (token && originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return this.client(originalRequest);
                    }
                    else {
                        // 没有有效token，触发登录流程
                        this.processQueue(new Error('需要登录'));
                        this.handleUnauthorized();
                        return Promise.reject(new Error('需要登录'));
                    }
                }
                catch (refreshError) {
                    // 刷新失败，清除token并触发登录
                    this.processQueue(refreshError);
                    authManager.clearTokens();
                    this.handleUnauthorized();
                    return Promise.reject(refreshError);
                }
                finally {
                    this.isRefreshing = false;
                }
            }
            return Promise.reject(error);
        });
    }
    /**
     * 处理未授权情况 - 直接跳转到WPS授权页面
     */
    handleUnauthorized() {
        // 直接跳转到WPS授权页面，不使用SDK
        authManager.redirectToAuth();
    }
    /**
     * 处理排队的请求
     */
    processQueue(error) {
        this.failedQueue.forEach(({ resolve, reject, config }) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(this.client(config));
            }
        });
        this.failedQueue.length = 0;
    }
    async get(url, options) {
        return this.client.get(url, {
            ...options,
            metadata: { skipAuth: options?.skipAuth },
        });
    }
    async post(url, data, options) {
        return this.client.post(url, data, {
            ...options,
            metadata: { skipAuth: options?.skipAuth },
        });
    }
    async put(url, data, options) {
        return this.client.put(url, data, {
            ...options,
            metadata: { skipAuth: options?.skipAuth },
        });
    }
    async delete(url, options) {
        return this.client.delete(url, {
            ...options,
            metadata: { skipAuth: options?.skipAuth },
        });
    }
}
// 创建全局API客户端实例
export const apiClient = new ApiClient();
//# sourceMappingURL=api-client.js.map