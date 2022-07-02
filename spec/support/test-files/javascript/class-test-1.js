'use strict';

/// This class is such an animal!
/// Who left the barn door open?
class Animal {
  /// Specify the number of feet for this animal
  feetCount = 0;

  /// Some of us have a hundred feet... so what?
  /// Are you feetist?
  /// Arguments:
  ///   feetCount: number
  ///     Specify the number of feet the fish has
  constructor(feetCount) {
    this.feetCount = feetCount;
  }
}

/// Humans are the most animal of animals
/// They also bark when they are stupid
/// Properties:
///   soulless: boolean
///     Do you have a soul?
class Human extends Animal {
  soulless = false;

  constructor() {
    super(2);

    this.soulless = true;
  }
}

module.exports = {
  Animal,
  Human,
};
