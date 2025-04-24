#!/usr/bin/env node

import commander from './commander.js'
import { createRouterChildren } from '../build/utils.js'
import { createProdFunc } from './help_prod.js'

process.env.pageType = 'single'

commander(() => {
  createProdFunc(createRouterChildren)
})

