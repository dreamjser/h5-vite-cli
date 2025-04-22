#!/usr/bin/env node

import commander from './commander.js'
import { createRouterChildren } from '../build/utils.js'
import { createDevFunc } from './help_dev.js'

process.env.pageType = 'single'

commander(() => {
  createDevFunc(createRouterChildren)
})

