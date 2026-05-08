import { TerminalKindExtensions } from '@nomicfoundation/slang/cst';

// Given a Monaco position in a known source file, ask Slang's binding graph
// for the corresponding definition. Returns { sourceName, range } in Monaco
// coordinates, or null when there is no identifier or no definition.
export function findDefinition(unit, sourceName, monacoPosition) {
  const file = unit.file(sourceName);
  if (!file) return null;

  const target = {
    line: monacoPosition.lineNumber - 1,
    column: monacoPosition.column - 1,
  };

  const cursor = file.createTreeCursor();
  let identifierCursor = null;
  while (cursor.goToNextTerminal()) {
    if (!containsPosition(cursor.textRange, target)) continue;
    if (TerminalKindExtensions.isIdentifier(cursor.node.kind)) {
      identifierCursor = cursor;
    }
    break;
  }
  if (!identifierCursor) return null;

  const definition = resolveDefinition(unit, identifierCursor);
  if (!definition) return null;

  const userLocation = definition.nameLocation.asUserFileLocation();
  if (!userLocation) return null;

  return {
    sourceName: userLocation.fileId,
    range: textRangeToMonacoRange(userLocation.cursor.textRange),
  };
}

// The cursor may be on a use (typical) or on the definition site itself.
// `referenceAt` covers uses; `definitionAt` covers cursors that already sit
// on a definition's name.
function resolveDefinition(unit, cursor) {
  const reference = unit.bindingGraph.referenceAt(cursor);
  if (reference) {
    const definitions = reference.definitions();
    if (definitions.length > 0) return definitions[0];
  }
  return unit.bindingGraph.definitionAt(cursor) ?? null;
}

function containsPosition(range, pos) {
  return comparePos(range.start, pos) <= 0 && comparePos(pos, range.end) < 0;
}

function comparePos(a, b) {
  if (a.line !== b.line) return a.line - b.line;
  return a.column - b.column;
}

function textRangeToMonacoRange(textRange) {
  return {
    startLineNumber: textRange.start.line + 1,
    startColumn: textRange.start.column + 1,
    endLineNumber: textRange.end.line + 1,
    endColumn: textRange.end.column + 1,
  };
}
