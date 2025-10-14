/// <reference lib="deno.ns" />
import { assertEquals } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { extractOfferIdFromUrl, isOfferId } from '../src/utils/offerUtils.ts';

Deno.test('URL and Offer ID Handling', async (t) => {
  await t.step('should extract offer ID from normal Dexie URL', () => {
    const url = 'https://dexie.space/offers/5GVuRrfcx7311tW2JpDxR9eAPnxibEb7nAU4kRdbj72';
    const result = extractOfferIdFromUrl(url);
    assertEquals(result, '5GVuRrfcx7311tW2JpDxR9eAPnxibEb7nAU4kRdbj72');
  });

  await t.step('should handle URL with @ prefix', () => {
    const url = '@https://dexie.space/offers/5GVuRrfcx7311tW2JpDxR9eAPnxibEb7nAU4kRdbj72';
    // Should strip @ and extract
    const cleaned = url.replace(/^@/, '');
    const result = extractOfferIdFromUrl(cleaned);
    assertEquals(result, '5GVuRrfcx7311tW2JpDxR9eAPnxibEb7nAU4kRdbj72');
  });

  await t.step('should recognize plain offer ID', () => {
    const offerId = '5GVuRrfcx7311tW2JpDxR9eAPnxibEb7nAU4kRdbj72';
    const result = isOfferId(offerId);
    console.log(`isOfferId("${offerId}") = ${result}`);
    console.log(`Length: ${offerId.length}`);
    console.log(`Starts with offer1: ${offerId.startsWith('offer1')}`);
    console.log(`Matches pattern: ${/^[A-Za-z0-9+/]+$/.test(offerId)}`);
    assertEquals(result, true);
  });

  await t.step('should extract offer ID from MintGarden URL', () => {
    const url = 'https://mintgarden.io/offers/5GVuRrfcx7311tW2JpDxR9eAPnxibEb7nAU4kRdbj72';
    const result = extractOfferIdFromUrl(url);
    assertEquals(result, '5GVuRrfcx7311tW2JpDxR9eAPnxibEb7nAU4kRdbj72');
  });

  await t.step('should handle URL with trailing slash', () => {
    const url = 'https://dexie.space/offers/5GVuRrfcx7311tW2JpDxR9eAPnxibEb7nAU4kRdbj72/';
    const result = extractOfferIdFromUrl(url);
    assertEquals(result, '5GVuRrfcx7311tW2JpDxR9eAPnxibEb7nAU4kRdbj72');
  });
});
