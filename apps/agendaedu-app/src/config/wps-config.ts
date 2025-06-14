// WPS协作JSAPI配置文件
export const WPS_CONFIG = {
  // WPS协作应用配置
  appId: process.env.VITE_WPS_APP_ID || 'your-app-id', // 从环境变量获取AppID

  // 权限范围配置
  scope: [
    'location', // 地理位置权限
    'image', // 图片选择和上传权限
    'share', // 分享权限
    'device', // 设备信息权限
    'ui' // UI交互权限
  ],

  // SDK配置
  sdk: {
    url: 'https://365.kdocs.cn/3rd/open/js/ksoxz_sdk.js',
    timeout: 10000 // 初始化超时时间（毫秒）
  },

  // 功能开关
  features: {
    enableLocation: true, // 启用位置功能
    enableCamera: true, // 启用拍照功能
    enableShare: true, // 启用分享功能
    enableMockMode: true // 启用模拟模式（开发环境）
  },

  // 模拟数据配置（开发环境使用）
  mockData: {
    location: {
      latitude: 39.9042,
      longitude: 116.4074,
      address: '教学楼A座 201教室',
      accuracy: 10
    },
    course: {
      name: '高等数学',
      time: '09:00 - 10:40',
      classroom: '教学楼A座 201教室',
      teacher: '张教授'
    }
  }
};

// 环境检测
export const isWPSEnvironment = (): boolean => {
  return typeof window !== 'undefined' && !!window.ksoxz_sdk;
};

// 开发环境检测
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};
