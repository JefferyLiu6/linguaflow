# LinguaFlow walkthroughs

Two high-resolution videos with English narration, synchronized burned-in subtitles, and embedded chapters. The existing cream-and-green design is preserved.

## Watch

| Video | Focus | Duration | Resolution |
|---|---|---:|---:|
| [Product walkthrough](english-study-demo.mp4) | Practice, feedback, saved session, study card and a real AI explanation | 0:53 | 2560 × 1800 |
| [AI engineering walkthrough](ai-system-walkthrough.mp4) | Retrieval, evidence selection, index reliability, evaluation, cost and failure analysis | 2:57 | 2560 × 1600 |

The product video records the live interface. The engineering video is a narrated visual explanation of the repository and saved local evaluation evidence; it is not a live production trace. Source paths appear on each engineering scene.

[Product subtitles](english-study-narration.vtt) · [Engineering subtitles](ai-system-walkthrough.vtt) · [Narration script](narration-script.json) · [Media metadata and transcripts](narrated-walkthroughs.json)

## Smooth GIF

[README GIF](english-study-demo.gif): **2560 × 1800 at 20 fps**, about 8.5 MiB. Native browser capture measured **19.6 fps**. It replaces the original 5 fps export; its 982 frames each have a 50 ms duration. GIF does not support sound. Use either MP4 for narration, full color and efficient playback.

The GIF and [silent source recording](english-study-silent.mp4) run about 49 seconds. The narrated product version holds scenes slightly longer where speech needs room. Both preserve real interactions; loading gaps are edited, so the recording is not latency evidence. Desktop and mobile stills remain native 2× lossless PNGs.

## Product chapters

| Start | Scene |
|---|---|
| 00:00 | Start here |
| 00:03 | Choose a session |
| 00:08 | Write an answer |
| 00:13 | Immediate feedback |
| 00:18 | Saved practice |
| 00:22 | Find a card |
| 00:27 | Recall first |
| 00:31 | Reveal the answer |
| 00:36 | Ask for the reason |
| 00:38 | Explanation and source |
| 00:47 | Keep learning |

## AI engineering chapters

| Start | Topic |
|---|---|
| 00:00 | Evidence before fluency |
| 00:11 | A small, inspectable corpus |
| 00:26 | Retrieval, then selection |
| 00:48 | A source is a claim |
| 01:05 | Fail explicitly |
| 01:25 | Freeze the comparison |
| 01:43 | Measure the trade-off |
| 02:00 | Account for every stage |
| 02:21 | Keep the failures visible |
| 02:38 | What this demonstrates |

## Screenshots

Desktop images are 2560 pixels wide; mobile images are 780 pixels wide, captured at 2× the 390-pixel mobile viewport. PNGs retain their original capture resolution.

| Screen | File |
|---|---|
| Landing | [landing.png](landing.png) |
| Practice setup | [practice.png](practice.png) |
| Typed answer | [practice-answer.png](practice-answer.png) |
| Answer feedback | [practice-feedback.png](practice-feedback.png) |
| Saved session | [session-summary.png](session-summary.png) |
| Study selection | [study-selection.png](study-selection.png) |
| Question card | [study-question.png](study-question.png) |
| Revealed answer | [study-answer.png](study-answer.png) |
| Explanation and teaching reference | [english-study.png](english-study.png) |
| Full desktop study page | [english-study-full.png](english-study-full.png) |
| Full mobile study page | [english-study-mobile.png](english-study-mobile.png) |
| Mobile explanation detail | [english-study-mobile-detail.png](english-study-mobile-detail.png) |

## Production and validation

Narration uses the existing local `ai-video-pipeline`: Qwen3-TTS CustomVoice bf16, English voice `ryan`, followed by local Whisper alignment. No cloud TTS calls or model downloads were made. This is synthetic narration, not a recording of the project author's voice. One garbled segment detected by transcription was regenerated and checked again.

| Check | Result |
|---|---|
| Live UI identity, meaningful content, no framework overlay | Passed |
| Browser errors / mobile horizontal overflow | None |
| Practice submission, correct feedback, saved summary | Passed |
| Real AI explanation and expected passive-voice reference | Passed, HTTP 200 |
| Native capture resolution / 20 fps GIF timing | Passed |
| Narration transcription and aligned captions | Checked; repaired one segment |
| AAC audio tracks and full video decode | Passed for both videos |
| Narration peak level | Product −4.2 dBFS; engineering −4.3 dBFS; no clipping |
| Representative final frames | Inspected for text and subtitle clipping |

The browser capture used Playwright with Chrome because the Browser plugin was unavailable. The product viewports were 1280 × 800 and 390 × 844 at 2× density. No session history or AI answers were injected; a canonical practice answer was typed through the UI. Other browsers and authenticated flows were not tested by this capture.

The engineering scores remain automated, corpus-aware synthetic evidence with documented judge errors. Independent human review and the coordinated 200-note production index publication remain pending. Neither video claims improved learning outcomes or real-user accuracy.

See [local regeneration instructions](../LOCAL_DEVELOPMENT.md#narrated-product-and-ai-engineering-walkthroughs). Engineering source visuals are also available in [the storyboard](ai-system/storyboard.html).
