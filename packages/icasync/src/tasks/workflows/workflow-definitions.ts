// @stratix/icasync 工作流定义
// 定义全量同步和增量同步的完整工作流

import type { WorkflowDefinition } from '@stratix/tasks';
import { IcasyncTaskType } from '../types/task-types.js';

/**
 * 全量同步工作流定义
 * 
 * 执行完整的课表数据同步流程：
 * 1. 数据验证和清理
 * 2. 数据聚合
 * 3. 日历管理
 * 4. 参与者管理
 * 5. 日程创建
 * 6. 状态更新和完成
 */
export const FULL_SYNC_WORKFLOW: WorkflowDefinition = {
  name: '全量同步工作流',
  description: '完整的课表数据同步到WPS日历',
  version: '1.0.0',
  tasks: [
    // === 阶段1：数据准备 ===
    {
      id: 'data-validation',
      name: '数据验证',
      type: IcasyncTaskType.DATA_VALIDATION,
      description: '验证数据库连接和数据完整性',
      config: {
        validateConnections: true,
        validateData: true,
        checkDataIntegrity: true
      },
      timeout: 60000, // 1分钟
      retries: 2
    },
    {
      id: 'data-cleanup',
      name: '数据清理',
      type: IcasyncTaskType.DATA_CLEANUP,
      description: '清理现有的聚合数据',
      config: {
        clearExistingData: true,
        preserveBackup: true
      },
      dependsOn: ['data-validation'],
      timeout: 300000, // 5分钟
      retries: 1
    },
    {
      id: 'data-aggregation',
      name: '数据聚合',
      type: IcasyncTaskType.DATA_AGGREGATION,
      description: '聚合课程数据到任务表',
      config: {
        useNativeSQL: true,
        batchSize: 1000,
        parallel: false
      },
      dependsOn: ['data-cleanup'],
      timeout: 600000, // 10分钟
      retries: 3
    },
    
    // === 阶段2：日历管理 ===
    {
      id: 'calendar-cleanup',
      name: '日历清理',
      type: IcasyncTaskType.CALENDAR_DELETION,
      description: '删除学期内所有现有日历',
      config: {
        deleteAllForSemester: true,
        batchSize: 50
      },
      dependsOn: ['data-aggregation'],
      timeout: 900000, // 15分钟
      retries: 2
    },
    {
      id: 'calendar-creation',
      name: '日历创建',
      type: IcasyncTaskType.CALENDAR_CREATION,
      description: '批量创建课程日历',
      config: {
        batchSize: 50,
        parallel: true,
        maxConcurrency: 10
      },
      dependsOn: ['calendar-cleanup'],
      timeout: 1200000, // 20分钟
      retries: 3
    },
    
    // === 阶段3：参与者管理 ===
    {
      id: 'participant-management',
      name: '参与者管理',
      type: IcasyncTaskType.PARTICIPANT_ADDITION,
      description: '添加日历参与者',
      config: {
        batchSize: 100,
        parallel: true,
        maxConcurrency: 20
      },
      dependsOn: ['calendar-creation'],
      timeout: 900000, // 15分钟
      retries: 2
    },
    
    // === 阶段4：日程创建 ===
    {
      id: 'schedule-creation',
      name: '日程创建',
      type: IcasyncTaskType.SCHEDULE_CREATION,
      description: '创建课程日程',
      config: {
        batchSize: 200,
        parallel: true,
        maxConcurrency: 15
      },
      dependsOn: ['participant-management'],
      timeout: 1800000, // 30分钟
      retries: 3
    },
    
    // === 阶段5：完成处理 ===
    {
      id: 'status-update',
      name: '状态更新',
      type: IcasyncTaskType.STATUS_UPDATE,
      description: '更新同步状态',
      config: {
        markAsCompleted: true,
        updateTimestamp: true
      },
      dependsOn: ['schedule-creation'],
      timeout: 120000, // 2分钟
      retries: 2
    },
    {
      id: 'sync-completion',
      name: '同步完成',
      type: IcasyncTaskType.SYNC_COMPLETION,
      description: '生成同步报告并发送通知',
      config: {
        generateReport: true,
        sendNotification: true,
        cleanupTempData: true
      },
      dependsOn: ['status-update'],
      timeout: 180000, // 3分钟
      retries: 1
    }
  ],
  options: {
    parallel: false,  // 阶段间串行执行
    timeout: 3600000, // 总超时：60分钟
    retries: 2,       // 工作流级别重试
    onFailure: 'stop', // 失败时停止执行
    onSuccess: 'complete' // 成功时标记完成
  },
  metadata: {
    category: 'sync',
    priority: 'high',
    estimatedDuration: 3600000, // 预估1小时
    resourceRequirements: {
      memory: '512MB',
      cpu: '2 cores',
      network: 'high'
    }
  }
};

/**
 * 增量同步工作流定义
 * 
 * 执行增量的课表数据同步流程：
 * 1. 变更检测
 * 2. 删除处理
 * 3. 更新处理
 * 4. 新增处理
 * 5. 完成处理
 */
export const INCREMENTAL_SYNC_WORKFLOW: WorkflowDefinition = {
  name: '增量同步工作流',
  description: '检测变更并增量同步到WPS日历',
  version: '1.0.0',
  tasks: [
    // === 阶段1：变更检测 ===
    {
      id: 'change-detection',
      name: '变更检测',
      type: IcasyncTaskType.DATA_VALIDATION,
      description: '检测课程数据变更',
      config: {
        detectChanges: true,
        compareWithExisting: true,
        generateChangeReport: true
      },
      timeout: 180000, // 3分钟
      retries: 2
    },
    
    // === 阶段2：删除处理 ===
    {
      id: 'handle-deletions',
      name: '处理删除',
      type: IcasyncTaskType.SCHEDULE_DELETION,
      description: '删除已取消的课程日程',
      config: {
        processDeletedCourses: true,
        batchSize: 100,
        parallel: true,
        maxConcurrency: 10
      },
      dependsOn: ['change-detection'],
      timeout: 300000, // 5分钟
      retries: 2
    },
    {
      id: 'remove-participants',
      name: '移除参与者',
      type: IcasyncTaskType.PARTICIPANT_REMOVAL,
      description: '移除已删除课程的参与者',
      config: {
        processRemovedParticipants: true,
        batchSize: 150,
        parallel: true,
        maxConcurrency: 15
      },
      dependsOn: ['change-detection'],
      timeout: 240000, // 4分钟
      retries: 2
    },
    
    // === 阶段3：更新处理 ===
    {
      id: 'update-aggregation',
      name: '更新聚合',
      type: IcasyncTaskType.DATA_AGGREGATION,
      description: '增量聚合变更的数据',
      config: {
        incrementalMode: true,
        useNativeSQL: true,
        batchSize: 500
      },
      dependsOn: ['handle-deletions', 'remove-participants'],
      timeout: 300000, // 5分钟
      retries: 3
    },
    {
      id: 'update-calendars',
      name: '更新日历',
      type: IcasyncTaskType.CALENDAR_UPDATE,
      description: '更新已修改的日历',
      config: {
        updateModifiedOnly: true,
        batchSize: 50,
        parallel: true,
        maxConcurrency: 8
      },
      dependsOn: ['update-aggregation'],
      timeout: 480000, // 8分钟
      retries: 2
    },
    {
      id: 'update-schedules',
      name: '更新日程',
      type: IcasyncTaskType.SCHEDULE_UPDATE,
      description: '更新已修改的日程',
      config: {
        updateModifiedOnly: true,
        batchSize: 100,
        parallel: true,
        maxConcurrency: 12
      },
      dependsOn: ['update-calendars'],
      timeout: 600000, // 10分钟
      retries: 2
    },
    
    // === 阶段4：新增处理 ===
    {
      id: 'create-new-calendars',
      name: '创建新日历',
      type: IcasyncTaskType.CALENDAR_CREATION,
      description: '创建新增课程的日历',
      config: {
        createNewOnly: true,
        batchSize: 30,
        parallel: true,
        maxConcurrency: 8
      },
      dependsOn: ['update-aggregation'],
      timeout: 360000, // 6分钟
      retries: 3
    },
    {
      id: 'add-new-participants',
      name: '添加新参与者',
      type: IcasyncTaskType.PARTICIPANT_ADDITION,
      description: '为新日历添加参与者',
      config: {
        addNewOnly: true,
        batchSize: 80,
        parallel: true,
        maxConcurrency: 15
      },
      dependsOn: ['create-new-calendars'],
      timeout: 300000, // 5分钟
      retries: 2
    },
    {
      id: 'create-new-schedules',
      name: '创建新日程',
      type: IcasyncTaskType.SCHEDULE_CREATION,
      description: '创建新增课程的日程',
      config: {
        createNewOnly: true,
        batchSize: 120,
        parallel: true,
        maxConcurrency: 10
      },
      dependsOn: ['add-new-participants'],
      timeout: 480000, // 8分钟
      retries: 3
    },
    
    // === 阶段5：完成处理 ===
    {
      id: 'incremental-completion',
      name: '增量同步完成',
      type: IcasyncTaskType.SYNC_COMPLETION,
      description: '生成增量同步报告',
      config: {
        incrementalMode: true,
        generateChangeReport: true,
        sendNotification: true,
        updateLastSyncTime: true
      },
      dependsOn: ['update-schedules', 'create-new-schedules'],
      timeout: 120000, // 2分钟
      retries: 1
    }
  ],
  options: {
    parallel: true,   // 支持并行执行
    timeout: 1800000, // 总超时：30分钟
    retries: 2,       // 工作流级别重试
    onFailure: 'continue', // 失败时继续执行其他任务
    onSuccess: 'complete'  // 成功时标记完成
  },
  metadata: {
    category: 'sync',
    priority: 'medium',
    estimatedDuration: 1200000, // 预估20分钟
    resourceRequirements: {
      memory: '256MB',
      cpu: '1 core',
      network: 'medium'
    }
  }
};

/**
 * 快速同步工作流定义（用于测试或小规模同步）
 */
export const QUICK_SYNC_WORKFLOW: WorkflowDefinition = {
  name: '快速同步工作流',
  description: '快速的课表数据同步（适用于测试或小规模数据）',
  version: '1.0.0',
  tasks: [
    {
      id: 'quick-validation',
      name: '快速验证',
      type: IcasyncTaskType.DATA_VALIDATION,
      description: '快速验证数据和连接',
      config: {
        validateConnections: true,
        skipDataIntegrityCheck: true
      },
      timeout: 30000, // 30秒
      retries: 1
    },
    {
      id: 'quick-aggregation',
      name: '快速聚合',
      type: IcasyncTaskType.DATA_AGGREGATION,
      description: '快速聚合少量数据',
      config: {
        useNativeSQL: true,
        batchSize: 100,
        limitRecords: 1000
      },
      dependsOn: ['quick-validation'],
      timeout: 120000, // 2分钟
      retries: 2
    },
    {
      id: 'quick-calendar-sync',
      name: '快速日历同步',
      type: IcasyncTaskType.CALENDAR_CREATION,
      description: '快速创建少量日历',
      config: {
        batchSize: 20,
        parallel: true,
        maxConcurrency: 5,
        limitCalendars: 100
      },
      dependsOn: ['quick-aggregation'],
      timeout: 300000, // 5分钟
      retries: 2
    },
    {
      id: 'quick-completion',
      name: '快速完成',
      type: IcasyncTaskType.SYNC_COMPLETION,
      description: '快速完成同步',
      config: {
        generateReport: false,
        sendNotification: false
      },
      dependsOn: ['quick-calendar-sync'],
      timeout: 30000, // 30秒
      retries: 1
    }
  ],
  options: {
    parallel: true,
    timeout: 600000, // 总超时：10分钟
    retries: 1,
    onFailure: 'stop',
    onSuccess: 'complete'
  },
  metadata: {
    category: 'test',
    priority: 'low',
    estimatedDuration: 300000, // 预估5分钟
    resourceRequirements: {
      memory: '128MB',
      cpu: '0.5 cores',
      network: 'low'
    }
  }
};
