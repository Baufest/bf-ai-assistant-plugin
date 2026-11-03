import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { main, marketplace, parseArgs, prepareCommerce } from "../scripts/prepare-commerce.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts", "prepare-commerce.mjs");
const readJson = (...parts) => JSON.parse(readFileSync(join(root, ...parts), "utf8"));
const releaseMarketplace = readJson(".agents", "plugins", "marketplace.json");
const pinnedSha = releaseMarketplace.plugins[0].source.sha;
const pinnedApps = JSON.parse(execFileSync("git", ["show", `${pinnedSha}:.app.json`], {
  cwd: root,
  encoding: "utf8",
}));
// This pinned ID is a parser fixture, not evidence about its current target.
const fixtureId = Object.values(pinnedApps.apps)[0]?.id;
const exampleUrl = "https://example.test/mcp/commerce";
const args = (id = fixtureId, url = exampleUrl) => [
  "--app-id", id, "--commerce-url", url, "--verified-connection",
];
const invoke = (...cliArgs) => spawnSync(process.execPath, [script, ...cliArgs], {
  cwd: root,
  encoding: "utf8",
});
const freshOutput = () => `.commerce-local-test-${randomBytes(8).toString("hex")}`;

test("the marketplace pin resolves to a configured package with a matching name", () => {
  assert.equal(releaseMarketplace.plugins[0].name, "mini-assistant-commerce");
  assert.match(pinnedSha, /^[0-9a-f]{40}$/);
  assert.equal(releaseMarketplace.plugins[0].source.ref, undefined);
  const pinnedManifest = JSON.parse(execFileSync("git", ["show", `${pinnedSha}:plugin.json`], {
    cwd: root,
    encoding: "utf8",
  }));
  const pinnedCompat = JSON.parse(execFileSync("git", ["show", `${pinnedSha}:.codex-plugin/plugin.json`], {
    cwd: root,
    encoding: "utf8",
  }));
  assert.equal(releaseMarketplace.plugins[0].name, pinnedManifest.name);
  assert.equal(pinnedCompat.name, pinnedManifest.name);
  assert.equal(pinnedCompat.version, pinnedManifest.version);
  assert.equal(pinnedCompat.apps, "./.app.json");
  assert.equal(pinnedManifest.extensions["com.openai"].apps, pinnedCompat.apps);
  assert.deepEqual(Object.keys(pinnedApps.apps), ["commerce"]);
  for (const app of Object.values(pinnedApps.apps)) {
    assert.match(app.id, /^plugin_asdk_app_[A-Za-z0-9_-]+$/);
    assert.equal(app.required, true);
  }
});

test("both commerce manifests agree and no legacy skill is installed", () => {
  const portable = readJson("plugin.json");
  const compat = readJson(".codex-plugin", "plugin.json");
  assert.equal(portable.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
  const allowedFields = new Set(["$schema", "name", "version", "description", "author", "repository", "keywords", "extensions"]);
  assert.ok(Object.keys(portable).every((key) => allowedFields.has(key)));
  assert.match(portable.name, /^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/);
  assert.equal(portable.name, "mini-assistant-commerce");
  for (const field of ["name", "version", "description", "author", "repository", "keywords"]) {
    assert.deepEqual(portable[field], compat[field]);
  }
  assert.equal(compat.skills, "./skills/");
  assert.equal(compat.apps, "./.app.json");
  assert.equal(portable.extensions["com.openai"].apps, compat.apps);
  assert.deepEqual(portable.extensions["com.openai"].interface, compat.interface);
  const apps = readJson(".app.json").apps;
  assert.deepEqual(Object.keys(apps), ["commerce"]);
  assert.match(apps.commerce.id, /^plugin_asdk_app_[A-Za-z0-9_-]+$/);
  assert.equal(apps.commerce.required, true);
  const skills = readdirSync(join(root, "skills"))
    .filter((name) => existsSync(join(root, "skills", name, "SKILL.md")));
  assert.deepEqual(skills, ["commerce"]);
});

test("commerce skill describes the real generic contract and its safety boundaries", () => {
  const skill = readFileSync(join(root, "skills", "commerce", "SKILL.md"), "utf8");
  assert.match(skill, /^---\r?\nname: commerce\r?\ndescription: .+\r?\n---/);
  for (const required of [
    "commerce_list_stores", "commerce_search_products", "commerce_prepare_cart",
    "storeId", "productId", "modifierIds", "cartUrl", "CART_OUTCOME_UNKNOWN",
    "Otro", "read-only", "explicitly pay", "untrusted",
  ]) {
    assert.ok(skill.toLowerCase().includes(required.toLowerCase()), `Missing ${required}`);
  }
  for (const removed of ["commerce_place_order", "commerce_quote_order", "hotelbeds_book_hotel", "demo_get_catalog"]) {
    assert.ok(!skill.includes(removed), `Obsolete tool ${removed}`);
  }
});

test("argument parser accepts an ID only as an offline, user-verified configuration", () => {
  assert.deepEqual(parseArgs(args()), { appId: fixtureId, output: ".commerce-local" });
  assert.deepEqual(parseArgs([...args(), "--output", ".commerce-local-team_1"]), {
    appId: fixtureId,
    output: ".commerce-local-team_1",
  });
  assert.deepEqual(parseArgs(["--help"]), { help: true });
  assert.throws(() => parseArgs([]), /technical ID/);
  assert.throws(() => parseArgs(["--help", "--app-id", fixtureId]), /Unknown or repeated/);
  assert.throws(() => parseArgs([...args(), "--app-id", fixtureId]), /Unknown or repeated/);
  assert.throws(() => parseArgs([...args(), "--unexpected"]), /Unknown or repeated/);
  assert.throws(() => parseArgs(["--app-id", "--verified-connection"]), /missing/);
  assert.throws(() => parseArgs(["--app-id", fixtureId]), /public HTTPS/);
  assert.throws(() => parseArgs(["--app-id", fixtureId, "--commerce-url", exampleUrl]), /Verify the connection/);
  assert.throws(() => parseArgs(args("not-a-registered-id")), /technical ID/);
  assert.throws(() => parseArgs(args(`${fixtureId}\n`)), /technical ID/);
  assert.throws(() => parseArgs([...args(), "--output", "..\\outside"]), /Output must/);
  assert.throws(() => prepareCommerce({ appId: fixtureId, output: "..\\outside" }), /Invalid package/);
});

test("the endpoint must be the exact public HTTPS commerce resource", () => {
  for (const url of [
    "not-a-url", "http://example.test/mcp/commerce", "https://example.test/mcp",
    "https://example.test/mcp/commerce/", "https://example.test/mcp/commerce?x=1",
    "https://example.test/mcp/commerce#", "https://user:password@example.test/mcp/commerce",
  ]) {
    assert.throws(() => parseArgs(args(fixtureId, url)), /public HTTPS/);
  }
});

test("the local marketplace points at the generated package with install-time authentication", () => {
  assert.deepEqual(marketplace("mini-assistant-commerce"), {
    name: "mini-assistant-commerce-local",
    interface: { displayName: "Mini Assistant Commerce (local)" },
    plugins: [{
      name: "mini-assistant-commerce",
      source: { source: "local", path: "./plugin" },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Productivity",
    }],
  });
});

test("filesystem failures are reported without leaking details or overwriting user files", () => {
  const options = { appId: fixtureId, output: freshOutput() };
  const denied = {
    mkdirSync() {
      const error = new Error("sensitive filesystem detail");
      error.code = "EACCES";
      throw error;
    },
  };
  assert.throws(() => prepareCommerce(options, denied), (error) => {
    assert.match(error.message, /Could not create/);
    assert.ok(!error.message.includes("sensitive filesystem detail"));
    return true;
  });
  let calls = 0;
  const interrupted = {
    mkdirSync() {
      calls += 1;
      if (calls === 2) throw new Error("sensitive filesystem detail");
    },
  };
  assert.throws(() => prepareCommerce(options, interrupted), (error) => {
    assert.match(error.message, /did not finish/);
    assert.ok(!error.message.includes("sensitive filesystem detail"));
    return true;
  });
  assert.equal(existsSync(join(root, options.output)), false);
});

test("CLI creates one isolated commerce mapping and refuses to overwrite it", () => {
  const output = freshOutput();
  const destination = join(root, output);
  assert.equal(existsSync(destination), false);
  try {
    const result = invoke(...args(), "--output", output);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /not verified or changed/);
    assert.ok(!result.stdout.includes(fixtureId));
    const app = JSON.parse(readFileSync(join(destination, "plugin", ".app.json"), "utf8"));
    assert.deepEqual(app, { apps: { commerce: { id: fixtureId, required: true } } });
    const localMarketplace = JSON.parse(readFileSync(join(destination, ".agents", "plugins", "marketplace.json"), "utf8"));
    assert.deepEqual(localMarketplace, marketplace("mini-assistant-commerce"));
    for (const parts of [
      ["plugin.json"], [".codex-plugin", "plugin.json"], ["skills", "commerce", "SKILL.md"],
    ]) {
      assert.equal(readFileSync(join(destination, "plugin", ...parts), "utf8"), readFileSync(join(root, ...parts), "utf8"));
    }
    const sentinel = join(destination, "sentinel.txt");
    writeFileSync(sentinel, "preserve");
    const repeated = invoke(...args(), "--output", output);
    assert.equal(repeated.status, 1);
    assert.match(repeated.stderr, /already exists/);
    assert.equal(readFileSync(sentinel, "utf8"), "preserve");
  } finally {
    if (existsSync(destination)) rmSync(destination, { recursive: true });
  }
});

test("CLI help and invalid invocations do not create an output directory", () => {
  const help = invoke("--help");
  assert.equal(help.status, 0);
  assert.match(help.stdout, /offline command cannot verify/);
  const output = freshOutput();
  const invalid = invoke("--output", output);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /technical ID/);
  assert.equal(existsSync(join(root, output)), false);
});

test("in-process entry point covers success, help, and failure without exposing the ID", () => {
  const messages = [];
  const logger = { log: (message) => messages.push(message), error: (message) => messages.push(message) };
  assert.equal(main(["--help"], logger), 0);
  assert.equal(main([], logger), 1);
  const output = freshOutput();
  const destination = join(root, output);
  assert.equal(existsSync(destination), false);
  try {
    assert.equal(main([...args(), "--output", output], logger), 0);
    assert.equal(main([...args(), "--output", output], logger), 1);
    assert.ok(messages.every((message) => !message.includes(fixtureId)));
  } finally {
    if (existsSync(destination)) rmSync(destination, { recursive: true });
  }
});
