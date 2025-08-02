/**
 * API客户端
 * 集成WPS授权管理器，自动处理401响应和token刷新
 */
export interface ApiResponse<T = any> {
    success: number;
    message: string;
    data: T;
}
export interface RequestOptions extends RequestInit {
    skipAuth?: boolean;
    retryOnAuth?: boolean;
}
export declare class ApiClient {
    private baseUrl;
    private isRefreshing;
    private failedQueue;
    constructor(baseUrl?: string);
    /**
     * 发送HTTP请求
     */
    request<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>;
    /**
     * 执行请求
     */
    private executeRequest;
    /**
     * 处理401未授权响应
     */
    private handleUnauthorized;
    /**
     * 处理队列中的请求
     */
    private processQueue;
    /**
     * 跳转到授权页面
     */
    private redirectToAuth;
    /**
     * GET请求
     */
    get<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>;
    /**
     * POST请求
     */
    post<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>;
    /**
     * PUT请求
     */
    put<T = any>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>;
    /**
     * DELETE请求
     */
    delete<T = any>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>;
}
export declare const apiClient: ApiClient;
export declare const api: {
    get: <T = any>(endpoint: string, options?: RequestOptions) => Promise<ApiResponse<T>>;
    post: <T = any>(endpoint: string, data?: any, options?: RequestOptions) => Promise<ApiResponse<T>>;
    put: <T = any>(endpoint: string, data?: any, options?: RequestOptions) => Promise<ApiResponse<T>>;
    delete: <T = any>(endpoint: string, options?: RequestOptions) => Promise<ApiResponse<T>>;
};
//# sourceMappingURL=api-client.d.ts.map