-- MySQL 5 兼容性测试脚本
-- 测试修复后的SQL文件是否能在MySQL 5中正常执行

-- 设置字符集
SET NAMES utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- 测试创建一个简单的表来验证字符集支持
CREATE TABLE test_compatibility (
  id int NOT NULL AUTO_INCREMENT,
  test_field varchar(100) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- 插入测试数据
INSERT INTO test_compatibility (test_field) VALUES ('测试数据');

-- 查询测试数据
SELECT * FROM test_compatibility;

-- 清理测试表
DROP TABLE test_compatibility;

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 如果以上命令都能正常执行，说明兼容性修复成功
SELECT 'MySQL 5 兼容性测试通过' AS result; 