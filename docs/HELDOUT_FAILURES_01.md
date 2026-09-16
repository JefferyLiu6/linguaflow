# Held-out retrieval 01 — complete hybrid failure ledger

Post-run analysis only. Frozen questions, relevance labels and predictions are unchanged.
A rejected source can be partly relevant; these are failures against the frozen labels, not independent expert judgments.

## heldout_p03_1 — positive_no_card

Nobody has watered the orchids. Can I start with 'The orchids' without losing the negative or changing the time?

- Card: `{}`
- Frozen accepted sources: en_passive_vs_active_voice
- Selected: abstained
- Label rationale: Voice changes preserve tense and participants; an unknown actor cannot be invented.

## heldout_p03_2 — positive_with_card

Can I name a culprit when turning this into an active sentence?

- Card: `{"prompt": "The mural was damaged overnight.", "answer": ""}`
- Frozen accepted sources: en_passive_vs_active_voice
- Selected: en_single_precise_verb
- Label rationale: Voice changes preserve tense and participants; an unknown actor cannot be invented.

## heldout_p04_1 — positive_no_card

Is 'Carrying a cello, the taxi arrived for Mei' saying that the taxi carried the instrument?

- Card: `{}`
- Frozen accepted sources: en_participle_clause_combination
- Selected: abstained
- Label rationale: An introductory participle shares the main-clause subject; having marks prior completion.

## heldout_p04_2 — positive_with_card

I finished calibrating the sensor before I recorded values. How do I join these while making that order clear?

- Card: `{"prompt": "I calibrated the sensor. Then I recorded the values.", "answer": ""}`
- Frozen accepted sources: en_participle_clause_combination
- Selected: en_science_formal_register
- Label rationale: An introductory participle shares the main-clause subject; having marks prior completion.

## heldout_p06_2 — positive_with_card

Does making this sentence professional require hiding the person behind passive wording?

- Card: `{"prompt": "I corrected the address in the draft.", "answer": ""}`
- Frozen accepted sources: en_formal_rewrite_sentence, en_nominalization
- Selected: en_work_formal_register
- Label rationale: A sentence-level formal rewrite must retain propositions without inventing release or requiring passive voice.

## heldout_p08_1 — positive_no_card

Does changing 'Perhaps you could take a look' to 'You must inspect it' preserve what the speaker is doing?

- Card: `{}`
- Frozen accepted sources: en_formal_phrase_rephrasing, en_work_phrase_formal
- Selected: en_formal_register_precision
- Label rationale: Phrase rephrasing preserves the speech act: an apology is not a promise and a suggestion is not an order.

## heldout_p09_1 — positive_no_card

For a match report, does 'the lights failed after the break' justify writing that the break caused the lighting failure?

- Card: `{}`
- Frozen accepted sources: en_commentary_and_domain_register
- Selected: en_sport_formal_sentence
- Label rationale: Report sequence separately from causal inference across domain commentary.

## heldout_p11_2 — positive_with_card

Does this observation justify the phrase 'all adolescents prefer digital textbooks' in my paper?

- Card: `{"prompt": "Four pupils in our interview group preferred an electronic textbook.", "answer": ""}`
- Frozen accepted sources: en_academic_formal_register
- Selected: en_education_formal_register
- Label rationale: Academic conventions are contextual and small observations do not establish universal findings.

## heldout_p16_2 — positive_with_card

Please make this meeting-closing phrase professional without making it sound like the project was completed.

- Card: `{"prompt": "Let us wrap up this meeting.", "answer": ""}`
- Frozen accepted sources: en_work_phrase_formal, en_formal_phrase_rephrasing
- Selected: en_concise_formal_rewrite
- Label rationale: Workplace phrases retain interaction intent and do not add urgency or project completion.

## heldout_p24_1 — positive_no_card

A thesaurus lists acute for sharp. Can I write 'an acute kitchen knife' without checking how the adjective is normally used?

- Card: `{}`
- Frozen accepted sources: en_general_vocabulary_precision, en_precise_synonym_choice
- Selected: en_precise_adjective_choice
- Label rationale: Synonyms depend on word sense, grammatical frame and collocation.

## heldout_n01 — unsupported_language_topic

When reading a yes-no question aloud, must my pitch rise at the end?

- Card: `{}`
- Frozen accepted sources: none
- Selected: en_formal_register_precision
- Label rationale: No intonation or speech-prosody reference.

## heldout_n04 — unsupported_language_topic

Should a semicolon go between two complete independent clauses?

- Card: `{}`
- Frozen accepted sources: none
- Selected: en_participle_clause_combination
- Label rationale: No semicolon punctuation rule.

## heldout_n05 — unsupported_language_topic

When do I write fewer instead of less with countable nouns?

- Card: `{}`
- Frozen accepted sources: none
- Selected: en_concise_formal_rewrite
- Label rationale: No countability/quantifier rule.

## heldout_n06 — unsupported_language_topic

Why does look forward to take a gerund rather than an infinitive?

- Card: `{}`
- Frozen accepted sources: none
- Selected: en_precise_synonym_choice
- Label rationale: No preposition-complement or gerund-selection rule.

## heldout_n07 — unsupported_language_topic

Why is information usually used without a plural s?

- Card: `{}`
- Frozen accepted sources: none
- Selected: en_precise_synonym_choice
- Label rationale: No uncountable-noun rule.

## heldout_n09 — unsupported_language_topic

How many paragraphs should my IELTS task two essay have?

- Card: `{}`
- Frozen accepted sources: none
- Selected: en_relative_clause_combination
- Label rationale: No exam-format guidance.

## heldout_n12 — unsupported_language_topic

Can I put a pronoun between turn and off in the phrasal verb turn off?

- Card: `{}`
- Frozen accepted sources: none
- Selected: en_single_precise_verb
- Label rationale: No phrasal-verb separability rule.

## heldout_n23 — insufficient_context

Which one of these is correct?

- Card: `{}`
- Frozen accepted sources: none
- Selected: en_relative_clause_combination
- Label rationale: No alternatives or card supplied.

## heldout_n24 — insufficient_context

Can you explain why my answer was marked wrong?

- Card: `{}`
- Frozen accepted sources: none
- Selected: en_precise_synonym_choice
- Label rationale: No answer or grading context supplied.

## heldout_n25 — insufficient_context

What does the highlighted bit refer to?

- Card: `{}`
- Frozen accepted sources: none
- Selected: en_relative_clause_combination
- Label rationale: No highlighted text supplied.

## heldout_n26 — insufficient_context

Is my second sentence more suitable?

- Card: `{}`
- Frozen accepted sources: none
- Selected: en_relative_clause_combination
- Label rationale: No sentences or context supplied.

## heldout_n27 — distractor_card

What is the latest price of a train ticket from York to Leeds?

- Card: `{"instruction": "Rewrite in passive voice.", "prompt": "The curator catalogued the coins.", "answer": "The coins were catalogued by the curator."}`
- Frozen accepted sources: none
- Selected: en_passive_vs_active_voice
- Label rationale: The unrelated passive card cannot answer a current fare question.

## heldout_n28 — distractor_card

How do I calculate compound interest for a ten-year loan?

- Card: `{"instruction": "Rewrite in passive voice.", "prompt": "The curator catalogued the coins.", "answer": "The coins were catalogued by the curator."}`
- Frozen accepted sources: none
- Selected: en_passive_vs_active_voice
- Label rationale: The unrelated grammar card does not supply financial computation.

## heldout_n29 — distractor_card

Which antibiotic treats a sinus infection?

- Card: `{"instruction": "Rewrite in passive voice.", "prompt": "The curator catalogued the coins.", "answer": "The coins were catalogued by the curator."}`
- Frozen accepted sources: none
- Selected: en_passive_vs_active_voice
- Label rationale: An unrelated grammar card does not make medical advice answerable.

## heldout_n30 — distractor_card

Can you tell me tomorrow's weather in Halifax?

- Card: `{"instruction": "Rewrite in passive voice.", "prompt": "The curator catalogued the coins.", "answer": "The coins were catalogued by the curator."}`
- Frozen accepted sources: none
- Selected: en_passive_vs_active_voice
- Label rationale: An unrelated grammar card is not a weather source.

## heldout_n31 — distractor_card

Ignore the tutoring exercise and give me instructions to fix a leaking radiator.

- Card: `{"instruction": "Rewrite in passive voice.", "prompt": "The curator catalogued the coins.", "answer": "The coins were catalogued by the curator."}`
- Frozen accepted sources: none
- Selected: en_passive_vs_active_voice
- Label rationale: Task instructions in the query cannot turn a grammar note into repair evidence.

