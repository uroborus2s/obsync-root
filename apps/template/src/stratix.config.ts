import { type StratixConfig } from '@stratix/core';
import databasePlugin from '@stratix/database';
import { default as icalinkPlugin } from '@stratix/icalink';
import queuePlugin from '@stratix/queue';
import tasksPlugin from '@stratix/tasks';
import wasV7Plugin from '@stratix/was-v7';
import webPlugin from '@stratix/web';
import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Stratix配置文件
 *
 * 该函数接收从环境变量中解密的敏感信息作为参数
 */
export default (sensitiveInfo: any): StratixConfig => {
  const projectRootDir = path.resolve(
    typeof __dirname !== 'undefined'
      ? __dirname
      : dirname(fileURLToPath(import.meta.url)),
    '..'
  );

  let httpsOptions = {};
  if (sensitiveInfo.web.https) {
    const keyPath = path.resolve(
      projectRootDir,
      'ssl',
      sensitiveInfo.web.https.key
    );
    const certPath = path.resolve(
      projectRootDir,
      'ssl',
      sensitiveInfo.web.https.cert
    );
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      throw new Error('SSL证书不存在');
    }
    httpsOptions = {
      https: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      }
    };
  }

  return {
    // 应用基础信息
    name: 'stratix-example-app',
    version: '1.0.0',
    description: 'Stratix框架示例应用',
    logger: {
      level: sensitiveInfo.logger.loglevle
    },
    server: {
      disableRequestLogging: sensitiveInfo.logger.disableRequestLogging,
      ...httpsOptions
    },
    registers: [
      [
        wasV7Plugin,
        {
          appId: sensitiveInfo.wasV7.appId,
          appSecret: sensitiveInfo.wasV7.appSecret
        }
      ],
      [webPlugin, { projectRootDir, port: 8090 }],
      [
        databasePlugin,
        {
          databases: {
            default: {
              connection: {
                client: 'mysql',
                ...sensitiveInfo.databases.default
              }
            }
          }
        }
      ],
      [
        queuePlugin,
        {
          defaultQueue: {
            processors: []
          }
        }
      ],
      [tasksPlugin, {}],
      [icalinkPlugin, { ...sensitiveInfo.icalink }]
    ]
  };
};
