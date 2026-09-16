import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baseUrl = (process.env.DEMO_GIF_BASE_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '')
const outputDir = path.join(repoRoot, 'docs', 'demo')
const question = 'Why does the passive answer use "was reviewed"?'
const viewport = { width: 1280, height: 1000 }

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repoRoot, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)))
  })
}

async function main() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'linguaflow-demo-'))
  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  const consoleErrors = []
  let frameIndex = 0
  try {
    const page = await browser.newPage({ viewport })
    page.on('pageerror', error => consoleErrors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    async function capture(label, seconds) {
      const text = await page.locator('body').innerText()
      if (/Request failed|HTTP 50[234]|Application error|Runtime Error/.test(text)) {
        throw new Error(`Visible error at ${label}; refusing to publish a broken demo`)
      }
      await page.evaluate(() => document.fonts.ready)
      const frame = await page.screenshot({ animations: 'disabled' })
      for (let i = 0; i < seconds * 2; i += 1) {
        await writeFile(path.join(tempDir, `frame-${String(frameIndex++).padStart(3, '0')}.png`), frame)
      }
      console.log(`Captured ${label}`)
    }

    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    if (!(await page.title()).includes('LinguaFlow')) throw new Error('Wrong page')
    await page.getByRole('button', { name: /English/ }).click()
    await page.getByRole('link', { name: 'Study', exact: true }).click()
    await page.waitForURL('**/study')
    await page.getByRole('heading', { name: /English.*essentials/ }).waitFor()
    await page.getByRole('button', { name: /Work/ }).click()
    await page.getByText('The committee reviewed the proposal.', { exact: true }).click()
    await page.getByRole('button', { name: 'Practice this one' }).click()
    await page.getByPlaceholder('Ask a question about this card…').waitFor()
    await page.evaluate(() => window.scrollTo(0, 0))
    await capture('English passive-voice card', 3)

    await page.locator('.study-scene').click()
    await page.locator('.study-inner.flipped').waitFor()
    // Wait for the actual card-flip transition; do not alter the rendered content.
    await page.waitForTimeout(500)
    await capture('Revealed answer', 3)

    await page.getByPlaceholder('Ask a question about this card…').fill(question)
    await capture('Learner question', 3)
    const responsePromise = page.waitForResponse(response =>
      response.url().endsWith('/api/study-assist') && response.request().method() === 'POST',
    { timeout: 65000 })
    await page.getByRole('button', { name: 'Ask', exact: true }).click()
    const response = await responsePromise
    if (!response.ok()) throw new Error(`Study request returned HTTP ${response.status()}`)
    const result = await response.json()
    if (!result.retrievalHit || !result.retrievedSources?.some(source => source.id === 'en_passive_vs_active_voice')) {
      throw new Error('Expected passive-voice reference was not returned')
    }
    await page.getByText('Study reference: Active voice vs passive voice', { exact: true }).waitFor()
    await page.evaluate(() => window.scrollTo(0, 0))
    await capture('Actual answer and reference', 8)
    await page.screenshot({ path: path.join(tempDir, 'english-study.png') })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Ask', exact: true }).waitFor()
    await page.screenshot({ path: path.join(tempDir, 'english-study-mobile.png'), fullPage: true })
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    if (consoleErrors.length) throw new Error(`Browser errors: ${consoleErrors.join('; ')}`)

    const palette = path.join(tempDir, 'palette.png')
    const frames = path.join(tempDir, 'frame-%03d.png')
    const gif = path.join(tempDir, 'english-study-demo.gif')
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '2', '-i', frames,
      '-vf', 'palettegen', palette])
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '2', '-i', frames,
      '-i', palette, '-lavfi', 'paletteuse', '-loop', '0', gif])
    await mkdir(outputDir, { recursive: true })
    // Publish only after the real request, UI assertions and GIF encoding succeed.
    await writeFile(path.join(outputDir, 'english-study-demo.gif'), await readFile(gif))
    await copyFile(path.join(tempDir, 'english-study.png'), path.join(outputDir, 'english-study.png'))
    const mobilePath = path.join(os.tmpdir(), 'linguaflow-english-study-mobile.png')
    await copyFile(path.join(tempDir, 'english-study-mobile.png'), mobilePath)
    await writeFile(path.join(outputDir, 'english-study-capture.json'), JSON.stringify({
      recordedAt: new Date().toISOString(), baseUrl, page: `${baseUrl}/study`, viewport,
      flow: 'Select English → Study → Work → passive card → reveal → ask → reference-backed answer',
      question, status: response.status(), answer: result.assistantMessage,
      retrievedSources: result.retrievedSources, consoleErrors,
      mobile: { width: 390, height: 844, horizontalOverflow: mobileOverflow },
      note: 'Real UI and API response. Edited still-frame walkthrough; pauses are not measured latency. No mocked responses or injected session history.',
    }, null, 2) + '\n')
    console.log(`Published English Study capture. Mobile QA: ${mobilePath}`)
  } finally {
    await browser.close()
    await rm(tempDir, { recursive: true, force: true })
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
