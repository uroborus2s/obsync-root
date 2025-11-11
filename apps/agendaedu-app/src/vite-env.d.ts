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

interface WPSSDKChooseImageResult {
  localIds: string[]; // 返回选定照片的本地ID列表
}

interface WPSSDKChooseImageOptions {
  sourceType: ('camera' | 'album')[]; // 图片来源：camera-相机，album-相册
  count: number; // 可选择的图片数量
  onSuccess: (res: WPSSDKChooseImageResult) => void; // 成功回调
  onFail: (error: { errMsg: string }) => void; // 失败回调
}

interface WPSSDKGetLocalImgDataResult {
  localData: string; // 图片的base64数据
}

interface WPSSDK {
  getLocationInfo(): Promise<WPSSDKLocationInfo>;
  chooseImage(options: WPSSDKChooseImageOptions): void;
  getLocalImgData(options: {
    localId: string;
    onSuccess: (res: WPSSDKGetLocalImgDataResult) => void;
    onFail: (error: { errMsg: string }) => void;
  }): void;
}

declare global {
  interface Window {
    ksoxz_sdk?: WPSSDK;
  }
}
