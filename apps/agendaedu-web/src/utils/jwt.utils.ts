/**
 * JWT解析工具函数
 */
import type {
  JWTParseResult,
  JWTUserPayload,
  UserInfo,
} from '@/types/user.types'

/**
 * JWT Cookie名称
 */
export const JWT_COOKIE_NAME = 'wps_jwt_token'

/**
 * 从Cookie中获取JWT令牌
 */
export function getJWTFromCookie(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  try {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === JWT_COOKIE_NAME) {
        return decodeURIComponent(value)
      }
    }
    return null
  } catch (_error) {
    return null
  }
}

/**
 * Base64 URL解码（支持UTF-8）
 */
function base64UrlDecode(str: string): string {
  // 替换URL安全字符
  str = str.replace(/-/g, '+').replace(/_/g, '/')

  // 添加填充
  while (str.length % 4) {
    str += '='
  }

  try {
    // 使用现代浏览器的 TextDecoder 和 Uint8Array 来正确处理 UTF-8
    // 首先将 base64 字符串转换为字节数组
    const binaryString = atob(str)
    const bytes = new Uint8Array(binaryString.length)

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // 使用 TextDecoder 正确解码 UTF-8
    const decoder = new TextDecoder('utf-8')
    return decoder.decode(bytes)
  } catch (error) {
    // 如果 TextDecoder 失败，尝试使用简单的字符串方法
    try {
      const binaryString = atob(str)
      // 使用 Array.from 和 String.fromCharCode 来处理字符
      const chars = Array.from(binaryString, (char) => char.charCodeAt(0))
      const uint8Array = new Uint8Array(chars)
      const decoder = new TextDecoder('utf-8')
      return decoder.decode(uint8Array)
    } catch (_fallbackError) {
      throw new Error(
        `Base64解码失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }
}

/**
 * 解码Unicode转义序列
 * 将 \uXXXX 格式的Unicode转义序列转换为实际字符
 */
function decodeUnicodeEscapes(str: string): string {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_match, code) => {
    return String.fromCharCode(parseInt(code, 16))
  })
}

/**
 * 修复JWT payload中的Unicode编码问题
 */
function fixUnicodeInPayload(payload: JWTUserPayload): JWTUserPayload {
  const fixed = { ...payload }

  // 需要修复Unicode编码的字符串字段
  const stringFields = [
    'username',
    'collegeName',
    'departmentName',
    'title',
    'education',
  ] as const

  for (const field of stringFields) {
    const value = fixed[field]
    if (typeof value === 'string') {
      ;(fixed as any)[field] = decodeUnicodeEscapes(value)
    }
  }

  return fixed
}

/**
 * 解析JWT令牌（支持3部分或4部分JWT）
 * 4部分JWT是因为Fastify Cookie签名会在JWT后面添加额外的签名
 */
export function parseJWT(token: string): JWTUserPayload {
  try {
    // JWT格式: header.payload.signature，但有些实现可能有4部分（带Fastify签名）
    const parts = token.split('.')

    // 检查JWT格式：支持3部分或4部分
    if (parts.length !== 3 && parts.length !== 4) {
      throw new Error(`JWT格式无效 - 应该有3或4部分，实际有${parts.length}部分`)
    }

    // 解码payload部分（第二部分，无论是3部分还是4部分，payload都在第二部分）
    const payload = base64UrlDecode(parts[1])
    const parsedPayload = JSON.parse(payload) as JWTUserPayload

    // 修复Unicode编码问题
    const fixedPayload = fixUnicodeInPayload(parsedPayload)

    return fixedPayload
  } catch (error) {
    throw new Error(
      `JWT解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    )
  }
}

/**
 * 解析JWT令牌（不修复Unicode编码，用于调试）
 */
export function parseJWTRaw(token: string): JWTUserPayload {
  try {
    // JWT格式: header.payload.signature，但有些实现可能有4部分（带Fastify签名）
    const parts = token.split('.')

    // 检查JWT格式：支持3部分或4部分
    if (parts.length !== 3 && parts.length !== 4) {
      throw new Error(`JWT格式无效 - 应该有3或4部分，实际有${parts.length}部分`)
    }

    // 解码payload部分（第二部分）
    const payload = base64UrlDecode(parts[1])
    const parsedPayload = JSON.parse(payload) as JWTUserPayload

    return parsedPayload
  } catch (error) {
    throw new Error(
      `JWT解析失败: ${error instanceof Error ? error.message : '未知错误'}`
    )
  }
}

/**
 * 检查JWT是否已过期
 */
export function isJWTExpired(payload: JWTUserPayload): boolean {
  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now
}

/**
 * 将JWT Payload转换为UserInfo
 */
export function convertJWTPayloadToUserInfo(payload: JWTUserPayload): UserInfo {
  return {
    id: payload.userId,
    name: payload.username,
    number: payload.userNumber,
    type: payload.userType,
    college: payload.collegeName,
    roles: payload.roles,
    permissions: payload.permissions,
    employeeNumber: payload.employeeNumber,
    department: payload.departmentName,
    title: payload.title,
    education: payload.education,
    // 生成默认头像（基于用户姓名的首字母）
    avatar: generateDefaultAvatar(payload.username),
  }
}

/**
 * 生成默认头像（基于用户姓名）
 */
function generateDefaultAvatar(username: string): string {
  if (!username) return ''

  // 获取姓名的第一个字符
  const firstChar = username.charAt(0)

  // 使用Gravatar风格的默认头像API
  // 这里使用一个简单的颜色生成算法
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E9',
  ]

  const colorIndex = username.charCodeAt(0) % colors.length
  const backgroundColor = colors[colorIndex]

  // 返回SVG格式的头像
  const svg = `
    <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="${backgroundColor}"/>
      <text x="20" y="28" text-anchor="middle" fill="white" font-size="16" font-family="Arial, sans-serif">
        ${firstChar}
      </text>
    </svg>
  `

  // 使用 encodeURIComponent 来处理包含中文字符的 SVG
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * 从Cookie中解析用户信息
 */
export function parseUserFromCookie(): JWTParseResult {
  try {
    // 获取JWT令牌
    const token = getJWTFromCookie()
    if (!token) {
      return {
        success: false,
        error: 'JWT令牌不存在',
      }
    }

    // 解析JWT
    const payload = parseJWT(token)

    // 检查是否过期
    const expired = isJWTExpired(payload)
    if (expired) {
      return {
        success: false,
        error: 'JWT令牌已过期',
        expired: true,
      }
    }

    // 转换为用户信息
    const user = convertJWTPayloadToUserInfo(payload)

    return {
      success: true,
      user,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '解析用户信息失败',
    }
  }
}

/**
 * 清除JWT Cookie
 */
export function clearJWTCookie(): void {
  if (typeof document === 'undefined') {
    return
  }

  try {
    document.cookie = `${JWT_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  } catch (_error) {
    // 静默处理错误
  }
}
