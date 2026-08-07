#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const codexDistDir = path.join(distDir, "codex");
const packageName = "clipnode-media-mcp";
const packageDir = path.join(codexDistDir, packageName);
const zipPath = path.join(distDir, `${packageName}-codex.zip`);
const codexIntegrationDir = path.join(rootDir, "integrations", "codex");

const entriesToCopy = [
  "assets",
  "examples",
  "lib"
];

const docsToCopy = [
  "ai-prompts.md",
  "capabilities.md",
  "privacy-and-local-service.md",
  "troubleshooting.md"
];

const scriptFiles = [
  "clipnode-media-mcp-server.js",
  "smoke-test-clipnode-task-flow.js"
];

function copyEntry(source, target) {
  fs.cpSync(source, target, {
    recursive: true,
    dereference: false,
    force: true
  });
}

function copyReadmeForPackage(sourceFile, targetFile) {
  const source = fs.readFileSync(sourceFile, "utf8");
  const lines = source
    .split(/\r?\n/)
    .filter((line) => !line.includes("docs/showcase"));
  fs.writeFileSync(targetFile, `${lines.join("\n").trimEnd()}\n`);
}

function ensureZipAvailable() {
  const result = spawnSync("zip", ["-v"], {
    stdio: "ignore"
  });
  if (result.status !== 0) {
    throw new Error("zip command is required to build the release package.");
  }
}

function buildPackageDirectory() {
  fs.rmSync(packageDir, {
    recursive: true,
    force: true
  });
  fs.mkdirSync(packageDir, {
    recursive: true
  });

  copyEntry(path.join(codexIntegrationDir, ".codex-plugin"), path.join(packageDir, ".codex-plugin"));
  copyEntry(path.join(codexIntegrationDir, ".mcp.json"), path.join(packageDir, ".mcp.json"));
  copyReadmeForPackage(path.join(rootDir, "README.md"), path.join(packageDir, "README.md"));
  copyReadmeForPackage(path.join(rootDir, "README.zh-CN.md"), path.join(packageDir, "README.zh-CN.md"));

  for (const entry of entriesToCopy) {
    copyEntry(path.join(rootDir, entry), path.join(packageDir, entry));
  }

  const docsDir = path.join(packageDir, "docs");
  fs.mkdirSync(docsDir, {
    recursive: true
  });
  for (const docFile of docsToCopy) {
    copyEntry(path.join(rootDir, "docs", docFile), path.join(docsDir, docFile));
  }

  const scriptsDir = path.join(packageDir, "scripts");
  fs.mkdirSync(scriptsDir, {
    recursive: true
  });
  for (const scriptFile of scriptFiles) {
    copyEntry(path.join(rootDir, "scripts", scriptFile), path.join(scriptsDir, scriptFile));
  }
}

function buildZip() {
  fs.rmSync(zipPath, {
    force: true
  });
  const result = spawnSync("zip", ["-qr", zipPath, packageName], {
    cwd: codexDistDir,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    throw new Error(`zip failed with status ${result.status}`);
  }
}

ensureZipAvailable();
fs.mkdirSync(codexDistDir, {
  recursive: true
});
buildPackageDirectory();
buildZip();

console.log(`Built ${path.relative(rootDir, packageDir)}`);
console.log(`Built ${path.relative(rootDir, zipPath)}`);
