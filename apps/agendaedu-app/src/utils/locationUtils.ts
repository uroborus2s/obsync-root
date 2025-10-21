/**
 * 前端位置验证工具函数
 * 用于打卡位置验证和距离计算
 */

/**
 * 位置坐标接口
 */
export interface Location {
  /** 经度 */
  lng: number;
  /** 纬度 */
  lat: number;
}

/**
 * 教学楼位置配置
 */
export interface BuildingLocation {
  /** 建筑物名称 */
  name: string;
  /** 位置坐标 */
  location: Location;
  /** 允许的关键词匹配 */
  keywords: string[];
}

/**
 * 位置验证结果
 */
export interface LocationValidationResult {
  /** 是否验证通过 */
  valid: boolean;
  /** 匹配的建筑物 */
  matchedBuilding?: BuildingLocation;
  /** 当前距离（米） */
  distance?: number;
  /** 最大允许距离（米） */
  maxDistance?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 教学楼位置配置
 * 根据您提供的坐标信息配置
 */
export const BUILDING_LOCATIONS: BuildingLocation[] = [
  {
    name: '实验楼',
    location: { lng: 125.434203, lat: 43.819996 },
    keywords: ['实验楼', '实验', '实验室']
  },
  {
    name: '第一教学楼',
    location: { lng: 125.43551, lat: 43.820859 },
    // location: { lng: 114.410905, lat: 30.502573 },
    keywords: ['第一教学楼', '一教', '第一教', '一号教学楼', '1号教学楼']
  },
  {
    name: '逸夫教学楼',
    location: { lng: 125.436876, lat: 43.818679 },
    keywords: ['逸夫教学楼', '逸夫楼', '逸夫', '二教', '第二教学楼']
  },
  {
    name: '双创楼',
    location: { lng: 125.439685, lat: 43.819594 },
    keywords: ['双创楼', '双创', '创新创业楼', '创业楼']
  }
];

/**
 * 默认的打卡允许距离（米）
 */
export const DEFAULT_CHECK_IN_RADIUS = 5000;

/**
 * 地球半径（公里）
 */
const EARTH_RADIUS = 6371;

/**
 * 将角度转换为弧度
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 使用Haversine公式计算两点间的距离
 * @param point1 第一个点的坐标
 * @param point2 第二个点的坐标
 * @returns 距离（米）
 */
export function calculateDistance(point1: Location, point2: Location): number {
  const lat1Rad = toRadians(point1.lat);
  const lng1Rad = toRadians(point1.lng);
  const lat2Rad = toRadians(point2.lat);
  const lng2Rad = toRadians(point2.lng);

  const deltaLat = lat2Rad - lat1Rad;
  const deltaLng = lng2Rad - lng1Rad;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // 返回距离（米）
  return EARTH_RADIUS * c * 1000;
}

/**
 * 从房间信息中解析建筑物名称
 * @param roomInfo 房间信息，如："第一教学楼1329/1329"
 * @returns 匹配的建筑物配置，如果找不到则返回null
 */
export function parseBuildingFromRoom(
  roomInfo: string
): BuildingLocation | null {
  if (!roomInfo) return null;

  const normalizedRoom = roomInfo.trim();

  // 遍历所有建筑物配置，寻找匹配的关键词
  for (const building of BUILDING_LOCATIONS) {
    for (const keyword of building.keywords) {
      if (normalizedRoom.includes(keyword)) {
        return building;
      }
    }
  }

  return null;
}

/**
 * 验证用户位置是否在允许的打卡范围内
 * @param userLocation 用户当前位置
 * @param roomInfo 课程房间信息
 * @param maxDistance 最大允许距离（米），默认500米
 * @returns 验证结果
 */
export function validateLocationForCheckIn(
  userLocation: Location,
  roomInfo: string,
  maxDistance: number = DEFAULT_CHECK_IN_RADIUS
): LocationValidationResult {
  // 验证用户位置格式
  if (
    !userLocation ||
    typeof userLocation.lng !== 'number' ||
    typeof userLocation.lat !== 'number'
  ) {
    return {
      valid: false,
      error: '用户位置信息无效'
    };
  }

  // 验证经纬度范围
  if (Math.abs(userLocation.lat) > 90 || Math.abs(userLocation.lng) > 180) {
    return {
      valid: false,
      error: '位置坐标超出有效范围'
    };
  }

  // 解析房间信息获取建筑物
  const building = parseBuildingFromRoom(roomInfo);
  if (!building) {
    return {
      valid: false,
      error: `无法识别房间信息中的建筑物: ${roomInfo}`
    };
  }

  // 计算距离
  const distance = calculateDistance(userLocation, building.location);

  // 验证距离是否在允许范围内
  const valid = distance <= maxDistance;

  return {
    valid,
    matchedBuilding: building,
    distance: Math.round(distance),
    maxDistance,
    error: valid ? undefined : ``
  };
}

/**
 * 格式化距离显示
 * @param distance 距离（米）
 * @returns 格式化的距离字符串
 */
export function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${Math.round(distance)}米`;
  } else {
    return `${(distance / 1000).toFixed(1)}公里`;
  }
}

/**
 * 获取所有支持的建筑物列表
 * @returns 建筑物配置列表
 */
export function getSupportedBuildings(): BuildingLocation[] {
  return [...BUILDING_LOCATIONS];
}
