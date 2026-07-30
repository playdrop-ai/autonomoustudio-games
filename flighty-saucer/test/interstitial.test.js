import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERSTITIAL_COOLDOWN_MS,
  RetryInterstitial,
} from '../src/interstitial.js';

function createAds({ loadStatus = 'ready', showStatus = 'dismissed' } = {}) {
  const calls = [];
  return {
    calls,
    interstitial: {
      async load() {
        calls.push('load');
        return { status: loadStatus };
      },
      async show() {
        calls.push('show');
        return { status: showStatus };
      },
    },
  };
}

test('does not request an interstitial before 30 seconds of session time', async () => {
  let now = 1_000;
  const ads = createAds();
  const interstitial = new RetryInterstitial(ads, () => now);

  now += INTERSTITIAL_COOLDOWN_MS - 1;
  const result = await interstitial.showIfEligible();

  assert.equal(result.status, 'cooldown');
  assert.deepEqual(ads.calls, []);
  assert.equal(Math.ceil(interstitial.remainingMs), 1);
});

test('loads and shows an interstitial at the 30-second boundary', async () => {
  let now = 2_000;
  const ads = createAds();
  const interstitial = new RetryInterstitial(ads, () => now);

  now += INTERSTITIAL_COOLDOWN_MS;
  const result = await interstitial.showIfEligible();

  assert.deepEqual(result, { status: 'dismissed', shown: true });
  assert.deepEqual(ads.calls, ['load', 'show']);
  assert.equal(interstitial.remainingMs, INTERSTITIAL_COOLDOWN_MS);
});

test('resets the cooldown after a shown interstitial', async () => {
  let now = 5_000;
  const ads = createAds();
  const interstitial = new RetryInterstitial(ads, () => now);

  now += INTERSTITIAL_COOLDOWN_MS;
  await interstitial.showIfEligible();
  now += INTERSTITIAL_COOLDOWN_MS - 1;
  await interstitial.showIfEligible();

  assert.deepEqual(ads.calls, ['load', 'show']);
  now += 1;
  await interstitial.showIfEligible();
  assert.deepEqual(ads.calls, ['load', 'show', 'load', 'show']);
});

test('does not reset the cooldown when inventory is unavailable', async () => {
  let now = 9_000;
  const ads = createAds({ loadStatus: 'no_fill' });
  const interstitial = new RetryInterstitial(ads, () => now);

  now += INTERSTITIAL_COOLDOWN_MS;
  const result = await interstitial.showIfEligible();

  assert.deepEqual(result, { status: 'no_fill', shown: false });
  assert.equal(interstitial.remainingMs, 0);
  assert.deepEqual(ads.calls, ['load']);
});
