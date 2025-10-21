// @wps/hltnlink CourseClass表Schema定义
// 用于自动表创建功能

import { DataColumnType, SchemaBuilder } from '@stratix/database';

/**
 * CourseClass表的Schema定义
 * 使用SchemaBuilder的流式API构建表结构
 * 注意：created_at 和 updated_at 字段由 BaseRepository 自动管理，无需手动定义
 */
export const courseClassTableSchema = SchemaBuilder.create('course_classes')
  .setComment('课程班级表 - 存储学生与课程的关联关系')

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

  // 学生信息
  .addColumn('student_number', DataColumnType.STRING, {
    length: 50,
    nullable: false,
    comment: '学号(xh)'
  })
  .addColumn('student_name', DataColumnType.STRING, {
    length: 100,
    nullable: false,
    comment: '学生姓名'
  })
  .addColumn('student_school', DataColumnType.STRING, {
    length: 255,
    nullable: true,
    comment: '学生学院'
  })
  .addColumn('student_major', DataColumnType.STRING, {
    length: 255,
    nullable: true,
    comment: '学生专业'
  })
  .addColumn('student_class', DataColumnType.STRING, {
    length: 100,
    nullable: true,
    comment: '学生班级'
  })

  // 学期信息
  .addColumn('xnxq', DataColumnType.STRING, {
    length: 20,
    nullable: false,
    comment: '学年学期，如：2024-2025-1'
  })

  // WPS相关信息
  .addColumn('wps_user_id', DataColumnType.STRING, {
    length: 50,
    nullable: true,
    comment: 'WPS用户ID'
  })
  .addColumn('wps_email', DataColumnType.STRING, {
    length: 255,
    nullable: true,
    comment: 'WPS邮箱地址'
  })

  // 权限和状态
  .addColumn('permission_type', DataColumnType.STRING, {
    length: 20,
    nullable: false,
    defaultValue: 'read',
    comment: '权限类型：read(只读)、write(读写)'
  })
  .addColumn('share_status', DataColumnType.STRING, {
    length: 20,
    nullable: false,
    defaultValue: 'PENDING',
    comment: '分享状态：PENDING(待分享)、SHARED(已分享)、FAILED(分享失败)'
  })

  // 额外信息
  .addColumn('extra_info', DataColumnType.TEXT, {
    nullable: true,
    comment: '额外的JSON格式学生信息'
  })

  // 索引配置
  .addIndex('idx_course_classes_calendar_id', ['calendar_id'])
  .addIndex('idx_course_classes_course_id', ['course_id'])
  .addIndex('idx_course_classes_student_number', ['student_number'])
  .addIndex('idx_course_classes_xnxq', ['xnxq'])
  .addIndex('idx_course_classes_share_status', ['share_status'])
  .addIndex('idx_course_classes_wps_user_id', ['wps_user_id'])
  .addUniqueIndex('idx_course_classes_calendar_student', [
    'calendar_id',
    'student_number'
  ])

  // 构建最终的TableSchema
  .build();
