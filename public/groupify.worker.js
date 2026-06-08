/**
 * public/groupify.worker.js
 *
 * Web Worker for the buildGroups algorithm.
 * Runs entirely off the main thread so large inputs cannot freeze the UI.
 *
 * Protocol:
 *   Main → Worker:  { rawOrItems, groupBy, value, mode }
 *   Worker → Main:  { groups }  on success
 *                   { error: string }  on failure
 */

const HUES = [185, 200, 220, 260, 160, 340, 35, 280];

function buildGroups(rawOrItems, groupBy, value, mode) {
  let pool = [];

  if (typeof rawOrItems === "string") {
    const names = rawOrItems
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0 || value < 1) return [];
    pool = names.map((n) => ({ label: n }));
  } else {
    if (rawOrItems.length === 0 || value < 1) return [];
    pool = [...rawOrItems];
  }

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  if (groupBy === "count") {
    const count = Math.min(value, pool.length);
    if (count <= 0) return [];

    const baseSize = Math.floor(pool.length / count);
    const extra = pool.length % count;
    const buckets = Array.from({ length: count }, (_, i) =>
      pool.slice(i * baseSize, i * baseSize + baseSize)
    );
    if (extra > 0) {
      pool.slice(count * baseSize).forEach((m, i) =>
        buckets[i % buckets.length].push(m)
      );
    }
    return buckets.map((bucket, i) => ({
      id: i + 1,
      label: `Group ${i + 1}`,
      members: bucket.map((m) => m.label),
      rawMembers: bucket.map((m) => m.data || {}),
      originalIds: bucket.map((m) => m.originalId),
      hue: HUES[i % HUES.length],
    }));
  }

  const size = value;
  const count = Math.floor(pool.length / size);
  const extra = pool.length % size;
  const buckets = Array.from({ length: count }, (_, i) =>
    pool.slice(i * size, i * size + size)
  );
  if (extra > 0) {
    const tail = pool.slice(count * size);
    if (mode === "best" && buckets.length > 0) {
      tail.forEach((m, i) => buckets[i % buckets.length].push(m));
    } else {
      buckets.push(tail);
    }
  }
  return buckets.map((bucket, i) => ({
    id: i + 1,
    label: `Group ${i + 1}`,
    members: bucket.map((m) => m.label),
    rawMembers: bucket.map((m) => m.data || {}),
    originalIds: bucket.map((m) => m.originalId),
    hue: HUES[i % HUES.length],
  }));
}

self.onmessage = (event) => {
  try {
    const { rawOrItems, groupBy, value, mode } = event.data;
    const groups = buildGroups(rawOrItems, groupBy, value, mode);
    self.postMessage({ groups });
  } catch (err) {
    self.postMessage({ error: String(err) });
  }
};
