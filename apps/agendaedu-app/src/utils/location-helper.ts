import { LocationInfo } from '@/lib/wps-collaboration-api';

/**
 * 地理位置辅助工具类
 */
export class LocationHelper {
  /**
   * 获取当前位置信息
   * 优先使用WPS JSAPI，如果不可用则使用浏览器原生API
   */
  static async getCurrentLocation(): Promise<LocationInfo> {
    return new Promise((resolve, reject) => {
      // 检查是否在WPS环境中
      if (typeof window !== 'undefined' && window.ksoxz_sdk) {
        console.log('WPS SDK已加载', window.ksoxz_sdk);
        console.log('🔍 使用WPS JSAPI获取位置...');

        // 如果WPS API失败，尝试使用浏览器API
        this.getBrowserLocation().then(resolve).catch(reject);

        // window.ksoxz_sdk.getLocationInfo({
        //   onSuccess: (data: LocationInfo) => {
        //     console.log('📍 WPS JSAPI获取位置成功:', data);
        //     resolve(data);
        //   },
        //   onError: (error: unknown) => {
        //     console.error('❌ WPS JSAPI获取位置失败:', error);
        //     // 如果WPS API失败，尝试使用浏览器API
        //     this.getBrowserLocation().then(resolve).catch(reject);
        //   }
        // });
      } else {
        console.log('🔍 使用浏览器原生API获取位置...');
        this.getBrowserLocation().then(resolve).catch(reject);
      }
    });
  }

  /**
   * 使用浏览器原生API获取位置
   */
  private static getBrowserLocation(): Promise<LocationInfo> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('浏览器不支持地理位置功能'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationInfo = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: '当前位置',
            accuracy: position.coords.accuracy
          };
          console.log('📍 浏览器API获取位置成功:', location);
          resolve(location);
        },
        (error) => {
          console.error('❌ 浏览器API获取位置失败:', error);
          let errorMessage = '获取位置失败';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '用户拒绝了位置权限请求';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = '位置信息不可用';
              break;
            case error.TIMEOUT:
              errorMessage = '获取位置超时';
              break;
          }

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }

  /**
   * 检查是否支持地理位置功能
   */
  static isLocationSupported(): boolean {
    return (
      (typeof window !== 'undefined' && !!window.ksoxz_sdk) ||
      'geolocation' in navigator
    );
  }

  /**
   * 格式化位置信息显示
   */
  static formatLocationDisplay(location: LocationInfo): string {
    if (location.address && location.address !== '当前位置') {
      return location.address;
    }

    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }

  /**
   * 计算两个位置之间的距离（米）
   */
  static calculateDistance(
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
}
