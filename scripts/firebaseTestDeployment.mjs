import {
  PRODUCTION_FIREBASE_PROJECT_ID,
  TEST_FIREBASE_PROJECT_ID
} from '../src/utils/firebaseRuntimeConfig.js'

export const assertTestDeploymentTarget = projectId => {
  const normalizedProjectId = String(projectId || '').trim()
  if (normalizedProjectId === PRODUCTION_FIREBASE_PROJECT_ID) {
    throw new Error('Wdrożenie do projektu produkcyjnego jest zabronione.')
  }
  if (normalizedProjectId !== TEST_FIREBASE_PROJECT_ID) {
    throw new Error(
      `Dozwolony jest wyłącznie projekt ${TEST_FIREBASE_PROJECT_ID}.`
    )
  }
  return normalizedProjectId
}

export const buildTestRulesDeployArguments = projectId => {
  const target = assertTestDeploymentTarget(projectId)
  const args = [
    'deploy',
    '--only',
    'firestore:rules',
    '--project',
    target,
    '--non-interactive'
  ]

  if (args.includes('hosting') || args.includes('functions')) {
    throw new Error('Niedozwolony zakres wdrożenia Firebase.')
  }
  return args
}

export const buildTestAccessCheckArguments = projectId => {
  const target = assertTestDeploymentTarget(projectId)
  return [
    'apps:list',
    'WEB',
    '--project',
    target,
    '--json'
  ]
}
