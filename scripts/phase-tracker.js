#!/usr/bin/env node

/**
 * Phase Tracker Script
 * Tracks progress through the development phases
 */

const fs = require('fs');
const path = require('path');

const PHASES = {
  1: {
    name: 'STABILIZATION',
    sprints: [
      { name: 'Emergency Fixes', tasks: ['SEC-001', 'SEC-002', 'SEC-003', 'SEC-004', 'CFG-001', 'CFG-002'] },
      { name: 'TypeScript & Dependencies', tasks: ['TS-001', 'TS-002', 'DEP-001', 'DEP-002'] },
      { name: 'Performance Foundation', tasks: ['PERF-001', 'PERF-002', 'CACHE-001'] },
      { name: 'Testing Setup', tasks: ['TEST-001', 'TEST-002', 'TEST-003', 'CI-001'] }
    ]
  },
  2: {
    name: 'OPTIMIZATION', 
    sprints: [
      { name: 'Core Performance', tasks: ['PERF-003', 'PERF-004', 'PERF-006', 'CACHE-003'] },
      { name: 'AI Optimizations', tasks: ['AI-001', 'AI-002', 'AI-003', 'AI-004'] },
      { name: 'Monitoring Setup', tasks: ['MON-001', 'MON-002', 'MON-003', 'ALERT-001'] },
      { name: 'Advanced Testing', tasks: ['TEST-005', 'TEST-006', 'TEST-007', 'CI-005'] }
    ]
  }
};

const TASK_DEFINITIONS = {
  'SEC-001': { desc: 'Исправить ESLint конфигурацию', hours: 2, status: 'completed' },
  'SEC-002': { desc: 'Откатить typescript-eslint до v7', hours: 1, status: 'completed' },
  'SEC-003': { desc: 'Устранить esbuild vulnerability', hours: 2, status: 'completed' },
  'SEC-004': { desc: 'Обновить Vite до latest', hours: 1, status: 'completed' },
  'CFG-001': { desc: 'Создать .eslintrc.json', hours: 1, status: 'completed' },
  'CFG-002': { desc: 'Настроить pre-commit hooks', hours: 2, status: 'completed' },
  'TS-001': { desc: 'Включить noImplicitAny', hours: 4, status: 'pending' },
  'TS-002': { desc: 'Исправить все any типы', hours: 8, status: 'pending' },
};

function displayStatus() {
  console.log('\n🚀 AI MUSIC PLATFORM - DEVELOPMENT TRACKER');
  console.log('=' .repeat(50));
  
  const currentPhase = 1;
  const currentSprint = 1;
  
  console.log(`\n📊 CURRENT: Phase ${currentPhase} - ${PHASES[currentPhase].name}`);
  console.log(`🏃 Sprint ${currentSprint}: ${PHASES[currentPhase].sprints[currentSprint-1].name}`);
  
  const completedTasks = Object.entries(TASK_DEFINITIONS)
    .filter(([_, task]) => task.status === 'completed').length;
  const totalTasks = Object.keys(TASK_DEFINITIONS).length;
  
  console.log(`\n✅ Progress: ${completedTasks}/${totalTasks} tasks completed`);
  console.log(`📈 ${Math.round((completedTasks/totalTasks)*100)}% Phase 1 Sprint 1 complete`);
  
  console.log('\n🎯 COMPLETED TASKS:');
  Object.entries(TASK_DEFINITIONS)
    .filter(([_, task]) => task.status === 'completed')
    .forEach(([id, task]) => {
      console.log(`   ✅ ${id}: ${task.desc}`);
    });
  
  console.log('\n🔄 NEXT TASKS:');
  Object.entries(TASK_DEFINITIONS)
    .filter(([_, task]) => task.status === 'pending')
    .slice(0, 3)
    .forEach(([id, task]) => {
      console.log(`   ⏳ ${id}: ${task.desc} [${task.hours}h]`);
    });
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('   npm run dev          # Start development');
  console.log('   npm run typecheck    # Check TypeScript');
  console.log('   npm run lint:fix     # Fix linting issues');
  console.log('   node scripts/phase-tracker.js # Check progress');
}

function markTaskComplete(taskId) {
  if (TASK_DEFINITIONS[taskId]) {
    TASK_DEFINITIONS[taskId].status = 'completed';
    console.log(`✅ Task ${taskId} marked as complete!`);
  } else {
    console.log(`❌ Task ${taskId} not found`);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    displayStatus();
  } else if (args[0] === 'complete' && args[1]) {
    markTaskComplete(args[1]);
  } else if (args[0] === 'status') {
    displayStatus();
  } else {
    console.log('Usage:');
    console.log('  node scripts/phase-tracker.js           # Show status');
    console.log('  node scripts/phase-tracker.js status    # Show status');
    console.log('  node scripts/phase-tracker.js complete SEC-001  # Mark task complete');
  }
}

if (require.main === module) {
  main();
}

module.exports = { PHASES, TASK_DEFINITIONS, displayStatus, markTaskComplete };