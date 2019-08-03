#!/usr/bin/env node
/**
 * vault.js
 * Script Generator
 *
 * Ashen Gunaratne
 * mail@ashenm.ml
 *
 */

const fs = require('fs');
const yargs = require('yargs');
const nunjucks = require('nunjucks');
const environment = nunjucks.configure({ autoescape: false });

yargs
  .options({
    'config': {
      string: true,
      demandOption: true,
      describe: 'Runtime configuration'
    },
    'in-file': {
      string: true,
      demandOption: true,
      describe: 'The script template file',
    },
    'out-file': {
      string: true,
      demandOption: true,
      describe: 'The output script file'
    },
  })
  .usage('Usage: $0 OPTIONS')
  .version(false)
  .strict(true);

environment.addFilter('stringify', function (input) {
  return JSON.stringify(input)
    .replace(/\[/, '[ ')
    .replace(/\]/, ' ]')
    .replace(/,/g, ', ')
    .replace(/"/g, '\'');
});

fs.writeFileSync(
  yargs.argv.outFile,
  environment.render(yargs.argv.inFile, JSON.parse(fs.readFileSync(yargs.argv.config)))
);

/* vim: set expandtab shiftwidth=2 syntax=javascript: */
