/**
 * Web插件实现
 *
 * @packageDocumentation
 */

import type { FastifyInstance, StratixPlugin } from '@stratix/core';
import { fp } from '@stratix/core';
import { env, merge } from '@stratix/utils';
import { pluginOptions, validateConfig, WebConfig } from './config.js';

/**
 * 动态加载Fastify插件，并尊重插件的封装意图
 *
 * @param fastify Fastify实例
 * @param pluginPath 插件路径或插件对象
 * @param options 插件选项
 */
async function loadAndRegisterPlugin(
  fastify: FastifyInstance,
  pluginPath: string | any,
  options: Record<string, any> = {}
): Promise<void> {
  try {
    let plugin;

    // 处理插件输入，可能是路径字符串或已导入的插件对象
    if (typeof pluginPath === 'string') {
      // 动态导入插件
      plugin = await import(pluginPath).then(
        (module) => module.default || module
      );
      fastify.log.debug(`插件 [${pluginPath}] 导入成功`);
    } else {
      // 使用提供的插件对象
      plugin = pluginPath;
      // 尝试获取插件名称用于日志
      const pluginName = plugin?.name || 'unnamed-plugin';
      fastify.log.debug(`使用已加载的插件 [${pluginName}]`);
    }

    // 检查插件是否已被fastify-plugin包装
    const isWrapped =
      plugin &&
      (plugin[Symbol.for('skip-override')] === true ||
        !!plugin[Symbol.for('fastify.display-name')]);

    // 如果未被包装且我们希望打破封装性，使用fastify-plugin包装
    const finalPlugin = isWrapped
      ? plugin
      : fp(plugin, {
          name:
            typeof pluginPath === 'string'
              ? pluginPath
              : plugin?.name || 'unnamed-plugin',
          fastify: '>=5.0.0'
        });

    // 注册最终的插件
    await fastify.register(finalPlugin, options);
    fastify.log.debug(
      `Fastify plugin [${typeof pluginPath === 'string' ? pluginPath : 'object'}] registered successfully,loaded with config: ${options}`
    );
  } catch (err) {
    fastify.log.warn(
      `Failed to register Fastify plugin [${typeof pluginPath === 'string' ? pluginPath : 'object'}]`,
      err
    );
    throw err; // 抛出错误，让异步函数处理
  }
}

/**
 * 处理中间件配置
 * 如果配置为true，使用默认配置；如果为对象，合并配置；如果为false，不加载
 */
function processMergeConfig(
  config: boolean | pluginOptions,
  defaultOptions: pluginOptions = {}
): pluginOptions | false {
  if (config === false) {
    return false;
  }

  return typeof config === 'object'
    ? merge.deepMerge(defaultOptions, config)
    : defaultOptions;
}

/**
 * Web插件 - 处理HTTP服务
 * 当此插件被注册时，Stratix 会检测到此标识并在 run() 时启动 HTTP 服务器。
 * 如果此插件未被注册，Stratix 应用只会调用 ready() 完成容器的创建。
 */
const webPlugin: StratixPlugin<WebConfig> = async (
  fastify: FastifyInstance,
  options: WebConfig
) => {
  // 为应用装饰一个标志，表明 web 插件已注册
  fastify.decorate('_stratixWebEnabled', true);

  // 验证并规范化配置
  const config = validateConfig(options);

  // 保存 web 配置以便在监听端口时使用
  fastify.decorate('_stratixWebConfig', {
    port: config.port || 3000,
    host: config.host || '0.0.0.0'
  });

  const opts = {
    cors: true,
    helmet: true,
    compress: true,
    cookie: true,
    formbody: true,
    multipart: false,
    rateLimit: false,
    static: true,
    ...config
  };

  // 注册CORS插件
  const corsOptions = processMergeConfig(opts.cors, {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
    maxAge: 86400 // 24小时
  });
  if (corsOptions !== false) {
    await loadAndRegisterPlugin(fastify, '@fastify/cors', corsOptions);
  }

  // 注册Helmet插件(安全头)
  const helmetOptions = processMergeConfig(opts.helmet, {});
  if (helmetOptions !== false) {
    await loadAndRegisterPlugin(fastify, '@fastify/helmet', helmetOptions);
  }

  // 注册Compress插件(压缩)
  const compressOptions = processMergeConfig(opts.compress, {});
  if (compressOptions !== false) {
    await loadAndRegisterPlugin(fastify, '@fastify/compress', compressOptions);
  }

  // 注册Cookie插件
  const cookieOptions = processMergeConfig(opts.cookie, {
    parseOptions: {
      domain: '',
      path: '/',
      secure: env.isProduction(),
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 86400, // 24小时
      signed: false
    }
  });
  if (cookieOptions !== false) {
    await loadAndRegisterPlugin(fastify, '@fastify/cookie', cookieOptions);
  }

  // 注册表单解析插件
  const formbodyOptions = processMergeConfig(opts.formbody, {});
  if (formbodyOptions !== false) {
    await loadAndRegisterPlugin(fastify, '@fastify/formbody', formbodyOptions);
  }

  // // 注册多部分表单解析插件
  // const multipartOptions = processMergeConfig(opts.multipart, {
  //   limits: {
  //     fieldNameSize: 100, // 字段名最大长度
  //     fieldSize: 1000000, // 字段值最大大小，约1MB
  //     fields: 10, // 最大字段数
  //     fileSize: 5000000, // 文件最大大小，约5MB
  //     files: 5, // 最大文件数
  //     headerPairs: 2000 // 最大头部对数
  //   },
  //   attachFieldsToBody: true
  // });
  // if (multipartOptions !== false) {
  //   await loadAndRegisterPlugin(
  //     fastify,
  //     '@fastify/multipart',
  //     multipartOptions
  //   );
  // }

  // // 注册速率限制插件
  // const rateLimitOptions = processMergeConfig(opts.rateLimit, {});
  // if (rateLimitOptions !== false) {
  //   await loadAndRegisterPlugin(
  //     fastify,
  //     '@fastify/rate-limit',
  //     rateLimitOptions
  //   );
  // }

  // // 注册静态文件服务
  // const staticOptions = processMergeConfig(opts.static, {
  //   root: path.resolve(opts.projectRootDir, 'public'),
  //   maxAge: env.isProduction() ? 86400000 : 0, // 生产环境1天，开发环境禁用
  //   immutable: env.isProduction(),
  //   etag: true,
  //   index: 'index.html',
  //   list: !env.isProduction() // 开发环境启用目录列表
  // });

  // if (staticOptions !== false) {
  //   await loadAndRegisterPlugin(fastify, '@fastify/static', staticOptions);
  // }
};

Object.defineProperties(webPlugin, {
  description: {
    value: 'Stratix Web plugin',
    writable: false
  }
});

export const warpWebPlugin: StratixPlugin<WebConfig> = fp(webPlugin, {
  name: '@stratix/web',
  fastify: '>=5.0.0'
});
