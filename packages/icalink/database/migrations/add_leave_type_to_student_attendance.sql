-- 为icalink_student_attendance表添加leave_type字段
-- 支持四种请假类型：sick病假，personal事假，emergency紧急事假，other其他

ALTER TABLE `icalink_student_attendance` 
ADD COLUMN `leave_type` enum('sick','personal','emergency','other') DEFAULT 'sick' 
COMMENT '请假类型：sick病假，personal事假，emergency紧急事假，other其他' 
AFTER `leave_reason`; 