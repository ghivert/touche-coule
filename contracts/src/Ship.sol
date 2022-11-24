// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import 'hardhat/console.sol';

contract Ship {
  
  address owner;
  mapping(uint => mapping(uint => uint)) map; // 0 : no informations ; 1 : my ship ; 2 : miss ; 3 = touched ; 4 = destroy
  uint w;
  uint h;
  uint counter = 0;

  constructor(address o){
    owner = o;
  }

  // todo maybe create a set a positions available et get a random value from this set ??

  function random() private returns (uint){
    counter += 1;
    return uint(keccak256(abi.encode(counter)));
  }

  function update(uint x, uint y) public{
    map[x][y] = 1;
  }

  function fire() public pure returns (uint, uint){
    return (0,0);
  }

  function place(uint width, uint height) public returns (uint, uint){
    w = width;
    h = height;

    uint get_h = random() % h;
    uint get_w = random() % w;
    bool found = true;

    while(found){
      get_h = random() % h;
      get_w = random() % w;

      if(map[get_h][get_w] == 0){
        found = false;
      }
    }

    return (get_h,get_w);
  }
}

