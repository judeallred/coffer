/// <reference lib="deno.ns" />
import { assertEquals } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { splitOfferInput } from '../../src/utils/offerUtils.ts';

/**
 * Regression tests for splitOfferInput, which breaks a comma- or
 * whitespace-delimited batch of pasted offers into individual segments.
 */
Deno.test('splitOfferInput', async (t) => {
  await t.step('returns a single value unchanged', () => {
    assertEquals(splitOfferInput('offer1abc'), ['offer1abc']);
  });

  await t.step('trims surrounding whitespace on a single value', () => {
    assertEquals(splitOfferInput('  offer1abc  '), ['offer1abc']);
  });

  await t.step('splits on commas', () => {
    assertEquals(splitOfferInput('offer1abc,offer1def,offer1ghi'), [
      'offer1abc',
      'offer1def',
      'offer1ghi',
    ]);
  });

  await t.step('splits on spaces', () => {
    assertEquals(splitOfferInput('offer1abc offer1def'), ['offer1abc', 'offer1def']);
  });

  await t.step('splits on tabs', () => {
    assertEquals(splitOfferInput('offer1abc\toffer1def'), ['offer1abc', 'offer1def']);
  });

  await t.step('splits on newlines', () => {
    assertEquals(splitOfferInput('offer1abc\noffer1def\r\noffer1ghi'), [
      'offer1abc',
      'offer1def',
      'offer1ghi',
    ]);
  });

  await t.step('splits on mixed delimiters', () => {
    assertEquals(splitOfferInput('offer1abc, offer1def\toffer1ghi\noffer1jkl'), [
      'offer1abc',
      'offer1def',
      'offer1ghi',
      'offer1jkl',
    ]);
  });

  await t.step('drops empty segments from repeated delimiters', () => {
    assertEquals(splitOfferInput('offer1abc,,  ,\noffer1def'), ['offer1abc', 'offer1def']);
  });

  await t.step('preserves order', () => {
    assertEquals(splitOfferInput('offer1c,offer1a,offer1b'), [
      'offer1c',
      'offer1a',
      'offer1b',
    ]);
  });

  await t.step('returns an empty array for empty or whitespace-only input', () => {
    assertEquals(splitOfferInput(''), []);
    assertEquals(splitOfferInput('   \n\t , '), []);
  });
});
