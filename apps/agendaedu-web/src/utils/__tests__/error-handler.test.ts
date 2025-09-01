/**
 * 错误处理工具函数测试
 */
import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ErrorType,
  extractErrorInfo,
  getErrorType,
  getFriendlyErrorMessage,
  handle401Error,
  handle403Error,
  handleError,
} from '../error-handler'

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
})

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

Object.defineProperty(console, 'log', { value: mockConsole.log })
Object.defineProperty(console, 'warn', { value: mockConsole.warn })
Object.defineProperty(console, 'error', { value: mockConsole.error })

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://example.com/test-page',
    pathname: '/test-page',
    search: '?param=value',
  },
})

// Mock navigator
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Test Browser)',
})

describe('错误处理工具函数', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('extractErrorInfo', () => {
    it('应该正确提取AxiosError信息', () => {
      const mockAxiosError = {
        config: {
          url: '/api/test',
          method: 'GET',
        },
        response: {
          status: 403,
          data: {
            message: '权限不足',
          },
        },
        message: 'Request failed',
        stack: 'Error stack trace',
      } as AxiosError

      const errorInfo = extractErrorInfo(mockAxiosError)

      expect(errorInfo).toMatchObject({
        url: '/api/test',
        method: 'GET',
        status: 403,
        message: '权限不足',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        currentPath: 'https://example.com/test-page',
      })
      expect(errorInfo.timestamp).toBeDefined()
      expect(errorInfo.stack).toBe('Error stack trace')
    })
  })

  describe('getErrorType', () => {
    it('应该正确识别不同的HTTP状态码', () => {
      expect(getErrorType(401)).toBe(ErrorType.UNAUTHORIZED)
      expect(getErrorType(403)).toBe(ErrorType.FORBIDDEN)
      expect(getErrorType(404)).toBe(ErrorType.NOT_FOUND)
      expect(getErrorType(422)).toBe(ErrorType.VALIDATION_ERROR)
      expect(getErrorType(500)).toBe(ErrorType.SERVER_ERROR)
      expect(getErrorType(502)).toBe(ErrorType.SERVER_ERROR)
      expect(getErrorType(400)).toBe(ErrorType.VALIDATION_ERROR)
      expect(getErrorType()).toBe(ErrorType.UNKNOWN_ERROR)
    })
  })

  describe('getFriendlyErrorMessage', () => {
    it('应该返回用户友好的错误消息', () => {
      expect(getFriendlyErrorMessage(ErrorType.UNAUTHORIZED)).toBe(
        '您需要登录才能访问此功能'
      )

      expect(getFriendlyErrorMessage(ErrorType.FORBIDDEN)).toBe(
        '您没有权限执行此操作'
      )

      expect(getFriendlyErrorMessage(ErrorType.NOT_FOUND)).toBe(
        '请求的资源不存在'
      )

      expect(getFriendlyErrorMessage(ErrorType.SERVER_ERROR)).toBe(
        '服务器暂时无法处理您的请求，请稍后重试'
      )

      expect(
        getFriendlyErrorMessage(ErrorType.VALIDATION_ERROR, '自定义消息')
      ).toBe('自定义消息')
    })
  })

  describe('handleError', () => {
    it('应该正确处理AxiosError', () => {
      const mockAxiosError = {
        config: { url: '/api/test', method: 'POST' },
        response: { status: 422, data: { message: '验证失败' } },
        message: 'Validation failed',
      } as AxiosError

      const result = handleError(mockAxiosError, {
        showToast: false,
        logToConsole: true,
      })

      expect(result).toMatchObject({
        url: '/api/test',
        method: 'POST',
        status: 422,
        message: '验证失败',
      })
      expect(mockConsole.error).toHaveBeenCalled()
    })

    it('应该正确处理普通Error', () => {
      const error = new Error('测试错误')

      const result = handleError(error, {
        showToast: false,
        logToConsole: true,
      })

      expect(result.message).toBe('测试错误')
      expect(mockConsole.error).toHaveBeenCalled()
    })

    it('应该正确处理字符串错误', () => {
      const result = handleError('字符串错误', {
        showToast: false,
        logToConsole: true,
      })

      expect(result.message).toBe('字符串错误')
      expect(mockConsole.error).toHaveBeenCalled()
    })
  })

  describe('handle401Error', () => {
    it('应该正确处理401错误', () => {
      const mockAxiosError = {
        config: { url: '/api/protected', method: 'GET' },
        response: { status: 401, data: { message: '未授权' } },
        message: 'Unauthorized',
      } as AxiosError

      handle401Error(mockAxiosError)

      expect(mockConsole.warn).toHaveBeenCalledWith(
        '🔐 权限错误:',
        expect.objectContaining({
          type: ErrorType.UNAUTHORIZED,
          url: '/api/protected',
          status: 401,
        })
      )
    })
  })

  describe('handle403Error', () => {
    it('应该正确处理403错误并存储错误信息', () => {
      const mockAxiosError = {
        config: { url: '/api/admin', method: 'DELETE' },
        response: { status: 403, data: { message: '权限不足' } },
        message: 'Forbidden',
      } as AxiosError

      handle403Error(mockAxiosError)

      expect(mockConsole.warn).toHaveBeenCalledWith(
        '🔐 权限错误:',
        expect.objectContaining({
          type: ErrorType.FORBIDDEN,
          url: '/api/admin',
          status: 403,
        })
      )

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'last_403_error',
        expect.stringContaining('"url":"/api/admin"')
      )
    })
  })
})
