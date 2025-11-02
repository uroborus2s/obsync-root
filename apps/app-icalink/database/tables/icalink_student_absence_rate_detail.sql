-- =====================================================
-- 创建分批处理所需的数据库对象
-- =====================================================
-- 用途：创建实体表和日志表，用于存储缺课率数据和处理日志
-- 执行方式：mysql -u username -p icasync < create_batch_processing_tables.sql
-- =====================================================

-- =====================================================
-- 1. 创建实体表：t_student_absence_rate_detail
-- =====================================================

CREATE TABLE icalink_student_absence_rate_detail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL COMMENT '学生ID',
    student_name VARCHAR(100) COMMENT '学生姓名',
    semester VARCHAR(20) NOT NULL COMMENT '学年学期',
    school_name VARCHAR(100) COMMENT '学院名称',
    school_id VARCHAR(50) COMMENT '学院ID',
    class_name VARCHAR(100) COMMENT '班级名称',
    class_id VARCHAR(50) COMMENT '班级ID',
    major_name VARCHAR(100) COMMENT '专业名称',
    major_id VARCHAR(50) COMMENT '专业ID',
    grade VARCHAR(10) COMMENT '年级',
    gender VARCHAR(10) COMMENT '性别',
    people VARCHAR(10) COMMENT '民族',
    course_code VARCHAR(50) NOT NULL COMMENT '课程代码',
    course_name VARCHAR(200) COMMENT '课程名称',
    courser_id bigint(20) NOT NULL COMMENT '课程ID',
    course_unit_id VARCHAR(20) COMMENT '开课单位ID',
    course_unit VARCHAR(200) COMMENT '开课单位名称',
    teaching_class_code VARCHAR(100) COMMENT '教学班代码',
    total_sessions INT DEFAULT 0 COMMENT '课程总课次数',
    completed_sessions INT DEFAULT 0 COMMENT '已完成课次数',
    absent_count INT DEFAULT 0 COMMENT '缺勤次数',
    leave_count INT DEFAULT 0 COMMENT '请假次数',
    truant_count INT DEFAULT 0 COMMENT '旷课次数',
    absence_rate DECIMAL(10, 4) DEFAULT 0 COMMENT '缺课率',
    truant_rate DECIMAL(10, 4) DEFAULT 0 COMMENT '旷课率',
    leave_rate DECIMAL(10, 4) DEFAULT 0 COMMENT '请假率',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_student_id (student_id),
    INDEX idx_course_code (course_code),
    INDEX idx_absence_rate (absence_rate),
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生缺课率明细表（物化表）';

SELECT '✅ 实体表 icalink_student_absence_rate_detail 创建成功' AS status;
