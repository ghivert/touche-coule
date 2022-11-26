// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "./Ship.sol";
import "hardhat/console.sol";
import "./NormalShip.sol";

struct Game {
  uint256 height;
  uint256 width;
  mapping(uint256 => mapping(uint256 => uint256)) board;
  mapping(uint256 => int256) xs;
  mapping(uint256 => int256) ys;
}

contract Main {
  Ship[] allShip;
  Game private game;
  uint256 private index;
  mapping(address => bool) private used;
  mapping(uint256 => address) private ships;
  mapping(uint256 => address) private owners;
  mapping(address => uint256) private count;

  event Size(uint256 width, uint256 height);
  event Touched(uint256 ship, uint256 x, uint256 y);
  event FiredAt(address ship, uint256 x, uint256 y);
  event HasWinner(address owner);

  event Registered(
    uint256 indexed index,
    address indexed owner,
    uint256 x,
    uint256 y
  );

  constructor() {
    game.width = 3;
    game.height = 3;
    index = 1;
    emit Size(game.width, game.height);
  }

  function register(address ship) public {
    require(count[msg.sender] < 2, "Only two ships");
    require(!used[ship], "Ship already on the board");
    require(index <= game.height * game.width, "Too much ship on board");
    count[msg.sender] += 1;
    ships[index] = ship;
    owners[index] = msg.sender;
    (uint256 x, uint256 y) = placeShip(index);
    Ship(ships[index]).update(x, y);
    emit Registered(index, msg.sender, x, y);
    index += 1;
    used[ship] = true;
  }

  function register2() external {
    require(count[msg.sender] < 2, "Only two ships");
    require(index <= game.height * game.width, "Too much ship on board");
    Ship tmp = new NormalShip(msg.sender);
    allShip.push(tmp);
    register(address(tmp));
  }

  function remove(uint index) public{
    allShip[index] = allShip[allShip.length - 1];
    allShip.pop();
  }

  function turn() external {
    require(index < 3, "Only one player");

    bool[] memory touched = new bool[](index);
    for (uint256 i = 1; i < index; i++) {
      if (game.xs[i] < 0) continue;
      Ship ship = Ship(ships[i]);
      (uint256 x, uint256 y) = ship.fire(game.width, game.height);
      emit FiredAt(address(ship), x, y);
      if (game.board[x][y] > 0) {
        touched[game.board[x][y]] = true;
      }
    }
    for (uint256 i = 0; i < index; i++) {
      if (touched[i]) {
        emit Touched(i, uint256(game.xs[i]), uint256(game.ys[i]));
        game.xs[i] = -1;

        console.log("Index : ", i);

        if (i < allShip.length) {
          remove(i);

          console.log("All Ships length : ", allShip.length);

          if (allShip.length == 2 || allShip.length == 1) {
            if (allShip.length == 2) {
              console.log("2 ships left!");
              if (allShip[0].getOwner() == allShip[1].getOwner()) {
                console.log("We have a winner here");
                emit HasWinner(allShip[0].getOwner());
              }
            }

            console.log("We have a winner here");
            emit HasWinner(allShip[0].getOwner());
          }
        }
      }
    }
  }

  function placeShip(uint256 idx) internal returns (uint256, uint256) {
    Ship ship = Ship(ships[idx]);
    (uint256 x, uint256 y) = ship.place(game.width, game.height);
    bool invalid = true;
    while (invalid) {
      if (game.board[x][y] == 0) {
        game.board[x][y] = idx;
        game.xs[idx] = int256(x);
        game.ys[idx] = int256(y);
        invalid = false;
      } else {
        uint256 newPlace = (y * game.width) + x + 1;
        x = newPlace % game.width;
        y = newPlace / game.width;
        if (
          newPlace == game.width * game.height
        )
        {
          x = 0;
          y = 0;
        }
      }
    }
    return (x, y);
  }
}
