import repl from 'node:repl';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import * as compilation from '@nomicfoundation/slang/compilation';
import * as bindings from '@nomicfoundation/slang/bindings';
import * as cst from '@nomicfoundation/slang/cst';
import * as utils from '@nomicfoundation/slang/utils';
import * as ast from '@nomicfoundation/slang/ast';

import { buildCompilationUnit } from '../src/compilation.js';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const solcInputPath = resolve(projectRoot, 'solc-input.json');

const text = await readFile(solcInputPath, 'utf8');
const json = JSON.parse(text);

const sources = Object.fromEntries(
  Object.entries(json.sources)
    .filter(([, entry]) => typeof entry?.content === 'string')
    .map(([name, entry]) => [name, entry.content]),
);

console.log(`Building compilation unit from ${solcInputPath}...`);
const unit = await buildCompilationUnit(sources);
console.log(`Files: ${unit.files().map((f) => f.id).join(', ')}`);
console.log(
  'Globals: unit, sources, compilation, bindings, cst, utils, ast, build()',
);
console.log('  build()  — rebuild the unit after editing solc-input.json');
console.log();

const server = repl.start({ prompt: 'slang> ' });

async function build() {
  const fresh = JSON.parse(await readFile(solcInputPath, 'utf8'));
  const freshSources = Object.fromEntries(
    Object.entries(fresh.sources)
      .filter(([, entry]) => typeof entry?.content === 'string')
      .map(([name, entry]) => [name, entry.content]),
  );
  const freshUnit = await buildCompilationUnit(freshSources);
  server.context.unit = freshUnit;
  server.context.sources = freshSources;
  return freshUnit;
}

Object.assign(server.context, {
  unit,
  sources,
  compilation,
  bindings,
  cst,
  utils,
  ast,
  build,
});
