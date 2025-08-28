import crypto from 'crypto';

// 用户信息
const userInfo = {
  id: '0304062400128',
  xm: '高誉宁',
  xh: '0304062400128',
  xydm: '0304',
  xymc: '统计学院',
  zydm: '030406',
  zymc: '数据科学',
  bjdm: '03040624001',
  bjmc: '数据科学2401',
  xb: '女',
  mz: '01',
  sfzh: '',
  sjh: null,
  sznj: '2024',
  rxnf: '2024',
  email: null,
  lx: 1,
  update_time: null,
  ykth: '',
  sj: '2024/11/25 09:32:59.000',
  zt: 'add'
};

// JWT配置（来自api-gateway配置）
const jwtConfig = {
  secret: 'your-jwt-secret-key-here',
  tokenExpiry: '29d',
  cookieName: 'wps_jwt_token'
};

// Cookie签名密钥（来自api-gateway配置）
const cookieSecret = 'stratix-cookie-secret-key-32-chars-required-for-security';

// 创建增强的JWT载荷（模拟AuthController.createEnhancedJWTPayload）
function createEnhancedJWTPayload(user) {
  const basePayload = {
    userId: user.id,
    username: user.xm,
    userNumber: user.xh, // 学号
    email: user.email,
    phone: user.sjh,
    userType: 'student',
    collegeName: user.xymc, // 学院名称
    roles: ['student'], // 基础角色
    permissions: ['read'] // 基础权限
  };

  // 学生特定信息
  return {
    ...basePayload,
    studentNumber: user.xh, // 学号
    className: user.bjmc, // 班级名称
    majorName: user.zymc, // 专业名称
    studentType: user.lx === 1 ? 'undergraduate' : 'graduate', // 本科生/研究生
    grade: user.sznj, // 年级
    enrollmentYear: user.rxnf, // 入学年份
    permissions: ['read', 'student:profile', 'student:courses']
  };
}

// 手动生成JWT token（简化版）
function generateJWTToken(payload) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 29 * 24 * 60 * 60; // 29天后过期

  const jwtPayload = {
    ...payload,
    iat: now,
    exp: exp
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    'base64url'
  );
  const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString(
    'base64url'
  );

  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', jwtConfig.secret)
    .update(data)
    .digest('base64url');

  return `${data}.${signature}`;
}

// 签名cookie值（使用cookie-signature标准算法）
function signCookie(value, secret) {
  // cookie-signature使用的标准算法：
  // 1. 使用HMAC-SHA256对value进行签名
  // 2. 将签名转换为base64url格式（去掉padding）
  // 3. 格式：s:value.signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(value);
  const signature = hmac
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `s:${value}.${signature}`;
}

// 验证签名cookie（用于测试）
function unsignCookie(signedValue, secret) {
  if (!signedValue.startsWith('s:')) {
    return { valid: false, value: null };
  }

  const value = signedValue.slice(2); // 去掉 's:' 前缀
  const lastDotIndex = value.lastIndexOf('.');

  if (lastDotIndex === -1) {
    return { valid: false, value: null };
  }

  const originalValue = value.slice(0, lastDotIndex);
  const signature = value.slice(lastDotIndex + 1);

  // 重新计算签名
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(originalValue);
  const expectedSignature = hmac
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const isValid = signature === expectedSignature;
  return { valid: isValid, value: isValid ? originalValue : null };
}

// 生成cookie
function generateCookie() {
  console.log('=== 用户信息 ===');
  console.log(JSON.stringify(userInfo, null, 2));

  console.log('\n=== 创建JWT载荷 ===');
  const jwtPayload = createEnhancedJWTPayload(userInfo);
  console.log(JSON.stringify(jwtPayload, null, 2));

  console.log('\n=== 生成JWT Token ===');
  const jwtToken = generateJWTToken(jwtPayload);
  console.log('JWT Token:', jwtToken);

  console.log('\n=== 生成签名Cookie ===');
  const signedCookieValue = signCookie(jwtToken, cookieSecret);
  console.log('Signed Cookie Value:', signedCookieValue);

  console.log('\n=== Cookie配置 ===');
  const cookieOptions = {
    maxAge: 29 * 24 * 60 * 60 * 1000, // 29天
    httpOnly: true,
    secure: false, // 开发环境
    sameSite: 'none',
    path: '/',
    signed: true
  };
  console.log('Cookie Options:', JSON.stringify(cookieOptions, null, 2));

  console.log('\n=== 完整Cookie字符串 ===');
  const expiresDate = new Date(Date.now() + cookieOptions.maxAge);
  const cookieString = `${jwtConfig.cookieName}=${signedCookieValue}; Max-Age=${Math.floor(cookieOptions.maxAge / 1000)}; Path=${cookieOptions.path}; HttpOnly; SameSite=${cookieOptions.sameSite}; Expires=${expiresDate.toUTCString()}`;
  console.log(cookieString);

  console.log('\n=== 用于测试的Cookie Header ===');
  console.log(`Cookie: ${jwtConfig.cookieName}=${signedCookieValue}`);

  console.log('\n=== 验证签名Cookie ===');
  const verificationResult = unsignCookie(signedCookieValue, cookieSecret);
  console.log('签名验证结果:', verificationResult);
  if (verificationResult.valid) {
    console.log('✅ Cookie签名验证成功');
    console.log('原始JWT Token:', verificationResult.value);
  } else {
    console.log('❌ Cookie签名验证失败');
  }

  return {
    cookieName: jwtConfig.cookieName,
    cookieValue: signedCookieValue,
    jwtToken: jwtToken,
    jwtPayload: jwtPayload,
    cookieString: cookieString,
    verificationResult: verificationResult
  };
}

// 执行生成
const result = generateCookie();

// 验证JWT token（手动解析）
console.log('\n=== 验证JWT Token ===');
try {
  const parts = result.jwtToken.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  console.log('JWT载荷解析成功:', JSON.stringify(payload, null, 2));
} catch (error) {
  console.log('JWT解析失败:', error.message);
}
