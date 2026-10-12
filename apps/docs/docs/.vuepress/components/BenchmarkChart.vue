<script setup lang="ts">
// A horizontal bar chart of one benchmark case, drawn from the measured results in
// `data/benchmarks.json` (written by `apps/benchmarks/src/publish.mjs`). It is plain HTML and CSS, so
// it follows the theme's colors, stays sharp at any size and updates when the data does.
import { computed } from "vue";

import data from "../data/benchmarks.json";

const props = defineProps<{
  /** `lookup`, `interpolation`, `plural`, `nested` or `size`. */
  metric: "lookup" | "interpolation" | "plural" | "nested" | "size";
  title: string;
  /** What the bars mean, for example "operations per second, higher is better". */
  subtitle: string;
  /** Shown for a library that does not support the case. */
  unsupported?: string;
}>();

interface Row {
  name: string;
  value: number | null;
  highlight: boolean;
}

const isSize = computed(() => props.metric === "size");

const rows = computed<Row[]>(() => {
  const source: Record<string, any> = isSize.value ? data.size : data.throughput;
  const list = Object.entries(source).map(([name, result]) => ({
    name,
    value: (isSize.value ? result.gzip : result[props.metric]) as number | null,
    highlight: name.startsWith("dialexjs"),
  }));
  // Best first: higher throughput, or fewer bytes. Unsupported cases go last.
  return list.sort((a, b) => {
    if (a.value === null) return 1;
    if (b.value === null) return -1;
    return isSize.value ? a.value - b.value : b.value - a.value;
  });
});

const best = computed(() =>
  rows.value.reduce((max, row) => (row.value !== null && row.value > max ? row.value : max), 0),
);

function width(row: Row): string {
  if (row.value === null || best.value === 0) return "0%";
  return `${Math.max(0.6, (row.value / best.value) * 100).toFixed(2)}%`;
}

function label(row: Row): string {
  const n = row.value;
  if (n === null) return props.unsupported ?? "n/a";
  if (isSize.value) return `${(n / 1024).toFixed(1)} KB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
}

function exact(row: Row): string {
  if (row.value === null) return props.unsupported ?? "n/a";
  return isSize.value
    ? `${row.value.toLocaleString("en-US")} B`
    : `${row.value.toLocaleString("en-US")} ops/s`;
}
</script>

<template>
  <figure class="bench-chart">
    <figcaption>
      <strong>{{ title }}</strong>
      <span>{{ subtitle }}</span>
    </figcaption>
    <ol>
      <li v-for="row in rows" :key="row.name" :class="{ 'is-dialex': row.highlight }">
        <span class="name">{{ row.name }}</span>
        <span class="track" :title="exact(row)">
          <span class="bar" :style="{ width: width(row) }" />
        </span>
        <span class="value">{{ label(row) }}</span>
      </li>
    </ol>
  </figure>
</template>

<style scoped>
.bench-chart {
  margin: 1.25rem 0;
  padding: 1rem 1.25rem 0.75rem;
  border: 1px solid var(--c-border, #e2e8f0);
  border-radius: 8px;
  background: var(--c-bg-light, transparent);
}

figcaption {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.75rem;
  margin-bottom: 0.75rem;
}

figcaption strong {
  font-size: 1.05rem;
}

figcaption span {
  color: var(--c-text-lighter, #6b7280);
  font-size: 0.875rem;
}

ol {
  list-style: none;
  margin: 0;
  padding: 0;
}

li {
  display: grid;
  grid-template-columns: minmax(130px, 15rem) 1fr 4.5rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.2rem 0;
  font-size: 0.9rem;
}

.name {
  overflow: hidden;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--c-text-lighter, #6b7280);
}

.is-dialex .name {
  color: var(--c-text, inherit);
  font-weight: 600;
}

.track {
  display: block;
  height: 1.1rem;
  border-radius: 4px;
  background: var(--c-border, #e2e8f0);
  opacity: 0.55;
}

.bar {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: #8a97a8;
}

.is-dialex .bar {
  background: var(--c-brand, #3eaf7c);
}

.track:has(.bar) {
  background: transparent;
  opacity: 1;
}

.value {
  font-variant-numeric: tabular-nums;
  color: var(--c-text-lighter, #6b7280);
}

.is-dialex .value {
  color: var(--c-text, inherit);
  font-weight: 600;
}

@media (max-width: 640px) {
  li {
    grid-template-columns: 1fr 4rem;
    row-gap: 0.1rem;
  }

  .name {
    grid-column: 1 / -1;
    text-align: left;
  }
}
</style>
