# StudentMessages.tsx 标签数量显示修复

## 🐛 问题描述

在 StudentMessages.tsx 页面中，当点击"已批准"标签时，所有三个标签（待审批、已批准、已拒绝）都显示相同的数量"1"，这是不正确的行为。

### 问题截图
```
待审批 1    已批准 1    已拒绝 1
```

## 🔍 问题分析

### 根本原因
问题出现在 `getTabCount` 函数的逻辑中：

```typescript
// 有问题的代码
const getTabCount = (status) => {
  if (stats) {
    // 使用 stats 中的数据
    return stats[`${status}_count`];
  }
  
  // 问题在这里：对所有状态都返回相同的值
  return applications.length;
};
```

### 问题分析
1. **API 变更影响**：新的 API 不再返回 `stats` 统计信息
2. **逻辑缺陷**：当 `stats` 不存在时，所有标签都返回 `applications.length`
3. **数据局限性**：`applications` 数组只包含当前活动标签的数据，无法计算其他标签的数量

## 🔧 解决方案

### 修复策略
采用"智能显示"策略：
- **有 stats 时**：显示所有标签的准确数量
- **无 stats 时**：只显示当前活动标签的数量，其他标签不显示数量

### 修复后的代码

#### 1. 更新 getTabCount 函数
```typescript
const getTabCount = (
  status: 'leave_pending' | 'leave' | 'leave_rejected'
) => {
  // 如果 stats 存在，使用 stats 中的数据
  if (stats) {
    switch (status) {
      case 'leave_pending':
        return stats.leave_pending_count || 0;
      case 'leave':
        return stats.leave_count || 0;
      case 'leave_rejected':
        return stats.leave_rejected_count || 0;
      default:
        return 0;
    }
  }
  
  // 如果 stats 不存在，只显示当前活动标签的数量
  if (status === activeTab) {
    return applications.length;
  }
  
  // 其他标签不显示数量
  return null;
};
```

#### 2. 更新标签显示逻辑
```typescript
// 修改前：简单的数量检查
{getTabCount(tab.key) > 0 && (
  <span>{getTabCount(tab.key)}</span>
)}

// 修改后：处理 null 值
{(() => {
  const count = getTabCount(tab.key);
  return count !== null && count > 0 ? (
    <span>{count}</span>
  ) : null;
})()}
```

## ✅ 修复效果

### 修复前的行为
```
待审批 1    已批准 1    已拒绝 1  ❌ 错误：所有标签显示相同数量
```

### 修复后的行为

#### 情况1：API 返回 stats（理想情况）
```
待审批 2    已批准 5    已拒绝 1  ✅ 正确：显示准确的统计数量
```

#### 情况2：API 不返回 stats（当前情况）
```
待审批      已批准 1    已拒绝     ✅ 正确：只显示当前标签的数量
```

## 🎯 技术要点

### 1. 空值处理
```typescript
// 返回 null 表示不显示数量
return null;

// 在 JSX 中安全处理 null 值
count !== null && count > 0 ? <span>{count}</span> : null
```

### 2. 条件渲染优化
```typescript
// 使用立即执行函数避免重复调用 getTabCount
{(() => {
  const count = getTabCount(tab.key);
  return count !== null && count > 0 ? (
    <span>{count}</span>
  ) : null;
})()}
```

### 3. 类型安全
```typescript
// 明确的返回类型，支持 null 值
const getTabCount = (status): number | null => {
  // ...
};
```

## 📋 测试验证

### 测试场景
1. **有 stats 数据时**：
   - ✅ 所有标签显示正确的统计数量
   - ✅ 数量为 0 时不显示徽章

2. **无 stats 数据时**：
   - ✅ 当前活动标签显示正确数量
   - ✅ 其他标签不显示数量徽章
   - ✅ 切换标签时数量正确更新

3. **边界情况**：
   - ✅ 数量为 0 时不显示徽章
   - ✅ 数据加载中时的状态处理

## 🔄 用户体验改进

### 修复前的问题
- ❌ **误导性信息**：显示错误的数量让用户困惑
- ❌ **不一致性**：实际数据与显示不符

### 修复后的改进
- ✅ **准确性**：显示的数量与实际数据一致
- ✅ **清晰性**：不确定的数量不显示，避免误导
- ✅ **一致性**：行为符合用户预期

## 🚀 后续优化建议

### 1. 短期优化
- 考虑在组件初始化时加载所有状态的统计信息
- 添加加载状态指示器

### 2. 长期优化
- 后端 API 恢复返回 stats 统计信息
- 实现客户端缓存，减少重复请求

### 3. 用户体验优化
- 添加数量变化的动画效果
- 考虑显示"加载中"状态而不是隐藏数量

## 📝 总结

这次修复成功解决了标签数量显示错误的问题，通过智能的显示策略，在保证准确性的同时提供了良好的用户体验。修复后的代码更加健壮，能够正确处理各种数据状态，避免了误导用户的情况。

### 关键改进点
1. **逻辑修复**：解决了所有标签显示相同数量的问题
2. **空值处理**：正确处理无统计数据的情况
3. **用户体验**：避免显示错误信息，提升界面可信度
4. **代码健壮性**：增强了对异常情况的处理能力
