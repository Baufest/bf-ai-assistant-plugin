import { Session } from "node:inspector";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { run } from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(root, "scripts", "prepare-commerce.mjs");
const session = new Session();
session.connect();
const post = (method, params = {}) => new Promise((resolvePost, rejectPost) => {
  session.post(method, params, (error, value) => error ? rejectPost(error) : resolvePost(value));
});

await post("Profiler.enable");
await post("Profiler.startPreciseCoverage", { callCount: true, detailed: true });

let failures = 0;
const stream = run({ files: [join(root, "tests", "commerce-plugin.test.mjs")], isolation: "none" });
for await (const event of stream) {
  if (event.type === "test:pass") console.log(`PASS ${event.data.name}`);
  if (event.type === "test:fail") {
    failures += 1;
    console.error(`FAIL ${event.data.name}: ${event.data.details.error}`);
  }
}

const { result } = await post("Profiler.takePreciseCoverage");
await post("Profiler.stopPreciseCoverage");
session.disconnect();
const entry = result.find((item) => item.url.toLowerCase() === pathToFileURL(sourcePath).href.toLowerCase());
if (!entry) throw new Error("No V8 coverage was collected for the commerce setup script.");

const ranges = entry.functions.flatMap((item) => item.ranges);
const lines = readFileSync(sourcePath, "utf8").split("\n");
const uncovered = [];
let offset = 0;
let total = 0;
for (const [index, line] of lines.entries()) {
  const positions = Array.from({ length: line.length }, (_, column) => ({ character: line[column], position: offset + column }))
    .filter(({ character }) => !/\s/.test(character));
  offset += line.length + 1;
  if (positions.length === 0) continue;

  const counts = positions.map(({ position }) => ranges
    .filter((range) => range.startOffset <= position && position < range.endOffset)
    .sort((a, b) => (a.endOffset - a.startOffset) - (b.endOffset - b.startOffset) || a.count - b.count)[0]?.count)
    .filter((count) => count !== undefined);
  if (counts.length === 0) continue;
  total += 1;
  if (counts.some((count) => count === 0)) uncovered.push(index + 1);
}
const percent = total === 0 ? 0 : (100 * (total - uncovered.length)) / total;
console.log(`V8 precise coverage, conservative nonblank lines: ${percent.toFixed(2)}% (${total - uncovered.length}/${total})`);
if (uncovered.length) console.log(`Uncovered lines: ${uncovered.join(", ")}`);
if (failures || percent < 90) process.exitCode = 1;
