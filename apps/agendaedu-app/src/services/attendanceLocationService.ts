/**
 * 考勤位置验证服务
 * 集成位置获取和验证功能
 */

import {
  wpsLocationService,
  type LocationResult
} from '@/services/wpsLocationService';
import {
  DEFAULT_CHECK_IN_RADIUS,
  formatDistance,
  validateLocationForCheckIn,
  type LocationValidationResult
} from '@/utils/locationUtils';

/**
 * 考勤位置验证结果
 */
export interface AttendanceLocationValidationResult
  extends LocationValidationResult {
  /** 用户位置信息 */
  userPosition?: LocationResult;
  /** 位置精度 */
  accuracy?: number;
  /** 位置来源 */
  source?: string;
}

/**
 * 考勤位置服务
 */
export class AttendanceLocationService {
  private currentPosition: LocationResult | null = null;
  private locationUpdateInterval: number | null = null;
  private isInitialized = false;

  /**
   * 初始化服务
   * @param pageUrl 当前页面URL
   * @returns 是否初始化成功
   */
  async initialize(pageUrl?: string): Promise<boolean> {
    try {
      // 记录页面URL用于调试
      console.log('初始化考勤位置服务，页面URL:', pageUrl);

      // 尝试初始化WPS JSAPI
      const wpsReady = await wpsLocationService.initWPSAPI();

      if (!wpsReady) {
        console.warn('WPS JSAPI初始化失败，将使用浏览器API');
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('位置服务初始化失败:', error);
      // 即使WPS初始化失败，也可以使用浏览器API
      this.isInitialized = true;
      return true;
    }
  }

  /**
   * 获取当前位置
   * @param options 位置获取选项
   * @returns 位置信息
   */
  async getCurrentPosition(
    options: {
      preferWPS?: boolean;
      timeout?: number;
      useCache?: boolean;
    } = {}
  ): Promise<LocationResult> {
    const { preferWPS = true, timeout = 10000, useCache = false } = options;

    // 如果使用缓存且有缓存位置
    if (useCache && this.currentPosition) {
      const cacheAge = Date.now() - (this.currentPosition as any).timestamp;
      if (cacheAge < 5 * 60 * 1000) {
        // 5分钟内的缓存
        return this.currentPosition;
      }
    }

    // 获取新位置
    const position = await wpsLocationService.getCurrentPosition({
      preferWPS,
      timeout
    });

    // 添加时间戳用于缓存判断
    (position as any).timestamp = Date.now();
    this.currentPosition = position;

    return position;
  }

  /**
   * 验证打卡位置
   * @param courseRoom 课程房间信息
   * @param maxDistance 最大允许距离（米）
   * @param options 选项
   * @returns 验证结果
   */
  async validateCheckInLocation(
    courseRoom: string,
    maxDistance: number = DEFAULT_CHECK_IN_RADIUS,
    options: {
      forceRefresh?: boolean;
      preferWPS?: boolean;
    } = {}
  ): Promise<AttendanceLocationValidationResult> {
    try {
      // 获取当前位置
      const position = await this.getCurrentPosition({
        preferWPS: options.preferWPS,
        useCache: !options.forceRefresh
      });

      // 验证位置
      const validationResult = validateLocationForCheckIn(
        { lng: position.lng, lat: position.lat },
        courseRoom,
        maxDistance
      );

      return {
        ...validationResult,
        userPosition: position,
        accuracy: position.accuracy,
        source: position.source
      };
    } catch (error) {
      return {
        valid: false,
        error: `位置获取失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 执行位置验证打卡流程
   * @param courseRoom 课程房间信息
   * @param onSuccess 成功回调
   * @param onError 失败回调
   * @param options 选项
   */
  async performLocationBasedCheckIn(
    courseRoom: string,
    onSuccess: (result: {
      message: string;
      building: string;
      distance: number;
      userPosition: LocationResult;
    }) => void,
    onError: (error: {
      message: string;
      building?: string;
      distance?: number;
      userPosition?: LocationResult;
    }) => void,
    options: {
      maxDistance?: number;
      showProgress?: boolean;
      preferWPS?: boolean;
    } = {}
  ): Promise<void> {
    const {
      maxDistance = DEFAULT_CHECK_IN_RADIUS,
      showProgress = true,
      preferWPS = true
    } = options;

    try {
      if (showProgress) {
        console.log('正在获取位置信息...');
      }

      // 检查权限
      const permission = await wpsLocationService.checkLocationPermission();
      if (permission === 'denied') {
        throw new Error('位置权限被拒绝，请在设置中开启位置权限');
      }

      // 验证位置
      const validationResult = await this.validateCheckInLocation(
        courseRoom,
        maxDistance,
        { preferWPS }
      );

      if (showProgress) {
        console.log('位置验证完成');
      }

      if (
        validationResult.valid &&
        validationResult.matchedBuilding &&
        validationResult.userPosition
      ) {
        // 位置验证通过，执行打卡
        onSuccess({
          message: '位置验证通过，可以打卡',
          building: validationResult.matchedBuilding.name,
          distance: validationResult.distance || 0,
          userPosition: validationResult.userPosition
        });
      } else {
        // 位置验证失败
        onError({
          message: validationResult.error || '位置验证失败',
          building: validationResult.matchedBuilding?.name,
          distance: validationResult.distance,
          userPosition: validationResult.userPosition
        });
      }
    } catch (error) {
      onError({
        message: error instanceof Error ? error.message : '位置验证失败'
      });
    }
  }

  /**
   * 开始位置监控
   * @param onLocationUpdate 位置更新回调
   * @param interval 更新间隔（毫秒）
   */
  startLocationMonitoring(
    onLocationUpdate: (position: LocationResult | null, error?: Error) => void,
    interval: number = 30000
  ): void {
    if (this.locationUpdateInterval) {
      this.stopLocationMonitoring();
    }

    const updateLocation = async () => {
      try {
        const position = await this.getCurrentPosition();
        onLocationUpdate(position);
      } catch (error) {
        console.error('位置更新失败:', error);
        onLocationUpdate(
          null,
          error instanceof Error ? error : new Error('位置更新失败')
        );
      }
    };

    // 立即执行一次
    updateLocation();

    // 设置定时更新
    this.locationUpdateInterval = window.setInterval(updateLocation, interval);
  }

  /**
   * 停止位置监控
   */
  stopLocationMonitoring(): void {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }
  }

  /**
   * 获取位置信息摘要
   * @returns 位置摘要信息
   */
  getLocationSummary(): {
    status: 'unknown' | 'available';
    position?: { lng: number; lat: number };
    accuracy?: number;
    source?: string;
    timestamp?: string;
    message?: string;
  } {
    if (!this.currentPosition) {
      return {
        status: 'unknown',
        message: '位置信息未获取'
      };
    }

    return {
      status: 'available',
      position: {
        lng: this.currentPosition.lng,
        lat: this.currentPosition.lat
      },
      accuracy: this.currentPosition.accuracy,
      source: this.currentPosition.source,
      timestamp: new Date().toLocaleString(),
      message: `位置精度: ${formatDistance(this.currentPosition.accuracy)}`
    };
  }

  /**
   * 清除缓存位置
   */
  clearLocationCache(): void {
    this.currentPosition = null;
  }

  /**
   * 检查服务是否已初始化
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 获取当前缓存的位置
   */
  get cachedPosition(): LocationResult | null {
    return this.currentPosition;
  }
}

// 导出单例实例
export const attendanceLocationService = new AttendanceLocationService();
