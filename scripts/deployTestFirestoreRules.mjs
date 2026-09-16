import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadAndValidateFirebaseTestConfig } from './firebaseTestConfig.mjs'
import {
  buildTestAccessCheckArguments,
  buildTestRulesDeployArguments,
  assertTestDeploymentTarget
} from './firebaseTestDeployment.mjs'

const runFirebaseCli = ({ firebaseCli, args, cwd, captureOutput = false }) => (
  new Promise((resolveExit, reject) => {
    const child = spawn(
      process.execPath,
      [firebaseCli, ...args],
      {
        cwd,
        stdio: captureOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit'
      }
    )
    let stdout = ''
    let stderr = ''
    if (captureOutput) {
      child.stdout.on('data', chunk => { stdout += chunk })
      child.stderr.on('data', chunk => { stderr += chunk })
    }
    child.on('error', reject)
    child.on('close', code => resolveExit({
      code: code ?? 1,
      stdout,
      stderr
    }))
  })
)

const main = async () => {
  const CONFIRM_PREFIX = '--confirm-project='
  const confirmation = process.argv
    .find(argument => argument.startsWith(CONFIRM_PREFIX))
    ?.slice(CONFIRM_PREFIX.length)
  const target = assertTestDeploymentTarget(confirmation)
  const cwd = process.cwd()
  const [webConfig, firebaseConfig] = await Promise.all([
    loadAndValidateFirebaseTestConfig({ cwd }),
    readFile(resolve(cwd, 'firebase.json'), 'utf8').then(JSON.parse)
  ])

  assert.equal(webConfig.projectId, target)
  assert.equal(firebaseConfig.firestore?.rules, 'firestore.rules')
  await readFile(resolve(cwd, firebaseConfig.firestore.rules), 'utf8')

  const firebaseCli = fileURLToPath(new URL(
    '../node_modules/firebase-tools/lib/bin/firebase.js',
    import.meta.url
  ))
  const accessCheck = await runFirebaseCli({
    firebaseCli,
    args: buildTestAccessCheckArguments(target),
    cwd,
    captureOutput: true
  })
  if (accessCheck.code !== 0) {
    throw new Error(
      `Firebase CLI nie potwierdził dostępu do projektu ${target}.`
    )
  }
  try {
    const response = JSON.parse(accessCheck.stdout)
    if (response.status !== 'success') throw new Error('Brak potwierdzenia.')
  } catch {
    throw new Error(
      `Firebase CLI nie zwrócił poprawnego potwierdzenia projektu ${target}.`
    )
  }

  const deployArguments = buildTestRulesDeployArguments(target)

  console.log(`Potwierdzony projekt docelowy: ${target}`)
  console.log('Firebase CLI potwierdził dostęp do projektu testowego.')
  console.log('Zakres wdrożenia: wyłącznie firestore.rules')

  const deployment = await runFirebaseCli({
    firebaseCli,
    args: deployArguments,
    cwd
  })

  if (deployment.code !== 0) {
    throw new Error(
      `Wdrożenie reguł nie powiodło się (kod ${deployment.code}).`
    )
  }
}

try {
  await main()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
