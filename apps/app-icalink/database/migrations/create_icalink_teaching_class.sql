
ALTER TABLE syncdb.out_jw_kc
CHARACTER SET utf8mb4  -- 字符集改为 utf8mb4
COLLATE utf8mb4_unicode_ci;

ALTER TABLE syncdb.out_jw_kc MODIFY COLUMN kcbh VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE syncdb.out_jw_kc MODIFY COLUMN kcmc VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;


CREATE TABLE icasync.icalink_teaching_class (
  id INT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  student_id VARCHAR(40) COMMENT '学生ID（可空，继承视图）',
  student_name VARCHAR(200) COMMENT '学生姓名（可空，继承视图）',
  school_name VARCHAR(90) COMMENT '学校名称（可空，继承视图）',
  college_code VARCHAR(30) COMMENT '学院代码（可空，继承视图）',
  major_name VARCHAR(90) COMMENT '专业名称（可空，继承视图）',
  class_name VARCHAR(90) COMMENT '班级名称（可空，继承视图）',
  course_code VARCHAR(60) NOT NULL COMMENT '课程代码（非空，继承视图）',  -- 视图中为NO（非空）
  teaching_class_code VARCHAR(60) NOT NULL COMMENT '课程编号（非空，继承视图）',  -- 视图中为NO（非空）
  course_name VARCHAR(200) NOT NULL COMMENT '课程名称（非空，继承视图）',  -- 视图中为NO（非空）
  course_unit VARCHAR(200) COMMENT '开课单位（可空，继承视图）',
  PRIMARY KEY (id)  -- 自增id为主键
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT '基于v_teaching_class的表（含自增id）';

ALTER TABLE icasync.icalink_course_checkin_stats
ADD COLUMN `need_checkin` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否需要签到：1=需要，0=不需要';

ALTER TABLE icasync.icasync_attendance_courses
ADD COLUMN `need_checkin` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否需要签到：1=需要，0=不需要';