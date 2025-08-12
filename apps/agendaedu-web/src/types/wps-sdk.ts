/**
 * WPS SDK 相关类型定义
 */

/**
 * 认证 URL 参数
 */
export interface AuthUrlParams {
  /** 应用 ID */
  appid?: string
  /** 重定向 URI */
  redirect_uri?: string
  /** 响应类型 */
  response_type?: string
  /** 作用域 */
  scope?: string
  /** 状态参数 */
  state?: string
  /** 登录类型 */
  login_type?: number
  /** 其他参数 */
  [key: string]: string | number | undefined
}

/**
 * 二维码生成参数
 */
export interface GenerateQrCodeParams {
  /** 应用 ID */
  app_id?: string
  /** 认证 URL */
  auth_url?: string
  /** 二维码内容 */
  text?: string
  /** 容器元素 ID */
  containerId?: string
  /** 二维码尺寸 */
  width?: number
  /** 二维码尺寸 */
  height?: number
  /** 错误纠正级别 */
  correctLevel?: 'L' | 'M' | 'Q' | 'H'
  /** 背景色 */
  background?: string
  /** 前景色 */
  foreground?: string
}

/**
 * WPS 二维码 SDK 接口
 */
export interface WpsQrCodeSDK {
  generateQrCode: (params: GenerateQrCodeParams) => void
}

/**
 * 扩展 Window 接口以包含 WPS SDK
 */
declare global {
  interface Window {
    qrcode?: WpsQrCodeSDK
  }
}

export { }

