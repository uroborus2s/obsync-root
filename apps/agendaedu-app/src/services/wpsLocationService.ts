/**
 * WPS JSAPI位置获取服务
 * 集成WPS JSAPI和浏览器原生定位API
 */

import type { Location } from '@/utils/locationUtils';

/**
 * 位置获取结果
 */
export interface LocationResult extends Location {
  /** 位置精度（米） */
  accuracy: number;
  /** 位置来源 */
  source: 'wps_jsapi' | 'browser_api' | 'manual';
  /** 地址描述（可选） */
  address?: string;
}

/**
 * WPS JSAPI配置
 */
export interface WPSConfig {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
  jsApiList: string[];
}

/**
 * WPS JSAPI位置服务
 */
export class WPSLocationService {
  private isWPSReady = false;
  private wpsConfig: WPSConfig | null = null;

  // 使用wpsConfig进行调试输出
  private logConfig(): void {
    console.log('当前WPS配置:', this.wpsConfig);
  }

  /**
   * 初始化WPS JSAPI
   * @param config WPS配置信息（从后端/api/auth/wps/jsapi-config获取）
   * @returns 是否初始化成功
   */
  async initWPSAPI(config?: WPSConfig): Promise<boolean> {
    try {
      // 如果没有传入配置，尝试从后端获取
      if (!config) {
        config = await this.getWPSConfig(window.location.href);
      }

      // 检查配置是否有效
      if (!config) {
        console.warn('无法获取WPS配置，将使用浏览器API');
        return false;
      }

      // 检查WPS JSAPI是否已加载
      if (typeof (window as any).wps === 'undefined') {
        console.warn('WPS JSAPI未加载，将使用浏览器API');
        return false;
      }

      this.wpsConfig = config;
      this.logConfig(); // 记录配置信息

      // 配置WPS JSAPI
      const wps = (window as any).wps;
      const configResult = await new Promise<boolean>((resolve, reject) => {
        wps.config({
          appId: config!.appId,
          timestamp: config!.timestamp,
          nonceStr: config!.nonceStr,
          signature: config!.signature,
          jsApiList: config!.jsApiList || ['getLocation']
        });

        wps.ready(() => {
          console.log('WPS JSAPI初始化成功');
          resolve(true);
        });

        wps.error((err: any) => {
          console.error('WPS JSAPI初始化失败:', err);
          reject(err);
        });

        // 设置超时
        setTimeout(() => {
          reject(new Error('WPS JSAPI初始化超时'));
        }, 10000);
      });

      this.isWPSReady = configResult;
      return configResult;
    } catch (error) {
      console.error('WPS JSAPI初始化异常:', error);
      return false;
    }
  }

  /**
   * 获取WPS JSAPI配置（从后端获取）
   * @param pageUrl 当前页面URL
   * @returns WPS配置信息
   */
  async getWPSConfig(pageUrl: string): Promise<WPSConfig> {
    try {
      const response = await fetch(
        `/api/auth/wps/jsapi-config?url=${encodeURIComponent(pageUrl)}`
      );
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '获取WPS配置失败');
      }

      return result.data;
    } catch (error) {
      console.error('获取WPS配置失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否在WPS环境中
   */
  isWPSEnvironment(): boolean {
    return typeof (window as any).wps !== 'undefined';
  }

  /**
   * 使用WPS JSAPI获取用户位置
   * @param options 位置获取选项
   * @returns 位置信息
   */
  async getCurrentPositionByWPS(
    options: {
      type?: 'wgs84' | 'gcj02';
      timeout?: number;
    } = {}
  ): Promise<LocationResult> {
    if (!this.isWPSReady) {
      throw new Error('WPS JSAPI未初始化');
    }

    const defaultOptions = {
      type: 'wgs84' as const,
      timeout: 10000,
      ...options
    };

    return new Promise((resolve, reject) => {
      const wps = (window as any).wps;

      wps.getLocation({
        type: defaultOptions.type,
        success: (res: any) => {
          console.log('WPS获取位置成功:', res);
          resolve({
            lng: parseFloat(res.longitude),
            lat: parseFloat(res.latitude),
            accuracy: res.accuracy || 0,
            source: 'wps_jsapi',
            address: res.address
          });
        },
        fail: (err: any) => {
          console.error('WPS获取位置失败:', err);
          reject(new Error(`WPS位置获取失败: ${err.errMsg || '未知错误'}`));
        },
        cancel: () => {
          reject(new Error('用户取消了位置获取'));
        }
      });

      // 设置超时
      setTimeout(() => {
        reject(new Error('WPS位置获取超时'));
      }, defaultOptions.timeout);
    });
  }

  /**
   * 使用浏览器原生API获取位置（备选方案）
   * @param options 位置获取选项
   * @returns 位置信息
   */
  async getCurrentPositionByBrowser(
    options: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
    } = {}
  ): Promise<LocationResult> {
    if (!navigator.geolocation) {
      throw new Error('浏览器不支持地理定位');
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5分钟缓存
      ...options
    };

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('浏览器获取位置成功:', position);
          resolve({
            lng: position.coords.longitude,
            lat: position.coords.latitude,
            accuracy: position.coords.accuracy,
            source: 'browser_api',
            address: `经度: ${position.coords.longitude.toFixed(6)}, 纬度: ${position.coords.latitude.toFixed(6)}`
          });
        },
        (error) => {
          let errorMessage = '位置获取失败';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '用户拒绝了位置权限请求';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = '位置信息不可用';
              break;
            case error.TIMEOUT:
              errorMessage = '位置获取超时';
              break;
          }
          console.error('浏览器获取位置失败:', error);
          reject(new Error(errorMessage));
        },
        defaultOptions
      );
    });
  }

  /**
   * 智能获取位置（优先使用WPS JSAPI，失败时回退到浏览器API）
   * @param options 位置获取选项
   * @returns 位置信息
   */
  async getCurrentPosition(
    options: {
      preferWPS?: boolean;
      timeout?: number;
    } = {}
  ): Promise<LocationResult> {
    const { preferWPS = true, timeout = 10000 } = options;
    const errors: string[] = [];

    // 如果偏好WPS且WPS可用，优先使用WPS JSAPI
    if (preferWPS && this.isWPSReady) {
      try {
        const position = await this.getCurrentPositionByWPS({ timeout });
        return position;
      } catch (error) {
        errors.push(
          `WPS JSAPI: ${error instanceof Error ? error.message : '未知错误'}`
        );
        console.warn('WPS JSAPI获取位置失败，尝试浏览器API:', error);
      }
    }

    // 回退到浏览器原生API
    try {
      const position = await this.getCurrentPositionByBrowser({ timeout });
      return position;
    } catch (error) {
      errors.push(
        `浏览器API: ${error instanceof Error ? error.message : '未知错误'}`
      );
      console.error('浏览器API获取位置失败:', error);
    }

    // 所有方法都失败
    throw new Error(`位置获取失败: ${errors.join('; ')}`);
  }

  /**
   * 检查位置权限状态
   * @returns 权限状态：'granted', 'denied', 'prompt', 'unknown'
   */
  async checkLocationPermission(): Promise<string> {
    if (!navigator.permissions) {
      return 'unknown';
    }

    try {
      const permission = await navigator.permissions.query({
        name: 'geolocation'
      });
      return permission.state;
    } catch (error) {
      console.warn('检查位置权限失败:', error);
      return 'unknown';
    }
  }

  /**
   * 创建位置服务单例
   */
  static instance: WPSLocationService | null = null;

  static getInstance(): WPSLocationService {
    if (!WPSLocationService.instance) {
      WPSLocationService.instance = new WPSLocationService();
    }
    return WPSLocationService.instance;
  }
}

// 导出单例实例
export const wpsLocationService = WPSLocationService.getInstance();
