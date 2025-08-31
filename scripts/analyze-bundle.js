#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analyzes build output and generates performance reports
 */

import fs from 'fs';
import path from 'path';
import { bundleMonitor } from '../src/lib/performance/bundle-monitor.js';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

/**
 * Parse Vite build output from console
 */
function parseBuildOutput() {
  // This would normally come from the build process
  // For now, we'll simulate it based on actual file sizes
  
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Build output not found. Run `npm run build` first.');
    process.exit(1);
  }
  
  const jsFiles = fs.readdirSync(ASSETS_DIR)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const filePath = path.join(ASSETS_DIR, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      return `dist/assets/${file}  ${sizeKB} kB`;
    });
  
  const cssFiles = fs.readdirSync(ASSETS_DIR)
    .filter(file => file.endsWith('.css'))
    .map(file => {
      const filePath = path.join(ASSETS_DIR, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      return `dist/assets/${file}  ${sizeKB} kB`;
    });
  
  return [...jsFiles, ...cssFiles].join('\n');
}

/**
 * Generate bundle analysis report
 */
function generateReport() {
  const buildOutput = parseBuildOutput();
  const analysis = bundleMonitor.analyzeBuildOutput(buildOutput);
  const report = bundleMonitor.generateReport();
  
  // Write report to file
  const reportPath = path.join(process.cwd(), 'bundle-analysis.txt');
  fs.writeFileSync(reportPath, report);
  
  // Log to console
  console.log(report);
  
  // Check if budget is met
  const withinBudget = bundleMonitor.checkBudget();
  
  if (!withinBudget) {
    console.log('\n❌ Bundle size exceeds budget limits!');
    process.exit(1);
  } else {
    console.log('\n✅ Bundle size within budget limits');
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Analyzing bundle...\n');
  
  try {
    generateReport();
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { parseBuildOutput, generateReport };