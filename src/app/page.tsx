import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { GraphExplorer, type HierarchyModel } from "./graph-explorer";

export const dynamic = "force-static";

export default async function Home() {
  const graphPath = join(process.cwd(), "public", "data", "layers.json");
  const model = JSON.parse(await readFile(graphPath, "utf8")) as HierarchyModel;

  return <GraphExplorer model={model} />;
}
