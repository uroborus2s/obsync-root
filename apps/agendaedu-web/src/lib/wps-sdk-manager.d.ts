declare global {
    interface Window {
        WPS_SDK_LOADING?: boolean;
        WPS_SDK_LOADED?: boolean;
    }
}
export declare class WPSSDKManager {
    private config;
    /**
     * 根据当前环境获取重定向URI
     */
    private getRedirectUri;
    /**
     * 构建授权URL
     */
    buildAuthUrl(state?: string): string;
    /**
     * 生成授权二维码
     */
    generateQrCode(state?: string): void;
    /**
     * 检查SDK是否可用
     */
    isSDKReady(): boolean;
    /**
     * 等待SDK加载完成
     */
    waitForSDK(timeout?: number): Promise<void>;
    /**
     * 获取诊断信息
     */
    private getDiagnosticInfo;
    /**
     * 获取配置信息
     */
    getConfig(): {
        appId: string;
        scope: string;
        baseAuthUrl: string;
    };
    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<typeof this.config>): void;
    /**
     * 清理资源（保持向后兼容）
     */
    cleanup(): void;
}
export declare const wpsSDK: WPSSDKManager;
//# sourceMappingURL=wps-sdk-manager.d.ts.map