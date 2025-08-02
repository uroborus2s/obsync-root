/**
 * JWT工具类
 * 用于生成和验证JWT令牌
 */
/**
 * JWT配置接口
 */
export interface JwtConfig {
    secret: string;
    expiresIn?: string | number;
    issuer?: string;
    audience?: string;
}
/**
 * JWT载荷接口
 */
export interface JwtPayload {
    userId: string;
    name: string;
    email?: string;
    mobile?: string;
    ex_user_id?: string;
    [key: string]: any;
}
/**
 * JWT工具类
 */
export declare class JwtUtil {
    private static readonly DEFAULT_SECRET;
    private static readonly DEFAULT_EXPIRES_IN;
    /**
     * 生成JWT令牌
     * @param payload 载荷数据
     * @param config JWT配置
     * @returns JWT令牌
     */
    static generateToken(payload: JwtPayload, config?: Partial<JwtConfig>): string;
    /**
     * 验证JWT令牌
     * @param token JWT令牌
     * @param config JWT配置
     * @returns 验证结果和载荷数据
     */
    static verifyToken(token: string, config?: Partial<JwtConfig>): {
        valid: boolean;
        payload?: JwtPayload;
        error?: string;
    };
    /**
     * 解码JWT令牌（不验证签名）
     * @param token JWT令牌
     * @returns 解码后的载荷数据
     */
    static decodeToken(token: string): JwtPayload | null;
    /**
     * 检查JWT令牌是否即将过期
     * @param token JWT令牌
     * @param thresholdSeconds 阈值秒数，默认7天
     * @returns 是否即将过期
     */
    static isTokenExpiringSoon(token: string, thresholdSeconds?: number): boolean;
    /**
     * 从WPS用户信息生成JWT载荷
     * @param userInfo WPS用户信息
     * @returns JWT载荷
     */
    static createPayloadFromWpsUser(userInfo: any): JwtPayload;
}
//# sourceMappingURL=jwt.util.d.ts.map