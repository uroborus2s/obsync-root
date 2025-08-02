/**
 * 学生服务类
 * 处理学生相关的业务逻辑
 */
/**
 * 学生服务类
 */
export class StudentService {
    studentInfoRepo;
    payload;
    studentInfo = null;
    constructor(payload, studentInfoRepo) {
        this.studentInfoRepo = studentInfoRepo;
        this.payload = payload;
    }
    /**
     * 获取学生基本信息
     */
    async getStudentInfo() {
        if (this.studentInfo) {
            return this.studentInfo;
        }
        // 从JWT payload中获取ex_user_id，用作学生ID
        const exUserId = this.payload.userId;
        if (!exUserId) {
            throw new Error('JWT payload中缺少ex_user_id字段');
        }
        this.studentInfo = await this.studentInfoRepo.findById(exUserId);
        return this.studentInfo;
    }
    /**
     * 获取学生学号
     */
    async getStudentId() {
        const studentInfo = await this.getStudentInfo();
        return studentInfo?.xh || null;
    }
    /**
     * 获取学生姓名
     */
    async getStudentName() {
        const studentInfo = await this.getStudentInfo();
        return studentInfo?.xm || null;
    }
    /**
     * 获取学生班级信息
     */
    async getClassInfo() {
        const studentInfo = await this.getStudentInfo();
        return {
            bjdm: studentInfo?.bjdm || null,
            bjmc: studentInfo?.bjmc || null,
            zydm: studentInfo?.zydm || null,
            zymc: studentInfo?.zymc || null,
            xydm: studentInfo?.xydm || null,
            xymc: studentInfo?.xymc || null
        };
    }
    /**
     * 获取学生联系方式
     */
    async getContactInfo() {
        const studentInfo = await this.getStudentInfo();
        return {
            sjh: studentInfo?.sjh || null,
            email: studentInfo?.email || null
        };
    }
    /**
     * 检查是否为本科生
     */
    async isUndergraduate() {
        const studentInfo = await this.getStudentInfo();
        return studentInfo?.lx === 1;
    }
    /**
     * 检查是否为研究生
     */
    async isGraduate() {
        const studentInfo = await this.getStudentInfo();
        return studentInfo?.lx === 2;
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
        return 'student';
    }
    /**
     * 检查权限
     */
    hasPermission(permission) {
        // 学生权限检查逻辑
        const studentPermissions = [
            'read:own_attendance',
            'read:own_schedule',
            'write:attendance_checkin',
            'write:leave_application'
        ];
        return studentPermissions.includes(permission);
    }
    /**
     * 静态工厂方法 - 创建学生服务
     */
    static createStudentFactory = (studentInfoRepo) => {
        return (payload) => new StudentService(payload, studentInfoRepo);
    };
    /**
     * 资源清理
     */
    dispose() {
        this.studentInfo = null;
        this.payload = null;
    }
}
//# sourceMappingURL=student.service.js.map