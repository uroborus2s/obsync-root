/**
 * NodeExecutionService 子流程节点执行测试
 *
 * 测试重构后的executeSubProcessNode方法的各种场景
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  INodeInstanceRepository,
  ITemplateService,
  IWorkflowDefinitionService,
  IWorkflowExecutionService,
  IWorkflowInstanceService
} from '../../interfaces/index.js';
import type { WorkflowInstance } from '../../types/business.js';
import type { WorkflowDefinitionTable } from '../../types/database.js';
import type { NodeInstance } from '../../types/unified-node.js';
import type {
  ExecutionContext,
  SubprocessNodeDefinition
} from '../../types/workflow.js';
import NodeExecutionService from '../NodeExecutionService.js';

describe('NodeExecutionService - Subprocess Node Execution', () => {
  let service: NodeExecutionService;
  let mockNodeInstanceRepository: INodeInstanceRepository;
  let mockLogger: Logger;
  let mockDatabaseApi: DatabaseAPI;
  let mockTemplateService: ITemplateService;
  let mockWorkflowInstanceService: IWorkflowInstanceService;
  let mockWorkflowDefinitionService: IWorkflowDefinitionService;
  let mockWorkflowExecutionService: IWorkflowExecutionService;

  beforeEach(() => {
    mockNodeInstanceRepository = {
      updateNodeInstance: vi.fn().mockResolvedValue({ success: true })
    } as any;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    } as any;

    mockDatabaseApi = {} as any;
    mockTemplateService = {} as any;

    mockWorkflowInstanceService = {
      findByExternalId: vi.fn(),
      getWorkflowInstance: vi.fn()
    } as any;

    mockWorkflowDefinitionService = {
      getById: vi.fn(),
      getByNameAndVersion: vi.fn(),
      getActiveByName: vi.fn()
    } as any;

    mockWorkflowExecutionService = {
      executeWorkflowInstance: vi.fn()
    } as any;

    service = new NodeExecutionService(
      mockNodeInstanceRepository,
      mockLogger,
      mockDatabaseApi,
      mockTemplateService,
      mockWorkflowInstanceService,
      mockWorkflowDefinitionService,
      mockWorkflowExecutionService
    );

    // Mock updateNodeStatus method
    vi.spyOn(service as any, 'updateNodeStatus').mockResolvedValue({
      success: true
    });

    // Mock mapSubprocessInputSimple method
    vi.spyOn(service as any, 'mapSubprocessInputSimple').mockReturnValue({
      input: 'test'
    });

    // Mock mapSubprocessOutputSimple method
    vi.spyOn(service as any, 'mapSubprocessOutputSimple').mockReturnValue({
      output: 'test'
    });
  });

  describe('executeSubProcessNode', () => {
    const mockNodeInstance: NodeInstance = {
      id: 1,
      nodeId: 'subprocess-node-1',
      workflowInstanceId: 100,
      nodeName: 'Test Subprocess',
      nodeType: 'subprocess',
      status: 'pending'
    } as any;

    const mockWorkflowInstance: WorkflowInstance = {
      id: 100,
      name: 'Parent Workflow',
      workflowDefinitionId: 1
    } as any;

    const mockSubprocessDef: SubprocessNodeDefinition = {
      nodeId: 'subprocess-node-1',
      nodeName: 'Test Subprocess',
      nodeType: 'subprocess',
      maxRetries: 3,
      subWorkflowName: 'child-workflow',
      subWorkflowVersion: '1.0.0'
    };

    const mockContext: ExecutionContext = {
      nodeInstance: mockNodeInstance,
      workflowInstance: mockWorkflowInstance,
      nodeDefinition: mockSubprocessDef,
      config: {}
    };

    it('should throw error when subWorkflowName is missing', async () => {
      const invalidDef = { ...mockSubprocessDef, subWorkflowName: undefined };
      const invalidContext = { ...mockContext, nodeDefinition: invalidDef };

      const result = await service.executeSubProcessNode(invalidContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to execute subprocess node');
    });

    it('should execute existing subprocess instance when found', async () => {
      const existingInstance: WorkflowInstance = {
        id: 200,
        workflowDefinitionId: 2,
        name: 'Existing Child Workflow'
      } as any;

      const workflowDefinition: WorkflowDefinitionTable = {
        id: 2,
        name: 'child-workflow',
        version: '1.0.0'
      } as any;

      mockWorkflowInstanceService.findByExternalId = vi.fn().mockResolvedValue({
        success: true,
        data: existingInstance
      });

      mockWorkflowDefinitionService.getById = vi.fn().mockResolvedValue({
        success: true,
        data: workflowDefinition
      });

      mockWorkflowExecutionService.executeWorkflowInstance = vi
        .fn()
        .mockResolvedValue({
          success: true
        });

      const result = await service.executeSubProcessNode(mockContext);

      expect(result.success).toBe(true);
      expect(mockWorkflowInstanceService.findByExternalId).toHaveBeenCalledWith(
        'subprocess-node-1'
      );
      expect(mockWorkflowDefinitionService.getById).toHaveBeenCalledWith(2);
      expect(
        mockWorkflowExecutionService.executeWorkflowInstance
      ).toHaveBeenCalledWith(workflowDefinition, existingInstance);
    });

    it('should create new subprocess instance when not found', async () => {
      const newInstance: WorkflowInstance = {
        id: 300,
        workflowDefinitionId: 2,
        name: 'New Child Workflow'
      } as any;

      const workflowDefinition: WorkflowDefinitionTable = {
        id: 2,
        name: 'child-workflow',
        version: '1.0.0'
      } as any;

      mockWorkflowInstanceService.findByExternalId = vi.fn().mockResolvedValue({
        success: true,
        data: null // 不存在
      });

      mockWorkflowDefinitionService.getByNameAndVersion = vi
        .fn()
        .mockResolvedValue({
          success: true,
          data: workflowDefinition
        });

      mockWorkflowInstanceService.getWorkflowInstance = vi
        .fn()
        .mockResolvedValue({
          success: true,
          data: newInstance
        });

      mockWorkflowExecutionService.executeWorkflowInstance = vi
        .fn()
        .mockResolvedValue({
          success: true
        });

      const result = await service.executeSubProcessNode(mockContext);

      expect(result.success).toBe(true);
      expect(
        mockWorkflowDefinitionService.getByNameAndVersion
      ).toHaveBeenCalledWith('child-workflow', '1.0.0');
      expect(
        mockWorkflowInstanceService.getWorkflowInstance
      ).toHaveBeenCalledWith(
        workflowDefinition,
        expect.objectContaining({
          inputData: { input: 'test' },
          contextData: expect.objectContaining({
            externalId: 'subprocess-node-1',
            parentWorkflowInstanceId: 100,
            parentNodeId: 'subprocess-node-1'
          })
        })
      );
    });

    it('should use active version when subWorkflowVersion is not specified', async () => {
      const defWithoutVersion = {
        ...mockSubprocessDef,
        subWorkflowVersion: undefined
      };
      const contextWithoutVersion = {
        ...mockContext,
        nodeDefinition: defWithoutVersion
      };

      mockWorkflowInstanceService.findByExternalId = vi.fn().mockResolvedValue({
        success: true,
        data: null
      });

      mockWorkflowDefinitionService.getActiveByName = vi
        .fn()
        .mockResolvedValue({
          success: true,
          data: { id: 2, name: 'child-workflow', version: 'active' } as any
        });

      mockWorkflowInstanceService.getWorkflowInstance = vi
        .fn()
        .mockResolvedValue({
          success: true,
          data: { id: 300 } as any
        });

      mockWorkflowExecutionService.executeWorkflowInstance = vi
        .fn()
        .mockResolvedValue({
          success: true
        });

      const result = await service.executeSubProcessNode(contextWithoutVersion);

      expect(result.success).toBe(true);
      expect(
        mockWorkflowDefinitionService.getActiveByName
      ).toHaveBeenCalledWith('child-workflow');
    });

    it('should handle workflow definition not found error', async () => {
      mockWorkflowInstanceService.findByExternalId = vi.fn().mockResolvedValue({
        success: true,
        data: null
      });

      mockWorkflowDefinitionService.getByNameAndVersion = vi
        .fn()
        .mockResolvedValue({
          success: false,
          error: 'Workflow definition not found'
        });

      const result = await service.executeSubProcessNode(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to execute subprocess node');
    });

    it('should handle subprocess execution failure', async () => {
      const existingInstance: WorkflowInstance = {
        id: 200,
        workflowDefinitionId: 2
      } as any;

      mockWorkflowInstanceService.findByExternalId = vi.fn().mockResolvedValue({
        success: true,
        data: existingInstance
      });

      mockWorkflowDefinitionService.getById = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 2 } as any
      });

      mockWorkflowExecutionService.executeWorkflowInstance = vi
        .fn()
        .mockResolvedValue({
          success: false,
          error: 'Execution failed'
        });

      const result = await service.executeSubProcessNode(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to execute subprocess node');
    });
  });
});
