// Initial files shown before any solc-input.json is uploaded.
// Keys are solc source names (treated as opaque identifiers, not filesystem paths).
export const files = {
  'Foo.sol': `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract Foo {
    enum AccountStatus { Inactive, Active, Frozen }

    struct Account {
        address owner;
        uint256 balance;
        AccountStatus status;
        uint64 lastDepositAt;
    }

    error NotAdmin(address caller);
    error AccountNotActive(address account, AccountStatus status);
    error InsufficientBalance(uint256 requested, uint256 available);
    error DepositTooLarge(uint256 amount, uint256 maxAllowed);
    error TransferFailed(address to, uint256 amount);

    event AccountOpened(address indexed account, address indexed owner);
    event Deposit(address indexed account, uint256 amount, uint256 newBalance);
    event Withdrawal(address indexed account, address indexed to, uint256 amount);
    event StatusChanged(address indexed account, AccountStatus from, AccountStatus to);

    address public immutable admin;
    uint256 public constant MAX_DEPOSIT = 1_000 ether;

    mapping(address => Account) private accounts;

    modifier onlyAdmin() {
        if (msg.sender != admin) {
            revert NotAdmin(msg.sender);
        }
        _;
    }

    modifier whenActive(address account) {
        Account storage acc = accounts[account];
        if (acc.status != AccountStatus.Active) {
            revert AccountNotActive(account, acc.status);
        }
        _;
    }

    constructor(address admin_) {
        admin = admin_;
    }

    function openAccount(address owner) external onlyAdmin {
        Account storage acc = accounts[owner];
        acc.owner = owner;
        _setStatus(owner, AccountStatus.Active);
        emit AccountOpened(owner, owner);
    }

    function deposit() external payable whenActive(msg.sender) {
        if (msg.value > MAX_DEPOSIT) {
            revert DepositTooLarge(msg.value, MAX_DEPOSIT);
        }
        Account storage acc = accounts[msg.sender];
        acc.balance += msg.value;
        acc.lastDepositAt = uint64(block.timestamp);
        emit Deposit(msg.sender, msg.value, acc.balance);
    }

    function withdraw(address payable to, uint256 amount) external whenActive(msg.sender) {
        Account storage acc = accounts[msg.sender];
        if (amount > acc.balance) {
            revert InsufficientBalance(amount, acc.balance);
        }
        acc.balance -= amount;
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) {
            revert TransferFailed(to, amount);
        }
        emit Withdrawal(msg.sender, to, amount);
    }

    function freeze(address account) external onlyAdmin {
        _setStatus(account, AccountStatus.Frozen);
    }

    function unfreeze(address account) external onlyAdmin {
        _setStatus(account, AccountStatus.Active);
    }

    function getAccount(address owner) external view returns (Account memory) {
        return accounts[owner];
    }

    function balanceOf(address owner) external view returns (uint256) {
        return accounts[owner].balance;
    }

    function _setStatus(address account, AccountStatus newStatus) internal {
        Account storage acc = accounts[account];
        AccountStatus prev = acc.status;
        acc.status = newStatus;
        emit StatusChanged(account, prev, newStatus);
    }
}
`,
};
