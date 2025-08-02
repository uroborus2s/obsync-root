/**
 * 教师服务类
 * 处理教师相关的业务逻辑
 */
/**
 * 教师服务类
 */
export class TeacherService {
    teacherInfoRepo;
    payload;
    teacherInfo = null;
    constructor(payload, teacherInfoRepo) {
        this.teacherInfoRepo = teacherInfoRepo;
        this.payload = payload;
    }
    /**
     * 获取教师基本信息
     */
    async getTeacherInfo() {
        if (this.teacherInfo) {
            return this.teacherInfo;
        }
        // 从JWT payload中获取ex_user_id，用作教师ID
        const exUserId = this.payload.userId;
        if (!exUserId) {
            throw new Error('JWT payload中缺少ex_user_id字段');
        }
        this.teacherInfo = await this.teacherInfoRepo.findById(exUserId);
        return this.teacherInfo;
    }
    /**
     * 获取教师工号
     */
    async getTeacherId() {
        const teacherInfo = await this.getTeacherInfo();
        return teacherInfo?.gh || null;
    }
    /**
     * 获取教师姓名
     */
    async getTeacherName() {
        const teacherInfo = await this.getTeacherInfo();
        return teacherInfo?.xm || null;
    }
    /**
     * 获取教师部门信息
     */
    async getDepartmentInfo() {
        const teacherInfo = await this.getTeacherInfo();
        return {
            ssdwdm: teacherInfo?.ssdwdm || null,
            ssdwmc: teacherInfo?.ssdwmc || null
        };
    }
    /**
     * 获取教师职业信息
     */
    async getProfessionalInfo() {
        const teacherInfo = await this.getTeacherInfo();
        return {
            zc: teacherInfo?.zc || null,
            zgxl: teacherInfo?.zgxl || null,
            zgxw: teacherInfo?.zgxw || null
        };
    }
    /**
     * 获取教师联系方式
     */
    async getContactInfo() {
        const teacherInfo = await this.getTeacherInfo();
        return {
            sjh: teacherInfo?.sjh || null,
            email: teacherInfo?.email || null
        };
    }
    /**
     * 获取教师性别
     */
    async getGender() {
        const teacherInfo = await this.getTeacherInfo();
        return teacherInfo?.xb || null;
    }
    /**
     * 检查是否为正教授
     */
    async isProfessor() {
        const teacherInfo = await this.getTeacherInfo();
        return teacherInfo?.zc?.includes('教授') || false;
    }
    /**
     * 检查是否为副教授
     */
    async isAssociateProfessor() {
        const teacherInfo = await this.getTeacherInfo();
        return teacherInfo?.zc?.includes('副教授') || false;
    }
    /**
     * 检查是否为讲师
     */
    async isLecturer() {
        const teacherInfo = await this.getTeacherInfo();
        return teacherInfo?.zc?.includes('讲师') || false;
    }
    /**
     * 获取JWT payload
     */
    getPayload() {
        return this.payload;
    }
    /**
     * 获取用户类型
     */
    getUserType() {
        return 'teacher';
    }
    /**
     * 检查权限
     */
    hasPermission(permission) {
        // 教师权限检查逻辑
        const teacherPermissions = [
            'read:all_attendance',
            'read:own_schedule',
            'read:class_schedule',
            'write:attendance_record',
            'write:grade_submission',
            'read:student_info',
            'manage:class_attendance'
        ];
        return teacherPermissions.includes(permission);
    }
    /**
     * 静态工厂方法 - 创建教师服务
     */
    static createTeacherFactory = (teacherInfoRepo) => {
        return (payload) => new TeacherService(payload, teacherInfoRepo);
    };
    /**
     * 资源清理
     */
    dispose() {
        this.teacherInfo = null;
        this.payload = null;
    }
}
//# sourceMappingURL=teacher.service.js.map