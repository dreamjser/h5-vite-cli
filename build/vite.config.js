import { defineConfig } from 'vite'
import { getAppConfig, getEnvConfig, getMulitEntry, getCurrentPath } from './utils.js'
import { join } from 'path'
import eslint from 'vite-plugin-eslint'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
import createHtmlPlugin from './vite-html-plugin.js'

const appConfig = await getAppConfig()
const envConfig = await getEnvConfig(process.env.currentEnv)
const pages = await getMulitEntry()
const alias = appConfig.alias

export default defineConfig({
  base: envConfig.PUBLIC_PATH,
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
    }): null
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
    proxy: {
      ...appConfig.proxyTable,
      ...(process.env.pageType === 'multiple' ? pages.reduce((acc, page) => {
        const path = page.filename.replace(/\.html$/, '')

        acc[`/${path}`] = {
          target: `http://localhost:${appConfig.devPort}`,
          rewrite: (path) => {
            if (path.endsWith('.html')) {
              return `/.tmp/multiple/${page.filename.replace(/\.html$/, '/index.html')}`
            }
            return path
          },
          changeOrigin: true,
          secure: false,
          ws: true
        }

        return acc
      }, {}) : {})
    },
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
    emptyOutDir: true,
  },
})
