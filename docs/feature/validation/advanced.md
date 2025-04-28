# @stratix/validation 高级特性

本文档介绍`@stratix/validation`插件的高级功能和使用技巧。

## 1. 自定义验证器

### 1.1 创建自定义验证器

自定义验证器允许你扩展标准验证功能，实现特定的业务规则验证。

```typescript
// 注册自定义验证器
app.register(validationPlugin, {
  customValidators: {
    // 中国大陆手机号验证器
    isChinaPhoneNumber: (value, ctx) => {
      const pattern = /^1[3-9]\d{9}$/;
      return pattern.test(value) || ctx.addIssue({
        code: 'custom',
        message: '无效的中国大陆手机号码'
      });
    },
    
    // 中国身份证号验证器
    isChineseIdCard: (value, ctx) => {
      // 简化的身份证验证逻辑
      const pattern = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
      return pattern.test(value) || ctx.addIssue({
        code: 'custom',
        message: '无效的身份证号码'
      });
    }
  }
});

// 使用自定义验证器
const userSchema = app.validation.object({
  name: app.validation.string(),
  phone: app.validation.string().custom('isChinaPhoneNumber'),
  idCard: app.validation.string().custom('isChineseIdCard')
});
```

### 1.2 参数化自定义验证器

```typescript
// 带参数的自定义验证器
app.register(validationPlugin, {
  customValidators: {
    // 密码强度验证器
    hasPasswordStrength: (value, ctx, params) => {
      const { minLength = 8, requireUppercase = true, requireNumber = true, requireSpecial = true } = params || {};
      
      if (value.length < minLength) {
        ctx.addIssue({
          code: 'custom',
          message: `密码长度至少为${minLength}个字符`
        });
        return false;
      }
      
      if (requireUppercase && !/[A-Z]/.test(value)) {
        ctx.addIssue({
          code: 'custom',
          message: '密码必须包含至少一个大写字母'
        });
        return false;
      }
      
      if (requireNumber && !/\d/.test(value)) {
        ctx.addIssue({
          code: 'custom',
          message: '密码必须包含至少一个数字'
        });
        return false;
      }
      
      if (requireSpecial && !/[!@#$%^&*]/.test(value)) {
        ctx.addIssue({
          code: 'custom',
          message: '密码必须包含至少一个特殊字符(!@#$%^&*)'
        });
        return false;
      }
      
      return true;
    }
  }
});

// 使用带参数的自定义验证器
const passwordSchema = app.validation.string().custom('hasPasswordStrength', {
  minLength: 10,
  requireUppercase: true,
  requireNumber: true,
  requireSpecial: true
});
```

## 2. 高级数据转换

### 2.1 复杂数据转换

```typescript
// 多步骤数据转换
const addressSchema = app.validation.object({
  street: app.validation.string(),
  city: app.validation.string(),
  state: app.validation.string(),
  zipCode: app.validation.string(),
  country: app.validation.string().default('China')
})
.transform(address => {
  // 格式化地址
  return {
    ...address,
    fullAddress: `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`,
    normalized: true
  };
})
.transform(address => {
  // 添加地理编码信息（模拟）
  return {
    ...address,
    coordinates: {
      lat: Math.random() * 90,
      lng: Math.random() * 180
    }
  };
});
```

### 2.2 条件转换

```typescript
// 基于条件的转换
const userSchema = app.validation.object({
  name: app.validation.string(),
  birthDate: app.validation.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '出生日期必须是YYYY-MM-DD格式')
    .transform(dateStr => new Date(dateStr)),
  role: app.validation.enum(['admin', 'user', 'guest'])
})
.transform(user => {
  // 根据角色添加不同的属性
  if (user.role === 'admin') {
    return {
      ...user,
      permissions: ['read', 'write', 'delete', 'admin'],
      isSuperUser: true
    };
  } else if (user.role === 'user') {
    return {
      ...user,
      permissions: ['read', 'write'],
      isSuperUser: false
    };
  } else {
    return {
      ...user,
      permissions: ['read'],
      isSuperUser: false
    };
  }
});
```

### 2.3 异步转换

```typescript
// 异步数据转换
const userSchema = app.validation.object({
  username: app.validation.string().min(3),
  password: app.validation.string().min(6)
})
.transformAsync(async user => {
  // 异步操作：密码哈希
  const hashedPassword = await hashPassword(user.password);
  
  return {
    ...user,
    password: hashedPassword,
    createdAt: new Date()
  };
});

// 使用异步Schema
async function createUser(userData) {
  const result = await userSchema.safeParseAsync(userData);
  
  if (result.success) {
    // 密码已被哈希处理
    return await saveUserToDatabase(result.data);
  } else {
    throw new Error('用户数据验证失败');
  }
}
```

## 3. 递归与嵌套Schema

### 3.1 自引用递归schema

```typescript
// 递归数据结构
interface Category {
  id: string;
  name: string;
  subcategories?: Category[];
}

// 创建递归schema
const categorySchema: any = app.validation.object({
  id: app.validation.string().uuid(),
  name: app.validation.string().min(1),
  // 初始定义，后面会替换
  subcategories: app.validation.array(app.validation.any()).optional()
});

// 填充递归引用
categorySchema.shape.subcategories = app.validation
  .array(categorySchema)
  .optional();
```

### 3.2 深层次嵌套对象

```typescript
// 定义嵌套对象schema
const productSchema = app.validation.object({
  id: app.validation.string().uuid(),
  name: app.validation.string(),
  price: app.validation.number().positive(),
  seller: app.validation.object({
    id: app.validation.string().uuid(),
    name: app.validation.string(),
    contact: app.validation.object({
      email: app.validation.string().email(),
      phone: app.validation.string().optional(),
      address: app.validation.object({
        street: app.validation.string(),
        city: app.validation.string(),
        state: app.validation.string(),
        zipCode: app.validation.string()
      }).optional()
    })
  }),
  inventory: app.validation.object({
    inStock: app.validation.boolean(),
    quantity: app.validation.number().int().nonnegative(),
    warehouses: app.validation.array(
      app.validation.object({
        id: app.validation.string().uuid(),
        name: app.validation.string(),
        quantity: app.validation.number().int().nonnegative()
      })
    ).optional()
  }).optional()
});
```

## 4. 高级验证规则

### 4.1 相关字段验证

```typescript
// 验证相关字段
const resetPasswordSchema = app.validation.object({
  newPassword: app.validation.string().min(8),
  confirmPassword: app.validation.string()
})
.refine(
  data => data.newPassword === data.confirmPassword,
  {
    message: '密码和确认密码必须匹配',
    path: ['confirmPassword'] // 指定错误应该附加到哪个字段
  }
);

// 多条件验证
const paymentSchema = app.validation.object({
  method: app.validation.enum(['credit_card', 'bank_transfer', 'paypal']),
  creditCardNumber: app.validation.string().optional(),
  bankAccount: app.validation.string().optional(),
  paypalEmail: app.validation.string().email().optional()
})
.refine(
  data => {
    if (data.method === 'credit_card') {
      return !!data.creditCardNumber;
    }
    return true;
  },
  {
    message: '使用信用卡支付时必须提供卡号',
    path: ['creditCardNumber']
  }
)
.refine(
  data => {
    if (data.method === 'bank_transfer') {
      return !!data.bankAccount;
    }
    return true;
  },
  {
    message: '使用银行转账时必须提供银行账号',
    path: ['bankAccount']
  }
)
.refine(
  data => {
    if (data.method === 'paypal') {
      return !!data.paypalEmail;
    }
    return true;
  },
  {
    message: '使用PayPal时必须提供邮箱',
    path: ['paypalEmail']
  }
);
```

### 4.2 精确条件验证

```typescript
// 使用superRefine进行更复杂的验证
const productSchema = app.validation.object({
  name: app.validation.string(),
  price: app.validation.number().positive(),
  salePrice: app.validation.number().positive().optional(),
  inStock: app.validation.boolean(),
  quantity: app.validation.number().int().nonnegative()
})
.superRefine((data, ctx) => {
  // 验证销售价格必须低于原价
  if (data.salePrice !== undefined && data.salePrice >= data.price) {
    ctx.addIssue({
      code: 'custom',
      message: '销售价格必须低于原价',
      path: ['salePrice']
    });
  }
  
  // 验证库存一致性
  if (data.inStock === true && data.quantity === 0) {
    ctx.addIssue({
      code: 'custom',
      message: '商品有库存时数量不能为0',
      path: ['quantity']
    });
  }
  
  if (data.inStock === false && data.quantity > 0) {
    ctx.addIssue({
      code: 'custom',
      message: '商品无库存时数量应为0',
      path: ['inStock', 'quantity']
    });
  }
});
```

## 5. 动态Schema生成

### 5.1 运行时生成Schema

```typescript
// 根据配置动态生成Schema
function createDynamicSchema(fieldConfig) {
  const schemaShape = {};
  
  for (const [fieldName, config] of Object.entries(fieldConfig)) {
    let fieldSchema;
    
    // 根据字段类型创建基础Schema
    switch (config.type) {
      case 'string':
        fieldSchema = app.validation.string();
        break;
      case 'number':
        fieldSchema = app.validation.number();
        break;
      case 'boolean':
        fieldSchema = app.validation.boolean();
        break;
      case 'date':
        fieldSchema = app.validation.date();
        break;
      default:
        throw new Error(`不支持的字段类型: ${config.type}`);
    }
    
    // 应用验证规则
    if (config.rules) {
      for (const [rule, value] of Object.entries(config.rules)) {
        if (typeof fieldSchema[rule] === 'function') {
          fieldSchema = fieldSchema[rule](value);
        }
      }
    }
    
    // 处理可选性
    if (config.optional) {
      fieldSchema = fieldSchema.optional();
    }
    
    // 处理默认值
    if ('default' in config) {
      fieldSchema = fieldSchema.default(config.default);
    }
    
    schemaShape[fieldName] = fieldSchema;
  }
  
  return app.validation.object(schemaShape);
}

// 使用动态Schema生成
const userConfig = {
  name: { type: 'string', rules: { min: 2, max: 50 } },
  age: { type: 'number', rules: { int: true, positive: true }, optional: true },
  email: { type: 'string', rules: { email: true } },
  active: { type: 'boolean', default: true }
};

const dynamicUserSchema = createDynamicSchema(userConfig);
```

### 5.2 基于数据库模型生成Schema

```typescript
// 从数据库模型定义生成验证Schema
function schemaFromDatabaseModel(modelDefinition) {
  const schemaFields = {};
  
  for (const [fieldName, fieldDef] of Object.entries(modelDefinition.fields)) {
    let fieldSchema;
    
    // 根据数据库字段类型创建Schema
    switch (fieldDef.type) {
      case 'string':
      case 'text':
      case 'uuid':
      case 'varchar':
        fieldSchema = app.validation.string();
        if (fieldDef.maxLength) {
          fieldSchema = fieldSchema.max(fieldDef.maxLength);
        }
        if (fieldDef.format === 'email') {
          fieldSchema = fieldSchema.email();
        }
        if (fieldDef.format === 'uuid') {
          fieldSchema = fieldSchema.uuid();
        }
        break;
        
      case 'integer':
      case 'bigint':
        fieldSchema = app.validation.number().int();
        break;
        
      case 'float':
      case 'decimal':
      case 'double':
        fieldSchema = app.validation.number();
        break;
        
      case 'boolean':
        fieldSchema = app.validation.boolean();
        break;
        
      case 'date':
      case 'datetime':
      case 'timestamp':
        fieldSchema = app.validation.date();
        break;
        
      case 'json':
      case 'jsonb':
        fieldSchema = app.validation.any();
        break;
        
      case 'array':
        fieldSchema = app.validation.array(
          fieldDef.items ? schemaFromDatabaseModel({ fields: { item: fieldDef.items } }).shape.item : app.validation.any()
        );
        break;
        
      default:
        fieldSchema = app.validation.any();
    }
    
    // 处理非空约束
    if (fieldDef.notNull) {
      // 已经是必需的
    } else {
      fieldSchema = fieldSchema.optional();
    }
    
    // 处理默认值
    if ('defaultValue' in fieldDef) {
      fieldSchema = fieldSchema.default(fieldDef.defaultValue);
    }
    
    schemaFields[fieldName] = fieldSchema;
  }
  
  return app.validation.object(schemaFields);
}

// 使用示例
const userModel = {
  fields: {
    id: { type: 'uuid', notNull: true },
    username: { type: 'string', maxLength: 50, notNull: true },
    email: { type: 'string', format: 'email', notNull: true },
    age: { type: 'integer' },
    active: { type: 'boolean', defaultValue: true },
    createdAt: { type: 'timestamp', defaultValue: () => new Date() }
  }
};

const userSchema = schemaFromDatabaseModel(userModel);
```

## 6. 性能优化技巧

### 6.1 Schema预编译和重用

```typescript
// 创建共享Schema
const sharedSchemas = {
  // 通用ID schema
  id: app.validation.string().uuid(),
  
  // 用户基础信息
  userBasic: app.validation.object({
    id: app.validation.string().uuid(),
    name: app.validation.string().min(2),
    email: app.validation.string().email()
  }),
  
  // 完整用户信息
  user: app.validation.object({
    id: app.validation.string().uuid(),
    name: app.validation.string().min(2),
    email: app.validation.string().email(),
    role: app.validation.enum(['admin', 'user', 'guest']).default('user'),
    createdAt: app.validation.date()
  }),
  
  // 分页参数
  pagination: app.validation.object({
    page: app.validation.number().int().positive().default(1),
    limit: app.validation.number().int().positive().max(100).default(20)
  })
};

// 复用共享Schema
const createUserSchema = app.validation.object({
  ...sharedSchemas.userBasic.shape,
  password: app.validation.string().min(8)
});

const userListQuerySchema = app.validation.object({
  ...sharedSchemas.pagination.shape,
  role: app.validation.enum(['admin', 'user', 'guest']).optional(),
  searchTerm: app.validation.string().optional()
});
```

### 6.2 懒加载验证器

```typescript
// 在高性能场景中使用懒加载
function createLazyValidators() {
  let userSchema;
  let productSchema;
  
  return {
    // 延迟初始化Schema
    getUserSchema() {
      if (!userSchema) {
        userSchema = app.validation.object({
          // 复杂的用户Schema定义...
        });
      }
      return userSchema;
    },
    
    getProductSchema() {
      if (!productSchema) {
        productSchema = app.validation.object({
          // 复杂的产品Schema定义...
        });
      }
      return productSchema;
    }
  };
}

const lazyValidators = createLazyValidators();

// 使用懒加载验证器
function validateUser(userData) {
  return lazyValidators.getUserSchema().safeParse(userData);
}
```

## 7. 高级集成模式

### 7.1 与Web中间件集成

```typescript
// 创建可复用的验证中间件
function createValidationMiddleware(app) {
  return {
    // 请求体验证中间件
    body(schema) {
      return async (request, reply) => {
        try {
          request.body = schema.parse(request.body);
        } catch (error) {
          reply.code(400).send({
            error: 'Validation Error',
            details: error.flatten()
          });
          throw error;
        }
      };
    },
    
    // 查询参数验证中间件
    query(schema) {
      return async (request, reply) => {
        try {
          request.query = schema.parse(request.query);
        } catch (error) {
          reply.code(400).send({
            error: 'Validation Error',
            details: error.flatten()
          });
          throw error;
        }
      };
    },
    
    // 路径参数验证中间件
    params(schema) {
      return async (request, reply) => {
        try {
          request.params = schema.parse(request.params);
        } catch (error) {
          reply.code(400).send({
            error: 'Validation Error',
            details: error.flatten()
          });
          throw error;
        }
      };
    }
  };
}

// 使用中间件
const validate = createValidationMiddleware(app);

// 在Web插件中使用
app.register(require('@stratix/web'), {
  routes: {
    '/api/users': {
      post: {
        // 使用多个中间件
        preHandler: [
          validate.body(userCreateSchema),
          authorize('create_user')
        ],
        handler: createUserHandler
      },
      
      get: {
        preHandler: [
          validate.query(userListQuerySchema)
        ],
        handler: getUsersHandler
      }
    },
    
    '/api/users/:id': {
      get: {
        preHandler: [
          validate.params(app.validation.object({
            id: app.validation.string().uuid()
          }))
        ],
        handler: getUserByIdHandler
      }
    }
  }
});
```

### 7.2 与数据库事务集成

```typescript
// 与数据库事务结合的验证
async function createUserWithProfile(userData, profileData) {
  // 验证用户和资料数据
  const userResult = userSchema.safeParse(userData);
  const profileResult = profileSchema.safeParse(profileData);
  
  // 收集所有验证错误
  if (!userResult.success || !profileResult.success) {
    return {
      success: false,
      errors: {
        user: userResult.success ? null : userResult.error.flatten(),
        profile: profileResult.success ? null : profileResult.error.flatten()
      }
    };
  }
  
  // 所有数据有效，开始事务
  const transaction = await app.db.transaction();
  
  try {
    // 创建用户
    const user = await app.db.models.users.create(userResult.data, { transaction });
    
    // 创建资料，关联到用户
    const profile = await app.db.models.profiles.create({
      ...profileResult.data,
      userId: user.id
    }, { transaction });
    
    // 提交事务
    await transaction.commit();
    
    return {
      success: true,
      data: {
        user,
        profile
      }
    };
  } catch (error) {
    // 回滚事务
    await transaction.rollback();
    
    return {
      success: false,
      errors: {
        database: error.message
      }
    };
  }
}
```

## 8. 国际化和本地化

```typescript
// 支持多语言的错误消息
function createI18nErrorMap(app) {
  // 获取当前语言环境
  const getLocale = () => app.i18n.getCurrentLocale() || 'zh-CN';
  
  // 错误消息映射
  const errorMessages = {
    'zh-CN': {
      invalid_type: '类型无效',
      required: '该字段是必填的',
      too_small: '值太小',
      too_big: '值太大',
      invalid_string: '无效的字符串',
      invalid_email: '无效的电子邮件地址',
      // 更多错误类型...
    },
    'en-US': {
      invalid_type: 'Invalid type',
      required: 'Required',
      too_small: 'Value too small',
      too_big: 'Value too big',
      invalid_string: 'Invalid string',
      invalid_email: 'Invalid email address',
      // 更多错误类型...
    }
  };
  
  // 返回错误映射函数
  return (issue, ctx) => {
    const locale = getLocale();
    const messages = errorMessages[locale] || errorMessages['zh-CN'];
    
    // 获取基本错误消息
    let message = messages[issue] || ctx.defaultError;
    
    // 替换参数占位符
    if (issue === 'invalid_type') {
      message = message.replace('{expected}', ctx.expected).replace('{received}', ctx.received);
    } else if (issue === 'too_small' || issue === 'too_big') {
      message = message.replace('{minimum}', ctx.minimum).replace('{maximum}', ctx.maximum);
    }
    
    return { message };
  };
}

// 注册带国际化支持的验证插件
app.register(validationPlugin, {
  errorMap: createI18nErrorMap(app)
});
``` 