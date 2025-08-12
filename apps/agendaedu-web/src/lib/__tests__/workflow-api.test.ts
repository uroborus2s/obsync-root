/**
 * 工作流API客户端测试
 * 测试前端API调用的正确性
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { workflowApi } from '../workflow-api'

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    })),
  },
}))

// Mock apiClient
const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}

vi.mock('../api-client', () => ({
  apiClient: mockApiClient,
}))

describe('WorkflowApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('工作流定义API', () => {
    it('应该正确调用获取工作流定义列表API', async () => {
      const mockResponse = {
        success: true,
        data: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0,
        },
        timestamp: new Date().toISOString(),
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await workflowApi.getWorkflowDefinitions({
        page: 1,
        pageSize: 20,
      })

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/workflows/definitions?page=1&pageSize=20'
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('应该正确调用创建工作流定义API', async () => {
      const mockRequest = {
        name: '测试工作流',
        description: '测试描述',
        version: '1.0.0',
        nodes: [],
        inputs: [],
        outputs: [],
      }

      const mockResponse = {
        success: true,
        data: {
          id: '1',
          ...mockRequest,
          createdAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await workflowApi.createWorkflowDefinition(mockRequest)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/workflows/definitions',
        mockRequest
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('应该正确调用获取工作流定义详情API', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: '1',
          name: '测试工作流',
          description: '测试描述',
        },
        timestamp: new Date().toISOString(),
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await workflowApi.getWorkflowDefinition(
        'test-workflow',
        '1.0.0'
      )

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/workflows/test-workflow/1.0.0'
      )
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('工作流实例API', () => {
    it('应该正确调用获取工作流实例列表API', async () => {
      const mockResponse = {
        success: true,
        data: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0,
        },
        timestamp: new Date().toISOString(),
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await workflowApi.getWorkflowInstances({
        page: 1,
        pageSize: 20,
      })

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/workflows/instances?page=1&pageSize=20'
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('应该正确调用创建工作流实例API', async () => {
      const mockRequest = {
        workflowDefinitionId: 1,
        name: '测试实例',
        inputData: { test: 'data' },
      }

      const mockResponse = {
        success: true,
        data: {
          instanceId: 'instance-1',
          status: 'running',
          startTime: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await workflowApi.createWorkflowInstance(mockRequest)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/workflows/instances',
        mockRequest
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('应该正确调用实例操作API', async () => {
      const mockResponse = {
        success: true,
        data: true,
        timestamp: new Date().toISOString(),
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      // 测试启动实例
      await workflowApi.startWorkflowInstance(1, '测试启动')
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/workflows/instances/1/start',
        { reason: '测试启动' }
      )

      // 测试暂停实例
      await workflowApi.pauseWorkflowInstance(1, '测试暂停')
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/workflows/instances/1/pause',
        { reason: '测试暂停' }
      )

      // 测试恢复实例
      await workflowApi.resumeWorkflowInstance(1, '测试恢复')
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/workflows/instances/1/resume',
        { reason: '测试恢复' }
      )

      // 测试取消实例
      await workflowApi.cancelWorkflowInstance(1, '测试取消')
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/workflows/instances/1/cancel',
        { reason: '测试取消' }
      )
    })
  })

  describe('工作流执行日志API', () => {
    it('应该正确调用获取执行日志API', async () => {
      const mockResponse = {
        success: true,
        data: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0,
        },
        timestamp: new Date().toISOString(),
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await workflowApi.getExecutionLogs({
        page: 1,
        pageSize: 20,
        workflowInstanceId: 1,
        level: 'info',
      })

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/workflows/logs?page=1&pageSize=20&workflowInstanceId=1&level=info'
      )
      expect(result).toEqual(mockResponse.data)
    })

    it('应该正确调用根据实例ID获取日志API', async () => {
      const mockResponse = {
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      const result = await workflowApi.getLogsByInstanceId(1, {
        level: 'error',
        limit: 100,
      })

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/workflows/logs/instance/1?level=error&limit=100'
      )
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('工作流定时任务API', () => {
    // 注意：定时任务功能暂时不可用，需要后端支持
    // it('应该正确调用获取定时任务列表API', async () => {
    //   const mockResponse = {
    //     success: true,
    //     data: {
    //       items: [],
    //       total: 0,
    //       page: 1,
    //       pageSize: 20,
    //       totalPages: 0,
    //     },
    //     timestamp: new Date().toISOString(),
    //   }

    //   mockApiClient.get.mockResolvedValue(mockResponse)

    //   const result = await workflowApi.getSchedules({
    //     page: 1,
    //     pageSize: 20,
    //     enabled: true,
    //   })

    //   expect(mockApiClient.get).toHaveBeenCalledWith(
    //     '/api/workflows/schedules?page=1&pageSize=20&enabled=true'
    //   )
    //   expect(result).toEqual(mockResponse.data)
    // })

    // 注意：定时任务功能暂时不可用，需要后端支持
    // it('应该正确调用创建定时任务API', async () => {
    //   const mockRequest = {
    //     workflowDefinitionId: 1,
    //     name: '测试定时任务',
    //     cronExpression: '0 0 * * *',
    //     timezone: 'Asia/Shanghai',
    //     enabled: true,
    //   }

    //   const mockResponse = {
    //     success: true,
    //     data: {
    //       id: '1',
    //       ...mockRequest,
    //       createdAt: new Date().toISOString(),
    //     },
    //     timestamp: new Date().toISOString(),
    //   }

    //   mockApiClient.post.mockResolvedValue(mockResponse)

    //   const result = await workflowApi.createSchedule(mockRequest)

    //   expect(mockApiClient.post).toHaveBeenCalledWith(
    //     '/api/workflows/schedules',
    //     mockRequest
    //   )
    //   expect(result).toEqual(mockResponse.data)
    // })

    it('应该正确调用切换定时任务状态API', async () => {
      const mockResponse = {
        success: true,
        data: true,
        timestamp: new Date().toISOString(),
      }

      mockApiClient.post.mockResolvedValue(mockResponse)

      const result = await workflowApi.toggleSchedule('1', false)

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/workflows/schedules/1/toggle',
        { enabled: false }
      )
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('错误处理', () => {
    it('应该正确处理API错误', async () => {
      const mockErrorResponse = {
        success: false,
        error: '工作流定义不存在',
        timestamp: new Date().toISOString(),
      }

      mockApiClient.get.mockResolvedValue(mockErrorResponse)

      await expect(
        workflowApi.getWorkflowDefinition('nonexistent', '1.0.0')
      ).rejects.toThrow('工作流定义不存在')
    })

    it('应该正确处理网络错误', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network Error'))

      await expect(workflowApi.getWorkflowDefinitions()).rejects.toThrow(
        'Network Error'
      )
    })
  })

  describe('URL构建', () => {
    it('应该正确构建带查询参数的URL', async () => {
      const mockResponse = {
        success: true,
        data: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 },
        timestamp: new Date().toISOString(),
      }

      mockApiClient.get.mockResolvedValue(mockResponse)

      await workflowApi.getWorkflowDefinitions({
        page: 2,
        pageSize: 50,
      })

      const expectedUrl = '/api/workflows?page=2&pageSize=50'
      expect(mockApiClient.get).toHaveBeenCalledWith(expectedUrl)
    })
  })
})
