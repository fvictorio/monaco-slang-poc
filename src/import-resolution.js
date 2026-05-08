// Resolves a Solidity import path to a solc source name.
//
// Two rules cover most cases (no remappings, no node_modules lookup):
//   - If importPath is relative (./ or ../), join it onto the importing
//     file's directory and normalize.
//   - Otherwise, the import path *is* the source name.

export function resolveSourceName(importingSourceName, importPath) {
  if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
    return importPath;
  }
  const lastSlash = importingSourceName.lastIndexOf('/');
  const dir = lastSlash === -1 ? '' : importingSourceName.slice(0, lastSlash);
  const joined = dir ? `${dir}/${importPath}` : importPath;
  return normalize(joined);
}

function normalize(p) {
  const out = [];
  for (const segment of p.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') out.pop();
    else out.push(segment);
  }
  return out.join('/');
}
