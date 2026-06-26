import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import type { HierarchyModel } from "../graph-explorer";
import { G6Explorer } from "./g6-explorer";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "G6 Issue Combo Explorer",
  description: "Explore the full-text issue hierarchy as nested AntV G6 combos.",
};

export default async function G6Page() {
  const graphPath = join(process.cwd(), "public", "data", "layers.json");
  const model = JSON.parse(await readFile(graphPath, "utf8")) as HierarchyModel;

  return <G6Explorer model={model} />;
}
