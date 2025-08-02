// WPS协作JSAPI鉴权服务
// 基于 WPS 协作网页应用开发工具包 v0.2.0
import { WPS_CONFIG } from '@/config/wps-config';
// 使用现有的 ksoxz_sdk 类型声明，从 wps-collaboration-api.ts
/**
 * WPS协作鉴权服务类
 */
export class WPSAuthService {
    isInitialized = false;
    authConfig = null;
    authorizedPermissions = [];
    constructor() {
        this.initializeFromConfig();
    }
    /**
     * 从配置文件初始化
     */
    initializeFromConfig() {
        this.authConfig = {
            appId: WPS_CONFIG.appId,
            scope: WPS_CONFIG.scope
        };
    }
    /**
     * 检查WPS协作环境
     */
    isWPSEnvironment() {
        return typeof window !== 'undefined' && !!window.ksoxz_sdk;
    }
    /**
     * 初始化WPS协作JSAPI
     */
    async initialize(config) {
        if (config) {
            this.authConfig = { ...this.authConfig, ...config };
        }
        if (!this.authConfig) {
            throw new Error('WPS配置未初始化');
        }
        if (!this.isWPSEnvironment()) {
            console.warn('⚠️ 不在WPS协作环境中，将使用模拟模式');
            return this.getMockAuthResult();
        }
        try {
            console.log('🔐 开始WPS协作JSAPI鉴权...', this.authConfig);
            const authResult = await this.requestAuthorization();
            if (authResult.isAuthorized) {
                this.isInitialized = true;
                this.authorizedPermissions = authResult.permissions || [];
                console.log('✅ WPS协作JSAPI鉴权成功', authResult);
            }
            else {
                console.error('❌ WPS协作JSAPI鉴权失败', authResult.error);
            }
            return authResult;
        }
        catch (error) {
            console.error('❌ WPS协作JSAPI鉴权异常:', error);
            return {
                isAuthorized: false,
                permissions: [],
                error: error instanceof Error ? error.message : '鉴权失败'
            };
        }
    }
    /**
     * 请求授权
     */
    async requestAuthorization() {
        if (!this.authConfig) {
            throw new Error('WPS配置未初始化');
        }
        return new Promise((resolve) => {
            const scopeString = this.authConfig.scope.join(',');
            window.ksoxz_sdk.authorize({
                params: { scope: scopeString },
                onSuccess: (result) => {
                    resolve({
                        isAuthorized: result.auth,
                        permissions: result
                            .permissions || this.authConfig.scope,
                        error: result.auth ? undefined : '授权被拒绝'
                    });
                },
                onError: (error) => {
                    console.error('授权请求失败:', error);
                    resolve({
                        isAuthorized: false,
                        permissions: [],
                        error: '授权请求失败'
                    });
                }
            });
        });
    }
    /**
     * 获取模拟授权结果（开发环境使用）
     */
    getMockAuthResult() {
        return {
            isAuthorized: true,
            permissions: ['location', 'image', 'share', 'device', 'ui'],
            error: undefined
        };
    }
    /**
     * 检查是否已授权
     */
    isAuthorized() {
        return this.isInitialized || WPS_CONFIG.features.enableMockMode;
    }
    /**
     * 检查特定权限
     */
    hasPermission(permission) {
        if (WPS_CONFIG.features.enableMockMode) {
            return true;
        }
        return this.authorizedPermissions.includes(permission);
    }
    /**
     * 获取当前位置信息
     */
    async getCurrentLocation() {
        if (!this.isAuthorized()) {
            throw new Error('未授权，请先进行鉴权');
        }
        if (!this.hasPermission('location')) {
            throw new Error('没有位置权限');
        }
        if (!this.isWPSEnvironment()) {
            return this.getMockLocation();
        }
        return new Promise((resolve, reject) => {
            window.ksoxz_sdk.getLocationInfo({
                type: 'gcj02', // 使用国测局坐标系
                onSuccess: (result) => {
                    const locationInfo = {
                        ...result,
                        timestamp: Date.now()
                    };
                    console.log('📍 获取位置成功:', locationInfo);
                    resolve(locationInfo);
                },
                onError: (error) => {
                    console.error('❌ 获取位置失败:', error);
                    reject(new Error('获取位置失败'));
                }
            });
        });
    }
    /**
     * 获取模拟位置信息
     */
    getMockLocation() {
        return {
            ...WPS_CONFIG.mockData.location,
            timestamp: Date.now()
        };
    }
    /**
     * 获取设备信息
     */
    async getDeviceInfo() {
        if (!this.isAuthorized()) {
            throw new Error('未授权，请先进行鉴权');
        }
        if (!this.hasPermission('device')) {
            throw new Error('没有设备信息权限');
        }
        if (!this.isWPSEnvironment()) {
            return this.getMockDeviceInfo();
        }
        return new Promise((resolve, reject) => {
            window.ksoxz_sdk.getDeviceInfo({
                onSuccess: (result) => {
                    console.log('📱 获取设备信息成功:', result);
                    resolve(result);
                },
                onError: (error) => {
                    console.error('❌ 获取设备信息失败:', error);
                    reject(new Error('获取设备信息失败'));
                }
            });
        });
    }
    /**
     * 获取模拟设备信息
     */
    getMockDeviceInfo() {
        return {
            platform: 'web',
            version: '1.0.0',
            model: 'Mock Device',
            networkType: 'wifi'
        };
    }
    /**
     * 选择图片
     */
    async chooseImage(count = 1) {
        if (!this.isAuthorized()) {
            throw new Error('未授权，请先进行鉴权');
        }
        if (!this.hasPermission('image')) {
            throw new Error('没有图片权限');
        }
        if (!this.isWPSEnvironment()) {
            return this.getMockImages(count);
        }
        return new Promise((resolve, reject) => {
            window.ksoxz_sdk.chooseImage({
                params: {
                    count,
                    sizeType: ['original', 'compressed'],
                    sourceType: ['album', 'camera']
                },
                onSuccess: (result) => {
                    console.log('📷 选择图片成功:', result);
                    resolve(result.localIds);
                },
                onError: (error) => {
                    console.error('❌ 选择图片失败:', error);
                    reject(new Error('选择图片失败'));
                }
            });
        });
    }
    /**
     * 获取模拟图片
     */
    getMockImages(count) {
        const images = [];
        for (let i = 0; i < count; i++) {
            images.push(`mock_image_${i + 1}_${Date.now()}.jpg`);
        }
        return images;
    }
    /**
     * 显示Toast提示
     */
    async showToast(title, icon = 'success', duration = 2000) {
        if (!this.isAuthorized()) {
            console.warn('未授权，使用浏览器alert替代');
            alert(title);
            return;
        }
        if (!this.isWPSEnvironment()) {
            console.log(`Toast: ${title}`);
            return;
        }
        return new Promise((resolve) => {
            window.ksoxz_sdk.showToast({
                params: { title, icon, duration },
                onSuccess: () => resolve(),
                onError: () => resolve() // Toast失败不影响主流程
            });
        });
    }
    /**
     * 显示确认框
     */
    async showConfirm(title, content) {
        if (!this.isAuthorized()) {
            return confirm(`${title}\n${content}`);
        }
        if (!this.isWPSEnvironment()) {
            return confirm(`${title}\n${content}`);
        }
        return new Promise((resolve, reject) => {
            window.ksoxz_sdk.showConfirm({
                params: {
                    title,
                    content,
                    confirmText: '确定',
                    cancelText: '取消'
                },
                onSuccess: (result) => {
                    resolve(result.confirm);
                },
                onError: (error) => {
                    console.error('❌ 显示确认框失败:', error);
                    reject(new Error('显示确认框失败'));
                }
            });
        });
    }
    /**
     * 计算两个位置之间的距离（米）
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // 地球半径（米）
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    /**
     * 验证打卡位置
     */
    async validateCheckInLocation(targetLocation, maxDistance = 100 // 最大允许距离（米）
    ) {
        try {
            const currentLocation = await this.getCurrentLocation();
            const distance = this.calculateDistance(currentLocation.latitude, currentLocation.longitude, targetLocation.latitude, targetLocation.longitude);
            const isValidLocation = distance <= maxDistance;
            return {
                location: currentLocation,
                isValidLocation,
                distance: Math.round(distance)
            };
        }
        catch (error) {
            console.error('验证打卡位置失败:', error);
            throw error;
        }
    }
    /**
     * 完整的打卡流程（位置+可选照片）
     */
    async performCheckIn(targetLocation, maxDistance = 100, requirePhoto = false) {
        try {
            // 1. 验证位置
            const locationResult = await this.validateCheckInLocation(targetLocation, maxDistance);
            if (!locationResult.isValidLocation) {
                await this.showToast(`距离目标位置${locationResult.distance}米，超出允许范围`, 'error');
                return locationResult;
            }
            // 2. 可选拍照
            let photos = [];
            if (requirePhoto) {
                const shouldTakePhoto = await this.showConfirm('打卡确认', '是否需要拍照打卡？');
                if (shouldTakePhoto) {
                    try {
                        photos = await this.chooseImage(1);
                    }
                    catch (error) {
                        console.warn('拍照失败，继续打卡流程:', error);
                    }
                }
            }
            // 3. 成功提示
            await this.showToast('打卡成功！', 'success');
            return {
                ...locationResult,
                photos
            };
        }
        catch (error) {
            console.error('打卡流程失败:', error);
            await this.showToast('打卡失败，请重试', 'error');
            throw error;
        }
    }
    /**
     * 重置授权状态
     */
    reset() {
        this.isInitialized = false;
        this.authorizedPermissions = [];
    }
}
// 创建单例实例
export const wpsAuthService = new WPSAuthService();
//# sourceMappingURL=wps-auth-service.js.map