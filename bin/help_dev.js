#!/usr/bin/env node

import { createServer } from 'vite';

export const createDevFunc = (createFunc) => {
  createFunc(async () => {
    try {
      // 获取 Vite 配置
      const viteConfig = await import('../build/vite.config.js')
      // 创建开发服务器
      const server = await createServer({
        ...viteConfig.default,
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