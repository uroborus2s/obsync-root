CREATE TABLE IF NOT EXISTS icalink_attendance_export_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- 任务标识
  task_id VARCHAR(64) NOT NULL UNIQUE COMMENT '任务ID（UUID）',
  
  -- 导出类型
  export_type ENUM('realtime', 'history') NOT NULL COMMENT '导出类型',
  
  -- 课程信息
  course_id INT COMMENT '课程ID（实时数据）',
  course_code VARCHAR(50) COMMENT '课程代码（历史数据）',
  course_name VARCHAR(200) COMMENT '课程名称',
  
  -- 查询参数（用于缓存判断）
  query_params JSON COMMENT '查询参数（JSON格式）',
  query_hash VARCHAR(64) NOT NULL COMMENT '查询参数哈希（用于去重）',
  
  -- 文件信息
  file_name VARCHAR(255) NOT NULL COMMENT '文件名',
  file_path VARCHAR(500) NOT NULL COMMENT 'OSS文件路径',
  file_size BIGINT COMMENT '文件大小（字节）',
  
  -- 任务状态
  status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending' COMMENT '任务状态',
  progress INT DEFAULT 0 COMMENT '进度百分比（0-100）',
  error_message TEXT COMMENT '错误信息',
  
  -- 统计信息
  record_count INT COMMENT '记录数量',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  completed_at TIMESTAMP NULL COMMENT '完成时间',
  expires_at TIMESTAMP NULL COMMENT '过期时间（文件有效期）',
  
  -- 创建者
  created_by VARCHAR(50) COMMENT '创建者ID',
  
  -- 索引
  INDEX idx_task_id (task_id),
  INDEX idx_query_hash (query_hash),
  INDEX idx_export_type (export_type),
  INDEX idx_course_code (course_code),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='考勤数据导出记录表';