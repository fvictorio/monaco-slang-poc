import assert from 'node:assert/strict';

import { CompilationBuilder } from '@nomicfoundation/slang/compilation';
import { LanguageFacts } from '@nomicfoundation/slang/utils';
import { TerminalKind } from '@nomicfoundation/slang/cst';

const SOURCE_NAME = 'contract.sol';
const CONTENT = `contract Foo {
    uint public x;

    function f() public {
        x = 1;
    }
}
`;

// Slang reports 0-based line numbers, so:
//   line 0: contract Foo {
//   line 1:     uint public x;     <-- the definition
//   line 2: (empty)
//   line 3:     function f() public {
//   line 4:         x = 1;          <-- the use we resolve from
const USE_LINE = 4;
const DEFINIENS_LINE = 1;

const builder = CompilationBuilder.create({
  languageVersion: LanguageFacts.latestVersion(),
  readFile: async (id) => (id === SOURCE_NAME ? CONTENT : undefined),
  resolveImport: async () => undefined,
});

await builder.addFile(SOURCE_NAME);
const unit = builder.build();

const file = unit.file(SOURCE_NAME);
assert(file, 'file not found in compilation unit');

// Walk identifiers until we find the `x` on USE_LINE.
const cursor = file.createTreeCursor();
let found = false;
while (cursor.goToNextTerminalWithKind(TerminalKind.Identifier)) {
  if (
    cursor.node.unparse() === 'x' &&
    cursor.textRange.start.line === USE_LINE
  ) {
    found = true;
    break;
  }
}
assert(found, `could not find identifier "x" on line ${USE_LINE}`);

const reference = unit.bindingGraph.referenceAt(cursor);
assert(reference, `no reference resolved for "x" at line ${USE_LINE}`);

const definitions = reference.definitions()

assert(definitions.length === 1)

const [definition] = definitions

const definiensStartLine = definition.definiensLocation.asUserFileLocation()?.cursor.textRange.start.line
console.log(
  `definiensLocation.textRange.start.line = ${definiensStartLine} (expected ${DEFINIENS_LINE})`,
);
assert.strictEqual(
  definiensStartLine,
  DEFINIENS_LINE,
  `expected definiens on line ${DEFINIENS_LINE}, got ${definiensStartLine}`,
);

console.log('OK');
