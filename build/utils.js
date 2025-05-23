import path from 'path'
import { join } from 'path'
import fs from 'fs'
import fileModule from '@dreamjser/file'

export const getCurrentPath = (path) => {
  return join(process.cwd(), path)
}

const getGlobalConfig = async () => {
  const env = process.env.currentEnv
  let envConfg

  try {
    envConfg = await import(getCurrentPath(`config/${env}.env.js`))
  } catch (error) {
    envConfg = await import(getCurrentPath(`config/dev.env.js`))
  }

  return envConfg.default
}

export const getAppConfig = async () => {
  const configPath = join(process.cwd(), 'app.config.js')
  if (fs.existsSync(configPath)) {
    const config = await import(configPath)
    return config.default
  }
}

export const getEnvConfig = async (env) => {
  const configPath = join(process.cwd(), `config/${env}.env.js`)
  if (fs.existsSync(configPath)) {
    const config = await import(configPath)
    return config.default
  }
}

export const createMultiPage = async (cb) => {
  let params = process.env.currentModules
  let framework = process.env.currentFramework
  let allModules = fs.readdirSync(getCurrentPath('src/modules'))
  let envConfg = await getGlobalConfig()
  let appConfig = await getAppConfig()
  let isProd = envConfg.NODE_ENV.indexOf('production') >= 0? true: false

  if(params.toLocaleLowerCase() === 'all' || isProd) {
    params = allModules
  }

  params.forEach((module) => {
    const confPath = path.join(process.cwd(), `src/modules/${module}/conf.json`);
    try {
      const jsonData = fs.readFileSync(confPath, 'utf-8');
      const conf = JSON.parse(jsonData);
      let htmlData = fs.readFileSync(getCurrentPath('template/index.html'), 'utf-8')


      Object.keys(conf).forEach(sencondKey => {
        const secondConf = conf[sencondKey]

        Object.keys(secondConf).forEach(thirdKey => {
          const thirdPath = path.join(process.cwd(), `.tmp/multiple/${module}/${sencondKey}/${thirdKey}`)
          const content = framework === 'vue'?
          (
            `import '@/common/styles/app.less'\n`+
            `import '@/common/app'\n`+
            `import { createApp } from 'vue'\n`+
            `import { createPinia } from 'pinia'\n`+
            `import Render from '@/modules/${module}/views/${sencondKey}/${thirdKey}.vue'\n`+
            `const pinia = createPinia()\n`+
            `const vm = createApp(Render)\n`+
            `vm.use(pinia)\n`+
            `vm.mount('#${appConfig.containerId}')\n`+
            `App.vm = vm`
          )
          :
          (
            `import '@/common/styles/app.less'\n`+
            `import React from 'react'\n`+
            `import { createRoot } from 'react-dom/client'\n`+
            `import Entry from '@/modules/${module}/views/${sencondKey}/${thirdKey}'\n`+
            `import '@/common/app'\n`+
            `const root = createRoot(document.getElementById('${appConfig.containerId}') as HTMLElement)\n`+
            `root.render(<Entry />)`
          )
          fileModule.mkdir(thirdPath, () => {
            htmlData = htmlData.replace(/src="\/src\/portal\/index.tsx?"/, `src="./main.${framework === 'vue'? 'js': 'tsx'}"`)

            fs.writeFile(
              thirdPath + `/index.html`,
              htmlData,
              () => {}
            )

            fs.writeFile(
              thirdPath + `/main.${framework === 'vue'? 'js': 'tsx'}`,
              content,
              () => {}
            )
          })
        })
      })
    } catch (error) {

    }

  })

  setTimeout(cb, 1000)
}

export const getMulitEntry = async () => {
  let params = process.env.currentModules
  let framework = process.env.currentFramework
  let allModules = fs.readdirSync(getCurrentPath('src/modules'))
  let envConfg = await getGlobalConfig()
  let isProd = envConfg.NODE_ENV.indexOf('production') >= 0? true: false

  if(params.toLocaleLowerCase() === 'all' || isProd) {
    params = allModules
  }

  const pagesConfig = []

  params.forEach((module) => {
    const confPath = path.join(process.cwd(), `src/modules/${module}/conf.json`);

    try {
      const jsonData = fs.readFileSync(confPath, 'utf-8');
      const conf = JSON.parse(jsonData);

      Object.keys(conf).forEach(sencondKey => {
        const secondConf = conf[sencondKey]

        Object.keys(secondConf).forEach(thirdKey => {
          const thirdConf = secondConf[thirdKey]
          pagesConfig.push({
            // entry: getCurrentPath(`.tmp/multiple/${module}/${sencondKey}/${thirdKey}/main.${framework === 'vue'? 'js': 'tsx'}`),
            filename: getCurrentPath(`dist/${module}/${sencondKey}/${thirdKey}.html`),
            template: getCurrentPath(`.tmp/multiple/${module}/${sencondKey}/${thirdKey}/index.html`),
            title: thirdConf.title,
          })

        })
      })
    } catch (error) {

    }

  })

  return pagesConfig
}

const createModuleRouterReact = (modules, cb) => {
  let routeConf = `import React from 'react'\nexport default [`

  modules.forEach((module) => {
    const confPath = path.join(process.cwd(), `src/modules/${module}/conf.json`);
    try {
      const jsonData = fs.readFileSync(confPath, 'utf-8');
      const conf = JSON.parse(jsonData);
      Object.keys(conf).forEach(sencondKey => {
        const secondConf = conf[sencondKey]
        Object.keys(secondConf).forEach(thirdKey => {
          const thirdConf = secondConf[thirdKey]
          routeConf +=
            (
              `{\n` +
              `  name: '${module}${sencondKey}${thirdKey}',\n` +
              `  path: '/${module}/${sencondKey}/${thirdKey}',\n` +
              `  component: React.lazy(() => import('@\/modules\/${module}\/views\/${sencondKey}\/${thirdKey}')),\n` +
              `  meta: ${JSON.stringify(thirdConf)}` +
              `},\n`
            )
        })


      })
    } catch (error) {

    }

  })
  fileModule.mkdir('.tmp', () => {
    fs.writeFile(getCurrentPath(`.tmp/routers.ts`), routeConf + " ]", cb)
  })
}

const createModuleRouterVue = (modules, cb) => {
  let routeConf = '['

  modules.forEach((module) => {
    const confPath = path.join(process.cwd(), `src/modules/${module}/conf.json`);
    try {
      const jsonData = fs.readFileSync(confPath, 'utf-8');
      const conf = JSON.parse(jsonData);

      Object.keys(conf).forEach(sencondKey => {
        const secondConf = conf[sencondKey]

        Object.keys(secondConf).forEach(thirdKey => {
          const thirdConf = secondConf[thirdKey]
          routeConf +=
            (
              `{\n` +
              `  name: '${module}${sencondKey}${thirdKey}',\n` +
              `  path: '/${module}/${sencondKey}/${thirdKey}',\n` +
              `  component: () => import('@\/modules\/${module}\/views\/${sencondKey}\/${thirdKey}'),\n` +
              `  meta: ${JSON.stringify(thirdConf)}` +
              `},\n`
            )

        })
      })
    } catch (error) {

    }

  })
  fileModule.mkdir('.tmp', () => {
    fs.writeFile(getCurrentPath(`.tmp/routers.ts`), 'export default ' + routeConf + " ]", cb);
  })
}

export const createRouterChildren = async (cb) => {
  let params = process.env.currentModules
  let framework = process.env.currentFramework
  let allModules = fs.readdirSync(getCurrentPath('src/modules'))
  const globalConfig = await getGlobalConfig()


  if (params.toLocaleLowerCase() === 'all' || globalConfig.NODE_ENV.indexOf('production') >= 0) {
    params = allModules
  } else {
    params = params.split(',')
  }

  framework === 'vue' ? createModuleRouterVue(params, cb) : createModuleRouterReact(params, cb)
}