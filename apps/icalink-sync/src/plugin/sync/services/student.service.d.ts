/**
 * 学生服务类
 * 处理学生相关的业务逻辑
 */
import { StudentInfoRepository } from '../repositories/student-info-repository.js';
import type { StudentInfoEntity } from '../repositories/types.js';
import type { JwtPayload } from '../utils/jwt.util.js';
/**
 * 学生服务类
 */
export declare class StudentService {
    private studentInfoRepo;
    private payload;
    private studentInfo;
    constructor(payload: JwtPayload, studentInfoRepo: StudentInfoRepository);
    /**
     * 获取学生基本信息
     */
    getStudentInfo(): Promise<StudentInfoEntity | null>;
    /**
     * 获取学生学号
     */
    getStudentId(): Promise<string | null>;
    /**
     * 获取学生姓名
     */
    getStudentName(): Promise<string | null>;
    /**
     * 获取学生班级信息
     */
    getClassInfo(): Promise<{
        bjdm: string | null;
        bjmc: string | null;
        zydm: string | null;
        zymc: string | null;
        xydm: string | null;
        xymc: string | null;
    }>;
    /**
     * 获取学生联系方式
     */
    getContactInfo(): Promise<{
        sjh: string | null;
        email: string | null;
    }>;
    /**
     * 检查是否为本科生
     */
    isUndergraduate(): Promise<boolean>;
    /**
     * 检查是否为研究生
     */
    isGraduate(): Promise<boolean>;
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
     * 静态工厂方法 - 创建学生服务
     */
    static createStudentFactory: (studentInfoRepo: StudentInfoRepository) => (payload: JwtPayload) => StudentService;
    /**
     * 资源清理
     */
    dispose(): void;
}
//# sourceMappingURL=student.service.d.ts.map