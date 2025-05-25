import { resolve, join, dirname } from 'path'
import { readFileSync, existsSync, mkdirSync, unlinkSync, writeFileSync, rmSync, readdirSync, statSync } from 'fs'
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

      // 检查是否为单页面应用
      const isSinglePage = pages.length === 1 && pages[0].filename === 'index.html'

      const buildConfig = {
        build: {
          outDir,
          rollupOptions: {
            input,
            output: {
              // 确保每个页面都有自己的入口，JS 文件与 HTML 文件在同一目录
              entryFileNames: (chunkInfo) => {
                // 单页面模式下，JS 文件直接输出到根目录
                if (isSinglePage) {
                  return 'index.[hash].js'
                }

                // 找到对应的页面配置
                const page = pages.find(p => {
                  const name = p.filename.replace(/\.html$/, '').replace(/\//g, '_')
                  return name === chunkInfo.name
                })

                if (page) {
                  // 使用页面的 filename 路径，但替换为 .js 后缀
                  return page.filename.replace(/\.html$/, '.[hash].js')
                }

                // 默认情况
                return `${chunkInfo.name}.[hash].js`
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

      return buildConfig
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

        // 检查是否为单页面应用
        const isSinglePage = pages.length === 1 && pages[0].filename === 'index.html'

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

        // 单页面模式下直接返回HTML，不改变输出路径
        if (isSinglePage) {
          return result
        }

        // 多页面模式下返回处理后的 HTML 和自定义的输出路径
        return {
          html: result,
          tags: [],
          filename: page.filename
        }
      }
    },

        // 添加 writeBundle 钩子来处理文件移动
    writeBundle(options, bundle) {
      // 检查是否为单页面应用
      const isSinglePage = pages.length === 1 && pages[0].filename === 'index.html'

      // 单页面模式下需要移动HTML文件到根目录
      if (isSinglePage) {
        const templateHtmlPath = join(outDir, 'template', 'index.html')
        const targetHtmlPath = join(outDir, 'index.html')

        if (existsSync(templateHtmlPath)) {
          try {
            // 读取HTML内容
            let htmlContent = readFileSync(templateHtmlPath, 'utf-8')

            // 替换标题
            const page = pages[0]
            if (page.title) {
              htmlContent = htmlContent.replace(
                /<title>(.*?)<\/title>/,
                `<title>${page.title}</title>`
              )
            }

            // 如果配置了 minify，进行压缩
            if (minify) {
              htmlContent = htmlContent
                .replace(/\s+/g, ' ')
                .replace(/<!--[\s\S]*?-->/g, '')
                .trim()
            }

            // 写入到根目录
            writeFileSync(targetHtmlPath, htmlContent, 'utf-8')

            // 删除template目录
            rmSync(join(outDir, 'template'), { recursive: true, force: true })
          } catch (error) {
            console.error(`Error moving HTML file: ${error.message}`)
          }
        }
        return
      }

      const tmpRootDir = join(outDir, '.tmp')
      if (existsSync(tmpRootDir)) {
        // 递归查找HTML文件的函数
        const findHtmlFiles = (dir) => {
          const htmlFiles = []
          const items = readdirSync(dir)

          for (const item of items) {
            const fullPath = join(dir, item)
            const stat = statSync(fullPath)

            if (stat.isDirectory()) {
              htmlFiles.push(...findHtmlFiles(fullPath))
            } else if (item.endsWith('.html')) {
              htmlFiles.push(fullPath)
            }
          }

          return htmlFiles
        }

        // 获取所有HTML文件
        const allHtmlFiles = findHtmlFiles(tmpRootDir)

        // 遍历页面配置，为每个页面查找对应的HTML文件
        pages.forEach(page => {
          if (page && page.filename && page.template) {
            const targetPath = join(outDir, page.filename)

            // 多页面模式：根据filename的各个部分进行匹配
            const filenameParts = page.filename.replace(/\.html$/, '').split('/')

            const matchingHtmlFile = allHtmlFiles.find(htmlFile => {
              // 检查HTML文件路径是否包含filename的所有部分
              return filenameParts.every(part => htmlFile.includes(part))
            })

            if (matchingHtmlFile && existsSync(matchingHtmlFile)) {
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
                // 使用找到的构建后HTML文件作为基础
                let processedContent = readFileSync(matchingHtmlFile, 'utf-8')

                // 替换标题
                processedContent = processedContent.replace(
                  /<title>(.*?)<\/title>/,
                  `<title>${page.title || 'Untitled'}</title>`
                )

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
            } else {
              console.warn(`No matching HTML file found for: ${page.filename}`)
            }
          }
        })

        // 删除.tmp目录
        try {
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
