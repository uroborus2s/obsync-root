# 汉字请求头处理修复（简化版）

## 问题描述

在API Gateway转发用户身份信息时，遇到了以下错误：

```
InvalidArgumentError: invalid X-User-Name header
```

这个错误是由于HTTP请求头中包含汉字等非ASCII字符导致的。

## 问题原因

只有以下4个请求头会包含汉字，需要特殊处理：

1. **X-User-Name**：用户姓名（如：张三、李明）
2. **X-User-College**：学院名称（如：计算机学院）
3. **X-User-Major**：专业名称（如：软件工程）
4. **X-User-Class**：班级名称（如：软工2021-1班）

## 解决方案

### 1. API Gateway端修复

只对4个可能包含汉字的请求头进行URL编码：

```typescript
// 只对这4个字段进行URL编码
if (identity.username) {
  headers['X-User-Name'] = encodeURIComponent(identity.username);
}
if (identity.collegeName) {
  headers['X-User-College'] = encodeURIComponent(identity.collegeName);
}
if (identity.majorName) {
  headers['X-User-Major'] = encodeURIComponent(identity.majorName);
}
if (identity.className) {
  headers['X-User-Class'] = encodeURIComponent(identity.className);
}
```

### 2. Tasks插件端修复

只对这4个请求头进行URL解码：

```typescript
function decodeChineseHeaderValue(value: string, headerName: string): string {
  // 只对可能包含汉字的请求头进行解码
  const chineseHeaders = ['x-user-name', 'x-user-college', 'x-user-major', 'x-user-class'];

  if (!chineseHeaders.includes(headerName.toLowerCase())) {
    return value; // 其他请求头直接返回
  }

  try {
    if (value.includes('%')) {
      return decodeURIComponent(value);
    }
    return value;
  } catch (error) {
    return value;
  }
}
```

## 示例

### 编码前后对比

| 原始值 | 编码后 | 解码后 |
|--------|--------|--------|
| `张三` | `%E5%BC%A0%E4%B8%89` | `张三` |
| `计算机学院` | `%E8%AE%A1%E7%AE%97%E6%9C%BA%E5%AD%A6%E9%99%A2` | `计算机学院` |
| `软工2021-1班` | `%E8%BD%AF%E5%B7%A52021-1%E7%8F%AD` | `软工2021-1班` |

### 请求头示例

**修复前（会导致错误）：**
```
X-User-Name: 张三
X-User-College: 计算机学院
```

**修复后（正常传输）：**
```
X-User-Name: %E5%BC%A0%E4%B8%89
X-User-College: %E8%AE%A1%E7%AE%97%E6%9C%BA%E5%AD%A6%E9%99%A2
```

## 测试验证

运行测试验证修复效果：

```bash
# 运行汉字处理测试
pnpm test identity-chinese-headers
```

## 相关文件

- `apps/api-gateway/src/hooks.ts` - API Gateway身份转发逻辑
- `packages/tasks/src/utils/identity-parser.ts` - Tasks插件身份解析逻辑
