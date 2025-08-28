/// <reference types="vite/client" />

// Vite环境变量类型定义
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_ENV: string;
  readonly VITE_DEBUG: string;
  readonly VITE_WPS_APP_ID: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// WPS协作JSAPI类型定义
interface WPSSDKLocationInfo {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

interface WPSSDK {
  getLocationInfo(): Promise<WPSSDKLocationInfo>;
  // 可以根据需要添加更多WPS SDK方法
}

declare global {
  interface Window {
    ksoxz_sdk?: WPSSDK;
  }
}
