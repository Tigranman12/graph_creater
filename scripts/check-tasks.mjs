import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'

const root = process.cwd()

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function ok(condition, message) {
  if (condition) {
    console.log(`PASS  ${message}`)
    return true
  }
  console.log(`FAIL  ${message}`)
  return false
}

function contains(path, pattern) {
  return read(path).includes(pattern)
}

function notContains(path, pattern) {
  return !read(path).includes(pattern)
}

let failed = 0

console.log('Checking task files...')
failed += ok(existsSync(join(root, 'tasks', 'tickets.json')), 'tasks/tickets.json exists') ? 0 : 1
failed += ok(existsSync(join(root, 'tasks', 'TICKET-001.md')), 'ticket markdown exists') ? 0 : 1

console.log('\nChecking TICKET-001...')
failed += ok(contains('src/components/NodeLibrary/NodeLibrary.tsx', "name: 'Module'"), 'module entry exists in library') ? 0 : 1
failed += ok(notContains('src/components/NodeLibrary/NodeLibrary.tsx', "name: 'Process'"), 'old Process template removed') ? 0 : 1
failed += ok(notContains('src/components/NodeLibrary/NodeLibrary.tsx', "name: 'Mux'"), 'old Mux template removed') ? 0 : 1

console.log('\nChecking TICKET-002...')
failed += ok(contains('src/types/index.ts', 'export interface NetlistDatabase'), 'NetlistDatabase type exists') ? 0 : 1
failed += ok(contains('src/store/graphStore.ts', 'enterHierarchyByNode'), 'enterHierarchyByNode exists') ? 0 : 1
failed += ok(contains('src/store/graphStore.ts', 'exitHierarchy'), 'exitHierarchy exists') ? 0 : 1
failed += ok(contains('electron/main.ts', "label: 'Tools'"), 'Tools menu exists') ? 0 : 1

console.log('\nChecking TICKET-003...')
failed += ok(contains('src/types/index.ts', 'export type ModuleType'), 'explicit ModuleType exists') ? 0 : 1
failed += ok(contains('src/components/NodeBlock/NodeBlock.tsx', 'node.moduleKind === \'hierarchical\''), 'hierarchy badge condition exists') ? 0 : 1

console.log('\nChecking TICKET-004...')
failed += ok(contains('src/store/graphStore.ts', 'groupSelectedAsSubmodule'), 'groupSelectedAsSubmodule action exists') ? 0 : 1
failed += ok(contains('src/store/graphStore.ts', 'groupNodesIntoSubmodule'), 'groupNodesIntoSubmodule helper exists') ? 0 : 1

console.log('\nChecking TICKET-005...')
failed += ok(contains('package.json', 'check:tasks'), 'package script exists') ? 0 : 1
failed += ok(existsSync(join(root, 'scripts', 'check-tasks.mjs')), 'checker script exists') ? 0 : 1

console.log('\nRunning build...')
try {
  execSync('npm run build', { stdio: 'inherit' })
  console.log('PASS  build succeeded')
} catch (error) {
  console.log('FAIL  build failed')
  failed += 1
}

if (failed > 0) {
  console.error(`\nTask check failed with ${failed} issue(s).`)
  process.exit(1)
}

console.log('\nAll task checks passed.')
