'use strict';

// This is a test
async function* test() {

}

/// This class is such an animal!
/// Who left the barn door open?
class Animal {
  /* This is just a test... I promise */
  private static test() { }

  feetCount: number;

  /// Some of us have a hundred feet... so what?
  /// Are you feetist?
  /// Arguments:
  ///   feetCount:
  ///     Specify the number of feet the fish has
  constructor(feetCount: number) {
    this.feetCount = feetCount;
  }
}

/// Humans are the most animal of animals
/// They also bark when they are stupid
class Human extends Animal {
  /// Do you have a soul?
  soulless: boolean;

  constructor() {
    super(2);

    this.soulless = true;
  }
}

module.exports = {
  Animal,
  Human,
};
