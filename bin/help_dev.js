#!/usr/bin/env node

import { createServer } from 'vite';
import {  getViteConfig } from '../build/utils.js';

export const createDevFunc = (createFunc) => {
  createFunc(async () => {
    try {
      // 获取 Vite 配置
      const viteConfig = await getViteConfig();

      // 创建开发服务器
      const server = await createServer({
        ...viteConfig,
        configFile: false
      });

      // 启动服务器
      await server.listen();

      // 打印服务器信息
      server.printUrls();
    } catch (error) {
      console.error('启动开发服务器失败:', error);
      process.exit(1);
    }
  })
}