#!/usr/bin/env bun

/**
 * Documentation Generation Script
 * 
 * This script generates API documentation using TypeDoc.
 * Run with: bun run scripts/generate-docs.ts
 */

import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import { spawn } from "child_process";

const DOCS_DIR = path.join(process.cwd(), "docs");
const TYPEDOC_CONFIG = path.join(process.cwd(), "typedoc.json");

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: "inherit",
      shell: true,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    proc.on("error", (error) => {
      reject(error);
    });
  });
}

async function generateDocs() {
  console.log("📚 Generating API documentation...\n");

  // Check if typedoc.json exists
  if (!existsSync(TYPEDOC_CONFIG)) {
    console.error(`❌ TypeDoc config not found at ${TYPEDOC_CONFIG}`);
    process.exit(1);
  }

  // Create docs directory if it doesn't exist
  if (!existsSync(DOCS_DIR)) {
    await mkdir(DOCS_DIR, { recursive: true });
    console.log(`📁 Created docs directory: ${DOCS_DIR}`);
  }

  // Generate documentation
  console.log("🔄 Running TypeDoc...\n");
  
  try {
    await runCommand("bunx", ["typedoc", "--options", TYPEDOC_CONFIG]);
    console.log("\n✅ Documentation generated successfully!");
    console.log(`📖 Open ${DOCS_DIR}/index.html in your browser to view the docs.\n`);
  } catch (error) {
    console.error("\n❌ Failed to generate documentation:", error);
    process.exit(1);
  }
}

// Run the script
generateDocs();

