/**
 * JWT工具函数
 * 用于解析cookie中的JWT token
 */

export interface JWTPayload {
  userId: string;
  userNumber: string;
  userType: 'student' | 'teacher';
  username: string;
  collegeName: string;
  roles: string[];
  permissions: string[];
  // student
  studentNumber?: string;
  className?: string;
  majorName?: string;
  grade?: string;
  enrollmentYear?: string;
  // teacher
  title?: string;
  degree?: string;
  employeeNumber?: string;
  education?: string;
  departmentName: string;
  exp?: number;
  iat?: number;
}

/**
 * 从cookie中获取指定名称的值
 */
export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Base64 URL解码（支持UTF-8）
 * 参考agendaedu-web项目的实现
 */
function base64UrlDecode(str: string): string {
  // 替换URL安全字符
  str = str.replace(/-/g, '+').replace(/_/g, '/');

  // 添加填充
  while (str.length % 4) {
    str += '=';
  }

  try {
    // 使用现代浏览器的 TextDecoder 和 Uint8Array 来正确处理 UTF-8
    // 首先将 base64 字符串转换为字节数组
    const binaryString = atob(str);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 使用 TextDecoder 正确解码 UTF-8
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  } catch (error) {
    // 如果 TextDecoder 失败，尝试使用简单的字符串方法
    try {
      const binaryString = atob(str);
      // 使用 Array.from 和 String.fromCharCode 来处理字符
      const chars = Array.from(binaryString, (char) => char.charCodeAt(0));
      const uint8Array = new Uint8Array(chars);
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(uint8Array);
    } catch (_fallbackError) {
      throw new Error(
        `Base64解码失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }
}

/**
 * 解码Unicode转义序列
 * 将 \uXXXX 格式的Unicode转义序列转换为实际字符
 */
function decodeUnicodeEscapes(str: string): string {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_match, code) => {
    return String.fromCharCode(parseInt(code, 16));
  });
}

/**
 * 修复JWT payload中的Unicode编码问题
 */
function fixUnicodeInPayload(payload: JWTPayload): JWTPayload {
  const fixed = { ...payload };

  // 需要修复Unicode编码的字符串字段
  const stringFields = [
    'username',
    'collegeName',
    'departmentName',
    'title',
    'education'
  ] as const;

  for (const field of stringFields) {
    const value = (fixed as any)[field];
    if (typeof value === 'string') {
      (fixed as any)[field] = decodeUnicodeEscapes(value);
    }
  }

  return fixed;
}

/**
 * 解析JWT token（参考agendaedu-web的实现，支持4部分JWT）
 */
export function parseJWT(token: string): JWTPayload | null {
  try {
    // JWT格式：header.payload.signature，但有些实现可能有4部分
    const parts = token.split('.');

    // 检查JWT格式：支持3部分或4部分
    if (parts.length !== 3 && parts.length !== 4) {
      console.error(
        '❌ JWT格式无效 - 应该有3或4部分，实际有',
        parts.length,
        '部分'
      );
      return null;
    }

    // 解码payload部分（第二部分）
    const payloadPart = parts[1];

    try {
      // 使用更强大的Base64URL解码
      const decodedPayload = base64UrlDecode(payloadPart);

      const parsedPayload = JSON.parse(decodedPayload) as JWTPayload;

      // 修复Unicode编码问题
      const fixedPayload = fixUnicodeInPayload(parsedPayload);

      return fixedPayload;
    } catch (decodeError) {
      console.error('❌ Base64URL解码失败，尝试标准Base64解码...', decodeError);

      // 尝试标准的base64解码作为后备方案
      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 =
        base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);

      const decodedPayload = atob(paddedBase64);

      const parsedPayload = JSON.parse(decodedPayload) as JWTPayload;
      const fixedPayload = fixUnicodeInPayload(parsedPayload);

      return fixedPayload;
    }
  } catch (error) {
    console.error('❌ JWT解析失败:', error);
    console.error(
      '❌ 错误详情:',
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * 从cookie中获取用户信息
 */
export function getUserInfoFromCookie(): JWTPayload | null {
  try {
    // 获取wps_jwt_token cookie
    const jwtToken = getCookie('wps_jwt_token');
    if (!jwtToken) {
      console.log('❌ 未找到wps_jwt_token cookie');
      return null;
    }

    console.log('🎫 找到JWT token长度:', jwtToken.length);

    // 解析JWT token
    const payload = parseJWT(jwtToken);
    if (!payload) {
      console.log('❌ JWT token解析失败');
      return null;
    }

    // 检查token是否过期
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      console.log('⏰ JWT token已过期');
      console.log('⏰ 过期时间:', new Date(payload.exp * 1000));
      console.log('⏰ 当前时间:', new Date());
      return null;
    }

    console.log('✅ 用户信息获取成功:', {
      userId: payload.userId,
      username: payload.username
    });

    console.log('✅ 用户信息获取成功:', payload);

    return payload;
  } catch (error) {
    console.error('💥 获取用户信息失败:', error);
    return null;
  }
}
