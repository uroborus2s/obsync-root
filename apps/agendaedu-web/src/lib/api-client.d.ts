import { AxiosRequestConfig } from 'axios';
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data: T;
}
export interface RequestOptions extends AxiosRequestConfig {
    skipAuth?: boolean;
    retryOnAuth?: boolean;
}
export declare class ApiClient {
    private client;
    private isRefreshing;
    private failedQueue;
    constructor(baseURL?: string);
    private setupInterceptors;
    /**
     * 处理未授权情况 - 直接跳转到WPS授权页面
     */
    private handleUnauthorized;
    /**
     * 处理排队的请求
     */
    private processQueue;
    get<T = unknown>(url: string, options?: RequestOptions): Promise<T>;
    post<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T>;
    put<T = unknown>(url: string, data?: unknown, options?: RequestOptions): Promise<T>;
    delete<T = unknown>(url: string, options?: RequestOptions): Promise<T>;
}
export declare const apiClient: ApiClient;
declare module 'axios' {
    interface AxiosRequestConfig {
        metadata?: {
            skipAuth?: boolean;
        };
    }
}
//# sourceMappingURL=api-client.d.ts.map