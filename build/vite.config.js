import { defineConfig } from 'vite'
import { getAppConfig, getEnvConfig, getMulitEntry, getCurrentPath } from './utils.js'
import { join } from 'path'
import eslint from 'vite-plugin-eslint'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
import { createHtmlPlugin } from 'vite-plugin-html'

const appConfig = await getAppConfig()
const envConfig = await getEnvConfig(process.env.currentEnv)
const pages = await getMulitEntry()
const alias = appConfig.alias

export default defineConfig({
  plugins: [
    eslint({
      include: 'src/**/*.{js,jsx,ts,tsx,vue}',
      exclude: 'node_modules',
      fix: true,
      emitError: true,
      emitWarning: true,
      failOnError: true,
      failOnWarning: true,
    }),
    process.env.currentFramework === 'react' ? react() : vue(),
    process.env.pageType === 'multiple' ? createHtmlPlugin({
      minify: true,
      pages,
    }) : createHtmlPlugin({
      minify: true,
      entry: 'src/portal/index.tsx',
      template: getCurrentPath('template/index.html'),
    })
  ],
  resolve: {
    alias,
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
  },
  define: {
    'GLOBAL_CONFIG': JSON.stringify(envConfig)
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    },
    postcss: join(process.cwd(), 'postcss.config.js'),
  },
  server: {
    port: appConfig.devPort,
    open: true,
    proxy: appConfig.proxyTable,
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        // 阻止自动生成子目录
        assetFileNames: (assetInfo) => {
          console.log(assetInfo.name, 'assetInfo.name')
          return assetInfo.names === 'index.html'
            ? '[name][extname]' // HTML强制根目录
            : 'assets/[name]-[hash][extname]'
        }
      }
    }
  }
})