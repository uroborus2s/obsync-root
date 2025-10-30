/**
 * WPS 多维表字段定义配置
 * 用于创建和管理 icalink_absent_student_relations 表对应的 WPS 多维表字段
 */

import { DBSheetFieldType, type DBSheetField } from '@stratix/was-v7';

export interface WpsDbSheetField extends DBSheetField {
  dbFieldName: string;
}
/**
 * 缺勤学生关系表的 WPS 多维表字段定义
 */
export const ABSENT_STUDENT_RELATION_FIELDS: WpsDbSheetField[] = [
  {
    name: 'ID',
    dbFieldName: 'id',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0' // 整数格式
    }
  },
  {
    name: '课程统计ID',
    dbFieldName: 'course_stats_id',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0'
    }
  },
  {
    name: '课程ID',
    dbFieldName: 'course_id',
    type: DBSheetFieldType.SingleLineText,
    data: {
      number_format: '0'
    }
  },
  {
    name: '课程代码',
    dbFieldName: 'course_code',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '课程名称',
    dbFieldName: 'course_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '学生ID',
    dbFieldName: 'student_id',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '学生姓名',
    dbFieldName: 'student_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '学院名称',
    dbFieldName: 'school_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '班级名称',
    dbFieldName: 'class_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '专业名称',
    dbFieldName: 'major_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '缺勤类型',
    dbFieldName: 'absence_type',
    type: DBSheetFieldType.SingleSelect,
    data: {
      allow_add_item_while_inputting: false,
      items: [
        { value: '缺勤', color: 3 }, // 橙色
        { value: '旷课', color: 1 }, // 红色
        { value: '请假', color: 5 }, // 绿色
        { value: '请假待审批', color: 4 } // 黄色
      ]
    }
  },
  {
    name: '学期',
    dbFieldName: 'semester',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '教学周',
    dbFieldName: 'teaching_week',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0'
    }
  },
  {
    name: '星期',
    dbFieldName: 'week_day',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0' // 1-7 表示星期一到星期日
    }
  },
  {
    name: '节次',
    dbFieldName: 'periods',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '时间段',
    dbFieldName: 'time_period',
    type: DBSheetFieldType.SingleSelect,
    data: {
      allow_add_item_while_inputting: false,
      items: [
        { value: '上午', color: 2 }, // 蓝色
        { value: '下午', color: 6 } // 紫色
      ]
    }
  },
  {
    name: '请假原因',
    dbFieldName: 'leave_reason',
    type: DBSheetFieldType.MultiLineText
  },
  {
    name: '创建时间',
    dbFieldName: 'created_at',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '更新时间',
    dbFieldName: 'updated_at',
    type: DBSheetFieldType.SingleLineText
  }
];

/**
 * 课程签到统计表的 WPS 多维表字段定义
 */
export const COURSE_CHECKIN_STATS_FIELDS: WpsDbSheetField[] = [
  {
    name: 'ID',
    dbFieldName: 'id',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0' // 整数格式
    }
  },
  {
    name: '统计日期',
    dbFieldName: 'stat_date',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '课程ID',
    dbFieldName: 'course_id',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0'
    }
  },
  {
    name: '外部ID',
    dbFieldName: 'external_id',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '课程代码',
    dbFieldName: 'course_code',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '课程名称',
    dbFieldName: 'course_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '上课地址',
    dbFieldName: 'class_location',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '教师姓名',
    dbFieldName: 'teacher_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '教师工号',
    dbFieldName: 'teacher_codes',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '学期',
    dbFieldName: 'semester',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '教学周',
    dbFieldName: 'teaching_week',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0'
    }
  },
  {
    name: '星期',
    dbFieldName: 'week_day',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0' // 1-7 表示星期一到星期日
    }
  },
  {
    name: '时间段',
    dbFieldName: 'time_period',
    type: DBSheetFieldType.SingleSelect,
    data: {
      allow_add_item_while_inputting: false,
      items: [
        { value: '上午', color: 2 }, // 蓝色
        { value: '下午', color: 6 } // 紫色
      ]
    }
  },
  {
    name: '节次',
    dbFieldName: 'periods',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '开始时间',
    dbFieldName: 'start_time',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '结束时间',
    dbFieldName: 'end_time',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '应到人数',
    dbFieldName: 'total_should_attend',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0'
    }
  },
  {
    name: '实到人数',
    dbFieldName: 'present_count',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0'
    }
  },
  {
    name: '缺勤人数',
    dbFieldName: 'absent_count',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0'
    }
  },
  {
    name: '旷课人数',
    dbFieldName: 'truant_count',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0'
    }
  },
  {
    name: '请假人数',
    dbFieldName: 'leave_count',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0'
    }
  },
  {
    name: '请假未审批人数',
    dbFieldName: 'leave_count',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0'
    }
  }
];

/**
 * 课程签到统计表的 WPS 多维表字段定义
 */
export const TEACHING_CLASS_FIELDS: WpsDbSheetField[] = [
  {
    name: '学号',
    dbFieldName: 'student_id',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '课程代码',
    dbFieldName: 'course_code',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '课程名称',
    dbFieldName: 'course_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '姓名',
    dbFieldName: 'name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '学院名称',
    dbFieldName: 'school_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '专业名称',
    dbFieldName: 'major_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '班级名称',
    dbFieldName: 'class_name',
    type: DBSheetFieldType.SingleLineText
  }
];

/**
 * 课程签到统计表的 WPS 多维表字段定义
 */
export const STUDENT_STATISTICS_FIELDS: WpsDbSheetField[] = [
  {
    name: '学号',
    dbFieldName: 'student_id',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '姓名',
    dbFieldName: 'name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '学院名称',
    dbFieldName: 'school_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '专业名称',
    dbFieldName: 'major_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '班级名称',
    dbFieldName: 'class_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '课节总数',
    dbFieldName: 'total_sessions',
    type: DBSheetFieldType.Number
  },
  {
    name: '已经上课节数',
    dbFieldName: 'completed_sessions',
    type: DBSheetFieldType.Number
  },
  {
    name: '缺勤节数',
    dbFieldName: 'absent_count',
    type: DBSheetFieldType.Number
  },
  {
    name: '请假节数',
    dbFieldName: 'leave_count',
    type: DBSheetFieldType.Number
  },
  {
    name: '旷课次数',
    dbFieldName: 'truant_count',
    type: DBSheetFieldType.Number
  },
  {
    name: '缺勤率%',
    dbFieldName: 'absence_rate',
    type: DBSheetFieldType.Number
  }
];

/**
 * 课程签到统计表的 WPS 多维表字段定义
 */
export const STUDENT_STATISTICS_DETAILS_FIELDS: WpsDbSheetField[] = [
  {
    name: '学号',
    dbFieldName: 'student_id',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '课程代码',
    dbFieldName: 'course_code',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '课程名称',
    dbFieldName: 'course_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '姓名',
    dbFieldName: 'name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '学院名称',
    dbFieldName: 'school_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '专业名称',
    dbFieldName: 'major_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '班级名称',
    dbFieldName: 'class_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '上课地址',
    dbFieldName: 'class_location',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '教师姓名',
    dbFieldName: 'teacher_name',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '教师工号',
    dbFieldName: 'teacher_codes',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '学期',
    dbFieldName: 'semester',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '教学周',
    dbFieldName: 'teaching_week',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0'
    }
  },
  {
    name: '星期',
    dbFieldName: 'week_day',
    type: DBSheetFieldType.Number,
    data: {
      number_format: '0' // 1-7 表示星期一到星期日
    }
  },
  {
    name: '时间段',
    dbFieldName: 'time_period',
    type: DBSheetFieldType.SingleSelect,
    data: {
      allow_add_item_while_inputting: false,
      items: [
        { value: '上午', color: 2 }, // 蓝色
        { value: '下午', color: 6 } // 紫色
      ]
    }
  },
  {
    name: '节次',
    dbFieldName: 'periods',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '开始时间',
    dbFieldName: 'start_time',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '结束时间',
    dbFieldName: 'end_time',
    type: DBSheetFieldType.SingleLineText
  },
  {
    name: '课节总数',
    dbFieldName: 'total_sessions',
    type: DBSheetFieldType.Number
  },
  {
    name: '已经上课节数',
    dbFieldName: 'completed_sessions',
    type: DBSheetFieldType.Number
  },
  {
    name: '缺勤节数',
    dbFieldName: 'absent_count',
    type: DBSheetFieldType.Number
  },
  {
    name: '请假节数',
    dbFieldName: 'leave_count',
    type: DBSheetFieldType.Number
  },
  {
    name: '旷课次数',
    dbFieldName: 'truant_count',
    type: DBSheetFieldType.Number
  },
  {
    name: '缺勤率%',
    dbFieldName: 'absence_rate',
    type: DBSheetFieldType.Number
  }
];

/**
 * 表同步配置列表
 * 定义需要同步到 WPS 多维表的所有表配置
 */
export const SHEET_LIST = [
  {
    name: '缺勤历史明细表',
    sheetId: 2,
    wpsFileds: ABSENT_STUDENT_RELATION_FIELDS,
    views: [
      {
        name: '缺勤详细列表',
        type: 'grid'
      }
    ],
    dbTableName: 'absentStudentRelationRepository',
    syncTaskName: 'absent_student_relations_sync'
  },
  {
    name: '课程历史统计表',
    sheetId: 3,
    wpsFileds: COURSE_CHECKIN_STATS_FIELDS,
    views: [
      {
        name: '课程统计详细列表',
        type: 'grid'
      }
    ],
    dbTableName: 'courseCheckinStatsRepository',
    syncTaskName: 'course_checkin_stats_sync'
  },
  {
    name: '教学班表',
    sheetId: 4,
    wpsFileds: TEACHING_CLASS_FIELDS,
    views: [
      {
        name: '教学班列表',
        type: 'grid'
      }
    ],
    dbTableName: 'vTeachingClassRepository',
    syncTaskName: 'v_teaching_class'
  },
  {
    name: '学生历史统计表',
    sheetId: 5,
    wpsFileds: STUDENT_STATISTICS_FIELDS,
    views: [
      {
        name: '学生签到历史列表',
        type: 'grid'
      }
    ],
    dbTableName: 'courseCheckinStatsRepository',
    syncTaskName: 'view_student_overall_attendance_stats'
  },
  {
    name: '学生历史统计详情表',
    sheetId: 6,
    wpsFileds: STUDENT_STATISTICS_DETAILS_FIELDS,
    views: [
      {
        name: '学生签到历史详情列表',
        type: 'grid'
      }
    ],
    dbTableName: 'courseCheckinStatsRepository',
    syncTaskName: 'view_student_overall_attendance_stats_details'
  }
];

/**
 * 缺勤类型映射（数据库值 -> 显示值）
 */
export const ABSENCE_TYPE_MAPPING: Record<string, string> = {
  absent: '缺勤',
  truant: '旷课',
  leave: '请假',
  leave_pending: '请假待审批'
};

/**
 * 时间段映射（数据库值 -> 显示值）
 */
export const TIME_PERIOD_MAPPING: Record<string, string> = {
  am: '上午',
  pm: '下午'
};

/**
 * 星期映射（数字 -> 中文）
 */
export const WEEK_DAY_MAPPING: Record<number, string> = {
  1: '星期一',
  2: '星期二',
  3: '星期三',
  4: '星期四',
  5: '星期五',
  6: '星期六',
  7: '星期日'
};

/**
 * WPS 颜色代码说明
 */
export const WPS_COLOR_CODES = {
  RED: 1, // 红色
  BLUE: 2, // 蓝色
  ORANGE: 3, // 橙色
  YELLOW: 4, // 黄色
  GREEN: 5, // 绿色
  PURPLE: 6, // 紫色
  GRAY: 7 // 灰色
} as const;

/**
 * 必填字段列表
 */
export const REQUIRED_FIELDS = [
  '课程统计ID',
  '课程ID',
  '课程代码',
  '课程名称',
  '学生ID',
  '学生姓名',
  '缺勤类型',
  '统计日期',
  '学期',
  '教学周',
  '星期',
  '时间段'
] as const;

/**
 * 可选字段列表
 */
export const OPTIONAL_FIELDS = [
  'ID',
  '学院名称',
  '班级名称',
  '专业名称',
  '节次',
  '请假原因',
  '创建时间',
  '更新时间'
] as const;

/**
 * 获取缺勤类型的显示值
 * @param absenceType 数据库中的缺勤类型值
 * @returns 显示值
 */
export function getAbsenceTypeLabel(absenceType: string): string {
  return ABSENCE_TYPE_MAPPING[absenceType] || absenceType;
}

/**
 * 获取时间段的显示值
 * @param timePeriod 数据库中的时间段值
 * @returns 显示值
 */
export function getTimePeriodLabel(timePeriod: string): string {
  return TIME_PERIOD_MAPPING[timePeriod] || timePeriod;
}

/**
 * 获取星期的中文显示
 * @param weekDay 星期数字（1-7）
 * @returns 中文显示
 */
export function getWeekDayLabel(weekDay: number): string {
  return WEEK_DAY_MAPPING[weekDay] || `星期${weekDay}`;
}

/**
 * 验证字段值是否有效
 * @param fieldName WPS 字段名
 * @param value 字段值
 * @returns 是否有效
 */
export function validateFieldValue(fieldName: string, value: any): boolean {
  // 必填字段不能为空
  if (REQUIRED_FIELDS.includes(fieldName as any)) {
    if (value === null || value === undefined || value === '') {
      return false;
    }
  }

  // 缺勤类型必须是有效值
  if (fieldName === '缺勤类型') {
    return Object.values(ABSENCE_TYPE_MAPPING).includes(value);
  }

  // 时间段必须是有效值
  if (fieldName === '时间段') {
    return Object.values(TIME_PERIOD_MAPPING).includes(value);
  }

  // 星期必须是 1-7
  if (fieldName === '星期') {
    return typeof value === 'number' && value >= 1 && value <= 7;
  }

  return true;
}

/**
 * 格式化日期为 WPS 支持的格式
 * @param date 日期对象
 * @returns 格式化后的日期字符串 (YYYY-MM-DD)
 */
export function formatDateForWps(date: Date): string {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 创建 WPS 多维表字段的辅助函数
 * @param fileId WPS 文件 ID
 * @param sheetId WPS Sheet ID
 * @param wasV7ApiDbsheet WPS DBSheet 适配器
 */
export async function createAbsentStudentRelationFields(
  fileId: string,
  sheetId: number,
  wasV7ApiDbsheet: any
): Promise<void> {
  await wasV7ApiDbsheet.createFields(fileId, sheetId, {
    fields: ABSENT_STUDENT_RELATION_FIELDS
  });
}

/**
 * 创建课程签到统计 WPS 多维表字段的辅助函数
 * @param fileId WPS 文件 ID
 * @param sheetId WPS Sheet ID
 * @param wasV7ApiDbsheet WPS DBSheet 适配器
 */
export async function createCourseCheckinStatsFields(
  fileId: string,
  sheetId: number,
  wasV7ApiDbsheet: any
): Promise<void> {
  await wasV7ApiDbsheet.createFields(fileId, sheetId, {
    fields: COURSE_CHECKIN_STATS_FIELDS
  });
}
