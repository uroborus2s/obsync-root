-- 创建课程表
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_code VARCHAR(50) NOT NULL UNIQUE,
  course_name VARCHAR(500) NOT NULL,
  instructor VARCHAR(255) NOT NULL,
  credits INT NOT NULL DEFAULT 1,
  semester VARCHAR(50) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  department VARCHAR(255) NOT NULL,
  description TEXT,
  max_students INT,
  enrolled_students INT DEFAULT 0,
  status ENUM('active', 'inactive', 'completed') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_courses_code (course_code),
  INDEX idx_courses_instructor (instructor),
  INDEX idx_courses_semester (semester),
  INDEX idx_courses_academic_year (academic_year),
  INDEX idx_courses_department (department),
  INDEX idx_courses_status (status),
  INDEX idx_courses_credits (credits),
  INDEX idx_courses_created_at (created_at),
  INDEX idx_courses_semester_year (semester, academic_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
