import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import type { HierarchyModel } from "../graph-explorer";
import { IssueObservatory } from "./issue-observatory";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Issue Observatory",
  description: "A linked visual observatory for issue clusters, actors, and timelines.",
};

export default async function ObservatoryPage() {
  const graphPath = join(process.cwd(), "public", "data", "layers.json");
  const model = JSON.parse(await readFile(graphPath, "utf8")) as HierarchyModel;

  return <IssueObservatory model={model} />;
}
