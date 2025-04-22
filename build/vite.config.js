import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import eslint from 'vite-plugin-eslint'
import { createHtmlPlugin } from 'vite-plugin-html'
import styleImport from 'vite-plugin-style-import'
import { getAppConfig, getEnvConfig, getViteConfig } from './utils.js'

const appConfig = getAppConfig()
const envConfig = getEnvConfig(process.env.currentEnv)
const viteConfig = getViteConfig()

export default defineConfig({
  ...viteConfig,
  plugins: [
    react(),
    eslint(),
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          title: 'Vite App'
        }
      }
    }),
    styleImport({
      libs: [
        {
          libraryName: 'vant',
          esModule: true,
          resolveStyle: (name) => `vant/es/${name}/style`
        }
      ]
    })
  ],
  define: {
    'GLOBAL_CONFIG': JSON.stringify(envConfig)
  },
  server: {
    port: appConfig.devPort,
    open: true,
    proxy: appConfig.proxyTable
  },
  build: {
    outDir: appConfig.outputPath,
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})