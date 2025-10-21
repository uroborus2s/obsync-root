// @wps/hltnlink CalendarSchedule表Schema定义
// 用于自动表创建功能

import { DataColumnType, SchemaBuilder } from '@stratix/database';

/**
 * CalendarSchedule表的Schema定义
 * 使用SchemaBuilder的流式API构建表结构
 * 注意：created_at 和 updated_at 字段由 BaseRepository 自动管理，无需手动定义
 */
export const calendarScheduleTableSchema = SchemaBuilder.create(
  'calendar_schedules'
)
  .setComment('日历课程表 - 存储具体的课程安排')

  // 主键字段
  .addColumn('id', DataColumnType.INTEGER, {
    primaryKey: true,
    autoIncrement: true,
    nullable: false,
    comment: '记录ID，主键'
  })

  // 外键关联
  .addColumn('calendar_id', DataColumnType.INTEGER, {
    nullable: false,
    comment: '关联的日历ID'
  })
  .addForeignKey(
    'calendar_id',
    'calendars',
    'calendar_id',
    'CASCADE',
    'CASCADE'
  )

  // 课程和事件信息
  .addColumn('course_id', DataColumnType.STRING, {
    length: 50,
    nullable: false,
    comment: '课程ID'
  })
  .addColumn('wps_event_id', DataColumnType.STRING, {
    length: 100,
    nullable: true,
    comment: 'WPS事件ID'
  })
  .addColumn('event_title', DataColumnType.STRING, {
    length: 200,
    nullable: false,
    comment: '事件标题'
  })
  .addColumn('event_description', DataColumnType.TEXT, {
    nullable: true,
    comment: '事件描述'
  })

  // 时间信息
  .addColumn('start_time', DataColumnType.TIMESTAMP, {
    nullable: false,
    comment: '开始时间'
  })
  .addColumn('end_time', DataColumnType.TIMESTAMP, {
    nullable: false,
    comment: '结束时间'
  })

  // 地点信息
  .addColumn('classroom', DataColumnType.STRING, {
    length: 100,
    nullable: true,
    comment: '教室'
  })
  .addColumn('building', DataColumnType.STRING, {
    length: 100,
    nullable: true,
    comment: '教学楼'
  })
  .addColumn('campus', DataColumnType.STRING, {
    length: 100,
    nullable: true,
    comment: '校区'
  })

  // 课程安排信息
  .addColumn('week_number', DataColumnType.INTEGER, {
    nullable: true,
    comment: '周次'
  })
  .addColumn('weekday', DataColumnType.INTEGER, {
    nullable: true,
    comment: '星期几(1-7)'
  })
  .addColumn('class_period', DataColumnType.STRING, {
    length: 50,
    nullable: true,
    comment: '节次'
  })
  .addColumn('class_time', DataColumnType.STRING, {
    length: 100,
    nullable: true,
    comment: '上课时间'
  })

  // 学期信息
  .addColumn('xnxq', DataColumnType.STRING, {
    length: 20,
    nullable: false,
    comment: '学年学期，如：2024-2025-1'
  })

  // 重复和同步信息
  .addColumn('recurrence_type', DataColumnType.STRING, {
    length: 20,
    nullable: true,
    comment: '重复类型：NONE(不重复)、WEEKLY(每周)、CUSTOM(自定义)'
  })
  .addColumn('sync_status', DataColumnType.STRING, {
    length: 20,
    nullable: false,
    defaultValue: 'PENDING',
    comment: '同步状态：PENDING(待同步)、SYNCED(已同步)、FAILED(同步失败)'
  })

  // 元数据
  .addColumn('metadata', DataColumnType.TEXT, {
    nullable: true,
    comment: '额外的JSON格式元数据'
  })

  // 索引配置
  .addIndex('idx_calendar_schedules_calendar_id', ['calendar_id'])
  .addIndex('idx_calendar_schedules_course_id', ['course_id'])
  .addIndex('idx_calendar_schedules_wps_event_id', ['wps_event_id'])
  .addIndex('idx_calendar_schedules_start_time', ['start_time'])
  .addIndex('idx_calendar_schedules_end_time', ['end_time'])
  .addIndex('idx_calendar_schedules_xnxq', ['xnxq'])
  .addIndex('idx_calendar_schedules_sync_status', ['sync_status'])
  .addIndex('idx_calendar_schedules_week_weekday', ['week_number', 'weekday'])
  .addIndex('idx_calendar_schedules_time_range', ['start_time', 'end_time'])

  // 构建最终的TableSchema
  .build();
