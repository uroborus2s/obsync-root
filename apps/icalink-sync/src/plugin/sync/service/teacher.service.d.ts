/**
 * 教师服务类
 * 处理教师相关的业务逻辑
 */
import { TeacherInfoRepository } from '../repositories/teacher-info-repository.js';
import type { TeacherInfoEntity } from '../repositories/types.js';
import type { JwtPayload } from '../utils/jwt.util.js';
/**
 * 教师服务类
 */
export declare class TeacherService {
    private teacherInfoRepo;
    private payload;
    private teacherInfo;
    constructor(payload: JwtPayload, teacherInfoRepo: TeacherInfoRepository);
    /**
     * 获取教师基本信息
     */
    getTeacherInfo(): Promise<TeacherInfoEntity | null>;
    /**
     * 获取教师工号
     */
    getTeacherId(): Promise<string | null>;
    /**
     * 获取教师姓名
     */
    getTeacherName(): Promise<string | null>;
    /**
     * 获取教师部门信息
     */
    getDepartmentInfo(): Promise<{
        ssdwdm: string | null;
        ssdwmc: string | null;
    }>;
    /**
     * 获取教师职业信息
     */
    getProfessionalInfo(): Promise<{
        zc: string | null;
        zgxl: string | null;
        zgxw: string | null;
    }>;
    /**
     * 获取教师联系方式
     */
    getContactInfo(): Promise<{
        sjh: string | null;
        email: string | null;
    }>;
    /**
     * 获取教师性别
     */
    getGender(): Promise<string | null>;
    /**
     * 检查是否为正教授
     */
    isProfessor(): Promise<boolean>;
    /**
     * 检查是否为副教授
     */
    isAssociateProfessor(): Promise<boolean>;
    /**
     * 检查是否为讲师
     */
    isLecturer(): Promise<boolean>;
    /**
     * 获取JWT payload
     */
    getPayload(): JwtPayload;
    /**
     * 获取用户类型
     */
    getUserType(): string;
    /**
     * 检查权限
     */
    hasPermission(permission: string): boolean;
    /**
     * 静态工厂方法 - 创建教师服务
     */
    static createTeacherFactory: (teacherInfoRepo: TeacherInfoRepository) => (payload: JwtPayload) => TeacherService;
    /**
     * 资源清理
     */
    dispose(): void;
}
//# sourceMappingURL=teacher.service.d.ts.map