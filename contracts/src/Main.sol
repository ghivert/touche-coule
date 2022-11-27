// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import './Ship.sol';
import './MyShip.sol';
import 'hardhat/console.sol';

struct Game {
  uint height;
  uint width;
  mapping(uint => mapping(uint => uint)) board;
  mapping(uint => int) xs;
  mapping(uint => int) ys;
}

contract Main {
  Game private game;
  uint private index;
  mapping(address => bool) private used;
  mapping(uint => address) private ships;
  mapping(uint => address) private owners;
  mapping(address => uint) private count;

  event Size(uint width, uint height);
  event Touched(uint ship, uint x, uint y);
  event Registered(
    uint indexed index,
    address indexed owner,
    uint x,
    uint y
  );
  event Move(uint indexed index,address indexed owner, uint exX, uint exY, uint x, uint y);

  constructor() {
    game.width = 50;
    game.height = 50;
    index = 1;
    emit Size(game.width, game.height);
  }

  function register(address ship) external {
    require(count[msg.sender] < 2, 'Only two ships');
    require(!used[ship], 'Ship alread on the board');
    require(index <= game.height * game.width, 'Too much ship on board');
    count[msg.sender] += 1;
    ships[index] = ship;
    owners[index] = msg.sender;
    (uint x, uint y) = placeShip(index);
    Ship(ships[index]).update(x, y);
    emit Registered(index, msg.sender, x, y);
    used[ship] = true;
    index += 1;
  }

  function turn() external {
    bool[] memory touched = new bool[](index);
    for (uint i = 1; i < index; i++) {
      if (game.xs[i] < 0) continue;
      Ship ship = Ship(ships[i]);
      (uint newX, uint newY) = ship.move(game.width,game.height);
      uint exX = uint(game.xs[i]);
      uint exY = uint(game.ys[i]);
      if (game.board[newX][newY] == 0) {
        game.board[exX][exY] = 0;
        game.board[newX][newY] = i;
        game.xs[i] = int(newX);
        game.ys[i] = int(newY);
      }
      else{
        ship.update(exX,exY);
      } 
      emit Move(i, msg.sender, exX, exY, uint(game.xs[i]),uint(game.ys[i]));
      (uint x, uint y) = ship.fire();
      if (game.board[x][y] > 0) {
        touched[game.board[x][y]] = true;
      }
    }
    for (uint i = 0; i < index; i++) {
      if (touched[i]) {
        emit Touched(i, uint(game.xs[i]), uint(game.ys[i]));
        game.xs[i] = -1;
      }
    }
  }

  function placeShip(uint idx) internal returns (uint, uint) {
    Ship ship = Ship(ships[idx]);
    (uint x, uint y) = ship.place(game.width, game.height);
    bool invalid = true;
    while (invalid) {
      if (game.board[x][y] == 0) {
        game.board[x][y] = idx;
        game.xs[idx] = int(x);
        game.ys[idx] = int(y);
        invalid = false;
      } else {
        uint newPlace = (x * game.width) + y + 1;
        x = newPlace % game.width;
        y = newPlace / game.width % game.height;
      }
    }
    return (x, y);
  }
}
