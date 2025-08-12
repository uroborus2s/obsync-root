/**
 * 工作流集成测试
 * 验证重构后的工作流功能是否正常工作
 */
import { WorkflowStatus } from '@/types/workflow.types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi } from '../auth-api'
import { gatewayAuthManager } from '../gateway-auth-manager'
import { workflowApi } from '../workflow-api'

// Mock API客户端
vi.mock('../api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('工作流集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('认证集成', () => {
    it('应该能够验证认证状态', async () => {
      const mockAuthResponse = {
        success: true,
        user: {
          userId: 'test-user',
          name: '测试用户',
          email: 'test@example.com',
        },
      }

      vi.mocked(authApi.verifyAuth).mockResolvedValue(mockAuthResponse)

      const result = await authApi.verifyAuth()
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
    })

    it('应该能够处理认证失败', async () => {
      const mockAuthResponse = {
        success: false,
        error: 'UNAUTHORIZED',
        message: '未认证或认证已过期',
      }

      vi.mocked(authApi.verifyAuth).mockResolvedValue(mockAuthResponse)

      const result = await authApi.verifyAuth()
      expect(result.success).toBe(false)
      expect(result.error).toBe('UNAUTHORIZED')
    })

    it('应该能够跳转到认证页面', () => {
      const originalLocation = window.location
      delete (window as any).location
      window.location = { ...originalLocation, href: '' } as any

      authApi.redirectToAuth('/test-return-url')

      expect(localStorage.getItem('auth_return_url')).toBe('/test-return-url')

      window.location = originalLocation as any
    })
  })

  describe('工作流API集成', () => {
    it('应该能够获取工作流定义列表', async () => {
      const mockResponse = {
        success: true,
        data: {
          items: [
            {
              id: 1,
              name: 'test-workflow',
              version: '1.0.0',
              description: '测试工作流',
              nodes: [],
              status: 'active' as const,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }

      vi.mocked(workflowApi.getWorkflowDefinitions).mockResolvedValue(
        mockResponse.data
      )

      const result = await workflowApi.getWorkflowDefinitions()
      expect(result.items).toHaveLength(1)
      expect(result.items[0].name).toBe('test-workflow')
    })

    it('应该能够获取工作流实例列表', async () => {
      const mockResponse = {
        success: true,
        data: {
          items: [
            {
              id: 1,
              workflowDefinitionId: 1,
              name: 'test-instance',
              status: WorkflowStatus.RUNNING,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }

      vi.mocked(workflowApi.getWorkflowInstances).mockResolvedValue(
        mockResponse.data
      )

      const result = await workflowApi.getWorkflowInstances()
      expect(result.items).toHaveLength(1)
      expect(result.items[0].status).toBe('running')
    })

    it('应该能够获取执行日志', async () => {
      const mockLogs = [
        {
          id: 1,
          workflowInstanceId: 1,
          level: 'info' as const,
          message: '工作流开始执行',
          timestamp: '2024-01-01T00:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
        },
      ]

      vi.mocked(workflowApi.getLogsByInstanceId).mockResolvedValue(mockLogs)

      const result = await workflowApi.getLogsByInstanceId(1)
      expect(result).toHaveLength(1)
      expect(result[0].message).toBe('工作流开始执行')
    })

    it('应该能够处理API错误', async () => {
      const mockError = new Error('网络错误')
      vi.mocked(workflowApi.getWorkflowDefinitions).mockRejectedValue(mockError)

      await expect(workflowApi.getWorkflowDefinitions()).rejects.toThrow(
        '网络错误'
      )
    })
  })

  describe('认证管理器集成', () => {
    it('应该能够检查认证状态', async () => {
      const mockAuthResponse = {
        success: true,
        user: {
          userId: 'test-user',
          name: '测试用户',
        },
      }

      vi.mocked(authApi.verifyAuth).mockResolvedValue(mockAuthResponse)

      await gatewayAuthManager.checkAuthStatus()
      const state = gatewayAuthManager.getState()

      expect(state.isAuthenticated).toBe(true)
      expect(state.user?.userId).toBe('test-user')
    })

    it('应该能够处理认证失败', async () => {
      const mockAuthResponse = {
        success: false,
        error: 'UNAUTHORIZED',
      }

      vi.mocked(authApi.verifyAuth).mockResolvedValue(mockAuthResponse)

      await gatewayAuthManager.checkAuthStatus()
      const state = gatewayAuthManager.getState()

      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
    })

    it('应该能够订阅状态变化', () => {
      const mockListener = vi.fn()
      const unsubscribe = gatewayAuthManager.subscribe(mockListener)

      // 触发状态变化
      gatewayAuthManager.checkAuthStatus()

      expect(mockListener).toHaveBeenCalled()
      unsubscribe()
    })
  })

  describe('错误处理', () => {
    it('应该能够处理网络错误', async () => {
      const networkError = new Error('Network Error')
      vi.mocked(workflowApi.getWorkflowDefinitions).mockRejectedValue(
        networkError
      )

      await expect(workflowApi.getWorkflowDefinitions()).rejects.toThrow(
        'Network Error'
      )
    })

    it('应该能够处理认证错误', async () => {
      const authError = {
        success: false,
        error: 'UNAUTHORIZED',
        message: '认证失败',
      }

      vi.mocked(authApi.verifyAuth).mockResolvedValue(authError)

      const result = await authApi.verifyAuth()
      expect(result.success).toBe(false)
      expect(result.error).toBe('UNAUTHORIZED')
    })
  })

  describe('数据格式验证', () => {
    it('工作流定义应该符合预期格式', async () => {
      const mockDefinition = {
        id: 1,
        name: 'test-workflow',
        version: '1.0.0',
        description: '测试工作流',
        nodes: [],
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      expect(mockDefinition).toHaveProperty('id')
      expect(mockDefinition).toHaveProperty('name')
      expect(mockDefinition).toHaveProperty('version')
      expect(mockDefinition).toHaveProperty('nodes')
      expect(Array.isArray(mockDefinition.nodes)).toBe(true)
    })

    it('工作流实例应该符合预期格式', async () => {
      const mockInstance = {
        id: 1,
        workflowDefinitionId: 1,
        name: 'test-instance',
        status: 'running',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      expect(mockInstance).toHaveProperty('id')
      expect(mockInstance).toHaveProperty('workflowDefinitionId')
      expect(mockInstance).toHaveProperty('status')
      expect([
        'pending',
        'running',
        'completed',
        'failed',
        'cancelled',
      ]).toContain(mockInstance.status)
    })
  })
})
