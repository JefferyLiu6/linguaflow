'use client'

import Link from 'next/link'
import { aiFetch, asAiError, type AiRequestError } from '@/lib/aiClient'
import { AiFailure, AiLoading, useAiCooldown } from './AiRequestState'
import AiUsage from './AiUsage'
import { useLearningLanguage } from '@/lib/useLearningLanguage'
import LanguageSupport from './LanguageSupport'
import ExercisePreview from './ExercisePreview'
import { reviewHref } from '@/lib/learningProgress'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Language, DrillTopic, DrillItem } from '@/lib/drills'
import { LANGUAGES, TOPICS, getDB, shuffle } from '@/lib/drills'
import { getClientAuthenticatedUser } from '@/lib/clientAuth'

// BCP-47 codes for Web Speech API
const SPEECH_LANG: Record<Language, string> = {
  es: 'es-ES', fr: 'fr-FR', de: 'de-DE',
  zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', en: 'en-US',
}

const SPEED_PRESETS = [0.5, 0.75, 1, 1.25, 1.5] as const
type SpeechRate = typeof SPEED_PRESETS[number]

function speak(text: string, lang: string, rate: SpeechRate = 1) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = lang
  utt.rate = rate
  window.speechSynthesis.speak(utt)
}

const FONT_CJK = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", "Noto Sans JP", "Hiragino Kaku Gothic Pro", "Malgun Gothic", sans-serif'


type Phase = 'select' | 'study'

type StudyAction = 'explain_card' | 'show_similar_examples' | 'what_contrast_is_this' | 'freeform_help'

interface StudyAssistResult {
  assistantMessage: string
  retrievalHit: boolean
  retrievedSources: { id: string; title: string }[]
  similarExamples: { text: string; sourceItemId: string }[] | null
  elapsedMs: number
  responseId: string | null
  model: string
}

type StudyFeedbackStatus = 'idle' | 'pending' | 'saved' | 'error'
type StudyFeedbackState = { status: StudyFeedbackStatus; err?: string }

async function submitStudyFeedback(payload: {
  responseId: string
  surface: 'study'
  mode: string
  helpful: boolean
  language: string
  itemId: string
  source: { id: string; title: string }
  userPrompt: string | null
  assistantMessage: string
  model: string
}): Promise<void> {
  const res = await fetch('/api/ai-feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
  }
}

async function callStudyAssist(
  action: StudyAction,
  language: Language,
  card: DrillItem,
  question?: string,
  signal?: AbortSignal,
): Promise<StudyAssistResult> {
  const res = await aiFetch('/api/study-assist', {
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      language: language === 'en' ? 'English' : language,
      question: question ?? null,
      currentItem: {
        id:          card.id,
        type:        card.type,
        category:    card.category ?? null,
        topic:       card.topic    ?? null,
        instruction: card.instruction,
        prompt:      card.prompt,
        answer:      card.answer,
        variants:    card.variants ?? [],
      },
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function StudyClient({ reviewItems, reviewLanguage, reviewSessionId, initialLanguage }: { initialLanguage?: Language; reviewItems?: DrillItem[]; reviewLanguage?: Language; reviewSessionId?: string } = {}) {
  const { language, setLanguage, languageError } = useLearningLanguage(reviewLanguage ?? initialLanguage)
  const [topic,        setTopic]        = useState<DrillTopic | null>(null)
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [phase,        setPhase]        = useState<Phase>(reviewItems ? 'study' : 'select')
  const [isShuffled,   setIsShuffled]   = useState(false)

  // Flashcard state
  const [deck,       setDeck]      = useState<DrillItem[]>(reviewItems ?? [])
  const [index,      setIndex]     = useState(0)
  const [flipped,    setFlipped]   = useState(false)
  const [autoPlay,   setAutoPlay]  = useState(false)
  const [speechRate, setSpeechRate] = useState<SpeechRate>(1)

  // Study assist state
  const [assistLoading,      setAssistLoading]      = useState(false)
  const [assistResult,       setAssistResult]       = useState<StudyAssistResult | null>(null)
  const [assistError,        setAssistError]        = useState<AiRequestError | null>(null)
  const assistCooldown = useAiCooldown(assistError)
  const assistRequest = useRef<AbortController | null>(null)
  const assistGeneration = useRef(0)
  useEffect(() => () => assistRequest.current?.abort(), [])
  const [freeformInput,      setFreeformInput]      = useState('')
  const [lastFreeformQ,      setLastFreeformQ]      = useState<string | null>(null)
  const [lastAssistAction,   setLastAssistAction]   = useState<StudyAction | null>(null)
  const [studyFeedbackState, setStudyFeedbackState] = useState<StudyFeedbackState>({ status: 'idle' })


  const allItems = useMemo(() => getDB(language), [language])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return allItems.filter(item => (!topic || item.topic === topic) && (!query || `${item.prompt} ${item.answer}`.toLocaleLowerCase().includes(query)))
  }, [allItems, topic, search])

  // Per-topic counts across ALL items (for filter chip badges)
  const topicCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const item of allItems) {
      const key = item.topic ?? '__none__'
      c[key] = (c[key] ?? 0) + 1
    }
    return c
  }, [allItems])

  const topicsWithItems = useMemo(
    () => Object.keys(TOPICS).filter(t => (topicCounts[t] ?? 0) > 0) as DrillTopic[],
    [topicCounts]
  )

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleItem = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const selectAll  = () => setSelectedIds(new Set(filteredItems.map(d => d.id)))
  const clearAll   = () => setSelectedIds(new Set())
  const pickRandom = (n: number) => setSelectedIds(new Set(shuffle([...filteredItems]).slice(0, n).map(d => d.id)))

  // ── Start study ────────────────────────────────────────────────────────────

  const startStudy = useCallback((overrideDeck?: DrillItem[]) => {
    assistRequest.current?.abort()
    assistGeneration.current++
    setAssistLoading(false)
    setAssistError(null)
    setAssistResult(null)
    const ordered = overrideDeck ?? allItems.filter(d => selectedIds.has(d.id))
    const finalDeck = isShuffled ? shuffle([...ordered]) : ordered
    setDeck(finalDeck)
    setIndex(0)
    setFlipped(false)
    setPhase('study')
  }, [allItems, selectedIds, isShuffled])

  // ── Flashcard navigation ───────────────────────────────────────────────────

  const navigate = useCallback((newIndex: number) => {
    assistRequest.current?.abort()
    assistGeneration.current++
    setAssistLoading(false)
    setFlipped(false)
    setIndex(newIndex)
    setAssistResult(null)
    setAssistError(null)
    setFreeformInput('')
    setLastFreeformQ(null)
    setLastAssistAction(null)
    setStudyFeedbackState({ status: 'idle' })
  }, [])
  const goNext   = useCallback(() => navigate(Math.min(index + 1, deck.length - 1)), [navigate, index, deck.length])
  const goPrev   = useCallback(() => navigate(Math.max(index - 1, 0)),               [navigate, index])

  useEffect(() => {
    if (phase !== 'study') return
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); setFlipped(f => !f) }
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft')  goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, goNext, goPrev])

  useEffect(() => {
    if (phase !== 'study' || !autoPlay || !flipped) return
    const card = deck[index]
    if (card) speak(card.answer, SPEECH_LANG[language], speechRate)
  }, [flipped, autoPlay, phase, deck, index, language, speechRate])

  const card = deck[index]

  async function requestAssist(action: StudyAction, question?: string) {
    if (!card || assistLoading || assistCooldown > 0) return
    assistRequest.current?.abort()
    const controller = new AbortController()
    assistRequest.current = controller
    const generation = ++assistGeneration.current
    setAssistLoading(true)
    setAssistResult(null)
    setAssistError(null)
    setStudyFeedbackState({ status: 'idle' })
    setLastAssistAction(action)
    setLastFreeformQ(question ?? null)
    try {
      const result = await callStudyAssist(action, language, card, question, controller.signal)
      if (generation === assistGeneration.current && !controller.signal.aborted) setAssistResult(result)
    } catch (error) {
      if (!controller.signal.aborted && generation === assistGeneration.current) setAssistError(asAiError(error))
    } finally {
      if (generation === assistGeneration.current) setAssistLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SELECT PHASE
  // ─────────────────────────────────────────────────────────────────────────

  if (phase === 'select') {
    const previewItem = filteredItems.find(item => item.id === previewId) ?? filteredItems[0]
    const allFilteredSelected = filteredItems.length > 0 && filteredItems.every(item => selectedIds.has(item.id))
    return <div className="learning-page">
      <header className="learning-header"><div><span className="product-eyebrow">Make room for the words</span><h1>Study <em>{LANGUAGES[language].name}.</em></h1><p>Review at your own pace. Choose the questions you want to learn.</p></div></header>
      <LanguageSupport language={language} />
      {languageError && <p role="alert">{languageError}</p>}
      <div className="product-toolbar">
        <label className="learning-select">Language<select aria-label="Language" value={language} onChange={e => { setLanguage(e.target.value as Language); setTopic(null); clearAll() }}>{Object.entries(LANGUAGES).map(([code, info]) => <option key={code} value={code}>{info.name}</option>)}</select></label>
        <label className="learning-select">Topic<select aria-label="Topic" value={topic ?? ''} onChange={e => setTopic((e.target.value || null) as DrillTopic | null)}><option value="">All topics</option>{topicsWithItems.map(key => <option key={key} value={key}>{TOPICS[key].label}</option>)}</select></label>
        <label className="learning-select product-search">Search questions<input type="search" placeholder="Search a word or phrase" value={search} onChange={e => setSearch(e.target.value)} /></label>
      </div>
      <div className="product-selection-bar"><span aria-live="polite">{selectedIds.size} selected</span><div className="product-selection-actions"><button className="learning-link" disabled={!filteredItems.length} onClick={() => allFilteredSelected ? clearAll() : selectAll()}>{allFilteredSelected ? 'Clear selection' : 'Select all'}</button><button className="learning-link" disabled={!filteredItems.length} onClick={() => pickRandom(10)}>Choose 10 for me</button><label><input type="checkbox" checked={isShuffled} onChange={e => setIsShuffled(e.target.checked)} /> Shuffle</label><button className="btn-primary" disabled={!selectedIds.size} onClick={() => startStudy()}>Study selected →</button></div></div>
      {!filteredItems.length ? <div className="product-empty"><h2>No matching questions</h2><p>Try another search or choose a different topic.</p></div> : <div className="product-study-workspace"><div className="product-study-list">{filteredItems.map(item => <label key={item.id}><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => { toggleItem(item.id); setPreviewId(item.id) }} /><span><small>{item.topic ? TOPICS[item.topic].label : 'General'} · {item.instruction}</small><strong>{item.prompt}</strong></span></label>)}</div><aside className="product-study-preview">{previewItem && <ExercisePreview item={previewItem} language={language} label="A closer look" />}<div className="product-study-note"><span>Take your time.</span><p>Listen to the pronunciation, turn the card, and give each new phrase a moment to settle.</p></div></aside></div>}
    </div>
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STUDY PHASE (flashcards)
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .study-scene  { perspective: 1200px; }
        .study-inner  {
          position: relative; width: 100%; height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .study-inner.flipped { transform: rotateY(180deg); }
        .study-face {
          position: absolute; inset: 0;
          backface-visibility: hidden; -webkit-backface-visibility: hidden;
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          padding: 40px; border-radius: 8px;
        }
        .study-back { transform: rotateY(180deg); }
      `}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 60px)' }}>

        {reviewItems && <div className="review-banner"><div><strong>Review your mistakes</strong><p>{language === 'en' ? 'Read each answer, then ask your coach if you need help.' : 'Read each answer, then try these questions again from memory.'}</p></div><Link className="learning-link" href={reviewHref('/drill', language, reviewSessionId)}>Practice these questions →</Link></div>}
        {/* Study header */}
        <div style={{ borderBottom: '1px solid #E2DDD8', background: 'var(--bg)' }}>
          <div className="study-session-header" style={{ maxWidth: 800, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => { if (reviewItems) window.location.href = '/study'; else { assistRequest.current?.abort(); assistGeneration.current++; setAssistLoading(false); setPhase('select') } }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', fontFamily: 'var(--font-manrope), sans-serif', fontSize: '0.875rem', color: '#4A5A50', cursor: 'pointer', padding: '4px 0' }}
            >
              {reviewItems ? 'Browse study cards' : '← Back to selection'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setAutoPlay(a => !a)}
                title={autoPlay ? 'Auto-play on' : 'Auto-play off'}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: autoPlay ? '#0B1E12' : 'transparent', border: `1px solid ${autoPlay ? '#0B1E12' : '#E2DDD8'}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font-manrope), sans-serif', fontSize: '0.75rem', color: autoPlay ? 'white' : '#4A5A50', fontWeight: autoPlay ? 600 : 400 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill={autoPlay ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
                Auto-play
              </button>

              <select aria-label="Playback speed" value={speechRate} onChange={e => setSpeechRate(Number(e.target.value) as SpeechRate)} className="product-speed-select">{SPEED_PRESETS.map(rate => <option key={rate} value={rate}>{rate}× speed</option>)}</select>

              <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.75rem', color: '#8CA090', letterSpacing: '0.04em' }}>
                {deck.length > 0 ? `${index + 1} / ${deck.length}` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Card area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 32px 32px', maxWidth: 800, width: '100%', margin: '0 auto' }}>
          {!card ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.75rem', color: '#8CA090' }}>
              No cards in deck.
            </div>
          ) : (
            <>
              <button className="btn-secondary" style={{ marginBottom: 16 }} onClick={() => setFlipped(f => !f)}>{flipped ? 'Show question' : 'Show answer'}</button>
              <div className="study-scene" style={{ width: '100%', height: 280, marginBottom: 28 }} onClick={() => setFlipped(f => !f)}>
                <div key={index} className={`study-inner${flipped ? ' flipped' : ''}`}>

                  {/* Front — prompt */}
                  <div className="study-face" style={{ background: 'white', border: '1px solid #E2DDD8', boxShadow: 'none', gap: 16, textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4A5A50', border: '1px solid #E2DDD8', padding: '2px 7px', borderRadius: 4 }}>
                        {card.type}
                      </span>
                      <span style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: '0.75rem', color: '#8CA090' }}>
                        {card.instruction}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 400, color: '#0B1E12', lineHeight: 1.35, letterSpacing: '-0.01em' }}>
                      {card.prompt}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <button onClick={e => { e.stopPropagation(); speak(card.prompt, 'en-US', speechRate) }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F7F6F3', border: '1px solid #E2DDD8', borderRadius: 20, padding: '6px 14px', cursor: 'pointer', color: '#4A5A50', fontFamily: 'var(--font-manrope), sans-serif', fontSize: '0.8125rem', fontWeight: 500 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                        Listen
                      </button>
                      <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5625rem', letterSpacing: '0.08em', color: '#8CA090', textTransform: 'uppercase', opacity: 0.7 }}>
                        space to reveal
                      </span>
                    </div>
                  </div>

                  {/* Back — answer */}
                  <div className="study-face study-back" style={{ background: '#EAF3ED', border: '1px solid #C8DFD3', boxShadow: 'none', gap: 16, textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2E7D52' }}>Answer</span>
                      <button onClick={e => { e.stopPropagation(); speak(card.answer, SPEECH_LANG[language], speechRate) }} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(31,92,58,0.1)', border: '1px solid rgba(31,92,58,0.25)', borderRadius: 20, padding: '4px 11px', cursor: 'pointer', color: '#1F5C3A', fontFamily: 'var(--font-manrope), sans-serif', fontSize: '0.75rem', fontWeight: 500 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                        Listen
                      </button>
                    </div>
                    <div style={{ fontFamily: FONT_CJK, fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', fontWeight: 500, color: '#0B1E12', lineHeight: 1.45 }}>
                      {card.answer}
                    </div>
                    {card.variants && card.variants.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 4 }}>
                        {card.variants.map((v, i) => (
                          <span key={i} style={{ fontFamily: FONT_CJK, fontSize: '0.8125rem', color: '#2E7D52', background: 'rgba(31,92,58,0.08)', padding: '2px 8px', borderRadius: 4 }}>{v}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.6875rem', color: '#4A5A50', marginTop: 4, opacity: 0.6 }}>
                      {card.prompt}
                    </div>
                  </div>
                </div>
              </div>

              {/* Prev / Next */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', justifyContent: 'center' }}>
                <button onClick={goPrev} disabled={index === 0} style={{ padding: '9px 22px', border: '1px solid #E2DDD8', borderRadius: 8, background: 'white', color: index === 0 ? '#8CA090' : '#0B1E12', fontFamily: 'var(--font-manrope), sans-serif', fontWeight: 500, fontSize: '0.875rem', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.4 : 1 }}>
                  ← Prev
                </button>
                <div style={{ flex: 1, maxWidth: 300, display: 'flex', gap: 3, alignItems: 'center', overflow: 'hidden' }}>
                  {deck.slice(0, 60).map((_, i) => (
                    <div key={i} onClick={() => navigate(i)} style={{ flex: 1, height: 4, borderRadius: 2, minWidth: 3, cursor: 'pointer', background: i < index ? '#A8CCB8' : i === index ? '#1F5C3A' : '#E2DDD8', transition: 'background 0.15s' }} />
                  ))}
                  {deck.length > 60 && <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5rem', color: '#8CA090', flexShrink: 0, marginLeft: 4 }}>+{deck.length - 60}</span>}
                </div>
                {reviewItems && index === deck.length - 1 ? <Link className="btn-primary" href={reviewHref('/drill', language, reviewSessionId)}>Practice these questions →</Link> : <button onClick={goNext} disabled={index === deck.length - 1} className="btn-primary">Next →</button>}
              </div>

              <div style={{ marginTop: 20, fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5625rem', letterSpacing: '0.06em', color: '#8CA090', textAlign: 'center', opacity: 0.7 }}>
                space / ↑↓ flip · ← → navigate
              </div>

              {/* ── Study Helper (English only) ─────────────────── */}
              {language === 'en' && (
                <div style={{ width: '100%', marginTop: 32, borderTop: '1px solid #E2DDD8', paddingTop: 24 }}>
                  <div style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5625rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8CA090', marginBottom: 12 }}>
                    Study helper
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {([
                      { action: 'explain_card'           as StudyAction, label: 'Explain this card' },
                      { action: 'show_similar_examples'  as StudyAction, label: 'Show similar examples' },
                      { action: 'what_contrast_is_this'  as StudyAction, label: 'Explain the difference' },
                    ] as { action: StudyAction; label: string }[]).map(({ action, label }) => (
                      <button
                        key={action}
                        disabled={assistLoading || assistCooldown > 0}
                        onClick={() => void requestAssist(action)}
                        style={{
                          padding: '7px 16px', borderRadius: 8,
                          border: '1px solid #E2DDD8', background: 'white',
                          fontFamily: 'var(--font-manrope), sans-serif', fontSize: '0.8125rem',
                          fontWeight: 500, color: '#0B1E12', cursor: assistLoading ? 'wait' : 'pointer',
                          opacity: assistLoading ? 0.5 : 1,
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Freeform question input */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input
                      type="text"
                      value={freeformInput}
                      onChange={e => setFreeformInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && freeformInput.trim()) { e.preventDefault(); void requestAssist('freeform_help', freeformInput.trim()) }
                      }}
                      aria-label="Question for your study coach"
                      placeholder="Ask a question about this card…"
                      style={{
                        flex: 1, padding: '7px 12px', borderRadius: 8,
                        border: '1px solid #E2DDD8', background: 'white',
                        fontFamily: 'var(--font-manrope), sans-serif', fontSize: '0.8125rem',
                        color: '#0B1E12', outline: 'none',
                      }}
                    />
                    <button
                      disabled={assistLoading || assistCooldown > 0 || !freeformInput.trim()}
                      onClick={() => { if (freeformInput.trim()) void requestAssist('freeform_help', freeformInput.trim()) }}
                      style={{
                        padding: '7px 16px', borderRadius: 8,
                        border: 'none', background: '#0B1E12',
                        fontFamily: 'var(--font-manrope), sans-serif', fontSize: '0.8125rem',
                        fontWeight: 600, color: 'white',
                        cursor: assistLoading || !freeformInput.trim() ? 'not-allowed' : 'pointer',
                        opacity: assistLoading || !freeformInput.trim() ? 0.4 : 1,
                      }}
                    >
                      Ask
                    </button>
                  </div>

                  {assistLoading && <AiLoading active />}
                  <AiFailure error={assistError} retryIn={assistCooldown} onRetry={() => { if (lastAssistAction) void requestAssist(lastAssistAction, lastFreeformQ ?? undefined) }} />
                  <AiUsage feature="study" />

                  {assistResult && (
                    <div style={{ marginTop: 16, background: 'white', border: '1px solid #E2DDD8', borderRadius: 10, padding: '16px 20px' }}>
                      <div style={{ fontFamily: 'var(--font-manrope), sans-serif', fontSize: '0.875rem', color: '#0B1E12', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {assistResult.assistantMessage}
                      </div>

                      {assistResult.similarExamples && assistResult.similarExamples.length > 0 && (
                        <div style={{ marginTop: 14 }}>
                          <div style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5625rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8CA090', marginBottom: 8 }}>
                            Examples
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {assistResult.similarExamples.map((ex, i) => (
                              <li key={i} style={{ fontFamily: 'var(--font-fraunces), serif', fontStyle: 'italic', fontSize: '0.875rem', color: '#1F5C3A', marginBottom: 4, lineHeight: 1.5 }}>
                                {ex.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {assistResult.retrievedSources.length > 0 && (
                        <div style={{ marginTop: 14, fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5625rem', color: '#8CA090', letterSpacing: '0.04em' }}>
                          Study reference: {assistResult.retrievedSources.map(s => s.title).join(', ')}
                        </div>
                      )}

                      {/* ── Feedback row (grounded + authenticated only) ── */}
                      {assistResult.retrievalHit
                        && assistResult.retrievedSources.length > 0
                        && assistResult.responseId
                        && getClientAuthenticatedUser() !== null
                        && (() => {
                          const fbStatus = studyFeedbackState.status
                          const source = assistResult.retrievedSources[0]
                          const sendFb = (helpful: boolean) => {
                            if (fbStatus !== 'idle') return
                            setStudyFeedbackState({ status: 'pending' })
                            submitStudyFeedback({
                              responseId:       assistResult.responseId!,
                              surface:          'study',
                              mode:             lastAssistAction ?? 'explain_card',
                              helpful,
                              language:         language === 'en' ? 'English' : language,
                              itemId:           card.id,
                              source:           { id: source.id, title: source.title },
                              userPrompt:       lastFreeformQ,
                              assistantMessage: assistResult.assistantMessage,
                              model:            assistResult.model,
                            })
                              .then(() => setStudyFeedbackState({ status: 'saved' }))
                              .catch((e: unknown) => {
                                const err = e instanceof Error ? e.message : 'Unknown error'
                                setStudyFeedbackState({ status: 'error', err })
                              })
                          }
                          return (
                            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #F0EDE8', display: 'flex', alignItems: 'center', gap: 8 }}>
                              {fbStatus === 'saved' ? (
                                <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5625rem', color: '#8CA090', letterSpacing: '0.06em' }}>Saved</span>
                              ) : fbStatus === 'error' ? (
                                <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5625rem', color: '#C0392B', letterSpacing: '0.06em' }} title={studyFeedbackState.err}>
                                  Error saving{studyFeedbackState.err ? ` — ${studyFeedbackState.err}` : ''}
                                </span>
                              ) : (
                                <>
                                  <span style={{ fontFamily: 'var(--font-jetbrains), monospace', fontSize: '0.5rem', color: '#8CA090', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Helpful?</span>
                                  <button
                                    disabled={fbStatus === 'pending'}
                                    onClick={() => sendFb(true)}
                                    style={{ background: 'none', border: 'none', cursor: fbStatus === 'pending' ? 'wait' : 'pointer', fontSize: '0.875rem', opacity: fbStatus === 'pending' ? 0.4 : 1, padding: '0 2px' }}
                                    title="Yes, helpful"
                                  >
                                    👍
                                  </button>
                                  <button
                                    disabled={fbStatus === 'pending'}
                                    onClick={() => sendFb(false)}
                                    style={{ background: 'none', border: 'none', cursor: fbStatus === 'pending' ? 'wait' : 'pointer', fontSize: '0.875rem', opacity: fbStatus === 'pending' ? 0.4 : 1, padding: '0 2px' }}
                                    title="Not helpful"
                                  >
                                    👎
                                  </button>
                                </>
                              )}
                            </div>
                          )
                        })()
                      }
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
