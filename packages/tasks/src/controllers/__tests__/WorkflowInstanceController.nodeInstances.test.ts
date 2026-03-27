/**
 * WorkflowInstanceController 节点实例相关接口测试
 *
 * 测试新增的节点实例查询功能
 */

import type { FastifyReply, FastifyRequest } from '@stratix/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  IWorkflowDefinitionService,
  IWorkflowExecutionService,
  IWorkflowInstanceService
} from '../../interfaces/index.js';
import WorkflowInstanceController from '../WorkflowInstanceController.js';

// Mock services
const mockWorkflowInstanceService = {
  getNodeInstances: vi.fn()
} as unknown as IWorkflowInstanceService;

const mockWorkflowExecutionService = {} as IWorkflowExecutionService;
const mockWorkflowDefinitionService = {} as IWorkflowDefinitionService;

// Mock reply
const mockReply = {
  status: vi.fn().mockReturnThis(),
  send: vi.fn()
} as unknown as FastifyReply;

describe('WorkflowInstanceController - Node Instances', () => {
  let controller: WorkflowInstanceController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new WorkflowInstanceController(
      mockWorkflowExecutionService,
      mockWorkflowDefinitionService,
      mockWorkflowInstanceService
    );
  });

  describe('getNodeInstances', () => {
    it('should return all node instances with children successfully', async () => {
      // Arrange
      const instanceId = 123;
      const mockNodeInstances: NodeInstanceWithChildren[] = [
        {
          id: 1,
          workflowInstanceId: instanceId,
          nodeId: 'node1',
          nodeName: 'Test Node 1',
          nodeType: 'simple',
          status: 'completed',
          retryCount: 0,
          loopCompletedCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          workflowInstanceId: instanceId,
          nodeId: 'loop1',
          nodeName: 'Loop Node',
          nodeType: 'loop',
          status: 'running',
          retryCount: 0,
          loopCompletedCount: 5,
          loopTotalCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
          children: [
            {
              id: 3,
              workflowInstanceId: instanceId,
              nodeId: 'task1_1',
              nodeName: 'Task 1 Iteration 1',
              nodeType: 'simple',
              status: 'completed',
              parentNodeId: 2,
              childIndex: 0,
              retryCount: 0,
              loopCompletedCount: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ],
          childrenStats: {
            total: 1,
            completed: 1,
            running: 0,
            failed: 0,
            pending: 0
          }
        }
      ];

      const mockRequest = {
        params: { id: instanceId.toString() },
        query: {}
      } as FastifyRequest<{
        Params: { id: string };
        Querystring: { nodeId?: string };
      }>;

      vi.mocked(mockWorkflowInstanceService.getNodeInstances).mockResolvedValue(
        {
          success: true,
          data: mockNodeInstances
        }
      );

      // Act
      await controller.getNodeInstances(mockRequest, mockReply);

      // Assert
      expect(mockWorkflowInstanceService.getNodeInstances).toHaveBeenCalledWith(
        instanceId,
        undefined
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: mockNodeInstances,
        timestamp: expect.any(String)
      });
    });

    it('should return specific node with children when nodeId is provided', async () => {
      // Arrange
      const instanceId = 123;
      const nodeId = 'loop1';
      const mockNodeInstance: NodeInstanceWithChildren = {
        id: 2,
        workflowInstanceId: instanceId,
        nodeId: 'loop1',
        nodeName: 'Loop Node',
        nodeType: 'loop',
        status: 'running',
        retryCount: 0,
        loopCompletedCount: 5,
        loopTotalCount: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        children: [
          {
            id: 3,
            workflowInstanceId: instanceId,
            nodeId: 'task1_1',
            nodeName: 'Task 1 Iteration 1',
            nodeType: 'simple',
            status: 'completed',
            parentNodeId: 2,
            childIndex: 0,
            retryCount: 0,
            loopCompletedCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        childrenStats: {
          total: 1,
          completed: 1,
          running: 0,
          failed: 0,
          pending: 0
        }
      };

      const mockRequest = {
        params: { id: instanceId.toString() },
        query: { nodeId }
      } as FastifyRequest<{
        Params: { id: string };
        Querystring: { nodeId?: string };
      }>;

      vi.mocked(mockWorkflowInstanceService.getNodeInstances).mockResolvedValue(
        {
          success: true,
          data: [mockNodeInstance]
        }
      );

      // Act
      await controller.getNodeInstances(mockRequest, mockReply);

      // Assert
      expect(mockWorkflowInstanceService.getNodeInstances).toHaveBeenCalledWith(
        instanceId,
        nodeId
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: true,
        data: [mockNodeInstance],
        timestamp: expect.any(String)
      });
    });

    it('should handle invalid instance ID', async () => {
      // Arrange
      const mockRequest = {
        params: { id: 'invalid' },
        query: {}
      } as FastifyRequest<{
        Params: { id: string };
        Querystring: { nodeId?: string };
      }>;

      // Act
      await controller.getNodeInstances(mockRequest, mockReply);

      // Assert
      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid instance ID',
        timestamp: expect.any(String)
      });
    });

    it('should handle node not found when nodeId is provided', async () => {
      // Arrange
      const instanceId = 123;
      const nodeId = 'nonexistent';
      const mockRequest = {
        params: { id: instanceId.toString() },
        query: { nodeId }
      } as FastifyRequest<{
        Params: { id: string };
        Querystring: { nodeId?: string };
      }>;

      vi.mocked(mockWorkflowInstanceService.getNodeInstances).mockResolvedValue(
        {
          success: false,
          error: `Node with ID '${nodeId}' not found in workflow instance ${instanceId}`
        }
      );

      // Act
      await controller.getNodeInstances(mockRequest, mockReply);

      // Assert
      expect(mockWorkflowInstanceService.getNodeInstances).toHaveBeenCalledWith(
        instanceId,
        nodeId
      );
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Node not found',
        errorDetails: `Node with ID '${nodeId}' not found in workflow instance ${instanceId}`,
        timestamp: expect.any(String)
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      const instanceId = 123;
      const mockRequest = {
        params: { id: instanceId.toString() },
        query: {}
      } as FastifyRequest<{
        Params: { id: string };
        Querystring: { nodeId?: string };
      }>;

      vi.mocked(mockWorkflowInstanceService.getNodeInstances).mockResolvedValue(
        {
          success: false,
          error: 'Database connection failed'
        }
      );

      // Act
      await controller.getNodeInstances(mockRequest, mockReply);

      // Assert
      expect(mockWorkflowInstanceService.getNodeInstances).toHaveBeenCalledWith(
        instanceId,
        undefined
      );
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get node instances',
        errorDetails: 'Database connection failed',
        timestamp: expect.any(String)
      });
    });
  });
});
