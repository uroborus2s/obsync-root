# @stratix/utils/crypto 加密工具函数文档

该模块提供了一系列用于数据加密、解密、哈希计算和安全令牌生成的工具函数，帮助开发者实现数据安全和身份验证功能。

## 目录

- [@stratix/utils/crypto 加密工具函数文档](#stratixutilscrypto-加密工具函数文档)
  - [目录](#目录)
  - [哈希函数](#哈希函数)
    - [md5](#md5)
    - [sha1](#sha1)
    - [sha256](#sha256)
    - [sha512](#sha512)
    - [hmac](#hmac)
    - [hash](#hash)
  - [加密解密函数](#加密解密函数)
    - [encrypt](#encrypt)
    - [decrypt](#decrypt)
    - [aesEncrypt](#aesencrypt)
    - [aesDecrypt](#aesdecrypt)
    - [rsaEncrypt](#rsaencrypt)
    - [rsaDecrypt](#rsadecrypt)
  - [编码解码函数](#编码解码函数)
    - [base64Encode](#base64encode)
    - [base64Decode](#base64decode)
    - [urlSafeBase64Encode](#urlsafebase64encode)
    - [urlSafeBase64Decode](#urlsafebase64decode)
  - [安全令牌函数](#安全令牌函数)
    - [generateToken](#generatetoken)
    - [generateSecureRandom](#generatesecurerandom)
    - [generateUUID](#generateuuid)
    - [generateJWT](#generatejwt)
    - [verifyJWT](#verifyjwt)
  - [密码安全函数](#密码安全函数)
    - [hashPassword](#hashpassword)
    - [verifyPassword](#verifypassword)
    - [generateSalt](#generatesalt)

## 哈希函数

### md5

计算字符串或数据的MD5哈希值。

```typescript
function md5(data: string | Buffer): string
```

**参数:**
- `data`: 要计算哈希的字符串或二进制数据

**返回值:**
- 32位十六进制的MD5哈希字符串

**示例:**

```javascript
import { md5 } from '@stratix/utils/crypto';

const hash = md5('hello world');
console.log(hash); // '5eb63bbbe01eeed093cb22bb8f5acdc3'

// 计算文件内容的MD5
import fs from 'fs';
const fileData = fs.readFileSync('example.txt');
const fileHash = md5(fileData);
```

### sha1

计算字符串或数据的SHA-1哈希值。

```typescript
function sha1(data: string | Buffer): string
```

**参数:**
- `data`: 要计算哈希的字符串或二进制数据

**返回值:**
- 40位十六进制的SHA-1哈希字符串

**示例:**

```javascript
import { sha1 } from '@stratix/utils/crypto';

const hash = sha1('hello world');
console.log(hash); // '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed'

// 可用于简单的数据完整性检查
function checkIntegrity(data, expectedHash) {
  const actualHash = sha1(data);
  return actualHash === expectedHash;
}
```

### sha256

计算字符串或数据的SHA-256哈希值。

```typescript
function sha256(data: string | Buffer): string
```

**参数:**
- `data`: 要计算哈希的字符串或二进制数据

**返回值:**
- 64位十六进制的SHA-256哈希字符串

**示例:**

```javascript
import { sha256 } from '@stratix/utils/crypto';

const hash = sha256('hello world');
console.log(hash); // 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'

// 适用于更高安全性需求的场景
const secureHash = sha256(userData + process.env.SECRET_KEY);
```

### sha512

计算字符串或数据的SHA-512哈希值。

```typescript
function sha512(data: string | Buffer): string
```

**参数:**
- `data`: 要计算哈希的字符串或二进制数据

**返回值:**
- 128位十六进制的SHA-512哈希字符串

**示例:**

```javascript
import { sha512 } from '@stratix/utils/crypto';

const hash = sha512('hello world');
// 返回一个128位的哈希字符串
console.log(hash.substring(0, 20) + '...'); // '309ecc489c12d6eb4cc40f...'

// 用于最高安全级别的哈希需求
const criticalDataHash = sha512(sensitiveData);
```

### hmac

使用指定的密钥和算法创建HMAC（哈希消息认证码）。

```typescript
function hmac(algorithm: string, key: string | Buffer, data: string | Buffer): string
```

**参数:**
- `algorithm`: 使用的哈希算法，例如 'md5', 'sha1', 'sha256', 'sha512'
- `key`: 用于HMAC的密钥
- `data`: 要认证的数据

**返回值:**
- 十六进制的HMAC字符串

**示例:**

```javascript
import { hmac } from '@stratix/utils/crypto';

// 使用SHA-256算法和密钥创建HMAC
const signature = hmac('sha256', 'my-secret-key', 'data-to-authenticate');

// 验证HMAC
function verifyHmac(data, key, expectedHmac) {
  const calculatedHmac = hmac('sha256', key, data);
  return calculatedHmac === expectedHmac;
}
```

### hash

使用指定的算法计算哈希值。

```typescript
function hash(algorithm: string, data: string | Buffer): string
```

**参数:**
- `algorithm`: 使用的哈希算法，支持Node.js crypto模块的所有算法
- `data`: 要计算哈希的数据

**返回值:**
- 十六进制的哈希字符串

**示例:**

```javascript
import { hash } from '@stratix/utils/crypto';

// 使用特定的哈希算法
const md5Hash = hash('md5', 'hello world');
const sha256Hash = hash('sha256', 'hello world');
const sha3Hash = hash('sha3-256', 'hello world');

// 获取支持的哈希算法列表
import crypto from 'crypto';
console.log(crypto.getHashes());
```

## 加密解密函数

### encrypt

使用指定的算法和密钥加密数据。

```typescript
function encrypt(data: string, key: string, algorithm?: string): string
```

**参数:**
- `data`: 要加密的数据
- `key`: 加密密钥
- `algorithm`: 加密算法，默认为'aes-256-cbc'

**返回值:**
- Base64编码的加密数据

**示例:**

```javascript
import { encrypt, decrypt } from '@stratix/utils/crypto';

// 加密敏感数据
const encryptedData = encrypt('sensitive information', 'my-secret-key');
console.log(encryptedData); // Base64编码的加密数据

// 之后解密
const decryptedData = decrypt(encryptedData, 'my-secret-key');
console.log(decryptedData); // 'sensitive information'
```

### decrypt

解密使用encrypt函数加密的数据。

```typescript
function decrypt(encryptedData: string, key: string, algorithm?: string): string
```

**参数:**
- `encryptedData`: Base64编码的加密数据
- `key`: 解密密钥（必须与加密时相同）
- `algorithm`: 解密算法，默认为'aes-256-cbc'（必须与加密时相同）

**返回值:**
- 解密后的原始数据

**示例:**

```javascript
import { encrypt, decrypt } from '@stratix/utils/crypto';

// 加密配置数据
const config = {
  apiKey: '12345',
  secret: 'very-secret'
};
const encryptedConfig = encrypt(JSON.stringify(config), process.env.CONFIG_KEY);

// 存储加密数据...

// 读取并解密数据
const decryptedConfig = decrypt(encryptedConfig, process.env.CONFIG_KEY);
const config = JSON.parse(decryptedConfig);
console.log(config.apiKey); // '12345'
```

### aesEncrypt

使用AES算法加密数据。

```typescript
function aesEncrypt(data: string, key: string, iv?: Buffer): string
```

**参数:**
- `data`: 要加密的数据
- `key`: 加密密钥
- `iv`: 初始化向量（可选，如果不提供会自动生成）

**返回值:**
- 格式为 'iv:encryptedData' 的字符串，两部分都是Base64编码

**示例:**

```javascript
import { aesEncrypt, aesDecrypt } from '@stratix/utils/crypto';

// 加密数据
const encrypted = aesEncrypt('secret message', 'my-encryption-key');

// 解密数据
const decrypted = aesDecrypt(encrypted, 'my-encryption-key');
console.log(decrypted); // 'secret message'
```

### aesDecrypt

解密使用aesEncrypt函数加密的数据。

```typescript
function aesDecrypt(encryptedData: string, key: string): string
```

**参数:**
- `encryptedData`: 通过aesEncrypt加密的数据
- `key`: 解密密钥（必须与加密时相同）

**返回值:**
- 解密后的原始数据

**示例:**

```javascript
import { aesEncrypt, aesDecrypt } from '@stratix/utils/crypto';

// 加密用户会话数据
function createEncryptedSession(userData) {
  return aesEncrypt(JSON.stringify(userData), process.env.SESSION_KEY);
}

// 解密并验证会话
function validateSession(encryptedSession) {
  try {
    const userData = JSON.parse(aesDecrypt(encryptedSession, process.env.SESSION_KEY));
    return { valid: true, data: userData };
  } catch (error) {
    return { valid: false, error: 'Invalid session' };
  }
}
```

### rsaEncrypt

使用RSA公钥加密数据。

```typescript
function rsaEncrypt(data: string, publicKey: string): string
```

**参数:**
- `data`: 要加密的数据
- `publicKey`: RSA公钥（PEM格式）

**返回值:**
- Base64编码的加密数据

**示例:**

```javascript
import { rsaEncrypt, rsaDecrypt } from '@stratix/utils/crypto';
import fs from 'fs';

// 读取RSA公钥和私钥
const publicKey = fs.readFileSync('public-key.pem', 'utf8');
const privateKey = fs.readFileSync('private-key.pem', 'utf8');

// 加密敏感数据（可以安全地传输）
const encrypted = rsaEncrypt('highly confidential data', publicKey);

// 使用私钥解密
const decrypted = rsaDecrypt(encrypted, privateKey);
console.log(decrypted); // 'highly confidential data'
```

### rsaDecrypt

使用RSA私钥解密数据。

```typescript
function rsaDecrypt(encryptedData: string, privateKey: string): string
```

**参数:**
- `encryptedData`: 通过rsaEncrypt加密的数据
- `privateKey`: RSA私钥（PEM格式）

**返回值:**
- 解密后的原始数据

**示例:**

```javascript
import { rsaEncrypt, rsaDecrypt } from '@stratix/utils/crypto';

// 在安全的API中实现非对称加密
function secureApiResponse(data, clientPublicKey) {
  // 使用客户端的公钥加密响应
  return rsaEncrypt(JSON.stringify(data), clientPublicKey);
}

// 客户端解密
function decryptApiResponse(encryptedResponse, myPrivateKey) {
  return JSON.parse(rsaDecrypt(encryptedResponse, myPrivateKey));
}
```

## 编码解码函数

### base64Encode

将字符串或二进制数据编码为Base64。

```typescript
function base64Encode(data: string | Buffer): string
```

**参数:**
- `data`: 要编码的字符串或二进制数据

**返回值:**
- Base64编码的字符串

**示例:**

```javascript
import { base64Encode, base64Decode } from '@stratix/utils/crypto';

// 编码数据
const encoded = base64Encode('Hello, world!');
console.log(encoded); // 'SGVsbG8sIHdvcmxkIQ=='

// 解码数据
const decoded = base64Decode(encoded);
console.log(decoded); // 'Hello, world!'
```

### base64Decode

将Base64编码的字符串解码为原始数据。

```typescript
function base64Decode(encodedData: string): string
```

**参数:**
- `encodedData`: Base64编码的字符串

**返回值:**
- 解码后的原始字符串

**示例:**

```javascript
import { base64Encode, base64Decode } from '@stratix/utils/crypto';

// 在URL中安全传输数据
const userData = { id: 123, name: 'John' };
const encodedData = base64Encode(JSON.stringify(userData));
const url = `https://example.com/api?data=${encodedData}`;

// 接收端解码
function processRequest(request) {
  const encodedData = request.query.data;
  const userData = JSON.parse(base64Decode(encodedData));
  console.log(userData); // { id: 123, name: 'John' }
}
```

### urlSafeBase64Encode

将数据编码为URL安全的Base64格式。

```typescript
function urlSafeBase64Encode(data: string | Buffer): string
```

**参数:**
- `data`: 要编码的字符串或二进制数据

**返回值:**
- URL安全的Base64编码字符串（替换 '+' 为 '-'，'/' 为 '_'，并移除填充字符 '='）

**示例:**

```javascript
import { urlSafeBase64Encode, urlSafeBase64Decode } from '@stratix/utils/crypto';

// 编码URL参数
const data = JSON.stringify({ query: 'test+special/chars=' });
const encoded = urlSafeBase64Encode(data);
console.log(encoded); // URL安全的Base64字符串，无 '+', '/' 或 '='

// 在URL中使用
const url = `https://example.com/api?token=${encoded}`;
```

### urlSafeBase64Decode

将URL安全的Base64编码字符串解码为原始数据。

```typescript
function urlSafeBase64Decode(encodedData: string): string
```

**参数:**
- `encodedData`: URL安全的Base64编码字符串

**返回值:**
- 解码后的原始字符串

**示例:**

```javascript
import { urlSafeBase64Encode, urlSafeBase64Decode } from '@stratix/utils/crypto';

// 从URL参数中获取并解码数据
function handleRequest(url) {
  const params = new URLSearchParams(url.split('?')[1]);
  const token = params.get('token');
  
  if (token) {
    const decodedData = urlSafeBase64Decode(token);
    return JSON.parse(decodedData);
  }
  
  return null;
}
```

## 安全令牌函数

### generateToken

生成一个安全的随机令牌。

```typescript
function generateToken(length?: number): string
```

**参数:**
- `length`: 令牌的字节长度（可选，默认为32）

**返回值:**
- 十六进制编码的随机令牌

**示例:**

```javascript
import { generateToken } from '@stratix/utils/crypto';

// 生成默认长度的令牌
const token = generateToken();
console.log(token); // 64个字符的十六进制字符串

// 生成指定长度的令牌
const shortToken = generateToken(16); // 32个字符

// 用于API密钥或会话令牌
const apiKey = generateToken(24);
```

### generateSecureRandom

生成指定长度的安全随机字节。

```typescript
function generateSecureRandom(length: number): Buffer
```

**参数:**
- `length`: 要生成的随机字节数

**返回值:**
- 包含随机字节的Buffer

**示例:**

```javascript
import { generateSecureRandom } from '@stratix/utils/crypto';

// 生成16字节的随机数据
const randomBytes = generateSecureRandom(16);

// 创建密码学上安全的密钥
const cryptoKey = generateSecureRandom(32);

// 转换为十六进制字符串
const hexString = randomBytes.toString('hex');
```

### generateUUID

生成一个符合RFC4122的UUID（通用唯一标识符）。

```typescript
function generateUUID(version?: 1 | 4): string
```

**参数:**
- `version`: UUID版本，支持1或4（可选，默认为4）

**返回值:**
- 格式化的UUID字符串

**示例:**

```javascript
import { generateUUID } from '@stratix/utils/crypto';

// 生成v4 UUID（随机生成）
const uuid = generateUUID();
console.log(uuid); // 例如: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

// 生成v1 UUID（基于时间戳和节点ID）
const uuidV1 = generateUUID(1);

// 用于数据库记录的唯一ID
const userId = generateUUID();
```

### generateJWT

生成一个JSON Web Token (JWT)。

```typescript
function generateJWT(payload: Record<string, any>, secret: string, options?: JWTOptions): string
```

**参数:**
- `payload`: JWT的数据负载
- `secret`: 签名密钥
- `options`: JWT选项（可选），包括：
  - `expiresIn`: 过期时间（秒数或时间字符串，如 '2h', '7d'）
  - `algorithm`: 签名算法，默认为 'HS256'
  - `issuer`: 发行者
  - `subject`: 主题
  - `audience`: 受众

**返回值:**
- 编码的JWT字符串

**示例:**

```javascript
import { generateJWT, verifyJWT } from '@stratix/utils/crypto';

// 创建用户认证令牌
const userData = { id: 123, name: 'John Doe', roles: ['user'] };
const token = generateJWT(
  userData,
  process.env.JWT_SECRET,
  { expiresIn: '24h', issuer: 'my-app' }
);

// 验证并解码令牌
try {
  const decoded = verifyJWT(token, process.env.JWT_SECRET);
  console.log(decoded.id); // 123
  console.log(decoded.exp); // 过期时间戳
} catch (error) {
  console.error('Invalid token:', error.message);
}
```

### verifyJWT

验证并解码JSON Web Token。

```typescript
function verifyJWT(token: string, secret: string, options?: JWTVerifyOptions): Record<string, any>
```

**参数:**
- `token`: 要验证的JWT字符串
- `secret`: 签名密钥
- `options`: 验证选项（可选），包括：
  - `algorithms`: 允许的签名算法数组
  - `issuer`: 预期的发行者
  - `subject`: 预期的主题
  - `audience`: 预期的受众

**返回值:**
- JWT负载数据（如果验证成功）

**抛出异常:**
- 如果令牌无效、过期或签名验证失败

**示例:**

```javascript
import { verifyJWT } from '@stratix/utils/crypto';

// 在API中间件中验证认证令牌
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const userData = verifyJWT(token, process.env.JWT_SECRET, {
      issuer: 'my-app'
    });
    
    // 将用户数据附加到请求对象
    req.user = userData;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

## 密码安全函数

### hashPassword

安全地哈希密码，使用随机盐和多次迭代。

```typescript
function hashPassword(password: string, saltRounds?: number): Promise<string>
```

**参数:**
- `password`: 要哈希的明文密码
- `saltRounds`: 哈希的复杂度（可选，默认为10）

**返回值:**
- 包含算法、迭代次数、盐和哈希值的完整哈希字符串

**示例:**

```javascript
import { hashPassword, verifyPassword } from '@stratix/utils/crypto';

// 注册新用户时哈希密码
async function registerUser(username, plainPassword) {
  try {
    // 生成安全的密码哈希
    const hashedPassword = await hashPassword(plainPassword);
    
    // 存储用户信息和哈希密码
    await db.users.create({
      username,
      password: hashedPassword
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 验证用户登录
async function loginUser(username, password) {
  // 获取存储的用户数据
  const user = await db.users.findOne({ username });
  
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  
  // 验证密码
  const passwordValid = await verifyPassword(password, user.password);
  
  if (!passwordValid) {
    return { success: false, error: 'Invalid password' };
  }
  
  return { success: true, user };
}
```

### verifyPassword

验证密码是否匹配存储的哈希值。

```typescript
function verifyPassword(password: string, hashedPassword: string): Promise<boolean>
```

**参数:**
- `password`: 要验证的明文密码
- `hashedPassword`: 存储的密码哈希（通过hashPassword生成）

**返回值:**
- 如果密码匹配则为true，否则为false

**示例:**

```javascript
import { verifyPassword } from '@stratix/utils/crypto';

// 用户认证函数
async function authenticateUser(username, password) {
  // 从数据库获取用户
  const user = await getUserByUsername(username);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // 验证密码
  const isValid = await verifyPassword(password, user.hashedPassword);
  
  if (!isValid) {
    throw new Error('Invalid credentials');
  }
  
  // 密码验证通过，返回用户数据或生成会话
  return {
    id: user.id,
    username: user.username,
    // 不要包含密码哈希!
  };
}
```

### generateSalt

生成用于密码哈希的随机盐。

```typescript
function generateSalt(length?: number): string
```

**参数:**
- `length`: 盐的字节长度（可选，默认为16）

**返回值:**
- Base64编码的随机盐

**示例:**

```javascript
import { generateSalt } from '@stratix/utils/crypto';

// 生成默认长度的盐
const salt = generateSalt();

// 生成指定长度的盐
const longSalt = generateSalt(32);

// 在自定义哈希过程中使用盐
function customHash(data, salt) {
  return sha256(data + salt);
}
``` 