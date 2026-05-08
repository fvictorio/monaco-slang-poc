import { CompilationBuilder } from '@nomicfoundation/slang/compilation';
import { LanguageFacts } from '@nomicfoundation/slang/utils';

import { resolveSourceName } from './import-resolution.js';

export async function buildCompilationUnit(sources, languageVersion) {
  const version = languageVersion ?? LanguageFacts.latestVersion();

  const builder = CompilationBuilder.create({
    languageVersion: version,
    readFile: async (id) => sources[id],
    resolveImport: async (sourceFileId, importPath) => {
      const literal = importPath.node.unparse();
      const path = literal.replace(/^["']/, '').replace(/["']$/, '');
      return resolveSourceName(sourceFileId, path);
    },
  });

  for (const id of Object.keys(sources)) {
    await builder.addFile(id);
  }

  const unit = builder.build();

  // Slang computes the binding graph lazily on first access. Touch it now
  // so the cost is paid as part of the (already async) build, not on the
  // user's first go-to-definition click.
  void unit.bindingGraph;

  return unit;
}
