/**
 * WPS官方登录SDK类型定义
 * 基于官方文档: https://open-xz.wps.cn/pages/general/app-login/Web-app-login/SDK-access-document/
 */

declare global {
  interface Window {
    /**
     * WPS官方SDK全局变量
     * CDN: https://cloudcdn.wpscdn.cn/open/qrcode/qrcode.1.0.6.min.js
     */
    qrcode: {
      generateQrCode: (params: GenerateQrCodeParams) => void
    }
  }
}

/**
 * generateQrCode 参数
 */
export interface GenerateQrCodeParams {
  /** 应用ID */
  app_id: string
  /** 业务请求url，生成url见auth_url拼接规则 */
  auth_url: string
  /** 是否跳过登录状态检测，true表示跳过登录状态检测，强制扫码；false表示需要检测登录状态，根据接口返回的结果来决定是否需要扫码，不传时则按false处理 */
  forced?: boolean
  /** 二维码容器ID（可选，指定二维码显示的容器） */
  container_id?: string
}

/**
 * 授权URL参数
 */
export interface AuthUrlParams {
  /** 应用ID */
  appid: string
  /** 固定值：code */
  response_type: 'code'
  /** 授权后重定向的回调链接地址 */
  redirect_uri: string
  /** 用户授权的权限(user_info...)，多个值逗号分割 */
  scope: string
  /** 用户自定义，授权成功后会通过重定向接口带回 */
  state?: string
  /** 登录形式，可选值：0：账号登录 1：手机验证码登录，默认为0 */
  login_type?: 0 | 1
  /** 是否要开放切换账号，disabled：禁用不传或传其他值则为开放 */
  switch_account?: string
}

/**
 * WPS SDK配置
 */
export interface WPSSDKConfig {
  /** 应用ID */
  appid: string
  /** 重定向地址 */
  redirect_uri: string
  /** 授权范围 */
  scope?: string
  /** 状态参数 */
  state?: string
}

/**
 * 二维码请求参数
 */
export interface QRCodeParams {
  /** 应用ID */
  appid: string
  /** 重定向地址 */
  redirect_uri: string
  /** 授权范围，默认为 'user_info' */
  scope?: string
  /** 状态参数 */
  state?: string
}

/**
 * 二维码返回结果
 */
export interface QRCodeResult {
  /** 错误码，0表示成功 */
  code: number
  /** 错误信息 */
  msg?: string
  /** 二维码数据 */
  data?: {
    /** 二维码ID */
    qr_id: string
    /** 二维码图片Base64数据 */
    qr_code: string
    /** 过期时间(秒) */
    expires_in: number
  }
}

/**
 * 登录状态检查结果
 */
export interface LoginStatusResult {
  /** 错误码 */
  code: number
  /** 错误信息 */
  msg?: string
  /** 登录状态数据 */
  data?: {
    /** 状态: 0-等待扫码, 1-已扫码, 2-登录成功, 3-登录失败, 4-已过期 */
    status: number
    /** 授权码(登录成功时返回) */
    auth_code?: string
    /** 用户信息(登录成功时返回) */
    user_info?: {
      /** 用户ID */
      user_id: string
      /** 用户昵称 */
      nickname: string
      /** 用户头像 */
      avatar?: string
    }
  }
}

/**
 * SDK事件类型
 */
export type WPSSDKEvent =
  | 'qr_ready' // 二维码就绪
  | 'qr_scanned' // 二维码被扫描
  | 'login_success' // 登录成功
  | 'login_failed' // 登录失败
  | 'qr_expired' // 二维码过期

export {}
