import { resolve, join, dirname } from 'path'
import { readFileSync, existsSync, mkdirSync, unlinkSync, writeFileSync, rmSync } from 'fs'
import { createFilter } from '@rollup/pluginutils'

export default function viteMultiPagePlugin(options = {}) {
  const {
    pages = [],
    template = 'index.html',
    root = process.cwd(),
    minify = false,
    outDir = 'dist'
  } = options

  const filter = createFilter(
    options.include || /\.html$/,
    options.exclude
  )

  return {
    name: 'vite-plugin-multi-page',
    enforce: 'pre',

    config(config) {
      // 配置多入口
      const input = {}

      // 处理页面配置
      if (Array.isArray(pages)) {
        pages.forEach(page => {
          if (page && page.filename && page.template) {
            // 如果模板路径是绝对路径，直接使用
            const fullPath = page.template.startsWith('/')
              ? page.template
              : resolve(root, page.template)

            if (existsSync(fullPath)) {
              // 使用 filename 作为入口名称，去掉 .html 后缀，并替换路径分隔符
              const name = page.filename.replace(/\.html$/, '').replace(/\//g, '_')
              input[name] = fullPath
            } else {
              console.warn(`Entry file not found: ${fullPath}`)
            }
          }
        })
      }

      // 确保至少有一个入口
      if (Object.keys(input).length === 0) {
        console.warn('No valid entry files found. Please check your configuration and file structure.')
      }

      return {
        build: {
          outDir,
          rollupOptions: {
            input,
            output: {
              // 确保每个页面都有自己的入口，JS 文件与 HTML 文件在同一目录
              entryFileNames: (chunkInfo) => {
                // 找到对应的页面配置
                const page = pages.find(p => {
                  const name = p.filename.replace(/\.html$/, '').replace(/\//g, '_')
                  return name === chunkInfo.name
                })

                if (page) {
                  // 使用页面的 filename 路径，但替换为 .js 后缀
                  return page.filename.replace(/\.html$/, '.js')
                }

                // 默认情况
                return `${chunkInfo.name}.js`
              },
              // 确保资源文件正确输出
              assetFileNames: (assetInfo) => {
                const info = assetInfo.name.split('.')
                const ext = info[info.length - 1]
                if (/\.(css|less|scss)$/.test(assetInfo.name)) {
                  return `assets/css/[name]-[hash].${ext}`
                }
                if (/\.(png|jpe?g|gif|svg|webp)$/.test(assetInfo.name)) {
                  return `assets/images/[name]-[hash].${ext}`
                }
                return `assets/[name]-[hash].${ext}`
              }
            }
          }
        }
      }
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, { filename }) {
        // 获取当前页面的配置
        const page = pages.find(p => {
          const templatePath = p.template.startsWith('/')
            ? p.template
            : resolve(root, p.template)
          return templatePath === filename
        })
        if (!page) return html

        // 使用页面自己的模板内容
        let result = html

        // 替换模板中的变量
        result = result.replace(
          /<title>(.*?)<\/title>/,
          `<title>${page.title || 'Untitled'}</title>`
        )

        // 如果配置了 minify，进行压缩
        if (minify) {
          result = result
            .replace(/\s+/g, ' ')
            .replace(/<!--[\s\S]*?-->/g, '')
            .trim()
        }

        // 返回处理后的 HTML 和原始的输出路径
        return {
          html: result,
          tags: [],
          filename: page.filename
        }
      }
    },

    // 添加 writeBundle 钩子来处理文件移动
    writeBundle(options, bundle) {
      const tmpDir = join(outDir, '.tmp', 'multiple')
      if (existsSync(tmpDir)) {
        // 遍历页面配置，为每个页面移动对应的 HTML 文件
        pages.forEach(page => {
          if (page && page.filename && page.template) {
            // 构建源文件路径 - 直接使用模板路径
            const sourcePath = page.template
            const targetPath = join(outDir, page.filename)

            if (existsSync(sourcePath)) {
              // 确保目标目录存在
              const targetDir = dirname(targetPath)
              if (!existsSync(targetDir)) {
                mkdirSync(targetDir, { recursive: true })
              }

              // 如果目标文件已存在，先删除
              if (existsSync(targetPath)) {
                unlinkSync(targetPath)
              }

              // 复制文件并处理内容
              try {
                // 查找.tmp目录中构建后的HTML文件
                const entryName = page.filename.replace(/\.html$/, '').replace(/\//g, '_')

                // 构建后的HTML文件在.tmp/multiple目录的深层嵌套中
                const templateParts = page.template.split('/')
                const moduleIndex = templateParts.findIndex(part => part === 'multiple')

                let processedContent = ''

                if (moduleIndex !== -1 && moduleIndex + 1 < templateParts.length) {
                  // 构建实际的构建后HTML文件路径
                  const builtHtmlPath = join(outDir, '.tmp', 'multiple', ...templateParts.slice(moduleIndex + 1))

                  if (existsSync(builtHtmlPath)) {
                    // 使用构建后的HTML文件作为基础
                    processedContent = readFileSync(builtHtmlPath, 'utf-8')

                    // 替换标题
                    processedContent = processedContent.replace(
                      /<title>(.*?)<\/title>/,
                      `<title>${page.title || 'Untitled'}</title>`
                    )
                  } else {
                    // 如果没有找到构建后的文件，使用原始模板
                    const content = readFileSync(sourcePath, 'utf-8')

                    processedContent = content.replace(
                      /<title>(.*?)<\/title>/,
                      `<title>${page.title || 'Untitled'}</title>`
                    )
                  }
                } else {
                  // 如果无法解析路径，使用原始模板
                  const content = readFileSync(sourcePath, 'utf-8')

                  processedContent = content.replace(
                    /<title>(.*?)<\/title>/,
                    `<title>${page.title || 'Untitled'}</title>`
                  )
                }

                // 如果配置了 minify，进行压缩
                if (minify) {
                  processedContent = processedContent
                    .replace(/\s+/g, ' ')
                    .replace(/<!--[\s\S]*?-->/g, '')
                    .trim()
                }

                // 写入目标文件
                writeFileSync(targetPath, processedContent, 'utf-8')
              } catch (error) {
                console.error(`Error copying file: ${error.message}`)
              }
            }
          }
        })

        // 删除.tmp目录
        try {
          const tmpRootDir = join(outDir, '.tmp')
          if (existsSync(tmpRootDir)) {
            rmSync(tmpRootDir, { recursive: true, force: true })
          }
        } catch (error) {
          console.error(`Error removing .tmp directory: ${error.message}`)
        }
      }
    }
  }
}
