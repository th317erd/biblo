'use strict';

/// This is standard test!
/// Return: any
///  Gives ya a result man
/// Arguments:
///   a: string
///     Wacky, right?
///   b: number
///     Big fat number!
function test(a: string | null | undefined, b: number | null): string | number {

}

/// This is type test!
/// Return:
///  This returns stuff
/// Arguments:
///   a:
///     Does things, okay?
///   b:
///     Will blow your mind
function test_types(a: string | null | undefined, b: number | null): string | number {

}

/// This is an inline test!
function test_inline(/* "a" does things... */ a: string | null | undefined, /* b does some other things */ b: number | null): string /* Return a string please! */ {

}

module.exports = {
  test,
  test_types,
  test_inline,
};
