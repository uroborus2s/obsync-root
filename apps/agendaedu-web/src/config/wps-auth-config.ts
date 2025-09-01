/**
 * WPS认证统一配置
 * 根据需求统一所有WPS认证相关的配置参数
 */

export interface WpsAuthConfig {
  /** WPS应用ID */
  appid: string
  /** 授权范围 */
  scope: string
  /** 重定向URI */
  redirectUri: string
  /** WPS授权服务器地址 */
  authUrl: string
  /** 登录类型：0-账号登录, 1-手机验证码登录 */
  loginType: string
}

/**
 * WPS认证配置
 * 按照需求使用固定的生产环境配置
 */
export const WPS_AUTH_CONFIG: WpsAuthConfig = {
  appid: 'AK20250614WBSGPX',
  scope: 'user_info',
  redirectUri: 'https://kwps.jlufe.edu.cn/api/auth/authorization',
  authUrl: 'https://openapi.wps.cn/oauthapi/v2/authorize',
  loginType: '0',
}

/**
 * 对状态参数进行base64编码
 * @param state 原始状态参数
 * @returns base64编码后的状态参数
 */
function encodeStateToBase64(state: string): string {
  try {
    // 使用btoa进行base64编码，确保URL参数的安全传输
    const encodedState = btoa(encodeURIComponent(state))
    return encodedState
  } catch (error) {
    console.error('❌ WPS认证配置: 状态参数编码失败', error)
    // 编码失败时返回原始状态，确保认证流程不中断
    return state
  }
}

/**
 * 对base64编码的状态参数进行解码
 * @param encodedState base64编码的状态参数
 * @returns 解码后的原始状态参数
 */
export function decodeStateFromBase64(encodedState: string): string {
  try {
    // 使用atob进行base64解码
    const decodedState = decodeURIComponent(atob(encodedState))
    return decodedState
  } catch (error) {
    console.error('❌ WPS认证配置: 状态参数解码失败', error)
    // 解码失败时返回编码状态，避免认证流程中断
    return encodedState
  }
}

/**
 * 构建WPS授权URL
 * @param state 状态参数，通常是当前页面URL用于授权后重定向
 * @returns 完整的WPS授权URL
 */
export function buildWpsAuthUrl(state?: string): string {
  const finalState = state || window.location.href

  // 对状态参数进行base64编码，确保URL参数的安全传输
  const encodedState = encodeStateToBase64(finalState)

  const params = new URLSearchParams({
    appid: WPS_AUTH_CONFIG.appid,
    response_type: 'code',
    redirect_uri: WPS_AUTH_CONFIG.redirectUri,
    scope: WPS_AUTH_CONFIG.scope,
    state: encodedState, // 使用base64编码后的状态参数
    login_type: WPS_AUTH_CONFIG.loginType,
  })

  const fullUrl = `${WPS_AUTH_CONFIG.authUrl}?${params.toString()}`
  console.log('🔗 WPS认证配置: 完整授权URL:', fullUrl)

  return fullUrl
}

/**
 * 重定向到WPS授权页面
 * @param returnUrl 授权成功后要返回的页面URL
 */
export function redirectToWpsAuth(returnUrl?: string): void {
  const finalReturnUrl = returnUrl || window.location.href
  const authUrl = buildWpsAuthUrl(finalReturnUrl)

  // 保存返回URL到sessionStorage，以防state参数丢失
  if (returnUrl) {
    sessionStorage.setItem('wps_auth_return_url', returnUrl)
  }

  window.location.href = authUrl
}

/**
 * 获取保存的返回URL
 */
export function getReturnUrl(): string | null {
  return sessionStorage.getItem('wps_auth_return_url')
}

/**
 * 清除保存的返回URL
 */
export function clearReturnUrl(): void {
  sessionStorage.removeItem('wps_auth_return_url')
}
