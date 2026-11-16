'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Language } from './drills'
import { ignoreClientAuthExpiredError, loadLanguage, readLanguageSync, saveLanguage } from './stats'

// English is the first-visit default; explicit choices follow the learner across pages.
export function useLearningLanguage(initial?: Language) {
  const [language, updateLanguage] = useState<Language>(() => initial ?? readLanguageSync())
  const [error, setError] = useState('')
  const selected = useRef(false)
  useEffect(() => {
    let active = true
    if (initial) {
      void saveLanguage(initial).catch(error => {
        ignoreClientAuthExpiredError(error)
        if (active) setError('Your language preference could not be saved. Please try selecting it again.')
      })
    } else {
      loadLanguage().then(lang => { if (active && !selected.current) updateLanguage(lang) })
        .catch(error => { ignoreClientAuthExpiredError(error); if (active) setError('Your saved language could not be loaded. You can still choose a language.') })
    }
    return () => { active = false }
  }, [initial])
  const setLanguage = useCallback((language: Language) => {
    selected.current = true
    updateLanguage(language)
    setError('')
    void saveLanguage(language).catch(error => {
      ignoreClientAuthExpiredError(error)
      setError('Your language preference could not be saved. Please try selecting it again.')
    })
  }, [])
  return { language, setLanguage, languageError: error }
}
