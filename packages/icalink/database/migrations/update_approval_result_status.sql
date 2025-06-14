-- 修改icalink_leave_approvals表的approval_result字段
-- 添加更多审批状态：pending(未处理)、approved(批准)、rejected(拒绝)、cancelled(取消)

ALTER TABLE `icalink_leave_approvals` 
MODIFY COLUMN `approval_result` enum('pending','approved','rejected','cancelled') DEFAULT 'pending' 
COMMENT '审批结果：pending未处理，approved批准，rejected拒绝，cancelled取消'; 