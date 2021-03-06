#!/usr/bin/env node

import { Command } from 'commander';
import pageLoader from '../src/pageLoader.js';

const program = new Command();

program
  .name('page-loader')
  .argument('<url>')
  .description('Page loader utility')
  .version('0.0.1')
  .option('-o, --output [dir]', 'output dir', process.cwd())
  .action((url) => {
    pageLoader(url, program.opts().output)
      .then((filepath) => console.log(`Page was successfully downloaded into '${filepath}'`))
      .catch((e) => {
        console.error(e.message);
        process.exit(1);
      });
  });

program.parse();
