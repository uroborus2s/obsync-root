-- 修改icalink_leave_approvals表结构
-- 添加pending状态支持，并将approval_result字段改为可选

-- 修改approval_result字段，添加pending状态，并设为可选
ALTER TABLE `icalink_leave_approvals` 
MODIFY COLUMN `approval_result` enum('pending','approved','rejected') DEFAULT 'pending' COMMENT '审批结果：pending待审批，approved批准，rejected拒绝';

-- 修改approval_time字段为可选，因为pending状态时还没有审批时间
ALTER TABLE `icalink_leave_approvals` 
MODIFY COLUMN `approval_time` datetime DEFAULT NULL COMMENT '审批时间'; 