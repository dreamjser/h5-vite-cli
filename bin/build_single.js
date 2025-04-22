#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Command } from 'commander';
import { build } from 'vite';
import { getAppConfig, getViteConfig } from '../build/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const appConfig = getAppConfig();
const program = new Command();

program
  .option('--framework <f>', '框架', 'vue')
  .option('--platform <m>', '平台', 'h5')
  .option('--env <e>', '环境', 'prod')
  .arguments('[args...]', '需要构建的模块')
  .action(async (args, options) => {
    const { framework, platform, env } = options;
    const [module] = args;

    if (!module) {
      console.log('请输入模块名称');
      return;
    }

    // 设置环境变量
    process.env.currentFramework = framework;
    process.env.currentPlatform = platform;
    process.env.currentEnv = env;
    process.env.currentModule = module;

    try {
      // 获取 Vite 配置
      const viteConfig = await getViteConfig();
      
      // 执行构建
      await build({
        ...viteConfig,
        configFile: false
      });

      console.log('构建完成！');
    } catch (error) {
      console.error('构建失败:', error);
      process.exit(1);
    }
  });

program.parse(); 