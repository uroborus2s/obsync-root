/**
 * 签到令牌工具类
 */
import type { CheckInTokenPayload } from '../types/attendance.js';
/**
 * 签到令牌工具类
 */
export declare class CheckInTokenUtil {
    private readonly secret;
    private readonly algorithm;
    constructor(secret?: string);
    /**
     * 生成签到令牌
     * @param payload 令牌载荷
     * @returns 加密的令牌字符串
     */
    generateToken(payload: CheckInTokenPayload): string;
    /**
     * 验证并解析签到令牌
     * @param token 令牌字符串
     * @returns 解析的载荷
     */
    verifyToken(token: string): CheckInTokenPayload;
    /**
     * 生成简单的签到令牌（用于URL参数）
     * @param attendanceRecordId 考勤记录ID
     * @param expiresInMinutes 过期时间（分钟）
     * @returns 令牌字符串
     */
    generateSimpleToken(attendanceRecordId: string, expiresInMinutes?: number): string;
    /**
     * 验证简单令牌
     * @param token 令牌字符串
     * @returns 考勤记录ID
     */
    verifySimpleToken(token: string): string;
    /**
     * 生成签到URL
     * @param baseUrl 基础URL
     * @param attendanceRecordId 考勤记录ID
     * @param expiresInMinutes 过期时间（分钟）
     * @returns 完整的签到URL
     */
    generateCheckInUrl(baseUrl: string, attendanceRecordId: string, expiresInMinutes?: number): string;
    /**
     * 生成签到页面URL
     * @param baseUrl 基础URL
     * @param attendanceRecordId 考勤记录ID
     * @param expiresInMinutes 过期时间（分钟）
     * @returns 完整的签到页面URL
     */
    generateCheckInPageUrl(baseUrl: string, attendanceRecordId: string, expiresInMinutes?: number): string;
    /**
     * 创建哈希值（用于数据完整性验证）
     * @param data 要哈希的数据
     * @returns 哈希值
     */
    createHash(data: string): string;
    /**
     * 验证哈希值
     * @param data 原始数据
     * @param hash 哈希值
     * @returns 是否匹配
     */
    verifyHash(data: string, hash: string): boolean;
}
//# sourceMappingURL=token.util.d.ts.map