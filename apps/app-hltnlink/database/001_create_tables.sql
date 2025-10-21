-- =================================================================
-- 日历表 (calendars) - WPS日历与课程的映射关系表
-- =================================================================
-- 业务关系: WPS日历 ↔ 课程：一对一映射关系，一个日历对应一门课程
-- 
CREATE TABLE IF NOT EXISTS calendars (
    -- 主键：日历ID
    calendar_id VARCHAR(200) PRIMARY KEY,
    
    -- WPS日历信息
    wps_calendar_id VARCHAR(50) NOT NULL UNIQUE COMMENT 'WPS平台的日历ID',
    calendar_name VARCHAR(255) NOT NULL COMMENT '课程日历名称',
    calendar_summary TEXT COMMENT '日历描述信息',
    
    -- 课程信息
    course_id VARCHAR(50) NOT NULL COMMENT '课程ID',
    course_name VARCHAR(255) NOT NULL COMMENT '课程名称',
    course_code VARCHAR(50) COMMENT '课程编码',
    
    -- 教师信息
    teacher_name VARCHAR(100) NOT NULL COMMENT '授课教师姓名',
    teacher_id VARCHAR(50) NOT NULL COMMENT '授课教师ID/工号',
    
    -- 学期信息
    academic_year VARCHAR(20) COMMENT '学年，如：2024-2025',
    semester VARCHAR(10) COMMENT '学期，如：1(上学期)、2(下学期)',
    xnxq VARCHAR(20) COMMENT '学年学期组合，如：2024-2025-1',
    
    -- 扩展字段
    metadata TEXT COMMENT '额外的JSON格式元数据',
    
    -- 系统字段
    status VARCHAR(20) DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE(活跃)、INACTIVE(非活跃)、ARCHIVED(已归档)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 索引
    UNIQUE(course_id, xnxq) COMMENT '同一学期同一课程只能有一个日历'
);

-- =================================================================
-- 开课班表 (course_classes) - 日历分享者与选课学生的映射关系表
-- =================================================================
-- 业务关系: 日历分享者 ↔ 开课班学生：日历的分享者对应该课程的选课学生信息
--
CREATE TABLE IF NOT EXISTS course_classes (
    -- 主键
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 外键关联
    calendar_id INTEGER NOT NULL COMMENT '关联的日历ID',
    course_id VARCHAR(50) NOT NULL COMMENT '课程ID',
    
    -- 学生基本信息
    student_number VARCHAR(50) NOT NULL COMMENT '学号(xh)',
    student_name VARCHAR(100) NOT NULL COMMENT '学生姓名',
    student_school VARCHAR(255) COMMENT '学生学院',
    student_major VARCHAR(255) COMMENT '学生专业',
    student_class VARCHAR(100) COMMENT '学生班级',
    -- 学期信息
    xnxq VARCHAR(20) NOT NULL COMMENT '学年学期，如：2024-2025-1',
    -- WPS用户信息
    wps_user_id VARCHAR(50) COMMENT 'WPS用户ID',
    wps_email VARCHAR(255) COMMENT 'WPS邮箱地址',
    permission_type VARCHAR(20) DEFAULT 'READ' COMMENT '权限类型：read(只读)、write(读写)',
    share_status VARCHAR(20) DEFAULT 'PENDING' COMMENT '分享状态：PENDING(待分享)、SHARED(已分享)、FAILED(分享失败)',
    -- 扩展字段
    extra_info TEXT COMMENT '额外的JSON格式学生信息',
    -- 系统字段
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
    -- 外键约束
    FOREIGN KEY (calendar_id) REFERENCES calendars(calendar_id) ON DELETE CASCADE,
    -- 唯一约束
    UNIQUE(calendar_id, student_number) COMMENT '同一日历下学生不能重复',
    UNIQUE(course_id, student_number, xnxq) COMMENT '同一学期同一课程下学生不能重复'
);

-- =================================================================
-- 日历课程表 (calendar_schedules) - 日历日程与课程节次的映射关系表
-- =================================================================
-- 业务关系: 日历日程 ↔ 课程节次：日历中的每个日程对应课程的每一节课
--
CREATE TABLE IF NOT EXISTS calendar_schedules (
    -- 主键
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 外键关联
    calendar_id INTEGER NOT NULL COMMENT '关联的日历ID',
    course_id VARCHAR(50) NOT NULL COMMENT '课程ID',
    
    -- WPS日程信息
    wps_event_id VARCHAR(50) COMMENT 'WPS日程ID',
    event_title VARCHAR(255) NOT NULL COMMENT '日程标题',
    event_description TEXT COMMENT '日程描述',
    
    -- 课程时间信息
    start_time DATETIME NOT NULL COMMENT '开始时间',
    end_time DATETIME NOT NULL COMMENT '结束时间',    
    -- 课程地点信息
    classroom VARCHAR(255) COMMENT '教室/上课地点',
    building VARCHAR(255) COMMENT '教学楼',
    campus VARCHAR(100) COMMENT '校区',
    -- 课程安排信息
    week_number INTEGER COMMENT '第几周',
    weekday INTEGER COMMENT '星期几(1-7，1为周一)',
    class_period VARCHAR(50) COMMENT '第几节课，如：1-2节',
    class_time VARCHAR(50) COMMENT '上课时间段，如：08:00-09:40',
    -- 学期信息
    xnxq VARCHAR(20) NOT NULL COMMENT '学年学期，如：2024-2025-1',
    recurrence_type VARCHAR(20) COMMENT '重复类型：NONE(不重复)、WEEKLY(每周)、CUSTOM(自定义)',
    
    -- 状态信息
    sync_status VARCHAR(20) DEFAULT 'PENDING' COMMENT '同步状态：PENDING(待同步)、SYNCED(已同步)、FAILED(同步失败)',
    
    -- 扩展字段
    metadata TEXT COMMENT '额外的JSON格式课程安排信息',
    
    -- 系统字段
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 外键约束
    FOREIGN KEY (calendar_id) REFERENCES calendars(calendar_id) ON DELETE CASCADE
);

-- =================================================================
-- 索引优化
-- =================================================================

-- calendars表索引
CREATE INDEX IF NOT EXISTS idx_calendars_wps_calendar_id ON calendars(wps_calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendars_course_id ON calendars(course_id);
CREATE INDEX IF NOT EXISTS idx_calendars_teacher_id ON calendars(teacher_id);
CREATE INDEX IF NOT EXISTS idx_calendars_xnxq ON calendars(xnxq);
CREATE INDEX IF NOT EXISTS idx_calendars_status ON calendars(status);
CREATE INDEX IF NOT EXISTS idx_calendars_updated_at ON calendars(updated_at);

-- course_classes表索引
CREATE INDEX IF NOT EXISTS idx_course_classes_calendar_id ON course_classes(calendar_id);
CREATE INDEX IF NOT EXISTS idx_course_classes_course_id ON course_classes(course_id);
CREATE INDEX IF NOT EXISTS idx_course_classes_student_number ON course_classes(student_number);
CREATE INDEX IF NOT EXISTS idx_course_classes_xnxq ON course_classes(xnxq);
CREATE INDEX IF NOT EXISTS idx_course_classes_wps_user_id ON course_classes(wps_user_id);
CREATE INDEX IF NOT EXISTS idx_course_classes_share_status ON course_classes(share_status);
CREATE INDEX IF NOT EXISTS idx_course_classes_updated_at ON course_classes(updated_at);

-- calendar_schedules表索引
CREATE INDEX IF NOT EXISTS idx_calendar_schedules_calendar_id ON calendar_schedules(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_schedules_course_id ON calendar_schedules(course_id);
CREATE INDEX IF NOT EXISTS idx_calendar_schedules_wps_event_id ON calendar_schedules(wps_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_schedules_start_time ON calendar_schedules(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_schedules_xnxq ON calendar_schedules(xnxq);
CREATE INDEX IF NOT EXISTS idx_calendar_schedules_week_weekday ON calendar_schedules(week_number, weekday);
CREATE INDEX IF NOT EXISTS idx_calendar_schedules_sync_status ON calendar_schedules(sync_status);
CREATE INDEX IF NOT EXISTS idx_calendar_schedules_updated_at ON calendar_schedules(updated_at);
