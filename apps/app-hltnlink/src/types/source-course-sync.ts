// @wps/hltnlink 源数据同步类型定义
// 基于外部API接口的数据同步类型

/**
 * 外部API返回的课程数据结构（文档用途）
 * 实际使用中直接保存原始数据，不做类型转换
 */
export interface ApiSourceCourseData {
  /** 结束节次 */
  JSJC: string;
  /** 开始节次 */
  KSJC: string;
  /** 结束时间 */
  JSSJ: string;
  /** 上课周次 */
  SKZC: string;
  /** 教师工号 */
  JSGH: string;
  /** 教学任务ID */
  JXRWID: string;
  /** 课程名称 */
  KCMC: string;
  /** 行ID */
  ROW_ID: number;
  /** 开课学期码 */
  KKXQM: string;
  /** 星期几 */
  XQJ: string;
  /** 上课教室名称 */
  SKJSMC: string;
  /** 课程号 */
  KCH: string;
  /** 周状态 */
  ZZT: string;
  /** 单节值 */
  DJZ: string;
  /** 备注 */
  BZ: string;
  /** 课序号 */
  KXH: string;
  /** ID */
  ID: string;
  /** 教师姓名 */
  JSXM: string;
  /** 开始时间 */
  KSSJ: string;
  /** 教室号 */
  JSH: string;
}

/**
 * 外部API返回的选课数据结构（文档用途）
 * 实际使用中直接保存原始数据，不做类型转换
 */
export interface ApiSourceCourseSelectionData {
  /** 选课状态 */
  XKZT: string;
  /** 选课方式代码 */
  XKFSDM: string;
  /** 选课ID */
  XKID: string;
  /** 修读类别代码 */
  XDLBDM: string;
  /** 课程名称 */
  KCMC: string;
  /** 行ID */
  ROW_ID: number;
  /** 开课学期码 */
  KKXQM: string;
  /** 课程号 */
  KCH: string;
  /** 修读类别名称 */
  XDLBMC: string;
  /** 学生姓名 */
  XSXM: string;
  /** 选课课号 */
  XKKH: string;
  /** 选课方式名称 */
  XKFSMC: string;
  /** 学生ID */
  XSID: string;
  /** 课序号ID */
  KXHID: string;
}

/**
 * 数据同步配置
 */
export interface SourceDataSyncConfig {
  /** API基础URL */
  url: string;
  /** 应用ID */
  appId: string;
  /** 应用密钥 */
  appSecret: string;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 分页大小 */
  pageSize?: number;
  /** 批次保留数量 */
  maxBatchesToKeep?: number;
}

/**
 * API响应结构
 */
export interface ApiResponse<T = any> {
  /** 响应数据 */
  data: {
    /** 数据列表 */
    list: T[];
    /** 总页数 */
    totalPages: number;
    /** 当前页 */
    currentPage: number;
    /** 每页大小 */
    pageSize: number;
    /** 总记录数 */
    totalCount: number;
  };
  /** 状态码 */
  code: number;
  /** 消息 */
  message: string;
}

/**
 * 数据类型映射
 */
export const COURSE_DATA_TYPES = {
  /** 课程数据 */
  COURSE: '6a7e3d6566aa348acb131ee6287de1ca',
  /** 选课数据 */
  COURSESELECTION: '88edfcbb9f66e86b3cd490ebf2ed40de'
} as const;
