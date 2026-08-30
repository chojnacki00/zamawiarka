import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

await import('./verifyFirebaseEmulatorConfig.mjs')

const modes = {
  rules: {
    only: 'firestore',
    command: 'node --test tests/firestoreRules.emulator.test.js'
  },
  auth: {
    only: 'auth,firestore',
    command: 'node --test tests/employeeAuthEmulator.test.js'
  },
  all: {
    only: 'auth,firestore',
    command: 'node --test --test-concurrency=1 tests/firestoreRules.emulator.test.js tests/employeeAuthEmulator.test.js'
  }
}

const mode = modes[process.argv[2]]
if (!mode) {
  console.error('Nieznany zestaw testów Emulatorów Firebase.')
  process.exit(1)
}

const firebaseCliPath = fileURLToPath(new URL(
  '../node_modules/firebase-tools/lib/bin/firebase.js',
  import.meta.url
))
const childEnvironment = { ...process.env }
delete childEnvironment.DEBUG

const sanitizeLine = line => line
  .replace(
    /https?:\/\/[^\s]*\/emulator\/action\?[^\s]*/g,
    '[link weryfikacyjny Auth ukryty]'
  )
  .replace(/oobCode=[^&\s]+/g, 'oobCode=[ukryty]')

const forwardSanitizedOutput = (stream, target) => {
  let pending = ''
  stream.setEncoding('utf8')
  stream.on('data', chunk => {
    pending += chunk
    const lines = pending.split(/(?<=\n)/)
    pending = lines.pop() || ''
    lines.forEach(line => target.write(sanitizeLine(line)))
  })
  stream.on('end', () => {
    if (pending) target.write(sanitizeLine(pending))
  })
}

const child = spawn(process.execPath, [
  firebaseCliPath,
  'emulators:exec',
  '--only',
  mode.only,
  '--project',
  'demo-gastromanager',
  '--log-verbosity',
  'SILENT',
  mode.command
], {
  cwd: process.cwd(),
  env: childEnvironment,
  stdio: ['inherit', 'pipe', 'pipe']
})

forwardSanitizedOutput(child.stdout, process.stdout)
forwardSanitizedOutput(child.stderr, process.stderr)

child.on('error', error => {
  console.error('Nie udało się uruchomić Emulatorów Firebase:', error.message)
  process.exitCode = 1
})

child.on('close', (code, signal) => {
  if (signal) {
    console.error(`Testy Emulatorów przerwane sygnałem ${signal}.`)
    process.exitCode = 1
    return
  }
  process.exitCode = code ?? 1
})
