import { spawn } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const testFiles = (await readdir(resolve('tests')))
  .filter(file => file.endsWith('.test.js'))
  .filter(file => !file.toLowerCase().includes('emulator'))
  .map(file => resolve('tests', file))
  .sort()

if (!testFiles.length) {
  console.error('Nie znaleziono testów do uruchomienia.')
  process.exit(1)
}

const child = spawn(process.execPath, [
  '--test',
  '--test-concurrency=1',
  ...testFiles
], {
  cwd: process.cwd(),
  stdio: 'inherit'
})

child.on('error', error => {
  console.error('Nie udało się uruchomić testów:', error.message)
  process.exitCode = 1
})

child.on('close', code => {
  process.exitCode = code ?? 1
})
