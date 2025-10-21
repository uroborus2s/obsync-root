// @wps/hltnlink Calendar表Schema定义
// 用于自动表创建功能

import { DataColumnType, SchemaBuilder } from '@stratix/database';

/**
 * Calendar表的Schema定义
 * 使用SchemaBuilder的流式API构建表结构
 * 注意：created_at 和 updated_at 字段由 BaseRepository 自动管理，无需手动定义
 */
export const calendarTableSchema = SchemaBuilder.create('calendars')
  .setComment('日历表 - 存储课程日历信息')
  .addPrimaryKey('id')

  // WPS日历ID - 唯一标识
  .addColumn('wps_calendar_id', DataColumnType.STRING, {
    length: 100,
    nullable: false,
    unique: true,
    comment: 'WPS日历ID，唯一标识'
  })

  // 课程信息
  .addColumn('course_id', DataColumnType.STRING, {
    length: 50,
    nullable: false,
    comment: '课程ID'
  })
  .addColumn('course_name', DataColumnType.STRING, {
    length: 200,
    nullable: false,
    comment: '课程名称'
  })

  // 教师信息
  .addColumn('teacher_id', DataColumnType.STRING, {
    length: 50,
    nullable: false,
    comment: '教师ID'
  })
  .addColumn('teacher_name', DataColumnType.STRING, {
    length: 100,
    nullable: false,
    comment: '教师姓名'
  })

  // 学期信息
  .addColumn('xnxq', DataColumnType.STRING, {
    length: 20,
    nullable: false,
    comment: '学年学期，如：2024-2025-1'
  })

  // 状态信息
  .addColumn('status', DataColumnType.STRING, {
    length: 20,
    nullable: false,
    defaultValue: 'ACTIVE',
    comment: '日历状态：ACTIVE(活跃)、INACTIVE(非活跃)、ARCHIVED(已归档)'
  })

  // 元数据
  .addColumn('metadata', DataColumnType.TEXT, {
    nullable: true,
    comment: '额外的JSON格式元数据'
  })

  // 索引配置
  .addUniqueIndex('idx_calendars_wps_calendar_id', ['wps_calendar_id'])
  .addIndex('idx_calendars_course_id', ['course_id'])
  .addIndex('idx_calendars_teacher_id', ['teacher_id'])
  .addIndex('idx_calendars_xnxq', ['xnxq'])
  .addIndex('idx_calendars_status', ['status'])
  .addUniqueIndex('idx_calendars_course_teacher_xnxq', [
    'course_id',
    'teacher_id',
    'xnxq'
  ])

  // 构建最终的TableSchema
  .build();
