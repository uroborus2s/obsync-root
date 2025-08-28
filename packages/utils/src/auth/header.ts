/**
 * 用户身份验证和权限管理类型定义
 *
 * 基于api-gateway的身份转发机制，定义tasks插件库的用户身份相关类型
 * 版本: v1.0.0
 */

/**
 * 用户身份信息接口
 * 对应api-gateway转发的用户身份数据
 */
export interface UserIdentity {
  /** 用户ID */
  userId: string;
  /** 用户名 */
  username?: string;
  /** 用户类型 */
  userType?: 'student' | 'teacher';
  /** 用户编号 */
  userNumber?: string;
  /** 用户邮箱 */
  email?: string;
  /** 用户手机号 */
  phone?: string;
  /** 学院名称 */
  collegeName?: string;
  /** 专业名称 */
  majorName?: string;
  /** 班级名称 */
  className?: string;
  /** 用户角色列表 */
  roles?: string[];
  /** 权限列表 */
  permissions?: string[];
  /** 请求时间戳 */
  timestamp?: number;
}

/**
 * 身份验证请求头接口
 * 对应api-gateway转发的HTTP Headers
 */
export interface IdentityHeaders {
  /** 用户ID */
  'x-user-id'?: string;
  /** 用户名 */
  'x-user-name'?: string;
  /** 用户类型 */
  'x-user-type'?: string;
  /** 用户编号 */
  'x-user-number'?: string;
  /** 用户邮箱 */
  'x-user-email'?: string;
  /** 用户手机号 */
  'x-user-phone'?: string;
  /** 学院名称 */
  'x-user-college'?: string;
  /** 专业名称 */
  'x-user-major'?: string;
  /** 班级名称 */
  'x-user-class'?: string;
  /** 角色列表（JSON字符串） */
  'x-user-roles'?: string;
  /** 权限列表（JSON字符串） */
  'x-user-permissions'?: string;
  /** 请求时间戳 */
  'x-request-timestamp'?: string;
}

/**
 * 身份验证错误类型
 */
export enum IdentityErrorType {
  /** 缺少身份信息 */
  MISSING_IDENTITY = 'MISSING_IDENTITY',
  /** 身份信息无效 */
  INVALID_IDENTITY = 'INVALID_IDENTITY',
  /** 权限不足 */
  INSUFFICIENT_PERMISSION = 'INSUFFICIENT_PERMISSION',
  /** 角色不匹配 */
  ROLE_MISMATCH = 'ROLE_MISMATCH',
  /** 解析错误 */
  PARSE_ERROR = 'PARSE_ERROR'
}

/**
 * 身份验证错误接口
 */
export interface IdentityError {
  /** 错误类型 */
  type: IdentityErrorType;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: any;
  /** 错误时间 */
  timestamp: Date;
}

/**
 * 身份验证结果接口
 */
export interface IdentityValidationResult {
  /** 是否验证成功 */
  success: boolean;
  /** 用户身份信息（验证成功时） */
  identity?: UserIdentity;
  /** 错误信息（验证失败时） */
  error?: IdentityError;
}

/**
 * 身份验证上下文接口
 * 在请求处理过程中传递用户身份信息
 */
export interface IdentityContext {
  /** 用户身份信息 */
  user: UserIdentity;
  /** 是否已验证 */
  authenticated: boolean;
  /** 验证时间 */
  verifiedAt: Date;
}
/**
 * 解码可能包含汉字的请求头值
 * 只处理特定的几个请求头：X-User-Name、X-User-College、X-User-Major、X-User-Class
 *
 * @param value - 可能经过URL编码的请求头值
 * @param headerName - 请求头名称
 * @returns 解码后的值
 */
function decodeChineseHeaderValue(value: string, headerName: string): string {
  if (!value) return '';

  // 只对可能包含汉字的请求头进行解码
  const chineseHeaders = [
    'x-user-name',
    'x-user-college',
    'x-user-major',
    'x-user-class',
    'x-user-roles',
    'x-user-permissions'
  ];

  if (!chineseHeaders.includes(headerName.toLowerCase())) {
    return value;
  }

  try {
    // 检查是否包含URL编码字符（%XX格式）
    if (value.includes('%')) {
      return decodeURIComponent(value);
    }
    return value;
  } catch (error) {
    // 如果解码失败，返回原始值
    return value;
  }
}

/**
 * 从HTTP请求头中解析用户身份信息
 *
 * @param headers - HTTP请求头对象
 * @param logger - 日志记录器（可选）
 * @returns 身份验证结果
 */
function parseIdentityFromHeaders(
  headers: Record<string, string | string[] | undefined>,
  logger?: any
): IdentityValidationResult {
  try {
    // 提取身份相关的请求头
    const identityHeaders = extractIdentityHeaders(headers);

    // 验证必需的身份信息
    const validationResult = validateRequiredIdentity(identityHeaders);
    if (!validationResult.success) {
      return validationResult;
    }

    // 解析用户身份信息
    const userIdentity = parseUserIdentity(identityHeaders, logger);

    logger?.debug('Successfully parsed user identity from headers', {
      userId: userIdentity.userId,
      username: userIdentity.username,
      userType: userIdentity.userType,
      collegeName: userIdentity.collegeName
    });

    return {
      success: true,
      identity: userIdentity
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger?.error('Failed to parse identity from headers', {
      error: errorMessage,
      headers: sanitizeHeadersForLogging(headers)
    });

    return {
      success: false,
      error: {
        type: IdentityErrorType.PARSE_ERROR,
        message: `Failed to parse identity: ${errorMessage}`,
        details: error,
        timestamp: new Date()
      }
    };
  }
}

/**
 * 提取身份相关的请求头
 *
 * @param headers - 原始请求头
 * @returns 身份请求头对象
 */
function extractIdentityHeaders(
  headers: Record<string, string | string[] | undefined>
): IdentityHeaders {
  const getHeaderValue = (key: string): string | undefined => {
    const value = headers[key] || headers[key.toLowerCase()];
    const rawValue = Array.isArray(value) ? value[0] : value;

    // 解码请求头值（处理URL编码的汉字等）
    if (rawValue) {
      const decoded = decodeChineseHeaderValue(rawValue, key);
      return decoded || undefined;
    }

    return undefined;
  };

  return {
    'x-user-id': getHeaderValue('x-user-id'),
    'x-user-name': getHeaderValue('x-user-name'),
    'x-user-type': getHeaderValue('x-user-type'),
    'x-user-number': getHeaderValue('x-user-number'),
    'x-user-email': getHeaderValue('x-user-email'),
    'x-user-phone': getHeaderValue('x-user-phone'),
    'x-user-college': getHeaderValue('x-user-college'),
    'x-user-major': getHeaderValue('x-user-major'),
    'x-user-class': getHeaderValue('x-user-class'),
    'x-user-roles': getHeaderValue('x-user-roles'),
    'x-user-permissions': getHeaderValue('x-user-permissions'),
    'x-request-timestamp': getHeaderValue('x-request-timestamp')
  };
}

/**
 * 验证必需的身份信息
 *
 * @param headers - 身份请求头
 * @returns 验证结果
 */
function validateRequiredIdentity(
  headers: IdentityHeaders
): IdentityValidationResult {
  // 检查必需的用户ID
  if (!headers['x-user-id']) {
    return {
      success: false,
      error: {
        type: IdentityErrorType.MISSING_IDENTITY,
        message: 'Missing required user ID in headers',
        details: { missingHeader: 'x-user-id' },
        timestamp: new Date()
      }
    };
  }

  // 验证用户ID格式
  const userId = headers['x-user-id'];
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return {
      success: false,
      error: {
        type: IdentityErrorType.INVALID_IDENTITY,
        message: 'Invalid user ID format',
        details: { userId },
        timestamp: new Date()
      }
    };
  }

  return { success: true };
}

/**
 * 解析用户身份信息
 *
 * @param headers - 身份请求头
 * @param logger - 日志记录器
 * @returns 用户身份信息
 */
function parseUserIdentity(
  headers: IdentityHeaders,
  logger?: any
): UserIdentity {
  const identity: UserIdentity = {
    userId: headers['x-user-id']!,
    username: headers['x-user-name'],
    userType: headers['x-user-type'] as 'student' | 'teacher' | undefined,
    userNumber: headers['x-user-number'],
    email: headers['x-user-email'],
    phone: headers['x-user-phone'],
    collegeName: headers['x-user-college'],
    majorName: headers['x-user-major'],
    className: headers['x-user-class']
  };

  // 解析角色列表（可能包含URL编码）
  if (headers['x-user-roles']) {
    try {
      identity.roles = JSON.parse(headers['x-user-roles']);
    } catch (error) {
      logger?.warn('Failed to parse user roles from header', {
        rolesHeader: headers['x-user-roles'],
        error
      });
      identity.roles = [];
    }
  }

  // 解析权限列表（可能包含URL编码）
  if (headers['x-user-permissions']) {
    try {
      identity.permissions = JSON.parse(headers['x-user-permissions']);
    } catch (error) {
      logger?.warn('Failed to parse user permissions from header', {
        permissionsHeader: headers['x-user-permissions'],
        error
      });
      identity.permissions = [];
    }
  }

  // 解析时间戳
  if (headers['x-request-timestamp']) {
    try {
      identity.timestamp = new Date(headers['x-request-timestamp']).getTime();
    } catch (error) {
      logger?.warn('Failed to parse request timestamp', {
        timestampHeader: headers['x-request-timestamp'],
        error
      });
    }
  }

  return identity;
}

/**
 * 清理请求头用于日志记录（移除敏感信息）
 *
 * @param headers - 原始请求头
 * @returns 清理后的请求头
 */
function sanitizeHeadersForLogging(
  headers: Record<string, string | string[] | undefined>
): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase().includes('user')) {
      // 只记录身份相关头的存在性，不记录具体值
      sanitized[key] = value ? '[PRESENT]' : '[MISSING]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * 验证用户身份信息的完整性
 *
 * @param identity - 用户身份信息
 * @returns 验证结果
 */
function validateUserIdentity(
  identity: UserIdentity
): IdentityValidationResult {
  // 检查必需字段
  if (!identity.userId) {
    return {
      success: false,
      error: {
        type: IdentityErrorType.INVALID_IDENTITY,
        message: 'User ID is required',
        timestamp: new Date()
      }
    };
  }

  // 验证用户类型
  if (
    identity.userType &&
    !['student', 'teacher'].includes(identity.userType)
  ) {
    return {
      success: false,
      error: {
        type: IdentityErrorType.INVALID_IDENTITY,
        message: 'Invalid user type',
        details: { userType: identity.userType },
        timestamp: new Date()
      }
    };
  }

  // 验证角色格式
  if (identity.roles && !Array.isArray(identity.roles)) {
    return {
      success: false,
      error: {
        type: IdentityErrorType.INVALID_IDENTITY,
        message: 'Roles must be an array',
        details: { roles: identity.roles },
        timestamp: new Date()
      }
    };
  }

  // 验证权限格式
  if (identity.permissions && !Array.isArray(identity.permissions)) {
    return {
      success: false,
      error: {
        type: IdentityErrorType.INVALID_IDENTITY,
        message: 'Permissions must be an array',
        details: { permissions: identity.permissions },
        timestamp: new Date()
      }
    };
  }

  return { success: true, identity };
}

/**
 * 创建身份验证上下文
 *
 * @param identity - 用户身份信息
 * @returns 身份验证上下文
 */
function createIdentityContext(identity: UserIdentity) {
  return {
    user: identity,
    authenticated: true,
    verifiedAt: new Date()
  };
}

/**
 * 检查用户是否具有指定权限
 *
 * @param identity - 用户身份信息
 * @param permission - 要检查的权限
 * @returns 是否具有权限
 */
export function hasPermission(
  identity: UserIdentity,
  permission: string
): boolean {
  if (!identity.permissions) {
    return false;
  }

  return identity.permissions.includes(permission);
}

/**
 * 检查用户是否具有指定角色
 *
 * @param identity - 用户身份信息
 * @param role - 要检查的角色
 * @returns 是否具有角色
 */
export function hasRole(identity: UserIdentity, role: string): boolean {
  if (!identity.roles) {
    return false;
  }

  return identity.roles.includes(role);
}

/**
 * 检查用户是否具有要求的类型
 *
 * @param identity - 用户身份信息
 * @param requiredType - 要求的用户类型
 * @returns 是否具有要求的类型
 *
 */
export function hasUserType(
  identity: UserIdentity,
  requiredType: string
): boolean {
  return identity.userType === requiredType;
}

/**
 * onRequest权限验证钩子选项
 */
export interface OnRequestPermissionHookOptions {
  /** 需要跳过权限验证的路径列表，支持精确匹配和前缀匹配 */
  skipPaths?: string[];
  /** 多个权限验证函数的逻辑关系，'or'表示任一通过即可，'and'表示全部通过才行 */
  mode?: 'and' | 'or';
}

/**
 * onRequest权限验证钩子
 *
 * 该钩子用于验证用户是否具有访问特定资源的权限。
 * 支持基于角色的访问控制，可配置路径白名单和验证模式。
 *
 * @param handles - 权限验证处理器数组
 * @param options - 钩子选项
 * @param options.skipPaths - 需要跳过权限验证的路径列表
 * @param options.mode - 验证模式：'or'(默认)任一通过即可，'and'全部通过才行
 * @returns Fastify钩子函数
 */
export const onRequestPermissionHook =
  (
    handles: Array<(identity: UserIdentity) => boolean>,
    options?: OnRequestPermissionHookOptions
  ) =>
  async (request: any, reply: any) => {
    try {
      const { skipPaths = [], mode = 'or' } = options || {};

      // 检查是否为需要跳过权限验证的路径
      if (skipPaths.length > 0) {
        const shouldSkip = skipPaths.some((skipPath) => {
          // 支持精确匹配和前缀匹配
          return request.url === skipPath || request.url.startsWith(skipPath);
        });

        if (shouldSkip) {
          request.log?.debug('Skipping permission check for whitelisted path', {
            url: request.url,
            skipPaths,
            reason: 'Path in whitelist'
          });
          return; // 跳过权限验证，继续处理请求
        }
      }

      // 解析用户身份信息
      const identityResult = parseIdentityFromHeaders(
        request.headers,
        request.log as any
      );

      if (!identityResult.success) {
        request.log.warn('Failed to parse user identity', {
          url: request.url,
          error: identityResult.error
        });

        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Valid user identity required',
          timestamp: new Date().toISOString()
        });
      }

      const userIdentity = identityResult.identity!;

      if (handles && handles.length > 0) {
        // 根据验证模式检查权限
        let hasPermission: boolean;

        if (mode === 'and') {
          // 'and' 模式：所有验证函数都必须返回 true
          hasPermission = handles.every((handle) => handle(userIdentity));
        } else {
          // 'or' 模式（默认）：任一验证函数返回 true 即可
          hasPermission = handles.some((handle) => handle(userIdentity));
        }

        if (!hasPermission) {
          request.log.warn('Access denied: permission check failed', {
            url: request.url,
            userId: userIdentity.userId,
            userRoles: userIdentity.roles,
            mode,
            handleCount: handles.length
          });

          return reply.code(403).send({
            error: 'Forbidden',
            message: `Required permission not found to access this resource (mode: ${mode})`,
            userRoles: userIdentity.roles || [],
            timestamp: new Date().toISOString()
          });
        }
      }

      // 将用户身份信息添加到请求上下文
      (request as any).userIdentity = userIdentity;

      request.log.debug('Access granted', {
        url: request.url,
        userId: userIdentity.userId,
        userType: userIdentity.userType,
        roles: userIdentity.roles,
        mode,
        handleCount: handles?.length || 0
      });
    } catch (error) {
      request.log.error('Permission check failed', {
        url: request.url,
        error
      });

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to verify permissions',
        timestamp: new Date().toISOString()
      });
    }
  };
