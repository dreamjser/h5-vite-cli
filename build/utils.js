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