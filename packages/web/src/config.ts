/**
 * Helmet配置选项
 * @fastify/helmet插件的配置
 */
export interface HelmetOptions {
  /**
   * 内容安全策略
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
   */
  contentSecurityPolicy?:
    | {
        directives?: {
          defaultSrc?: string[];
          scriptSrc?: string[];
          styleSrc?: string[];
          imgSrc?: string[];
          connectSrc?: string[];
          fontSrc?: string[];
          objectSrc?: string[];
          mediaSrc?: string[];
          frameSrc?: string[];
          sandbox?: string[];
          reportTo?: string[];
          childSrc?: string[];
          formAction?: string[];
          frameAncestors?: string[];
          pluginTypes?: string[];
          baseUri?: string[];
          reportUri?: string;
          [key: string]: string[] | string | undefined;
        };
        reportOnly?: boolean;
      }
    | false;

  /**
   * 跨域嵌入策略
   * @default true
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy
   */
  crossOriginEmbedderPolicy?:
    | boolean
    | { policy?: 'require-corp' | 'credentialless' };

  /**
   * 跨域窗口策略
   * @default true
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
   */
  crossOriginOpenerPolicy?:
    | boolean
    | { policy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none' };

  /**
   * 跨域资源策略
   * @default true
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy
   */
  crossOriginResourcePolicy?:
    | boolean
    | { policy?: 'same-site' | 'same-origin' | 'cross-origin' };

  /**
   * DNS预获取控制
   * @default {allow: false}
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control
   */
  dnsPrefetchControl?: boolean | { allow?: boolean };

  /**
   * 点击劫持保护
   * @default {action: 'sameorigin'}
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
   */
  frameguard?: boolean | { action?: 'deny' | 'sameorigin' };

  /**
   * 隐藏X-Powered-By头
   * @default true
   */
  hidePoweredBy?: boolean;

  /**
   * HTTP严格传输安全
   * @default {maxAge: 15552000, includeSubDomains: true}
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
   */
  hsts?:
    | boolean
    | { maxAge?: number; includeSubDomains?: boolean; preload?: boolean };

  /**
   * IE安全保护
   * @default true
   */
  ieNoOpen?: boolean;

  /**
   * MIME类型嗅探保护
   * @default true
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
   */
  noSniff?: boolean;

  /**
   * 引用策略
   * @default {policy: 'no-referrer'}
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
   */
  referrerPolicy?: boolean | { policy?: string | string[] };

  /**
   * XSS过滤
   * @default true
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection
   */
  xssFilter?: boolean;

  /**
   * 权限策略
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Feature-Policy
   */
  permittedCrossDomainPolicies?:
    | boolean
    | {
        permittedPolicies?: 'none' | 'master-only' | 'by-content-type' | 'all';
      };

  /**
   * 期望-CT
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Expect-CT
   */
  expectCt?:
    | boolean
    | { maxAge?: number; enforce?: boolean; reportUri?: string };
}

/**
 * CORS配置选项
 * @fastify/cors插件的配置
 */
export interface CorsOptions {
  /**
   * 允许的来源
   * - true允许所有来源
   * - 字符串用于单一来源
   * - 数组用于多个来源
   * - 函数动态决定
   * @default true
   */
  origin?: boolean | string | string[] | Function;

  /**
   * 允许的HTTP方法
   * @default ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS']
   */
  methods?: string | string[];

  /**
   * 允许的请求头
   * @default true
   */
  allowedHeaders?: string | string[] | boolean;

  /**
   * 暴露的响应头
   */
  exposedHeaders?: string | string[];

  /**
   * 是否允许带凭证的请求（cookies等）
   * @default true
   */
  credentials?: boolean;

  /**
   * 预检请求结果缓存时间（秒）
   * @default 86400
   */
  maxAge?: number;

  /**
   * 是否将预检请求传递给下一个处理器
   * @default false
   */
  preflightContinue?: boolean;

  /**
   * 预检请求的状态码
   * @default 204
   */
  optionsSuccessStatus?: number;

  /**
   * 用户自定义的预检处理器
   */
  preflight?: boolean;

  /**
   * 严格模式，只允许列出的请求头
   * @default false
   */
  strictPreflight?: boolean;
}

/**
 * Compress配置选项
 * @fastify/compress插件的配置
 */
export interface CompressOptions {
  /**
   * 全局启用压缩
   * @default true
   */
  global?: boolean;

  /**
   * 最小压缩大小（字节）
   * @default 1024
   */
  threshold?: number;

  /**
   * 支持的压缩编码
   * @default ['gzip', 'deflate', 'br']
   */
  encodings?: string[];

  /**
   * 自定义MIME类型
   */
  customTypes?: string[];

  /**
   * 如果请求已压缩，是否解压缩
   * @default false
   */
  inflateIfDeflated?: boolean;

  /**
   * zlib压缩选项
   */
  zlibOptions?: {
    /**
     * 压缩级别，1-9，9为最高压缩比
     * @default 5
     */
    level?: number;

    [key: string]: any;
  };

  /**
   * brotli压缩选项
   */
  brotliOptions?: {
    params?: {
      [key: string]: any;
    };
  };
}

/**
 * Cookie配置选项
 * @fastify/cookie插件的配置
 */
export interface CookieOptions {
  /**
   * secret用于签名cookie
   */
  secret?: string | string[];

  /**
   * Cookie解析选项
   */
  parseOptions?: {
    /**
     * Cookie域名
     */
    domain?: string;

    /**
     * Cookie路径
     * @default '/'
     */
    path?: string;

    /**
     * 限制只能通过HTTP访问
     * @default true
     */
    httpOnly?: boolean;

    /**
     * 仅在HTTPS连接时发送
     * @default false
     */
    secure?: boolean;

    /**
     * SameSite策略
     * @default 'lax'
     */
    sameSite?: 'strict' | 'lax' | 'none';

    /**
     * 最大存活时间（秒）
     */
    maxAge?: number;

    /**
     * 过期时间
     */
    expires?: Date;

    /**
     * 签名cookie
     */
    signed?: boolean;

    /**
     * 编码函数
     */
    encode?: (value: string) => string;
  };

  /**
   * 钩子函数
   */
  hook?: 'onRequest' | 'preParsing' | 'preValidation' | 'preHandler';
}

/**
 * Formbody配置选项
 * @fastify/formbody插件的配置
 */
export interface FormbodyOptions {
  /**
   * 解析器
   */
  parser?: Function;

  /**
   * 在x-www-form-urlencoded请求体中使用qs模块解析
   * @default true
   */
  bodyLimit?: number;
}

/**
 * Multipart配置选项
 * @fastify/multipart插件的配置
 */
export interface MultipartOptions {
  /**
   * 文件上传限制
   */
  limits?: {
    /**
     * 字段名最大长度
     * @default 100
     */
    fieldNameSize?: number;

    /**
     * 字段值最大大小
     * @default 100
     */
    fieldSize?: number;

    /**
     * 最大字段数
     * @default 10
     */
    fields?: number;

    /**
     * 单个文件最大大小
     * @default 1048576 (1MB)
     */
    fileSize?: number;

    /**
     * 最大文件数
     * @default 1
     */
    files?: number;

    /**
     * 最大头部对数
     * @default 2000
     */
    headerPairs?: number;
  };

  /**
   * 将字段附加到body
   * @default true
   */
  attachFieldsToBody?: boolean;

  /**
   * 临时文件目录
   */
  tmpdir?: string;

  /**
   * 上传文件的回调函数
   */
  onFile?: (part: any) => void;

  /**
   * 添加文件到请求的方式
   * @default 'parts'
   */
  addToBody?: boolean;

  /**
   * 上传文件的扩展名验证
   */
  fileFilter?: (part: any) => boolean;

  /**
   * 上传文件的MIME类型验证
   */
  mimetype?: string[];

  /**
   * 强制使用busboy实例解析multipart
   */
  busboyInstance?: any;

  /**
   * 强制使用自定义解析函数
   */
  handler?: (
    field: string,
    file: any,
    filename: string,
    encoding: string,
    mimetype: string
  ) => void;

  /**
   * 上传文件存储
   */
  storage?: any;

  /**
   * 自动处理全部文件
   */
  processAll?: boolean;
}

/**
 * RateLimit配置选项
 * @fastify/rate-limit插件的配置
 */
export interface RateLimitOptions {
  /**
   * 时间窗口内最大请求数
   * @default 100
   */
  max?: number;

  /**
   * 时间窗口
   * @default '1 minute'
   */
  timeWindow?: string | number;

  /**
   * IP白名单
   */
  allowList?: string[] | string | ((req: any) => boolean | Promise<boolean>);

  /**
   * 封禁策略
   */
  ban?: null | ((req: any) => Promise<void>);

  /**
   * Redis配置（用于分布式限流）
   */
  redis?: any;

  /**
   * 错误时是否跳过
   * @default false
   */
  skipOnError?: boolean;

  /**
   * 当达到限流时返回的错误状态码
   * @default 429
   */
  errorResponseCode?: number;

  /**
   * 请求计数器键前缀
   * @default 'rl:'
   */
  keyPrefix?: string;

  /**
   * 限流处理钩子
   */
  hook?: 'onRequest' | 'preHandler';

  /**
   * 限流触发错误时的处理函数
   */
  errorHandler?: (req: any, res: any, next: () => void) => void;

  /**
   * 返回客户端的X-RateLimit-*标头名称
   */
  customHeaders?: {
    /**
     * X-RateLimit-Limit标头名称
     * @default 'X-RateLimit-Limit'
     */
    limit?: string | false;

    /**
     * X-RateLimit-Remaining标头名称
     * @default 'X-RateLimit-Remaining'
     */
    remaining?: string | false;

    /**
     * X-RateLimit-Reset标头名称
     * @default 'X-RateLimit-Reset'
     */
    reset?: string | false;

    /**
     * Retry-After标头名称
     * @default 'Retry-After'
     */
    retryAfter?: string | false;
  };

  /**
   * 自定义生成限流键的函数
   */
  keyGenerator?: (req: any) => string;

  /**
   * 自定义返回当前点数的函数
   */
  pointsToConsume?: (req: any) => number;
}

/**
 * Static配置选项
 * @fastify/static插件的配置
 */
export interface StaticOptions {
  /**
   * 静态文件根目录
   * @default 'public'
   */
  root?: string;

  /**
   * 是否装饰reply对象
   * @default true
   */
  decorateReply?: boolean;

  /**
   * 索引文件
   * @default ['index.html']
   */
  index?: string | string[];

  /**
   * 浏览器缓存最大时间
   */
  maxAge?: string | number;

  /**
   * 是否设置immutable缓存标志
   * @default false
   */
  immutable?: boolean;

  /**
   * 是否启用etag
   * @default true
   */
  etag?: boolean;

  /**
   * 是否启用Last-Modified
   * @default true
   */
  lastModified?: boolean;

  /**
   * 允许的HTTP方法
   * @default ['GET', 'HEAD']
   */
  allowedMethods?: string[];

  /**
   * 是否跟随符号链接
   * @default false
   */
  follow?: boolean;

  /**
   * 是否支持通配符
   * @default true
   */
  wildcard?: boolean;

  /**
   * 目录列表设置
   */
  list?:
    | boolean
    | {
        /**
         * 格式：html或json
         * @default 'html'
         */
        format?: 'html' | 'json';

        /**
         * 索引文件名
         * @default ['index', 'index.html']
         */
        names?: string[];
      };

  /**
   * 其他send选项
   */
  send?: Record<string, any>;

  /**
   * 配置前缀
   */
  prefix?: string;

  /**
   * 是否启用范围请求
   */
  acceptRanges?: boolean;

  /**
   * 自定义错误处理
   */
  setHeaders?: (res: any, filePath: string, stat: any) => void;

  /**
   * 启用压缩
   */
  compress?: boolean;

  /**
   * 自定义服务
   */
  serve?: boolean;
}

export type pluginOptions =
  | CorsOptions
  | HelmetOptions
  | CompressOptions
  | CookieOptions
  | FormbodyOptions
  | MultipartOptions
  | RateLimitOptions
  | StaticOptions;
/**
 * Web配置
 */
export interface WebConfig {
  /**
   * 项目根目录
   */
  projectRootDir: string;

  /**
   * 监听端口号
   * @default 3000
   */
  port?: number;

  /**
   * 监听主机
   * @default "0.0.0.0"
   */
  host?: string;

  /**
   * CORS配置
   */
  cors?: boolean | CorsOptions;

  /**
   * Helmet安全头配置
   */
  helmet?: boolean | HelmetOptions;

  /**
   * 压缩配置
   */
  compress?: boolean | CompressOptions;

  /**
   * Cookie配置
   */
  cookie?: boolean | CookieOptions;

  /**
   * Body解析配置
   */
  formbody?: boolean | FormbodyOptions;

  /**
   * 文件上传配置
   */
  multipart?: boolean | MultipartOptions;

  /**
   * 速率限制配置
   */
  rateLimit?: boolean | RateLimitOptions;

  /**
   * 静态文件服务配置
   */
  static?: boolean | StaticOptions;
}

/**
 * 验证配置
 */
export function validateConfig(config: WebConfig): WebConfig {
  // 合并默认配置和用户配置
  return {
    port: 8090,
    host: '0.0.0.0',
    ...config
  };
}
