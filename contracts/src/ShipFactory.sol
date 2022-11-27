// SPDX-License-Identifier: MIT
pragma solidity ^0.8;


import "./MyShip2.sol";


contract ShipFactory {
  struct ShipType {
    string name;
    uint index;
  }
  event ShipDeploy(address a);

  ShipType[] listTypeShip;

  constructor() {
    listTypeShip.push(ShipType("a", 0));
    listTypeShip.push(ShipType("b", 1));
  }

  function getListTypeShip() external view returns (ShipType[] memory) {
    return listTypeShip;
  }

  function deployShip(uint indexType) external {
    address a;
    if (indexType == 0) a = address(new MyShip());
    else a = address(new MyShip2());
    emit ShipDeploy(a);
  }
}
