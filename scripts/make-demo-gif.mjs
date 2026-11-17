import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baseUrl = (process.env.DEMO_GIF_BASE_URL ?? 'http://127.0.0.1:3001').replace(/\/$/, '')
const outputDir = path.join(repoRoot, 'docs', 'demo')
const viewport = { width: 1280, height: 800 }
const captureScale = 2
const captureFps = 20
const output = { width: 2560, height: 1800 }
const font = process.env.DEMO_FONT ?? '/System/Library/Fonts/Supplemental/Arial.ttf'

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
  const context = await browser.newContext({ viewport, deviceScaleFactor: captureScale })
  const page = await context.newPage()
  let started = Date.now()
  const frames = []
  let recording = false
  let recordingTask
  let recordingError
  const consoleErrors = []
  const scenes = []
  const screenshots = []
  const pause = ms => page.waitForTimeout(ms)
  const now = () => (Date.now() - started) / 1000
  let success = false
  let closed = false
  page.on('pageerror', error => consoleErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  async function check(label) {
    await page.evaluate(() => document.fonts.ready)
    const text = await page.locator('body').innerText()
    if (text.trim().length < 50 || /Request failed|HTTP 50[234]|Application error|Runtime Error/.test(text)) {
      throw new Error(`Invalid rendered page at ${label}; existing assets retained`)
    }
  }
  async function scene(label, caption, action, hold = 2500) {
    await check(label)
    const start = now()
    if (action) await action()
    await pause(hold)
    await check(label)
    scenes.push({ label, caption, start, end: now(), url: page.url() })
    console.log(`Captured: ${label}`)
  }
  async function still(filename, fullPage = false) {
    await page.screenshot({ path: path.join(tempDir, filename), fullPage, animations: 'disabled' })
    screenshots.push(filename)
  }
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    if (!(await page.title()).includes('LinguaFlow')) throw new Error('Wrong page')
    await page.getByRole('heading', { name: 'Practice the sentences you need.' }).waitFor()
    // Chromium's built-in screencast records CSS pixels even at 2x density.
    // Capture native device-pixel frames instead; preserve their measured timing.
    started = Date.now()
    recording = true
    recordingTask = (async () => {
      while (recording) {
        const stamp = now()
        const filename = path.join(tempDir, `native-${String(frames.length).padStart(5, '0')}.jpg`)
        await page.screenshot({ path: filename, type: 'jpeg', quality: 95, scale: 'device' })
        frames.push({ filename, stamp })
        await new Promise(resolve => setTimeout(resolve, Math.max(0, 1000 / captureFps - (now() - stamp) * 1000)))
      }
    })().catch(error => { recordingError = error })
    await pause(250)
    await scene('Start here', '01  /  PRACTICE     A short session. A little more fluent.', null, 3500)
    await still('landing.png')
    await scene('Choose a session', 'Choose English practice. Set the length to fit your day.', async () => {
      await page.getByRole('link', { name: 'Start practicing' }).click()
      await page.getByRole('heading', { name: 'Begin practice.' }).waitFor()
      for (let i = 0; i < 4; i++) { await page.getByRole('button', { name: 'Decrease item count' }).click(); await pause(200) }
    })
    await still('practice.png')
    const drills = JSON.parse(await readFile(path.join(repoRoot, 'data/english-drills.json'), 'utf8'))
    let practiced
    await scene('Write an answer', 'Read the prompt, then write your answer.', async () => {
      await page.getByRole('button', { name: 'Start practice', exact: false }).click()
      const prompt = await page.getByTestId('drill-prompt').innerText()
      practiced = drills.find(d => d.prompt === prompt)
      if (!practiced) throw new Error('Displayed practice question is absent from the canonical library')
      await pause(1500)
      await page.getByRole('textbox', { name: 'Response', exact: true }).pressSequentially(practiced.answer, { delay: 38 })
    }, 800)
    await still('practice-answer.png')
    await scene('Immediate feedback', 'Submit your answer and get immediate feedback.', async () => {
      await page.getByRole('button', { name: 'Submit', exact: true }).click()
      await page.getByTestId('drill-feedback').getByText('Correct.', { exact: true }).waitFor()
      await page.getByTestId('drill-feedback').scrollIntoViewIfNeeded()
    }, 3500)
    await still('practice-feedback.png')
    await scene('Saved practice', 'Your session is saved on this device. Keep your progress.', async () => {
      await page.getByRole('button', { name: 'See session summary', exact: false }).click()
      await page.getByRole('heading', { name: 'Practice complete.' }).waitFor()
    }, 3500)
    await still('session-summary.png')
    await scene('Find a card', '02  /  STUDY     Pick a topic. Focus on one sentence.', async () => {
      await page.getByRole('link', { name: 'Study', exact: true }).click()
      await page.getByRole('heading', { name: 'Study English.' }).waitFor()
      await page.getByLabel('Topic', { exact: true }).selectOption('work')
      await page.getByRole('searchbox').pressSequentially('The committee reviewed the proposal.', { delay: 45 })
      await page.locator('.product-study-list input').check()
    }, 2500)
    await still('study-selection.png')
    await scene('Recall first', 'Try the rewrite yourself before revealing the answer.', async () => {
      await page.getByRole('button', { name: 'Study selected' }).click()
      await page.getByPlaceholder('Ask a question about this card…').waitFor()
      await page.evaluate(() => window.scrollTo(0, 0))
    }, 4000)
    await still('study-question.png')
    await scene('Reveal the answer', 'Active to passive: the proposal becomes the subject.', async () => {
      await page.getByRole('button', { name: 'Show answer', exact: true }).click()
      await page.locator('.study-inner.flipped').waitFor()
      await pause(500)
    }, 4000)
    await still('study-answer.png')
    const responsePromise = page.waitForResponse(r => r.url().endsWith('/api/study-assist') && r.request().method() === 'POST', { timeout: 90000 })
    // Mark the promise handled while the visible loading scene is recorded.
    responsePromise.catch(() => {})
    await scene('Ask for the reason', '03  /  UNDERSTAND     Ask why this rewrite works.', async () => {
      await page.getByRole('button', { name: 'Explain this card', exact: true }).scrollIntoViewIfNeeded()
      await pause(700)
      await page.getByRole('button', { name: 'Explain this card', exact: true }).click()
    }, 1200)
    const response = await responsePromise
    if (!response.ok()) throw new Error(`Study request returned HTTP ${response.status()}`)
    const result = await response.json()
    if (!result.retrievalHit || !result.retrievedSources?.some(s => s.id === 'en_passive_vs_active_voice')) {
      throw new Error('Expected passive-voice reference was not returned')
    }
    const reference = page.getByText('Study reference: Active voice vs passive voice', { exact: true })
    await reference.waitFor()
    await reference.scrollIntoViewIfNeeded()
    await pause(700)
    await scene('Explanation and source', 'Read the explanation and see the teaching reference behind it.', null, 9000)
    await still('english-study.png')
    await still('english-study-full.png', true)
    await scene('Keep learning', 'Practice. Review. Understand.   /   LinguaFlow', async () => {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    }, 3500)

    recording = false
    await recordingTask
    if (recordingError) throw recordingError
    // Resize the same page to preserve the actual response, without injecting history.
    await page.setViewportSize({ width: 390, height: 844 })
    await reference.scrollIntoViewIfNeeded()
    await pause(500)
    await still('english-study-mobile.png', true)
    await still('english-study-mobile-detail.png')
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    if (mobileOverflow || consoleErrors.length) throw new Error(`QA failed: overflow=${mobileOverflow}; ${consoleErrors.join('; ')}`)
    await context.close(); closed = true
    const rawPath = path.join(tempDir, 'native-capture.mp4')
    const frameList = path.join(tempDir, 'frames.txt')
    await writeFile(frameList, frames.map((frame, i) => `file '${frame.filename}'\nduration ${i + 1 < frames.length ? frames[i + 1].stamp - frame.stamp : 1 / captureFps}`).join('\n') + `\nfile '${frames.at(-1).filename}'\n`)
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', frameList,
      '-vf', 'fps=20', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '16', '-pix_fmt', 'yuv420p', rawPath])
    const metadata = {
      recordedAt: new Date().toISOString(), baseUrl, viewport, deviceScaleFactor: captureScale, output, nativeFrames: frames.length, captureTargetFps: captureFps, exportFps: 20,
      measuredCaptureFps: Number(((frames.length - 1) / (frames.at(-1).stamp - frames[0].stamp)).toFixed(2)),
      flow: 'Landing → one-question English practice → feedback → saved summary → Study → select card → reveal → explanation and reference',
      scenes, screenshots, practice: { id: practiced.id, prompt: practiced.prompt, answer: practiced.answer },
      action: 'explain_card', status: response.status(), answer: result.assistantMessage,
      retrievedSources: result.retrievedSources, consoleErrors,
      mobile: { width: 390, height: 844, horizontalOverflow: mobileOverflow },
      note: 'Native 2x high-quality JPEG browser frames with measured timing, captured and encoded at a target of 20 fps, with editorial captions below the app. Loading gaps are cut; timing is not latency evidence. One real card-explanation request. No mocked responses, modified product UI, or injected session history. Practice uses a canonical sample answer.',
    }
    await writeFile(path.join(tempDir, 'english-study-capture.json'), JSON.stringify(metadata, null, 2) + '\n')
    const clips = []
    for (const [i, s] of scenes.entries()) {
      const caption = path.join(tempDir, `caption-${i}.txt`)
      const clip = path.join(tempDir, `clip-${i}.mp4`)
      await writeFile(caption, s.caption)
      await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(Math.max(0, s.start - frames[0].stamp)), '-i', rawPath,
        '-t', String(s.end - s.start), '-vf', `fps=20,pad=2560:1800:0:0:color=0xf7f5f1,drawbox=x=0:y=1600:w=2560:h=2:color=0xd8ddd5:t=fill,drawtext=fontfile='${font}':textfile='${caption}':fontsize=50:fontcolor=0x204e38:x=80:y=1676`,
        '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', clip])
      clips.push(clip)
    }
    const concat = path.join(tempDir, 'clips.txt')
    await writeFile(concat, clips.map(p => `file '${p}'`).join('\n'))
    const mp4 = path.join(tempDir, 'english-study-demo.mp4')
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concat, '-c', 'copy', '-movflags', '+faststart', mp4])
    const gif = path.join(tempDir, 'english-study-demo.gif')
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', mp4, '-filter_complex', 'fps=20,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle', '-loop', '0', gif])
    let elapsed = 0
    const time = n => { const ms = Math.round(n * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}` }
    const captions = scenes.map(s => { const start = elapsed; elapsed += s.end - s.start; return `${time(start)} --> ${time(elapsed)}\n${s.caption}\n` })
    await writeFile(path.join(tempDir, 'english-study-demo.vtt'), `WEBVTT\n\n${captions.join('\n')}`)
    await mkdir(outputDir, { recursive: true })
    for (const filename of [...screenshots, 'english-study-demo.mp4', 'english-study-demo.gif', 'english-study-demo.vtt', 'english-study-capture.json']) {
      await copyFile(path.join(tempDir, filename), path.join(outputDir, filename))
    }
    success = true
    console.log(`Published MP4, GIF, captions and ${screenshots.length} screenshots. Duration: ${elapsed.toFixed(1)} seconds.`)
  } finally {
    recording = false
    if (recordingTask) await recordingTask
    if (!closed) await context.close()
    await browser.close()
    if (success) await rm(tempDir, { recursive: true, force: true })
    else console.error(`Capture work retained for recovery: ${tempDir}`)
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
