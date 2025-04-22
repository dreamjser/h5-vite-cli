#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';
import { Command } from 'commander';
import { getAppConfig } from '../build/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const appConfig = getAppConfig();
const program = new Command();

program
  .option('--framework <f>', '框架', 'vue')
  .option('--platform <m>', '平台', 'h5')
  .option('--env <e>', '环境', 'dev')
  .arguments('[args...]', '需要构建的模块')
  .action((args, options) => {
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
    process.env.isMultiple = true;

    // 执行 vite 开发命令
    execSync('npx vite', { stdio: 'inherit' });
  });

program.parse(); 