// SPDX-License-Identifier: MIT

pragma solidity ^0.8;
import "./Ship.sol";
import "hardhat/console.sol";

contract NormalShip is Ship {
  uint256 nextPos;
  uint256 height;
  uint256 width;
  uint256 posShip;

  constructor(address _owner) {
    nextPos = width;
    owner = _owner;
  }

  function update(uint256 x, uint256 y) public override(Ship) {
    posShip = x + y * width;
  }

  function fire(uint256 width, uint256 height) public override(Ship) returns (uint256, uint256) {
    nextPos = nextPos + 1;
    if (nextPos == posShip) nextPos++;
    return (nextPos % width, (nextPos / height) % height);
  }

  function place(uint256 width, uint256 height)
    public
    override(Ship)
    returns (uint256, uint256)
  {
    uint256 x = uint256(
      keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender))
    ) % width;
    uint256 y = (uint256(
      keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender))
    ) / width) % height;
    console.log("Ship", x, y, msg.sender);
    return (x, y);
  }

    function getOwner() public override returns (address){
        return owner;
    }
}
