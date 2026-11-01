import { constants, copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const filesystem = { copyFileSync, mkdirSync, readFileSync, writeFileSync };
const usage = `Usage:
  node scripts/prepare-commerce.mjs --app-id <registered-id> --commerce-url <https-url> --verified-connection [--output <directory>]

The connection must already be registered for the supplied /mcp/commerce URL.
This offline command cannot verify the registration or contact the server.
The output is a new local marketplace; existing files are never overwritten.`;

function isOutputName(value) {
  return /^\.commerce-local(?:-[A-Za-z0-9][A-Za-z0-9_-]{0,48})?$/.test(value);
}

function isCommerceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username && !url.password &&
      url.href === `${url.origin}/mcp/commerce`;
  } catch {
    return false;
  }
}

export function parseArgs(args) {
  if (args.length === 1 && args[0] === "--help") return { help: true };

  const values = {};
  const allowed = new Set(["--app-id", "--commerce-url", "--output", "--verified-connection"]);
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    if (!allowed.has(name) || Object.hasOwn(values, name)) {
      throw new Error("Unknown or repeated argument. Use --help for usage.");
    }
    if (name === "--verified-connection") {
      values[name] = true;
      continue;
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error("An argument value is missing. Use --help for usage.");
    }
    values[name] = value;
    index += 1;
  }

  if (!/^plugin_asdk_app_[A-Za-z0-9_-]{1,128}$/.test(values["--app-id"] ?? "")) {
    throw new Error("Provide the registered ChatGPT technical ID with --app-id.");
  }
  if (!isCommerceUrl(values["--commerce-url"] ?? "")) {
    throw new Error("Provide the public HTTPS /mcp/commerce URL without credentials, query, or fragment.");
  }
  if (values["--verified-connection"] !== true) {
    throw new Error("Verify the connection targets that URL, then pass --verified-connection.");
  }
  const output = values["--output"] ?? ".commerce-local";
  if (!isOutputName(output)) {
    throw new Error("Output must be .commerce-local or .commerce-local-<name> in the repository root.");
  }
  return { appId: values["--app-id"], output };
}

export function marketplace(pluginName) {
  return {
    name: "mini-assistant-commerce-local",
    interface: { displayName: "Mini Assistant Commerce (local)" },
    plugins: [{
      name: pluginName,
      source: { source: "local", path: "./plugin" },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Productivity",
    }],
  };
}

export function prepareCommerce({ appId, output }, io = filesystem) {
  if (!isOutputName(output) || !/^plugin_asdk_app_[A-Za-z0-9_-]{1,128}$/.test(appId)) {
    throw new Error("Invalid package configuration.");
  }

  const destination = join(root, output);
  try {
    io.mkdirSync(destination);
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new Error("Output already exists; choose a different --output. No files were overwritten.");
    }
    throw new Error("Could not create the output directory. No files were overwritten.");
  }

  try {
    const plugin = join(destination, "plugin");
    const codex = join(plugin, ".codex-plugin");
    const skills = join(plugin, "skills");
    const commerce = join(skills, "commerce");
    io.mkdirSync(plugin);
    io.mkdirSync(codex);
    io.mkdirSync(skills);
    io.mkdirSync(commerce);
    for (const relativePath of [
      ["plugin.json"],
      [".codex-plugin", "plugin.json"],
      ["skills", "commerce", "SKILL.md"],
    ]) {
      io.copyFileSync(join(root, ...relativePath), join(plugin, ...relativePath), constants.COPYFILE_EXCL);
    }
    const manifest = JSON.parse(io.readFileSync(join(plugin, "plugin.json"), "utf8"));
    const app = { apps: { commerce: { id: appId, required: true } } };
    io.writeFileSync(join(plugin, ".app.json"), `${JSON.stringify(app, null, 2)}\n`, { flag: "wx" });
    const agents = join(destination, ".agents");
    const plugins = join(agents, "plugins");
    io.mkdirSync(agents);
    io.mkdirSync(plugins);
    io.writeFileSync(
      join(plugins, "marketplace.json"),
      `${JSON.stringify(marketplace(manifest.name), null, 2)}\n`,
      { flag: "wx" },
    );
  } catch {
    throw new Error("Package creation did not finish. Inspect the new output directory before removing it; no existing files were overwritten.");
  }
}

export function main(args, output = console) {
  try {
    const options = parseArgs(args);
    if (options.help) {
      output.log(usage);
      return 0;
    }
    prepareCommerce(options);
    output.log(`Created ${options.output}. The connection and server were not verified or changed.`);
    return 0;
  } catch (error) {
    output.error(error.message);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
