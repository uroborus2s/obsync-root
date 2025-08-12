// @stratix/icasync 执行器导出
// 导出所有执行器，用于自动发现和注册

// 新增的执行器
export { default as AddParticipantExecutor } from './AddParticipantExecutor.js';
export { default as CreateOrUpdateCalendarExecutor } from './CreateOrUpdateCalendarExecutor.js';
export { default as DeleteSingleCalendarProcessor } from './DeleteSingleCalendarProcessor.js';

// 现有的执行器
export { default as CalendarCreationProcessor } from './CalendarCreationProcessor.js';
export { default as CalendarSyncWorkflowProcessor } from './CalendarSyncWorkflowProcessor.js';
export { default as ChangeDetectionProcessor } from './ChangeDetectionProcessor.js';
export { default as CleanupAndOptimizeProcessor } from './CleanupAndOptimizeProcessor.js';
export { default as DataAggregationProcessor } from './DataAggregationProcessor.js';
export { default as DeleteOldCalendarProcessor } from './DeleteOldCalendarProcessor.js';
export { default as FetchAllCalendarsProcessor } from './FetchAllCalendarsProcessor.js';
export { default as FetchChangedCalendarsProcessor } from './FetchChangedCalendarsProcessor.js';
export { default as FetchOldCalendarMappingsProcessor } from './FetchOldCalendarMappingsProcessor.js';
export { default as FetchSyncSourcesProcessor } from './FetchSyncSourcesProcessor.js';
export { default as FinalSummaryProcessor } from './FinalSummaryProcessor.js';
export { default as IncrementalCalendarProcessor } from './IncrementalCalendarProcessor.js';
export { default as IncrementalSummaryProcessor } from './IncrementalSummaryProcessor.js';
export { default as NoChangesSummaryProcessor } from './NoChangesSummaryProcessor.js';
export { default as ParticipantManagementProcessor } from './ParticipantManagementProcessor.js';
export { default as ScheduleCreationProcessor } from './ScheduleCreationProcessor.js';
export { default as StatusUpdateProcessor } from './StatusUpdateProcessor.js';
export { default as SyncCompletionProcessor } from './SyncCompletionProcessor.js';

// 导出类型定义
export type {
  AddParticipantConfig,
  AddParticipantResult,
  ParticipantData
} from './AddParticipantExecutor.js';
export type {
  CreateOrUpdateCalendarConfig,
  CreateOrUpdateCalendarResult
} from './CreateOrUpdateCalendarExecutor.js';
export type {
  DeleteSingleCalendarConfig,
  DeleteSingleCalendarResult
} from './DeleteSingleCalendarProcessor.js';
export type {
  FetchOldCalendarMappingsConfig,
  FetchOldCalendarMappingsResult,
  OldCalendarMapping
} from './FetchOldCalendarMappingsProcessor.js';
