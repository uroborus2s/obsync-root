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
 * 构建WPS授权URL
 * @param state 状态参数，通常是当前页面URL用于授权后重定向
 * @returns 完整的WPS授权URL
 */
export function buildWpsAuthUrl(state?: string): string {
  const finalState = state || window.location.href

  console.log('🔧 WPS认证配置: 构建授权URL参数')
  console.log('  - appid:', WPS_AUTH_CONFIG.appid)
  console.log('  - redirectUri:', WPS_AUTH_CONFIG.redirectUri)
  console.log('  - scope:', WPS_AUTH_CONFIG.scope)
  console.log('  - authUrl:', WPS_AUTH_CONFIG.authUrl)
  console.log('  - state:', finalState)

  const params = new URLSearchParams({
    client_id: WPS_AUTH_CONFIG.appid,
    response_type: 'code',
    redirect_uri: WPS_AUTH_CONFIG.redirectUri,
    scope: WPS_AUTH_CONFIG.scope,
    state: finalState,
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
  console.log('🔄 WPS认证配置: 开始构建授权URL...')
  const finalReturnUrl = returnUrl || window.location.href
  const authUrl = buildWpsAuthUrl(finalReturnUrl)

  console.log('📋 WPS认证配置: 授权参数')
  console.log('  - 返回URL:', finalReturnUrl)
  console.log('  - 授权URL:', authUrl)

  // 保存返回URL到sessionStorage，以防state参数丢失
  if (returnUrl) {
    sessionStorage.setItem('wps_auth_return_url', returnUrl)
    console.log('💾 WPS认证配置: 已保存返回URL到sessionStorage')
  }

  // 直接重定向到WPS授权页面
  console.log('🚀 WPS认证配置: 即将重定向到WPS授权页面...')
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
