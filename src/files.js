// Initial files shown before any solc-input.json is uploaded.
// Keys are solc source names (treated as opaque identifiers, not filesystem paths).
export const files = {
  'project/contracts/Foo.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Bar } from "./Bar.sol";

contract Foo {
    Bar public bar;

    constructor(address barAddress) {
        bar = Bar(barAddress);
    }

    function callBar(uint256 value) external returns (uint256) {
        return bar.doubled(value);
    }
}
`,
  'project/contracts/Bar.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Bar {
    uint256 public counter;

    function doubled(uint256 value) external pure returns (uint256) {
        return value * 2;
    }

    function increment() external {
        counter += 1;
    }
}
`,
};
