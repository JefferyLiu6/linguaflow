import { expect, test } from 'playwright/test'
import type { SessionRecord } from '../lib/drills'

const missed: SessionRecord = {
  id: 'custom-review', date: 1700000000000, drillType: 'custom', language: 'es', correct: 0, total: 1, accuracy: 0, avgTime: 4,
  results: [{ item: { id: 'generated-only', type: 'translation', prompt: 'My green notebook.', answer: 'Mi cuaderno verde.', instruction: 'Translate to Spanish.', promptLang: 'en-US' }, correct: false, skipped: true, timedOut: false, userAnswer: '', timeUsed: 4 }],
}

test('reviews a saved custom mistake, practices it, and clears the current review', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/today')
  await page.evaluate(history => {
    localStorage.clear()
    localStorage.setItem('linguaflow_demo_sessions', JSON.stringify(history))
    localStorage.setItem('linguaflow_demo_language', JSON.stringify('es'))
  }, [missed])
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Review your recent mistakes' })).toBeVisible()
  await page.screenshot({ path: '/tmp/linguaflow-today-desktop.png', fullPage: true })
  await page.getByRole('link', { name: 'Review mistakes', exact: false }).click()
  await expect(page).toHaveURL(/\/study\?review=mistakes&language=es/)
  await expect(page.getByText('My green notebook.', { exact: true }).first()).toBeVisible()
  await page.locator('.study-scene').click()
  await expect(page.locator('.study-inner')).toHaveClass(/flipped/)
  await page.getByRole('link', { name: 'Practice these questions' }).last().click()
  await expect(page.getByRole('heading', { name: 'Try them again.' })).toBeVisible()
  await page.getByTestId('begin-session').click()
  await expect(page.getByTestId('drill-prompt')).toHaveText('My green notebook.')
  await page.getByLabel('Response').fill('Mi cuaderno verde.')
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  await page.getByRole('button', { name: 'See session summary' }).click()
  await expect(page).toHaveURL(/\/session\//)
  await expect(page.getByRole('heading', { name: 'Practice complete.' })).toBeVisible()
  await expect(page.getByText('You answered 1 of 1 questions correctly.', { exact: false })).toBeVisible()
  await page.getByRole('link', { name: 'Back to Today' }).click()
  await expect(page.getByRole('heading', { name: 'Keep your practice going' })).toBeVisible()
  // A past session remains reviewable, even after the latest attempt was correct.
  await page.goto('/session/custom-review')
  await page.getByRole('link', { name: 'Review 1 mistake' }).click()
  await expect(page).toHaveURL(/session=custom-review/)
  await expect(page.getByText('My green notebook.', { exact: true }).first()).toBeVisible()
  expect(errors).toEqual([])
})

test('keeps the new screens usable on mobile and handles empty review links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/today')
  await expect(page.getByRole('heading', { name: 'Your next practice' })).toBeVisible()
  await page.getByLabel('Learning language').selectOption('fr')
  await expect(page.getByRole('heading', { name: 'Start practicing French' })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Learning language')).toHaveValue('fr')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '/tmp/linguaflow-today-mobile.png', fullPage: true })
  await page.goto('/study?review=mistakes&language=fr&session=missing')
  await expect(page.getByRole('heading', { name: 'Nothing to review here' })).toBeVisible()
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Your progress starts with a session' })).toBeVisible()
})

test('carries an English mistake into the study coach', async ({ page }) => {
  await page.route('**/api/study-assist', async route => {
    const body = route.request().postDataJSON()
    expect(body.currentItem.id).toBe('generated-only')
    expect(body.action).toBe('explain_card')
    await route.fulfill({ json: { assistantMessage: 'Use an article before a singular countable noun.', retrievalHit: false, retrievedSources: [], similarExamples: null, elapsedMs: 1, responseId: null, model: 'test' } })
  })
  await page.goto('/today')
  await page.evaluate(history => localStorage.setItem('linguaflow_demo_sessions', JSON.stringify(history)), [{ ...missed, language: 'en' }])
  await page.goto('/study?review=mistakes&language=en&session=custom-review')
  await page.getByRole('button', { name: 'Explain this card' }).click()
  await expect(page.getByText('Use an article before a singular countable noun.')).toBeVisible()
})
