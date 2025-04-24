#!/usr/bin/env node

import { build } from 'vite';

export const createProdFunc = (createFunc) => {
  createFunc(async () => {
    try {
      // 获取 Vite 配置
      const viteConfig = await import('../build/vite.config.js')

      await build({
        ...viteConfig.default,
        configFile: false
      });

      console.log('构建完成！');
    } catch (error) {
      console.error('启动开发服务器失败:', error);
      process.exit(1);
    }
  })
}