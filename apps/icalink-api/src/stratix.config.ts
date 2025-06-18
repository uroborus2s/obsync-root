import { type StratixConfig } from '@stratix/core';
import databasePlugin from '@stratix/database';
import wasV7Plugin from '@stratix/was-v7';
import webPlugin from '@stratix/web';
import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import apiPlugin from './plugin/api/index.js';

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
  console.log(sensitiveInfo);
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
      bodyLimit: 50 * 1024 * 1024, // 50MB - 临时增大用于测试
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
      [
        webPlugin,
        {
          projectRootDir,
          port: 8090,
          formbody: {
            bodyLimit: 20 * 1024 * 1024 // 20MB - 与server.bodyLimit保持一致
          }
        }
      ],
      [
        databasePlugin,
        {
          databases: {
            default: {
              connection: {
                client: 'mysql',
                ...sensitiveInfo.databases.default,
                // 增加MySQL特定配置以支持大数据包
                connectionLimit: 20,
                acquireTimeout: 60000,
                timeout: 60000,
                reconnect: true,
                bigNumberStrings: true
              }
            }
          }
        }
      ],
      [apiPlugin, { ...sensitiveInfo.icalink }]
    ]
  };
};
