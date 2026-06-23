#!/usr/bin/env npx tsx
/**
 * Generate marketplace.yaml from individual MCP directories.
 *
 * Usage: npx tsx bin/generate-mcps-marketplace.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import {
  buildCategorySummary,
  listVisibleDirectories,
  repoPathFromBin,
  validateSuggestFor,
  writeMarketplaceYaml,
} from "./marketplace-generator-utils.ts";

const mcpsDir = repoPathFromBin("mcps");

const categories = new Set([
  "business",
  "data",
  "development",
  "observability",
  "productivity",
  "search",
  "web-automation",
]);

const items = listVisibleDirectories(mcpsDir)
  .map((dirName) => {
    const content = fs.readFileSync(path.join(mcpsDir, dirName, "MCP.yaml"), "utf-8");
    const mcp = yaml.parse(content);

    if (!categories.has(mcp.category)) {
      throw new Error(`${dirName}/MCP.yaml: invalid category "${mcp.category}"`);
    }
    if (mcp.tags !== undefined) {
      throw new Error(`${dirName}/MCP.yaml: use category instead of tags`);
    }
    validateSuggestFor(mcp.suggest_for, mcp.id || dirName, {
      fieldName: "suggest_for",
      filenameExample: "*.ipynb",
    });

    const marketplaceMcp = {} as typeof mcp;
    for (const [key, value] of Object.entries(mcp)) {
      marketplaceMcp[key] = value;
      if (key === "category") {
        marketplaceMcp.tags = [value];
      }
    }

    console.log(`Added: ${mcp.name}`);
    return marketplaceMcp;
  })
  .sort((a, b) => a.id.localeCompare(b.id));

const categorySummary = buildCategorySummary(items, {
  title: "MCP category usage",
  resourceNameSingular: "MCP",
  resourceNamePlural: "MCPs",
  scriptName: "bin/generate-mcps-marketplace.ts",
});

writeMarketplaceYaml(path.join(mcpsDir, "marketplace.yaml"), items, categorySummary);

console.log(`\nGenerated marketplace.yaml with ${items.length} MCPs`);
