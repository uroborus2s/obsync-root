import { LocationInfo } from '@/lib/wps-collaboration-api';
/**
 * 地理位置辅助工具类
 */
export declare class LocationHelper {
    /**
     * 获取当前位置信息
     * 优先使用WPS JSAPI，如果不可用则使用浏览器原生API
     */
    static getCurrentLocation(): Promise<LocationInfo>;
    /**
     * 使用浏览器原生API获取位置
     */
    private static getBrowserLocation;
    /**
     * 检查是否支持地理位置功能
     */
    static isLocationSupported(): boolean;
    /**
     * 格式化位置信息显示
     */
    static formatLocationDisplay(location: LocationInfo): string;
    /**
     * 计算两个位置之间的距离（米）
     */
    static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
}
//# sourceMappingURL=location-helper.d.ts.map