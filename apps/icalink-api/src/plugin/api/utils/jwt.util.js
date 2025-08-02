/**
 * JWT工具类
 * 用于生成和验证JWT令牌
 */
import jwt from 'jsonwebtoken';
/**
 * JWT工具类
 */
export class JwtUtil {
    static DEFAULT_SECRET = 'icalink-jwt-secret-key-2024';
    static DEFAULT_EXPIRES_IN = '29d'; // 29天
    /**
     * 生成JWT令牌
     * @param payload 载荷数据
     * @param config JWT配置
     * @returns JWT令牌
     */
    static generateToken(payload, config) {
        const { secret = this.DEFAULT_SECRET, expiresIn = this.DEFAULT_EXPIRES_IN, issuer = 'icalink', audience = 'icalink-users' } = config || {};
        const options = {
            expiresIn: expiresIn,
            issuer: issuer,
            audience: audience,
            algorithm: 'HS256'
        };
        return jwt.sign(payload, secret, options);
    }
    /**
     * 验证JWT令牌
     * @param token JWT令牌
     * @param config JWT配置
     * @returns 验证结果和载荷数据
     */
    static verifyToken(token, config) {
        try {
            const { secret = this.DEFAULT_SECRET, issuer = 'icalink', audience = 'icalink-users' } = config || {};
            const decoded = jwt.verify(token, secret, {
                issuer,
                audience,
                algorithms: ['HS256']
            });
            return {
                valid: true,
                payload: decoded
            };
        }
        catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                return {
                    valid: false,
                    error: 'Invalid token'
                };
            }
            else if (error instanceof jwt.TokenExpiredError) {
                return {
                    valid: false,
                    error: 'Token expired'
                };
            }
            else if (error instanceof jwt.NotBeforeError) {
                return {
                    valid: false,
                    error: 'Token not active'
                };
            }
            else {
                return {
                    valid: false,
                    error: 'Token verification failed'
                };
            }
        }
    }
    /**
     * 解码JWT令牌（不验证签名）
     * @param token JWT令牌
     * @returns 解码后的载荷数据
     */
    static decodeToken(token) {
        try {
            const decoded = jwt.decode(token);
            return decoded;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * 检查JWT令牌是否即将过期
     * @param token JWT令牌
     * @param thresholdSeconds 阈值秒数，默认7天
     * @returns 是否即将过期
     */
    static isTokenExpiringSoon(token, thresholdSeconds = 7 * 24 * 60 * 60) {
        try {
            const decoded = this.decodeToken(token);
            if (!decoded || !decoded.exp) {
                return true;
            }
            const currentTime = Math.floor(Date.now() / 1000);
            const expirationTime = decoded.exp;
            return expirationTime - currentTime <= thresholdSeconds;
        }
        catch (error) {
            return true;
        }
    }
    /**
     * 从WPS用户信息生成JWT载荷
     * @param userInfo WPS用户信息
     * @returns JWT载荷
     */
    static createPayloadFromWpsUser(userInfo) {
        return {
            userId: userInfo.ex_user_id,
            wpsUserId: userInfo.id,
            name: userInfo.user_name,
            avatarUrl: userInfo.avatar,
            source: 'wps',
            createdAt: new Date().toISOString()
        };
    }
}
//# sourceMappingURL=jwt.util.js.map