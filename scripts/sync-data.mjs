#!/usr/bin/env node

import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

const source = resolve(
  process.argv[2] ??
    "../exports/topic-map/runs/telegram-2026-0101-all-issues-strict7/hierarchical-fulltext-graph-temporal-l5event-keywords/layers.json",
);
const destination = resolve("public/data/layers.json");

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);

console.log(
  JSON.stringify({
    destination,
    source,
    size: statSync(destination).size,
  }),
);
