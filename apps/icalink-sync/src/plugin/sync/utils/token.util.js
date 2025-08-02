/**
 * 签到令牌工具类
 */
import crypto from 'crypto';
/**
 * 签到令牌工具类
 */
export class CheckInTokenUtil {
    secret;
    algorithm = 'aes-256-gcm';
    constructor(secret) {
        this.secret =
            process.env.CHECKIN_TOKEN_SECRET ||
                secret ||
                'default-secret-key-change-in-production';
    }
    /**
     * 生成签到令牌
     * @param payload 令牌载荷
     * @returns 加密的令牌字符串
     */
    generateToken(payload) {
        try {
            // 创建载荷JSON字符串
            const payloadStr = JSON.stringify(payload);
            // 生成随机IV
            const iv = crypto.randomBytes(16);
            // 生成密钥
            const key = crypto.scryptSync(this.secret, 'salt', 32);
            // 创建加密器
            const cipher = crypto.createCipheriv(this.algorithm, key, iv);
            // 加密载荷
            let encrypted = cipher.update(payloadStr, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            // 获取认证标签
            const authTag = cipher.getAuthTag();
            // 组合结果：iv + authTag + encrypted
            const result = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
            // Base64编码
            return Buffer.from(result).toString('base64url');
        }
        catch (error) {
            throw new Error(`生成签到令牌失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 验证并解析签到令牌
     * @param token 令牌字符串
     * @returns 解析的载荷
     */
    verifyToken(token) {
        try {
            // Base64解码
            const decoded = Buffer.from(token, 'base64url').toString();
            // 分离组件
            const parts = decoded.split(':');
            if (parts.length !== 3) {
                throw new Error('令牌格式无效');
            }
            const [ivHex, authTagHex, encrypted] = parts;
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            // 生成密钥
            const key = crypto.scryptSync(this.secret, 'salt', 32);
            // 创建解密器
            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
            decipher.setAuthTag(authTag);
            // 解密
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            // 解析JSON
            const payload = JSON.parse(decrypted);
            // 验证过期时间
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp < now) {
                throw new Error('签到令牌已过期');
            }
            return payload;
        }
        catch (error) {
            throw new Error(`验证签到令牌失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 生成简单的签到令牌（用于URL参数）
     * @param attendanceRecordId 考勤记录ID
     * @param expiresInMinutes 过期时间（分钟）
     * @returns 令牌字符串
     */
    generateSimpleToken(attendanceRecordId, expiresInMinutes = 120) {
        const now = Math.floor(Date.now() / 1000);
        const exp = now + expiresInMinutes * 60;
        const payload = {
            attendance_record_id: attendanceRecordId,
            exp,
            iat: now
        };
        return this.generateToken(payload);
    }
    /**
     * 验证简单令牌
     * @param token 令牌字符串
     * @returns 考勤记录ID
     */
    verifySimpleToken(token) {
        const payload = this.verifyToken(token);
        return payload.attendance_record_id;
    }
    /**
     * 生成签到URL
     * @param baseUrl 基础URL
     * @param attendanceRecordId 考勤记录ID
     * @param expiresInMinutes 过期时间（分钟）
     * @returns 完整的签到URL
     */
    generateCheckInUrl(baseUrl, attendanceRecordId, expiresInMinutes = 120) {
        const token = this.generateSimpleToken(attendanceRecordId, expiresInMinutes);
        const url = new URL('/api/attendance/checkin', baseUrl);
        url.searchParams.set('token', token);
        return url.toString();
    }
    /**
     * 生成签到页面URL
     * @param baseUrl 基础URL
     * @param attendanceRecordId 考勤记录ID
     * @param expiresInMinutes 过期时间（分钟）
     * @returns 完整的签到页面URL
     */
    generateCheckInPageUrl(baseUrl, attendanceRecordId, expiresInMinutes = 120) {
        const token = this.generateSimpleToken(attendanceRecordId, expiresInMinutes);
        const url = new URL('/checkin', baseUrl);
        url.searchParams.set('token', token);
        return url.toString();
    }
    /**
     * 创建哈希值（用于数据完整性验证）
     * @param data 要哈希的数据
     * @returns 哈希值
     */
    createHash(data) {
        return crypto
            .createHash('sha256')
            .update(data + this.secret)
            .digest('hex');
    }
    /**
     * 验证哈希值
     * @param data 原始数据
     * @param hash 哈希值
     * @returns 是否匹配
     */
    verifyHash(data, hash) {
        const expectedHash = this.createHash(data);
        return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
    }
}
//# sourceMappingURL=token.util.js.map