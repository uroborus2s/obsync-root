/**
 * API Gateway 数据库类型定义
 * 定义学生和教师信息表的类型结构
 */

import type {
  ColumnType,
  Insertable,
  Selectable,
  Updateable
} from '@stratix/database';

/**
 * 学生信息表（现有表 out_xsxx）
 */
export interface StudentInfoTable {
  /** 主键ID */
  id: string;
  /** 姓名 */
  xm: string | null;
  /** 学号 */
  xh: string | null;
  /** 学院代码 */
  xydm: string | null;
  /** 学院名称 */
  xymc: string | null;
  /** 专业代码 */
  zydm: string | null;
  /** 专业名称 */
  zymc: string | null;
  /** 班级代码 */
  bjdm: string | null;
  /** 班级名称 */
  bjmc: string | null;
  /** 性别 */
  xb: string | null;
  /** 民族 */
  mz: string | null;
  /** 身份证号 */
  sfzh: string | null;
  /** 手机号 */
  sjh: string | null;
  /** 所在年级 */
  sznj: string | null;
  /** 入学年份 */
  rxnf: string | null;
  /** 邮箱 */
  email: string | null;
  /** 类型 1本科生 2研究生 */
  lx: number | null;
  /** 更新时间 */
  update_time: ColumnType<Date, string | undefined, string> | null;
  /** 一卡通号 */
  ykth: string | null;
  /** 手机 */
  sj: string | null;
  /** 状态 */
  zt: string | null;
}

/**
 * 教师信息表（现有表 out_jsxx）
 */
export interface TeacherInfoTable {
  /** 主键ID */
  id: string;
  /** 姓名 */
  xm: string | null;
  /** 工号 */
  gh: string | null;
  /** 所属单位代码 */
  ssdwdm: string | null;
  /** 所属单位名称 */
  ssdwmc: string | null;
  /** 性别 */
  xb: string | null;
  /** 民族 */
  mz: string | null;
  /** 身份证号 */
  sfzh: string | null;
  /** 手机号 */
  sjh: string | null;
  /** 参加工作时间 */
  cjgzsj: ColumnType<Date, string | undefined, string> | null;
  /** 邮箱 */
  email: string | null;
  /** 职称 */
  zc: string | null;
  /** 最高学历 */
  zgxl: string | null;
  /** 学位 */
  xw: string | null;
  /** 政治面貌 */
  zzmm: string | null;
  /** 出生日期 */
  csrq: ColumnType<Date, string | undefined, string> | null;
  /** 更新时间 */
  update_time: ColumnType<Date, string | undefined, string> | null;
  /** 一卡通号 */
  ykth: string | null;
  /** 来源库时间 */
  sj: string | null;
  /** 状态标识 */
  zt: string | null;
}

/**
 * API Gateway 数据库接口
 */
export interface GatewayDatabase {
  /** 学生信息表 */
  out_xsxx: StudentInfoTable;
  /** 教师信息表 */
  out_jsxx: TeacherInfoTable;
}

// 导出便捷类型别名
export type StudentInfo = Selectable<StudentInfoTable>;
export type NewStudentInfo = Insertable<StudentInfoTable>;
export type StudentInfoUpdate = Updateable<StudentInfoTable>;

export type TeacherInfo = Selectable<TeacherInfoTable>;
export type NewTeacherInfo = Insertable<TeacherInfoTable>;
export type TeacherInfoUpdate = Updateable<TeacherInfoTable>;

/**
 * 查询条件类型
 */
export interface StudentSearchCriteria {
  /** 姓名 */
  name?: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
  /** 学号 */
  studentNumber?: string;
}

export interface TeacherSearchCriteria {
  /** 姓名 */
  name?: string;
  /** 邮箱 */
  email?: string;
  /** 手机号 */
  phone?: string;
  /** 工号 */
  employeeNumber?: string;
}
