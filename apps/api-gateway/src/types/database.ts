import { ColumnType } from '@stratix/database';

/**
 * 数据库表结构定义
 */
export interface IcalinkDatabase {
  icalink_contacts: IcalinkContact;
}

/**
 * 联系人表实体（基于 v_contacts 视图）
 * 统一了教师和学生的联系信息
 */
export interface IcalinkContact {
  id: ColumnType<number, number | undefined, number>;
  user_id: string;
  user_name: string;
  school_id: string | null;
  school_name: string | null;
  major_id: string | null;
  major_name: string | null;
  class_id: string | null;
  class_name: string | null;
  gender: string | null;
  grade: string | null;
  people: string | null;
  position: string | null;
  role: 'teacher' | 'student';
}
