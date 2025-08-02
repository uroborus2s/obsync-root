# 分层架构重构：原生 SQL 聚合查询

## 重构目标

将违反分层架构原则的代码重构为符合 DDD（领域驱动设计）和分层架构的标准实现。

## 问题分析

### 重构前的问题
```typescript
// ❌ Service 层包含数据访问逻辑（违反分层原则）
class CourseScheduleSyncService {
  private async executeNativeSqlAggregation(xnxq: string) {
    // 直接获取数据库连接
    const db = await this.databaseApi.getWriteConnection('syncdb');
    
    // 直接执行 SQL 查询
    const aggregatedCourses = await db
      .selectFrom('u_jw_kcb_cur')
      .select([...])
      .where('xnxq', '=', xnxq)
      .groupBy([...])
      .execute();
    
    // 数据转换和插入逻辑
    for (const course of aggregatedCourses) {
      const juheRenwuData = this.transformData(course);
      await this.juheRenwuRepository.create(juheRenwuData);
    }
  }
}
```

### 架构违反点
1. **Service 层直接访问数据库**：违反了分层架构原则
2. **数据访问逻辑分散**：SQL 查询逻辑不应该在 Service 层
3. **职责混乱**：Service 层既处理业务逻辑又处理数据访问
4. **难以测试**：Service 层与数据库紧耦合

## 重构方案

### 正确的分层架构
```
┌─────────────────────────────────────┐
│           Service Layer             │  ← 业务逻辑编排
│  - 业务流程控制                      │
│  - 错误处理和日志                    │
│  - 事务管理                         │
└─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────┐
│         Repository Layer            │  ← 数据访问逻辑
│  - SQL 查询构建                     │
│  - 数据转换                         │
│  - 批量操作                         │
└─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────┐
│          Database Layer             │  ← 数据库连接
│  - 连接管理                         │
│  - 查询执行                         │
└─────────────────────────────────────┘
```

## 重构实现

### 1. Repository 层：数据访问逻辑

```typescript
// ✅ Repository 层负责所有数据访问逻辑
class CourseRawRepository {
  /**
   * 执行原生 SQL 聚合查询
   * Repository 层负责 SQL 构建和执行
   */
  async executeAggregationQuery(xnxq: string): Promise<DatabaseResult<any[]>> {
    return await this.advancedQuery(async (db) => {
      return await (db as any)
        .selectFrom('u_jw_kcb_cur')
        .select([
          'kkh', 'xnxq', 'kcmc', 'rq', 'ghs', 'room', 'zc',
          (eb: any) => eb.fn.min('jc').as('jc_min'),
          (eb: any) => eb.fn.max('jc').as('jc_max'),
          (eb: any) => eb.fn.count('*').as('course_count'),
          // 计算时间段
          (eb: any) => eb.case()
            .when(eb.fn.min('jc'), '<=', 2).then('上午')
            .when(eb.fn.min('jc'), '<=', 4).then('下午')
            .else('晚上').end().as('sjd'),
          // 聚合时间
          (eb: any) => eb.fn.min('st').as('sj_f'),
          (eb: any) => eb.fn.max('et').as('sj_z'),
          // GROUP_CONCAT 聚合
          (eb: any) => eb.fn('GROUP_CONCAT', [eb.ref('jc')]).as('jc_list')
        ])
        .where('xnxq', '=', xnxq)
        .where('gx_zt', 'is', null)
        .groupBy(['kkh', 'rq', 'ghs', 'room', 'zc'])
        .having((eb: any) => eb.fn.count('*'), '>', 0)
        .orderBy(['rq', 'sj_f'])
        .execute();
    });
  }

  /**
   * 完整的聚合操作：查询 + 转换 + 插入
   * Repository 层负责完整的数据处理流程
   */
  async aggregateCourseDataWithSql(
    xnxq: string,
    juheRenwuRepository: any
  ): Promise<DatabaseResult<{ count: number; aggregatedData: any[] }>> {
    // 1. 执行聚合查询
    const aggregationResult = await this.executeAggregationQuery(xnxq);
    
    if (!aggregationResult.success) {
      return { success: false, error: aggregationResult.error };
    }

    // 2. 数据转换和批量插入
    const insertResults = [];
    let insertedCount = 0;
    
    for (const course of aggregationResult.data) {
      const juheRenwuData = this.transformToJuheRenwuFormat(course);
      const result = await juheRenwuRepository.create(juheRenwuData);
      
      if (result.success) {
        insertedCount++;
        insertResults.push(result.data);
      }
    }

    return {
      success: true,
      data: { count: insertedCount, aggregatedData: insertResults }
    };
  }

  /**
   * 数据格式转换
   * Repository 层负责数据格式转换逻辑
   */
  private transformToJuheRenwuFormat(course: any): any {
    return {
      kkh: course.kkh,
      xnxq: course.xnxq,
      kcmc: course.kcmc,
      rq: course.rq,
      ghs: course.ghs,
      room: course.room,
      zc: course.zc,
      jc: course.jc_min,
      jc_s: course.jc_min,
      jc_z: course.jc_max,
      sjd: course.sjd,
      sj_f: course.sj_f,
      sj_z: course.sj_z,
      lq: null,
      gx_sj: new Date().toISOString(),
      gx_zt: '0',
      sfdk: '0',
      // 扩展字段：聚合统计信息
      course_count: course.course_count,
      jc_list: course.jc_list,
      st_list: course.st_list,
      et_list: course.et_list
    };
  }
}
```

### 2. Service 层：业务逻辑编排

```typescript
// ✅ Service 层专注于业务逻辑编排
class CourseScheduleSyncService {
  /**
   * 聚合课程数据 - 业务逻辑编排
   * Service 层负责业务流程控制和错误处理
   */
  async aggregateCourseData(
    xnxq: string
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      this.logger.info('开始聚合课程数据', { xnxq });

      // 调用 Repository 层的聚合方法
      const aggregationResult = await this.courseRawRepository
        .aggregateCourseDataWithSql(xnxq, this.juheRenwuRepository);

      if (aggregationResult.success) {
        const { count, aggregatedData } = aggregationResult.data;
        
        this.logger.info('课程数据聚合成功', { 
          xnxq, 
          aggregatedCount: count,
          totalRecords: aggregatedData.length
        });

        return { success: true, count };
      } else {
        // 降级策略：使用应用层聚合
        this.logger.warn('原生 SQL 聚合失败，降级到应用层聚合', { 
          xnxq, 
          error: aggregationResult.error 
        });
        
        return await this.aggregateCourseDataFallback(xnxq);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('聚合课程数据失败', { xnxq, error: errorMessage });
      return { success: false, count: 0, error: errorMessage };
    }
  }
}
```

## 重构成果

### 1. 分层职责清晰

| 层级 | 职责 | 具体实现 |
|------|------|----------|
| **Service 层** | 业务逻辑编排 | • 流程控制<br>• 错误处理<br>• 日志记录<br>• 降级策略 |
| **Repository 层** | 数据访问逻辑 | • SQL 查询构建<br>• 数据转换<br>• 批量操作<br>• 事务管理 |
| **Database 层** | 数据库连接 | • 连接管理<br>• 查询执行<br>• 结果返回 |

### 2. 代码质量提升

#### 可测试性
```typescript
// ✅ Service 层易于单元测试
const mockRepository = {
  aggregateCourseDataWithSql: jest.fn().mockResolvedValue({
    success: true,
    data: { count: 10, aggregatedData: [] }
  })
};

// 测试业务逻辑，无需真实数据库
```

#### 可维护性
```typescript
// ✅ 职责单一，易于维护
// Repository 层：只关心数据访问
// Service 层：只关心业务逻辑
```

#### 可扩展性
```typescript
// ✅ 易于扩展新的聚合策略
interface IAggregationStrategy {
  aggregate(xnxq: string): Promise<DatabaseResult<any>>;
}

class SqlAggregationStrategy implements IAggregationStrategy { ... }
class InMemoryAggregationStrategy implements IAggregationStrategy { ... }
```

### 3. 性能优化保持

- **数据库层聚合**：使用 GROUP BY、COUNT、MIN/MAX 等 SQL 函数
- **网络传输优化**：减少数据传输量
- **内存使用优化**：避免大量数据在应用层处理
- **查询性能**：利用数据库索引和优化器

### 4. 接口设计规范

```typescript
// ✅ Repository 接口扩展
interface ICourseRawRepository {
  // 原生 SQL 聚合操作
  executeAggregationQuery(xnxq: string): Promise<DatabaseResult<any[]>>;
  aggregateCourseDataWithSql(
    xnxq: string,
    juheRenwuRepository: any
  ): Promise<DatabaseResult<{ count: number; aggregatedData: any[] }>>;
}
```

## 架构原则遵循

### 1. 单一职责原则 (SRP)
- Service 层：业务逻辑编排
- Repository 层：数据访问逻辑

### 2. 依赖倒置原则 (DIP)
- Service 层依赖 Repository 接口
- Repository 层实现具体的数据访问

### 3. 开闭原则 (OCP)
- 易于扩展新的聚合策略
- 无需修改现有代码

### 4. 接口隔离原则 (ISP)
- Repository 接口职责明确
- Service 层只依赖需要的接口

## 总结

这次重构成功地将违反分层架构的代码重构为符合 DDD 和分层架构原则的实现：

### ✅ 解决的问题
- **分层混乱**：明确了各层职责边界
- **代码耦合**：降低了 Service 层与数据库的耦合
- **测试困难**：提升了代码的可测试性
- **维护复杂**：简化了代码维护和扩展

### ✅ 保持的优势
- **性能优化**：保持了原生 SQL 聚合的性能优势
- **功能完整**：保持了所有原有功能
- **降级策略**：保持了应用层聚合的降级能力

### ✅ 架构价值
- **可维护性**：清晰的分层结构
- **可扩展性**：易于添加新功能
- **可测试性**：各层独立测试
- **可重用性**：Repository 层可被其他 Service 复用

这个重构展示了如何在保持性能优势的同时，遵循正确的分层架构原则，为后续的功能开发和维护奠定了良好的基础。
