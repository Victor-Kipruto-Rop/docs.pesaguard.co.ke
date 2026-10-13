#!/usr/bin/env node
"use strict";

/**
 * The published JSON and YAML OpenAPI downloads must describe the exact same
 * contract. The YAML mirror is deliberately JSON-compatible YAML, so this
 * check stays dependency-free and does not need a separate YAML parser.
 */
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const jsonPath = path.join(ROOT, "api-reference", "openapi.json");
const yamlPath = path.join(ROOT, "api-reference", "openapi.yaml");

function load(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`${path.relative(ROOT, file)} must contain valid JSON-compatible YAML/JSON: ${error.message}`);
    process.exit(1);
  }
}

const json = load(jsonPath);
const yaml = load(yamlPath);
const operations = (spec) => Object.entries(spec.paths || {}).reduce((count, [, item]) =>
  count + Object.keys(item).filter((method) =>
    ["get", "put", "post", "patch", "delete", "head", "options", "trace"].includes(method)
  ).length, 0);

if (JSON.stringify(json) !== JSON.stringify(yaml)) {
  const jsonPaths = Object.keys(json.paths || {}).length;
  const yamlPaths = Object.keys(yaml.paths || {}).length;
  const jsonOperations = operations(json);
  const yamlOperations = operations(yaml);
  console.error("OpenAPI JSON/YAML parity check failed.");
  console.error(`  JSON: ${jsonPaths} paths, ${jsonOperations} operations`);
  console.error(`  YAML: ${yamlPaths} paths, ${yamlOperations} operations`);
  console.error("Regenerate api-reference/openapi.yaml from api-reference/openapi.json.");
  process.exit(1);
}

console.log(`OpenAPI JSON/YAML parity OK: ${Object.keys(json.paths || {}).length} paths, ${operations(json)} operations`);
