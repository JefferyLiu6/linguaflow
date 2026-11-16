'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LANGUAGES, TOPICS, getDB, type Language, type DrillItem, type DrillTopic } from '@/lib/drills'
import { ignoreClientAuthExpiredError, loadCustomList, loadLanguage, readLanguageSync } from '@/lib/stats'

export default function LibraryClient() {
  const [language, setLanguage] = useState<Language>(readLanguageSync)
  const [customItems, setCustomItems] = useState<DrillItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [source, setSource] = useState('library')
  const [topic, setTopic] = useState('')
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(30)
  useEffect(() => {
    let active = true
    Promise.all([loadLanguage(), loadCustomList()]).then(([lang, items]) => {
      if (active) { setLanguage(lang); setCustomItems(items); setLoaded(true) }
    }).catch(e => { ignoreClientAuthExpiredError(e); if (active) { setError('Your saved exercises could not be loaded. Refresh to try again.'); setLoaded(true) } })
    return () => { active = false }
  }, [])
  const items = source === 'custom' ? customItems : getDB(language)
  const topics = Object.entries(TOPICS).filter(([key]) => items.some(item => item.topic === key))
  const search = query.trim().toLocaleLowerCase()
  const filtered = items.filter(item => (!topic || item.topic === topic) && (!search || `${item.prompt} ${item.answer} ${item.instruction}`.toLocaleLowerCase().includes(search)))
  const practiceHref = source === 'custom' ? `/drill?language=${language}&source=custom` : `/drill?language=${language}&type=mixed${topic ? `&topic=${topic}` : ''}`
  return <div className="learning-page">
    <header className="learning-header"><div><span className="product-eyebrow">Words for the world around you</span><h1>Your <em>library.</em></h1><p>Find the words, phrases, and sentence patterns you want to practice.</p></div><Link className="btn-secondary" href="/drill?source=custom">Add exercises</Link></header>
    <div className="product-toolbar">
      <label className="learning-select">Language<select aria-label="Language" value={language} onChange={e => { setLanguage(e.target.value as Language); setTopic(''); setVisible(30) }}>{Object.entries(LANGUAGES).map(([code, info]) => <option key={code} value={code}>{info.name}</option>)}</select></label>
      <label className="learning-select">Material<select aria-label="Material" value={source} onChange={e => { setSource(e.target.value); setTopic(''); setVisible(30) }}><option value="library">Library exercises</option><option value="custom">My exercises</option></select></label>
      <label className="learning-select">Topic<select aria-label="Topic" value={topic} onChange={e => { setTopic(e.target.value); setVisible(30) }}><option value="">All topics</option>{topics.map(([key, info]) => <option key={key} value={key}>{info.label}</option>)}</select></label>
      <label className="learning-select product-search">Search exercises<input type="search" value={query} placeholder="Search a word or phrase" onChange={e => { setQuery(e.target.value); setVisible(30) }} /></label>
    </div>
    {error && <p role="alert">{error}</p>}
    <div className="product-list-heading"><span aria-live="polite">{filtered.length} exercises{source === 'custom' ? ' in your saved list' : ` in ${LANGUAGES[language].name}`}</span>{filtered.length > 0 && <Link className="learning-link" href={practiceHref}>{topic ? 'Practice this topic' : source === 'custom' ? 'Practice my exercises' : 'Practice this language'} →</Link>}</div>
    {!loaded ? <p role="status">Loading exercises…</p> : !filtered.length ? <div className="product-empty"><h2>{items.length ? 'No matching exercises' : 'Your exercise list is empty'}</h2><p>{items.length ? 'Try another search or choose a different topic.' : 'Import a practice list or create exercises from a topic in practice setup.'}</p>{!items.length && <Link className="learning-link" href="/drill?source=custom">Add exercises →</Link>}</div> : <div className="product-exercise-list">{filtered.slice(0, visible).map(item => <details key={item.id}><summary><span><small>{item.topic ? TOPICS[item.topic as DrillTopic].label : 'General'} · {item.instruction}</small><strong>{item.prompt}</strong></span><span className="product-reveal-label">Answer</span></summary><div className="product-answer"><span>Answer</span><p>{item.answer}</p>{!!item.variants?.length && <small>Also accepted: {item.variants.join(' · ')}</small>}</div></details>)}</div>}
    {filtered.length > visible && <button className="btn-secondary product-show-more" onClick={() => setVisible(n => n + 30)}>Show more exercises</button>}
  </div>
}
