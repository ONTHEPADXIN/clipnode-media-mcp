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
  "README.md",
  "README.zh-CN.md",
  "assets",
  "docs",
  "examples",
  "lib"
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

  for (const entry of entriesToCopy) {
    copyEntry(path.join(rootDir, entry), path.join(packageDir, entry));
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
