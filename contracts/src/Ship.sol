// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import 'hardhat/console.sol';

abstract contract Ship {
  address public owner;

  function update(uint x, uint y) public virtual;
  function fire(uint256 width, uint256 height) public virtual returns (uint, uint);
  function place(uint width, uint height) public virtual returns (uint, uint);
  function getOwner() public virtual returns (address);

}

