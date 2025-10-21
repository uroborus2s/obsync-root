// WPS协作JSAPI鉴权服务
// 基于 WPS 协作网页应用开发工具包 v0.2.0

import { WPS_CONFIG } from '@/config/wps-config';

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

// 使用现有的 ksoxz_sdk 类型声明，从 wps-collaboration-api.ts

/**
 * WPS协作鉴权服务类
 */
export class WPSAuthService {
  private isInitialized = false;
  private authConfig: WPSAuthConfig | null = null;
  private authorizedPermissions: string[] = [];

  constructor() {
    this.initializeFromConfig();
  }

  /**
   * 从配置文件初始化
   */
  private initializeFromConfig(): void {
    this.authConfig = {
      appId: WPS_CONFIG.appId,
      scope: WPS_CONFIG.scope
    };
  }

  /**
   * 检查WPS协作环境
   */
  public isWPSEnvironment(): boolean {
    return typeof window !== 'undefined' && !!window.ksoxz_sdk;
  }

  /**
   * 初始化WPS协作JSAPI
   */
  public async initialize(
    config?: Partial<WPSAuthConfig>
  ): Promise<AuthResult> {
    if (config) {
      this.authConfig = { ...this.authConfig!, ...config };
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
      } else {
        console.error('❌ WPS协作JSAPI鉴权失败', authResult.error);
      }

      return authResult;
    } catch (error) {
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
  private async requestAuthorization(): Promise<AuthResult> {
    if (!this.authConfig) {
      throw new Error('WPS配置未初始化');
    }

    return new Promise((resolve) => {
      const scopeString = this.authConfig!.scope.join(',');

      window.ksoxz_sdk.authorize({
        params: { scope: scopeString },
        onSuccess: (result) => {
          resolve({
            isAuthorized: result.auth,
            permissions:
              (result as { auth: boolean; permissions?: string[] })
                .permissions || this.authConfig!.scope,
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
  private getMockAuthResult(): AuthResult {
    return {
      isAuthorized: true,
      permissions: ['location', 'image', 'share', 'device', 'ui'],
      error: undefined
    };
  }

  /**
   * 检查是否已授权
   */
  public isAuthorized(): boolean {
    return this.isInitialized || WPS_CONFIG.features.enableMockMode;
  }

  /**
   * 检查特定权限
   */
  public hasPermission(permission: string): boolean {
    if (WPS_CONFIG.features.enableMockMode) {
      return true;
    }
    return this.authorizedPermissions.includes(permission);
  }

  /**
   * 获取设备信息
   */
  public async getDeviceInfo(): Promise<DeviceInfo> {
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
  private getMockDeviceInfo(): DeviceInfo {
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
  public async chooseImage(count: number = 1): Promise<string[]> {
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
  private getMockImages(count: number): string[] {
    const images: string[] = [];
    for (let i = 0; i < count; i++) {
      images.push(`mock_image_${i + 1}_${Date.now()}.jpg`);
    }
    return images;
  }

  /**
   * 显示Toast提示
   */
  public async showToast(
    title: string,
    icon: 'success' | 'error' | 'loading' | 'none' = 'success',
    duration: number = 2000
  ): Promise<void> {
    if (!this.isAuthorized()) {
      console.warn('未授权，使用浏览器alert替代');
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
  public async showConfirm(title: string, content: string): Promise<boolean> {
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
  public calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // 地球半径（米）
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * 重置授权状态
   */
  public reset(): void {
    this.isInitialized = false;
    this.authorizedPermissions = [];
  }
}

// 创建单例实例
export const wpsAuthService = new WPSAuthService();
