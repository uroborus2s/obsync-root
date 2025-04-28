/**
 * JWT（JSON Web Token）相关函数
 * 提供JWT生成和验证功能
 *
 * 注意：项目中已安装jsonwebtoken依赖
 */

// 使用jsonwebtoken库进行JWT操作
import jwt from 'jsonwebtoken';

/**
 * JWT配置选项接口
 */
export interface JWTOptions {
  /** 过期时间（秒数或时间字符串，如 '2h', '7d'） */
  expiresIn?: jwt.SignOptions['expiresIn'];
  /** 签名算法，默认为 'HS256' */
  algorithm?: jwt.Algorithm;
  /** 非早于指定时间（单位秒或时间字符串） */
  notBefore?: jwt.SignOptions['notBefore'];
  /** 是否包含签发时间，单位秒 */
  noTimestamp?: boolean;
  /** JWT ID */
  jwtid?: string;
  /** 发行者 */
  issuer?: string;
  /** 主题 */
  subject?: string;
  /** 受众 */
  audience?: string | string[];
  /** 令牌头部设置 */
  header?: object;
  /** 密钥ID */
  keyid?: string;
}

/**
 * JWT验证选项接口
 */
export interface JWTVerifyOptions {
  /** 允许的签名算法数组 */
  algorithms?: jwt.Algorithm[];
  /** 预期的发行者 */
  issuer?: string | string[];
  /** 预期的主题 */
  subject?: string;
  /** 预期的受众 */
  audience?: string | RegExp | Array<string | RegExp>;
  /** 是否校验JWT ID */
  jwtid?: string;
  /** 是否校验签发时间 */
  ignoreNotBefore?: boolean;
  /** 是否校验过期时间 */
  ignoreExpiration?: boolean;
  /** 允许的最大过期时间，单位秒 */
  clockTolerance?: number;
  /** 当前时间戳 */
  clockTimestamp?: number;
  /** 最大有效期，单位秒 */
  maxAge?: string | number;
  /** 解析选项：是否返回完整的令牌结构 */
  complete?: boolean;
}

/**
 * JWT解码结果接口
 */
export interface JWTPayload {
  [key: string]: any;
  iat?: number; // 签发时间
  exp?: number; // 过期时间
  nbf?: number; // 生效时间
  iss?: string; // 发行者
  sub?: string; // 主题
  aud?: string | string[]; // 受众
  jti?: string; // JWT ID
}

/**
 * 生成一个JSON Web Token (JWT)
 *
 * @param payload JWT的数据负载
 * @param secret 签名密钥
 * @param options JWT选项（可选）
 * @returns 编码的JWT字符串
 * @throws 如果签名失败
 */
export function generateJWT(
  payload: string | object | Buffer,
  secret: jwt.Secret,
  options: JWTOptions = {}
): string {
  try {
    const defaultOptions: JWTOptions = {
      algorithm: 'HS256'
    };

    // 合并默认选项和用户提供的选项
    const jwtOptions = { ...defaultOptions, ...options } as jwt.SignOptions;

    return jwt.sign(payload, secret, jwtOptions);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`JWT生成失败: ${error.message}`);
    }
    throw new Error('JWT生成过程中发生未知错误');
  }
}

/**
 * 验证并解码JSON Web Token
 *
 * @param token 要验证的JWT字符串
 * @param secret 签名密钥
 * @param options 验证选项（可选）
 * @returns JWT负载数据（如果验证成功）
 * @throws 如果令牌无效、过期或签名验证失败
 */
export function verifyJWT(
  token: string,
  secret: jwt.Secret,
  options: JWTVerifyOptions = {}
): JWTPayload {
  try {
    return jwt.verify(
      token,
      secret,
      options as jwt.VerifyOptions
    ) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(`JWT签名无效: ${error.message}`);
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new Error(`JWT已过期: 过期时间 ${error.expiredAt}`);
    } else if (error instanceof jwt.NotBeforeError) {
      throw new Error(`JWT尚未生效: ${error.message}`);
    } else if (error instanceof Error) {
      throw new Error(`JWT验证失败: ${error.message}`);
    }
    throw new Error('JWT验证过程中发生未知错误');
  }
}

/**
 * 解码JWT令牌而不验证签名
 *
 * 注意：此函数不验证令牌签名，仅用于查看令牌内容
 * 不应在需要安全验证的场景中使用
 *
 * @param token JWT令牌字符串
 * @param options 解码选项
 * @returns 解码后的JWT内容
 */
export function decodeJWT(
  token: string,
  options?: { complete?: boolean }
): JWTPayload | null {
  try {
    return jwt.decode(token, options) as JWTPayload | null;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`JWT解码失败: ${error.message}`);
    }
    throw new Error('JWT解码过程中发生未知错误');
  }
}
