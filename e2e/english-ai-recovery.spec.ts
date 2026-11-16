import { expect, test } from 'playwright/test'

test('English onboarding and explicit language choices stay consistent across learning screens', async ({ page }) => {
  await page.goto('/today')
  await expect(page.getByLabel('Learning language')).toHaveValue('en')
  await expect(page.getByText('English with AI coaching.')).toBeVisible()
  await page.getByLabel('Learning language').selectOption('fr')
  await page.getByRole('navigation').getByRole('link', { name: 'Study', exact: true }).click()
  await expect(page.getByLabel('Language', { exact: true })).toHaveValue('fr')
  await expect(page.getByText('Exercises and flashcards are available', { exact: false })).toBeVisible()
  await page.getByRole('navigation').getByRole('link', { name: 'Practice', exact: true }).click()
  await expect(page.getByLabel('Language', { exact: true })).toHaveValue('fr')
  await page.getByRole('navigation').getByRole('link', { name: 'Library', exact: true }).click()
  await expect(page.getByLabel('Language', { exact: true })).toHaveValue('fr')
  await page.goto('/study?language=en')
  await expect(page.getByLabel('Language', { exact: true })).toHaveValue('en')
  await page.getByRole('navigation').getByRole('link', { name: 'Today', exact: true }).click()
  await expect(page.getByLabel('Learning language')).toHaveValue('en')
  await page.screenshot({ path: '/tmp/linguaflow-english-onboarding.png', fullPage: true })
})

test('Study preserves the question and respects Retry-After before retrying', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/study-assist', async route => {
    expect(route.request().postDataJSON().question).toBe('Why do I use this tense?')
    attempts++
    if (attempts === 1) return route.fulfill({ status: 429, headers: { 'Retry-After': '2' }, json: { error: 'Rate limited' } })
    return route.fulfill({ json: { assistantMessage: 'The tense describes a completed action.', retrievalHit: false, retrievedSources: [], similarExamples: null, responseId: null } })
  })
  await page.goto('/study?language=en')
  await page.getByRole('button', { name: 'Choose 10 for me' }).click()
  await page.getByRole('button', { name: 'Study selected' }).click()
  const question = page.getByLabel('Question for your study coach')
  await question.fill('Why do I use this tense?')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(page.locator('.ai-failure')).toContainText('AI usage limit reached')
  await expect(question).toHaveValue('Why do I use this tense?')
  await expect(page.getByRole('button', { name: /Try again in/ })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeEnabled({ timeout: 5000 })
  expect(attempts).toBe(1)
  await page.screenshot({ path: '/tmp/linguaflow-ai-recovery.png', fullPage: true })
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByText('The tense describes a completed action.')).toBeVisible()
  expect(attempts).toBe(2)
})

test('coach recovers from a dropped stream without losing or duplicating the question', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/tutor/stream', async route => {
    const body = route.request().postDataJSON()
    if (body.mode === 'feedback') return route.fulfill({ contentType: 'text/event-stream', body: 'data: {"token":"Review the expected answer."}\n\ndata: {"done":true}\n\n' })
    attempts++
    return route.fulfill({ contentType: 'text/event-stream', body: attempts === 1 ? 'data: {"token":"Partial"}\n\n' : 'data: {"token":"Use the base verb after does."}\n\ndata: {"done":true}\n\n' })
  })
  await page.goto('/drill?language=en&count=1')
  await page.getByTestId('begin-session').click()
  await page.getByLabel('Response').fill('not the answer')
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(page.getByText('Review the expected answer.')).toBeVisible()
  await page.getByRole('button', { name: 'Ask Coach', exact: true }).click()
  const question = page.getByPlaceholder('Ask for a hint, explanation, or guidance…')
  await question.fill('Why is my answer incorrect?')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(page.locator('.ai-failure')).toContainText('connection ended')
  await expect(question).toHaveValue('Why is my answer incorrect?')
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByText('Use the base verb after does.')).toBeVisible()
  await expect(page.getByText('Why is my answer incorrect?', { exact: true })).toHaveCount(1)
  await expect(page.getByPlaceholder('Follow-up question…')).toHaveValue('')
})

test('exercise generation preserves instructions through an outage', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/generate-drills', async route => {
    const body = route.request().postDataJSON()
    expect(body.rawPrompt).toBe('Practice English questions for a work meeting.')
    expect(body.language).toBe('English')
    attempts++
    if (attempts === 1) return route.fulfill({ status: 503, json: { error: 'Private provider detail' } })
    return route.fulfill({ json: { drills: [{ id: 'created-example', type: 'transformation', instruction: 'Make a question.', prompt: 'She works here.', answer: 'Does she work here?', promptLang: 'en-US' }] } })
  })
  await page.goto('/drill?language=en&source=custom')
  await page.getByRole('button', { name: 'Describe your practice', exact: true }).click()
  const prompt = page.getByLabel('Describe your exercises')
  await prompt.fill('Practice English questions for a work meeting.')
  await page.getByRole('button', { name: /^Generate \d+ drills$/ }).click()
  await expect(page.locator('.ai-failure')).toContainText('temporarily unavailable')
  await expect(page.locator('.ai-failure')).not.toContainText('Private provider')
  await expect(prompt).toHaveValue('Practice English questions for a work meeting.')
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Custom list' }).getByText('Does she work here?', { exact: true })).toBeVisible()
  expect(attempts).toBe(2)
})
