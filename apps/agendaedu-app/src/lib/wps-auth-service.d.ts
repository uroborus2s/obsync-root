export interface WPSAuthConfig {
    appId: string;
    scope: string[];
    redirectUri?: string;
}
export interface LocationInfo {
    latitude: number;
    longitude: number;
    address: string;
    accuracy: number;
    timestamp?: number;
}
export interface DeviceInfo {
    platform: string;
    version: string;
    model?: string;
    networkType?: string;
}
export interface AuthResult {
    isAuthorized: boolean;
    permissions: string[];
    error?: string;
}
export interface CheckInLocationResult {
    location: LocationInfo;
    isValidLocation: boolean;
    distance?: number;
    photos?: string[];
}
/**
 * WPS协作鉴权服务类
 */
export declare class WPSAuthService {
    private isInitialized;
    private authConfig;
    private authorizedPermissions;
    constructor();
    /**
     * 从配置文件初始化
     */
    private initializeFromConfig;
    /**
     * 检查WPS协作环境
     */
    isWPSEnvironment(): boolean;
    /**
     * 初始化WPS协作JSAPI
     */
    initialize(config?: Partial<WPSAuthConfig>): Promise<AuthResult>;
    /**
     * 请求授权
     */
    private requestAuthorization;
    /**
     * 获取模拟授权结果（开发环境使用）
     */
    private getMockAuthResult;
    /**
     * 检查是否已授权
     */
    isAuthorized(): boolean;
    /**
     * 检查特定权限
     */
    hasPermission(permission: string): boolean;
    /**
     * 获取当前位置信息
     */
    getCurrentLocation(): Promise<LocationInfo>;
    /**
     * 获取模拟位置信息
     */
    private getMockLocation;
    /**
     * 获取设备信息
     */
    getDeviceInfo(): Promise<DeviceInfo>;
    /**
     * 获取模拟设备信息
     */
    private getMockDeviceInfo;
    /**
     * 选择图片
     */
    chooseImage(count?: number): Promise<string[]>;
    /**
     * 获取模拟图片
     */
    private getMockImages;
    /**
     * 显示Toast提示
     */
    showToast(title: string, icon?: 'success' | 'error' | 'loading' | 'none', duration?: number): Promise<void>;
    /**
     * 显示确认框
     */
    showConfirm(title: string, content: string): Promise<boolean>;
    /**
     * 计算两个位置之间的距离（米）
     */
    calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
    /**
     * 验证打卡位置
     */
    validateCheckInLocation(targetLocation: {
        latitude: number;
        longitude: number;
    }, maxDistance?: number): Promise<CheckInLocationResult>;
    /**
     * 完整的打卡流程（位置+可选照片）
     */
    performCheckIn(targetLocation: {
        latitude: number;
        longitude: number;
    }, maxDistance?: number, requirePhoto?: boolean): Promise<CheckInLocationResult>;
    /**
     * 重置授权状态
     */
    reset(): void;
}
export declare const wpsAuthService: WPSAuthService;
//# sourceMappingURL=wps-auth-service.d.ts.map