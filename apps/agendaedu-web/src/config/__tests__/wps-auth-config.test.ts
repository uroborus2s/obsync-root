/**
 * WPS认证配置测试
 * 测试base64编码和解码功能
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildWpsAuthUrl, decodeStateFromBase64 } from '../wps-auth-config'

// Mock window.location
const mockLocation = {
  href: 'https://example.com/current-page',
}

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

// Mock console methods to avoid test output noise
const originalConsoleLog = console.log
const originalConsoleError = console.error

beforeEach(() => {
  console.log = vi.fn()
  console.error = vi.fn()
})

afterEach(() => {
  console.log = originalConsoleLog
  console.error = originalConsoleError
})

describe('WPS认证配置', () => {
  describe('buildWpsAuthUrl', () => {
    it('应该对state参数进行base64编码', () => {
      const testUrl = 'https://example.com/test-page?param=value'
      const authUrl = buildWpsAuthUrl(testUrl)

      // 解析URL参数
      const url = new URL(authUrl)
      const stateParam = url.searchParams.get('state')

      expect(stateParam).toBeTruthy()

      // 验证state参数是base64编码的
      const decodedState = decodeStateFromBase64(stateParam!)
      expect(decodedState).toBe(testUrl)
    })

    it('应该使用当前页面URL作为默认state', () => {
      const authUrl = buildWpsAuthUrl()

      // 解析URL参数
      const url = new URL(authUrl)
      const stateParam = url.searchParams.get('state')

      expect(stateParam).toBeTruthy()

      // 验证解码后的state是当前页面URL
      const decodedState = decodeStateFromBase64(stateParam!)
      expect(decodedState).toBe(mockLocation.href)
    })

    it('应该包含所有必需的URL参数', () => {
      const authUrl = buildWpsAuthUrl('https://example.com/test')
      const url = new URL(authUrl)

      expect(url.searchParams.get('appid')).toBe('AK20250614WBSGPX')
      expect(url.searchParams.get('response_type')).toBe('code')
      expect(url.searchParams.get('redirect_uri')).toBe(
        'https://kwps.jlufe.edu.cn/api/auth/authorization'
      )
      expect(url.searchParams.get('scope')).toBe('user_info')
      expect(url.searchParams.get('login_type')).toBe('0')
      expect(url.searchParams.get('state')).toBeTruthy()
    })
  })

  describe('decodeStateFromBase64', () => {
    it('应该正确解码base64编码的URL', () => {
      const originalUrl = 'https://example.com/test-page?param=value&other=test'
      const encodedUrl = btoa(encodeURIComponent(originalUrl))

      const decodedUrl = decodeStateFromBase64(encodedUrl)
      expect(decodedUrl).toBe(originalUrl)
    })

    it('应该处理包含中文字符的URL', () => {
      const originalUrl = 'https://example.com/测试页面?参数=值'
      const encodedUrl = btoa(encodeURIComponent(originalUrl))

      const decodedUrl = decodeStateFromBase64(encodedUrl)
      expect(decodedUrl).toBe(originalUrl)
    })

    it('应该处理解码失败的情况', () => {
      const invalidBase64 = 'invalid-base64-string'

      // 解码失败时应该返回原始字符串
      const result = decodeStateFromBase64(invalidBase64)
      expect(result).toBe(invalidBase64)
    })

    it('应该处理空字符串', () => {
      const result = decodeStateFromBase64('')
      expect(result).toBe('')
    })
  })

  describe('编码解码往返测试', () => {
    const testUrls = [
      'https://example.com/simple',
      'https://example.com/with-params?a=1&b=2',
      'https://example.com/中文路径',
      'https://example.com/complex?param=value&other=测试&number=123',
      'https://example.com/hash#section',
      'https://example.com/full?param=value#section',
    ]

    testUrls.forEach((testUrl) => {
      it(`应该正确处理URL: ${testUrl}`, () => {
        // 构建认证URL
        const authUrl = buildWpsAuthUrl(testUrl)

        // 从认证URL中提取state参数
        const url = new URL(authUrl)
        const stateParam = url.searchParams.get('state')

        expect(stateParam).toBeTruthy()

        // 解码state参数
        const decodedUrl = decodeStateFromBase64(stateParam!)

        // 验证往返编码解码的一致性
        expect(decodedUrl).toBe(testUrl)
      })
    })
  })
})
