# Stratix框架函数式编程最佳实践指南

## 📋 概述

本指南提供了在Stratix框架中进行函数式编程重构的最佳实践、代码示例和常见模式。遵循这些实践可以确保重构后的代码具有更好的可测试性、可维护性和可组合性。

## 🎯 核心原则

### 1. 纯函数优先
```typescript
// ❌ 避免：有副作用的函数
let globalCounter = 0;
function incrementCounter() {
  globalCounter++; // 副作用
  return globalCounter;
}

// ✅ 推荐：纯函数
const increment = (counter: number): number => counter + 1;

// 使用
let counter = 0;
counter = increment(counter);
```

### 2. 不可变数据结构
```typescript
// ❌ 避免：直接修改对象
interface User {
  id: string;
  name: string;
  email: string;
}

function updateUserEmail(user: User, newEmail: string): User {
  user.email = newEmail; // 直接修改
  return user;
}

// ✅ 推荐：创建新对象
const updateUserEmail = (user: User, newEmail: string): User => ({
  ...user,
  email: newEmail
});

// 对于复杂嵌套对象，使用辅助函数
const updateNestedProperty = <T, K extends keyof T>(
  obj: T,
  key: K,
  updater: (value: T[K]) => T[K]
): T => ({
  ...obj,
  [key]: updater(obj[key])
});
```

### 3. 函数组合
```typescript
// ❌ 避免：命令式链式调用
class DataProcessor {
  validate(data: any): any { /* ... */ }
  transform(data: any): any { /* ... */ }
  save(data: any): any { /* ... */ }
  
  process(data: any): any {
    const validated = this.validate(data);
    const transformed = this.transform(validated);
    return this.save(transformed);
  }
}

// ✅ 推荐：函数组合
import { pipe } from '@stratix/utils/functional';

const validate = (data: any): Either<Error, any> => {
  // 验证逻辑
  return data.id ? right(data) : left(new Error('ID required'));
};

const transform = (data: any): any => ({
  ...data,
  processedAt: new Date()
});

const save = async (data: any): Promise<any> => {
  // 保存逻辑
  return data;
};

// 组合函数
const processData = (data: any) => pipe(
  data,
  validate,
  map(transform),
  chain(save)
);
```

## 🛠️ 常用函数式模式

### 1. Either模式 - 错误处理
```typescript
// Either类型定义
type Either<L, R> = Left<L> | Right<R>;

interface Left<L> {
  readonly _tag: 'Left';
  readonly left: L;
}

interface Right<R> {
  readonly _tag: 'Right';
  readonly right: R;
}

const left = <L>(value: L): Left<L> => ({ _tag: 'Left', left: value });
const right = <R>(value: R): Right<R> => ({ _tag: 'Right', right: value });

const isLeft = <L, R>(either: Either<L, R>): either is Left<L> => 
  either._tag === 'Left';

const isRight = <L, R>(either: Either<L, R>): either is Right<R> => 
  either._tag === 'Right';

// 使用示例
const parseJSON = (str: string): Either<Error, any> => {
  try {
    return right(JSON.parse(str));
  } catch (error) {
    return left(new Error(`Invalid JSON: ${error.message}`));
  }
};

const validateUser = (data: any): Either<Error, User> => {
  if (!data.id) return left(new Error('User ID is required'));
  if (!data.email) return left(new Error('User email is required'));
  return right(data as User);
};

// 链式操作
const processUserData = (jsonStr: string): Either<Error, User> => 
  pipe(
    parseJSON(jsonStr),
    chain(validateUser)
  );
```

### 2. Maybe模式 - 空值处理
```typescript
// Maybe类型定义
type Maybe<T> = Some<T> | None;

interface Some<T> {
  readonly _tag: 'Some';
  readonly value: T;
}

interface None {
  readonly _tag: 'None';
}

const some = <T>(value: T): Some<T> => ({ _tag: 'Some', value });
const none: None = { _tag: 'None' };

const isSome = <T>(maybe: Maybe<T>): maybe is Some<T> => 
  maybe._tag === 'Some';

const isNone = <T>(maybe: Maybe<T>): maybe is None => 
  maybe._tag === 'None';

// 辅助函数
const map = <T, U>(f: (value: T) => U) => (maybe: Maybe<T>): Maybe<U> =>
  isSome(maybe) ? some(f(maybe.value)) : none;

const flatMap = <T, U>(f: (value: T) => Maybe<U>) => (maybe: Maybe<T>): Maybe<U> =>
  isSome(maybe) ? f(maybe.value) : none;

// 使用示例
const findUserById = (id: string): Maybe<User> => {
  const user = users.find(u => u.id === id);
  return user ? some(user) : none;
};

const getUserEmail = (id: string): Maybe<string> =>
  pipe(
    findUserById(id),
    map(user => user.email)
  );
```

### 3. 柯里化 - 函数参数化
```typescript
// 基础柯里化
const curry = <A, B, C>(f: (a: A, b: B) => C) => 
  (a: A) => (b: B) => f(a, b);

// 使用示例
const add = (a: number, b: number): number => a + b;
const curriedAdd = curry(add);

const add5 = curriedAdd(5);
console.log(add5(3)); // 8

// 实际应用：配置化函数
const createValidator = curry(
  (rules: ValidationRule[], data: any): Either<Error, any> => {
    for (const rule of rules) {
      const result = rule(data);
      if (isLeft(result)) return result;
    }
    return right(data);
  }
);

const userValidationRules: ValidationRule[] = [
  (data) => data.id ? right(data) : left(new Error('ID required')),
  (data) => data.email ? right(data) : left(new Error('Email required'))
];

const validateUser = createValidator(userValidationRules);
```

### 4. 高阶函数 - 行为增强
```typescript
// 重试装饰器
const withRetry = <T extends any[], R>(
  retries: number,
  delay: number = 1000
) => (fn: (...args: T) => Promise<R>) => 
  async (...args: T): Promise<R> => {
    let lastError: Error;
    
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error as Error;
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  };

// 缓存装饰器
const withCache = <T extends any[], R>(
  cacheKey: (...args: T) => string
) => (fn: (...args: T) => Promise<R>) => {
  const cache = new Map<string, R>();
  
  return async (...args: T): Promise<R> => {
    const key = cacheKey(...args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = await fn(...args);
    cache.set(key, result);
    return result;
  };
};

// 日志装饰器
const withLogging = <T extends any[], R>(
  logger: Logger,
  operationName: string
) => (fn: (...args: T) => Promise<R>) => 
  async (...args: T): Promise<R> => {
    const startTime = Date.now();
    logger.info(`Starting ${operationName}`);
    
    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      logger.info(`${operationName} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`${operationName} failed after ${duration}ms:`, error);
      throw error;
    }
  };

// 组合使用
const fetchUserData = withLogging(logger, 'fetchUserData')(
  withCache((id: string) => `user:${id}`)(
    withRetry(3, 1000)(
      async (id: string): Promise<User> => {
        // 实际的数据获取逻辑
        const response = await fetch(`/api/users/${id}`);
        return response.json();
      }
    )
  )
);
```

## 🏗️ 状态管理模式

### 1. 状态机模式
```typescript
// 状态定义
type TaskState = 'pending' | 'running' | 'completed' | 'failed';

interface TaskContext {
  readonly id: string;
  readonly state: TaskState;
  readonly startTime: Date | null;
  readonly endTime: Date | null;
  readonly error: string | null;
}

// 状态转换函数
const startTask = (context: TaskContext): TaskContext => ({
  ...context,
  state: 'running',
  startTime: new Date(),
  error: null
});

const completeTask = (context: TaskContext): TaskContext => ({
  ...context,
  state: 'completed',
  endTime: new Date()
});

const failTask = (error: string) => (context: TaskContext): TaskContext => ({
  ...context,
  state: 'failed',
  endTime: new Date(),
  error
});

// 状态机
const createTaskStateMachine = (initialContext: TaskContext) => {
  let currentContext = initialContext;
  
  return {
    getContext: () => currentContext,
    
    start: () => {
      if (currentContext.state === 'pending') {
        currentContext = startTask(currentContext);
      }
    },
    
    complete: () => {
      if (currentContext.state === 'running') {
        currentContext = completeTask(currentContext);
      }
    },
    
    fail: (error: string) => {
      if (currentContext.state === 'running') {
        currentContext = failTask(error)(currentContext);
      }
    }
  };
};
```

### 2. 事件溯源模式
```typescript
// 事件定义
type DomainEvent = 
  | { type: 'UserCreated'; payload: { id: string; name: string; email: string } }
  | { type: 'UserEmailUpdated'; payload: { id: string; email: string } }
  | { type: 'UserDeleted'; payload: { id: string } };

// 状态聚合
interface UserAggregate {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly isDeleted: boolean;
}

// 事件处理器
const applyEvent = (state: UserAggregate | null, event: DomainEvent): UserAggregate | null => {
  switch (event.type) {
    case 'UserCreated':
      return {
        id: event.payload.id,
        name: event.payload.name,
        email: event.payload.email,
        isDeleted: false
      };
      
    case 'UserEmailUpdated':
      return state ? { ...state, email: event.payload.email } : null;
      
    case 'UserDeleted':
      return state ? { ...state, isDeleted: true } : null;
      
    default:
      return state;
  }
};

// 事件存储
const replayEvents = (events: DomainEvent[]): UserAggregate | null =>
  events.reduce(applyEvent, null);
```

## 🧪 测试最佳实践

### 1. 纯函数测试
```typescript
// 纯函数易于测试
describe('Pure Functions', () => {
  test('should add two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
  
  test('should update user email immutably', () => {
    const user = { id: '1', name: 'John', email: 'john@old.com' };
    const updated = updateUserEmail(user, 'john@new.com');
    
    expect(updated.email).toBe('john@new.com');
    expect(user.email).toBe('john@old.com'); // 原对象不变
  });
});
```

### 2. 高阶函数测试
```typescript
describe('Higher Order Functions', () => {
  test('should retry failed operations', async () => {
    let attempts = 0;
    const failingFunction = async () => {
      attempts++;
      if (attempts < 3) throw new Error('Failed');
      return 'Success';
    };
    
    const retriedFunction = withRetry(3)(failingFunction);
    const result = await retriedFunction();
    
    expect(result).toBe('Success');
    expect(attempts).toBe(3);
  });
});
```

### 3. 状态管理测试
```typescript
describe('State Management', () => {
  test('should transition task states correctly', () => {
    const initialContext = {
      id: 'task-1',
      state: 'pending' as TaskState,
      startTime: null,
      endTime: null,
      error: null
    };
    
    const stateMachine = createTaskStateMachine(initialContext);
    
    stateMachine.start();
    expect(stateMachine.getContext().state).toBe('running');
    
    stateMachine.complete();
    expect(stateMachine.getContext().state).toBe('completed');
  });
});
```

## 📊 性能优化技巧

### 1. 记忆化
```typescript
const memoize = <T extends any[], R>(fn: (...args: T) => R) => {
  const cache = new Map<string, R>();
  
  return (...args: T): R => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// 使用
const expensiveCalculation = memoize((n: number): number => {
  // 复杂计算
  return n * n;
});
```

### 2. 惰性求值
```typescript
const lazy = <T>(factory: () => T) => {
  let cached: T;
  let computed = false;
  
  return (): T => {
    if (!computed) {
      cached = factory();
      computed = true;
    }
    return cached;
  };
};

// 使用
const expensiveResource = lazy(() => {
  console.log('Computing expensive resource...');
  return { data: 'expensive data' };
});

// 只有在第一次调用时才会计算
const resource = expensiveResource();
```

## 🎯 重构检查清单

### ✅ 代码质量检查
- [ ] 所有函数都是纯函数（无副作用）
- [ ] 使用不可变数据结构
- [ ] 函数长度控制在20行以内
- [ ] 避免深层嵌套（最多3层）
- [ ] 使用有意义的函数和变量名

### ✅ 函数式特性检查
- [ ] 使用函数组合替代继承
- [ ] 使用高阶函数增强行为
- [ ] 使用柯里化实现函数参数化
- [ ] 使用Either/Maybe处理错误和空值
- [ ] 实现不可变状态管理

### ✅ 测试覆盖检查
- [ ] 每个纯函数都有单元测试
- [ ] 状态转换函数有完整测试
- [ ] 高阶函数的行为增强有测试
- [ ] 错误处理路径有测试覆盖
- [ ] 集成测试覆盖主要业务流程

### ✅ 性能检查
- [ ] 避免不必要的对象创建
- [ ] 使用记忆化优化重复计算
- [ ] 实现惰性求值减少资源消耗
- [ ] 避免深层对象拷贝
- [ ] 使用结构共享优化内存使用

---

**下一步**：将这些最佳实践应用到具体的包重构中，确保重构后的代码符合函数式编程规范。
