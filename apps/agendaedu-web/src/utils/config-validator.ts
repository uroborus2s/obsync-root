/**
 * WPS认证配置验证工具
 * 用于验证整个项目中WPS认证配置的一致性
 */
import { WPS_AUTH_CONFIG } from '@/config/wps-auth-config'

/**
 * 配置验证结果接口
 */
export interface ConfigValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  summary: {
    totalChecks: number
    passedChecks: number
    failedChecks: number
  }
}

/**
 * 预期的WPS认证配置
 */
const EXPECTED_CONFIG = {
  appid: 'AK20250614WBSGPX',
  redirectUri: 'https://kwps.jlufe.edu.cn/api/auth/authorization',
  scope: 'user_info',
  authUrl: 'https://openapi.wps.cn/oauthapi/v2/authorize',
  loginType: '0',
}

/**
 * 预期的API服务配置
 */
const EXPECTED_API_CONFIG = {
  baseUrl: 'https://kwps.jlufe.edu.cn',
}

/**
 * 验证统一配置文件
 */
function validateUnifiedConfig(): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // 验证appid
  if (WPS_AUTH_CONFIG.appid !== EXPECTED_CONFIG.appid) {
    errors.push(
      `统一配置appid不匹配: 期望 "${EXPECTED_CONFIG.appid}", 实际 "${WPS_AUTH_CONFIG.appid}"`
    )
  }

  // 验证redirectUri
  if (WPS_AUTH_CONFIG.redirectUri !== EXPECTED_CONFIG.redirectUri) {
    errors.push(
      `统一配置redirectUri不匹配: 期望 "${EXPECTED_CONFIG.redirectUri}", 实际 "${WPS_AUTH_CONFIG.redirectUri}"`
    )
  }

  // 验证scope
  if (WPS_AUTH_CONFIG.scope !== EXPECTED_CONFIG.scope) {
    errors.push(
      `统一配置scope不匹配: 期望 "${EXPECTED_CONFIG.scope}", 实际 "${WPS_AUTH_CONFIG.scope}"`
    )
  }

  // 验证authUrl
  if (WPS_AUTH_CONFIG.authUrl !== EXPECTED_CONFIG.authUrl) {
    errors.push(
      `统一配置authUrl不匹配: 期望 "${EXPECTED_CONFIG.authUrl}", 实际 "${WPS_AUTH_CONFIG.authUrl}"`
    )
  }

  // 验证loginType
  if (WPS_AUTH_CONFIG.loginType !== EXPECTED_CONFIG.loginType) {
    warnings.push(
      `统一配置loginType不匹配: 期望 "${EXPECTED_CONFIG.loginType}", 实际 "${WPS_AUTH_CONFIG.loginType}"`
    )
  }

  return { errors, warnings }
}

/**
 * 验证环境变量配置
 */
function validateEnvironmentConfig(): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // 检查是否有冲突的环境变量
  if (typeof window !== 'undefined') {
    // 在浏览器环境中，无法直接访问process.env
    warnings.push('浏览器环境无法验证环境变量配置')
  }

  return { errors, warnings }
}

/**
 * 验证API服务配置一致性
 */
function validateApiServicesConfig(): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // 验证应用配置中的API基础URL
  import('@/lib/config')
    .then(({ appConfig }) => {
      if (appConfig.apiBaseUrl !== EXPECTED_API_CONFIG.baseUrl) {
        errors.push(
          `API基础URL不匹配: 期望 "${EXPECTED_API_CONFIG.baseUrl}", 实际 "${appConfig.apiBaseUrl}"`
        )
      }
    })
    .catch(() => {
      warnings.push('无法加载应用配置进行验证')
    })

  // 验证环境变量
  if (
    import.meta.env.VITE_API_BASE_URL &&
    import.meta.env.VITE_API_BASE_URL !== EXPECTED_API_CONFIG.baseUrl
  ) {
    errors.push(
      `环境变量VITE_API_BASE_URL不匹配: 期望 "${EXPECTED_API_CONFIG.baseUrl}", 实际 "${import.meta.env.VITE_API_BASE_URL}"`
    )
  }

  warnings.push('API服务配置验证：已统一使用kwps.jlufe.edu.cn/api')

  return { errors, warnings }
}

/**
 * 主要的配置验证函数
 */
export function validateWpsConfig(): ConfigValidationResult {
  const allErrors: string[] = []
  const allWarnings: string[] = []

  // 验证统一配置
  const unifiedResult = validateUnifiedConfig()
  allErrors.push(...unifiedResult.errors)
  allWarnings.push(...unifiedResult.warnings)

  // 验证环境变量
  const envResult = validateEnvironmentConfig()
  allErrors.push(...envResult.errors)
  allWarnings.push(...envResult.warnings)

  // 验证API服务配置
  const apiResult = validateApiServicesConfig()
  allErrors.push(...apiResult.errors)
  allWarnings.push(...apiResult.warnings)

  const totalChecks = 8 // 总检查项数
  const failedChecks = allErrors.length
  const passedChecks = totalChecks - failedChecks

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    summary: {
      totalChecks,
      passedChecks,
      failedChecks,
    },
  }
}

/**
 * 打印配置验证结果
 */
export function printValidationResult(result: ConfigValidationResult): void {
  console.group('🔍 WPS认证配置验证结果')

  console.log(`📊 总检查项: ${result.summary.totalChecks}`)
  console.log(`✅ 通过: ${result.summary.passedChecks}`)
  console.log(`❌ 失败: ${result.summary.failedChecks}`)

  if (result.errors.length > 0) {
    console.group('❌ 错误')
    result.errors.forEach((error, index) => {
      console.error(`${index + 1}. ${error}`)
    })
    console.groupEnd()
  }

  if (result.warnings.length > 0) {
    console.group('⚠️ 警告')
    result.warnings.forEach((warning, index) => {
      console.warn(`${index + 1}. ${warning}`)
    })
    console.groupEnd()
  }

  if (result.isValid) {
    console.log('🎉 所有配置验证通过！')
  } else {
    console.log('🚨 发现配置问题，请检查上述错误')
  }

  console.groupEnd()
}

/**
 * 开发环境自动验证配置
 */
if (import.meta.env.DEV) {
  const result = validateWpsConfig()
  printValidationResult(result)
}
