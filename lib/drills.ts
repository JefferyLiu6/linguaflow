import englishDrillData from '../data/english-drills.json'

export type Language = 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko' | 'en'

export const LANGUAGES: Record<Language, { name: string; native: string; flag: string }> = {
  es: { name: 'Spanish',  native: 'Español',  flag: '🇪🇸' },
  fr: { name: 'French',   native: 'Français', flag: '🇫🇷' },
  de: { name: 'German',   native: 'Deutsch',  flag: '🇩🇪' },
  zh: { name: 'Chinese',  native: '中文',      flag: '🇨🇳' },
  ja: { name: 'Japanese', native: '日本語',    flag: '🇯🇵' },
  ko: { name: 'Korean',   native: '한국어',    flag: '🇰🇷' },
  en: { name: 'English',  native: 'English',  flag: '🇺🇸' },
}

export type DrillType = 'sentence' | 'vocab' | 'phrase' | 'mixed' | 'custom' | 'translation' | 'substitution' | 'transformation'
export type DrillCategory = 'sentence' | 'vocab' | 'phrase'
export type DrillTopic =
  | 'travel' | 'daily' | 'food' | 'sport' | 'tech' | 'work'
  | 'health' | 'money' | 'family' | 'nature' | 'education' | 'culture'
  | 'politics' | 'science' | 'shopping' | 'emergency'

export const TOPICS: Record<DrillTopic, { label: string; icon: string }> = {
  travel:    { label: 'Travel',      icon: '✈️' },
  daily:     { label: 'Daily Life',  icon: '☀️' },
  food:      { label: 'Food',        icon: '🍜' },
  sport:     { label: 'Sport',       icon: '⚽' },
  tech:      { label: 'Technology',  icon: '💻' },
  work:      { label: 'Work',        icon: '💼' },
  health:    { label: 'Health',      icon: '🏥' },
  money:     { label: 'Finance',     icon: '💰' },
  family:    { label: 'Family',      icon: '👨‍👩‍👧' },
  nature:    { label: 'Nature',      icon: '🌿' },
  education: { label: 'Education',   icon: '📚' },
  culture:   { label: 'Culture',     icon: '🎭' },
  politics:  { label: 'Politics',    icon: '🏛️' },
  science:   { label: 'Science',     icon: '🔬' },
  shopping:  { label: 'Shopping',    icon: '🛒' },
  emergency: { label: 'Emergency',   icon: '🚨' },
}

export interface DrillItem {
  id: string
  type: 'translation' | 'substitution' | 'transformation'
  category?: DrillCategory
  topic?: DrillTopic
  instruction: string
  prompt: string
  answer: string
  variants?: string[]
  promptLang: string
}

export interface DrillResult {
  item: DrillItem
  correct: boolean
  timedOut: boolean
  skipped?: boolean
  userAnswer: string
  timeUsed: number
}

export interface SessionRecord {
  id: string
  date: number
  drillType: DrillType
  correct: number
  total: number
  accuracy: number
  avgTime: number
  results: DrillResult[]
  language?: Language
}

// ── Spanish ───────────────────────────────────────────────────────────────────

const DB_ES: DrillItem[] = [
  // TRANSLATION
  { id:'tr1',  type:'translation', topic:'daily',  instruction:'Translate to Spanish.', prompt:'Good morning.',                    answer:'Buenos días.',                   promptLang:'en-US' },
  { id:'tr2',  type:'translation', topic:'travel', instruction:'Translate to Spanish.', prompt:'Where is the hotel?',              answer:'¿Dónde está el hotel?',           variants:['Dónde está el hotel'], promptLang:'en-US' },
  { id:'tr3',  type:'translation', topic:'daily',  instruction:'Translate to Spanish.', prompt:'I do not understand.',             answer:'No entiendo.',                   promptLang:'en-US' },
  { id:'tr4',  type:'translation', topic:'daily',  instruction:'Translate to Spanish.', prompt:'Please speak more slowly.',        answer:'Hable más despacio, por favor.', variants:['Hable más despacio por favor'], promptLang:'en-US' },
  { id:'tr5',  type:'translation', topic:'travel', instruction:'Translate to Spanish.', prompt:'We need a taxi.',                  answer:'Necesitamos un taxi.',           promptLang:'en-US' },
  { id:'tr6',  type:'translation', topic:'travel', instruction:'Translate to Spanish.', prompt:'What time does the train leave?',  answer:'¿A qué hora sale el tren?',      variants:['A qué hora sale el tren'], promptLang:'en-US' },
  { id:'tr7',  type:'translation', topic:'travel', instruction:'Translate to Spanish.', prompt:'I am looking for the embassy.',    answer:'Estoy buscando la embajada.',    promptLang:'en-US' },
  { id:'tr8',  type:'translation', topic:'travel', instruction:'Translate to Spanish.', prompt:'How much does this cost?',         answer:'¿Cuánto cuesta esto?',           variants:['Cuánto cuesta esto'], promptLang:'en-US' },
  { id:'tr9',  type:'translation', topic:'travel', instruction:'Translate to Spanish.', prompt:'My passport is at the hotel.',     answer:'Mi pasaporte está en el hotel.', promptLang:'en-US' },
  { id:'tr10', type:'translation', topic:'daily',  instruction:'Translate to Spanish.', prompt:'Do you speak English?',            answer:'¿Habla usted inglés?',           variants:['Habla usted inglés'], promptLang:'en-US' },
  // SUBSTITUTION
  { id:'sub1', type:'substitution', topic:'daily',  instruction:'Substitute the cued element. Adjust agreement.', prompt:'Yo hablo inglés. → [nosotros]',          answer:'Nosotros hablamos inglés.',  promptLang:'es-ES' },
  { id:'sub2', type:'substitution', topic:'daily',  instruction:'Substitute the cued element. Adjust agreement.', prompt:'Ella vive en Madrid. → [ellos]',          answer:'Ellos viven en Madrid.',     promptLang:'es-ES' },
  { id:'sub3', type:'substitution', topic:'work',   instruction:'Substitute the cued element. Adjust agreement.', prompt:'Usted trabaja aquí. → [tú]',              answer:'Tú trabajas aquí.',          promptLang:'es-ES' },
  { id:'sub4', type:'substitution', topic:'travel', instruction:'Substitute the cued element.',                   prompt:'El tren llega a las tres. → [el avión]',  answer:'El avión llega a las tres.', promptLang:'es-ES' },
  { id:'sub5', type:'substitution', topic:'travel', instruction:'Substitute the cued element. Adjust agreement.', prompt:'Yo tengo el pasaporte. → [ella]',          answer:'Ella tiene el pasaporte.',   promptLang:'es-ES' },
  { id:'sub6', type:'substitution', topic:'food',   instruction:'Substitute the cued element. Adjust agreement.', prompt:'Nosotros comemos en el hotel. → [yo]',     answer:'Yo como en el hotel.',       promptLang:'es-ES' },
  { id:'sub7', type:'substitution', topic:'work',   instruction:'Substitute the cued element. Adjust agreement.', prompt:'Él escribe el informe. → [ellas]',          answer:'Ellas escriben el informe.', promptLang:'es-ES' },
  // TRANSFORMATION
  { id:'tf1', type:'transformation', topic:'work',   instruction:'Make the sentence negative.',     prompt:'Él trabaja aquí.',               answer:'Él no trabaja aquí.',           promptLang:'es-ES' },
  { id:'tf2', type:'transformation', topic:'daily',  instruction:'Make the sentence negative.',     prompt:'Ellos viven en Lima.',           answer:'Ellos no viven en Lima.',       promptLang:'es-ES' },
  { id:'tf3', type:'transformation', topic:'daily',  instruction:'Remove the negation.',            prompt:'Yo no tengo dinero.',            answer:'Yo tengo dinero.',              promptLang:'es-ES' },
  { id:'tf4', type:'transformation', topic:'daily',  instruction:'Convert to a yes/no question.',  prompt:'Usted habla francés.',           answer:'¿Usted habla francés?',         variants:['¿Habla usted francés?','Habla usted francés','Usted habla francés'], promptLang:'es-ES' },
  { id:'tf5', type:'transformation', topic:'daily',  instruction:'Convert to a statement.',        prompt:'¿Usted comprende la pregunta?',  answer:'Usted comprende la pregunta.',  promptLang:'es-ES' },
  { id:'tf6', type:'transformation', topic:'daily',  instruction:'Make the sentence negative.',    prompt:'Nosotros hablamos español.',     answer:'Nosotros no hablamos español.', promptLang:'es-ES' },
  { id:'tf7', type:'transformation', topic:'travel', instruction:'Make the sentence negative.',    prompt:'María compra los boletos.',      answer:'María no compra los boletos.',  promptLang:'es-ES' },
]

const DB_ES_VOCAB: DrillItem[] = [
  { id:'es_v1',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'water',    answer:'el agua',       variants:['agua'],         promptLang:'en-US' },
  { id:'es_v2',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'house',    answer:'la casa',       variants:['casa'],         promptLang:'en-US' },
  { id:'es_v3',  type:'translation', category:'vocab', topic:'food',   instruction:'Translate the word.', prompt:'food',     answer:'la comida',     variants:['comida'],       promptLang:'en-US' },
  { id:'es_v4',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'money',    answer:'el dinero',     variants:['dinero'],       promptLang:'en-US' },
  { id:'es_v5',  type:'translation', category:'vocab', topic:'work',   instruction:'Translate the word.', prompt:'work',     answer:'el trabajo',    variants:['trabajo'],      promptLang:'en-US' },
  { id:'es_v6',  type:'translation', category:'vocab', topic:'travel', instruction:'Translate the word.', prompt:'city',     answer:'la ciudad',     variants:['ciudad'],       promptLang:'en-US' },
  { id:'es_v7',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'time',     answer:'el tiempo',     variants:['tiempo'],       promptLang:'en-US' },
  { id:'es_v8',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'book',     answer:'el libro',      variants:['libro'],        promptLang:'en-US' },
  { id:'es_v9',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'door',     answer:'la puerta',     variants:['puerta'],       promptLang:'en-US' },
  { id:'es_v10', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'night',    answer:'la noche',      variants:['noche'],        promptLang:'en-US' },
  { id:'es_v11', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'man',      answer:'el hombre',     variants:['hombre'],       promptLang:'en-US' },
  { id:'es_v12', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'woman',    answer:'la mujer',      variants:['mujer'],        promptLang:'en-US' },
  { id:'es_v13', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'day',      answer:'el día',        variants:['día','el dia','dia'], promptLang:'en-US' },
  { id:'es_v14', type:'translation', category:'vocab', topic:'travel', instruction:'Translate the word.', prompt:'country',  answer:'el país',       variants:['país','pais','el pais'], promptLang:'en-US' },
  { id:'es_v15', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'friend',   answer:'el amigo',      variants:['amigo','la amiga','amiga'], promptLang:'en-US' },
]

const DB_ES_PHRASES: DrillItem[] = [
  { id:'es_ph1',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Thank you.',         answer:'Gracias.',            variants:['Gracias'],                                        promptLang:'en-US' },
  { id:'es_ph2',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:"You're welcome.",    answer:'De nada.',            variants:['De nada'],                                        promptLang:'en-US' },
  { id:'es_ph3',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Excuse me.',         answer:'Perdón.',             variants:['Perdón','Perdon','Perdon.','Con permiso.','Con permiso'], promptLang:'en-US' },
  { id:'es_ph4',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:"I'm sorry.",         answer:'Lo siento.',          variants:['Lo siento'],                                      promptLang:'en-US' },
  { id:'es_ph5',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'How are you?',       answer:'¿Cómo está usted?',   variants:['¿Cómo estás?','Cómo está usted','Cómo estás','Como esta usted','Como estas'], promptLang:'en-US' },
  { id:'es_ph6',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Nice to meet you.',  answer:'Mucho gusto.',        variants:['Mucho gusto','Encantado.','Encantado'],            promptLang:'en-US' },
  { id:'es_ph7',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'See you later.',     answer:'Hasta luego.',        variants:['Hasta luego'],                                    promptLang:'en-US' },
  { id:'es_ph8',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Good luck.',         answer:'Buena suerte.',       variants:['Buena suerte'],                                   promptLang:'en-US' },
  { id:'es_ph9',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'No problem.',        answer:'No hay problema.',    variants:['No hay problema'],                                 promptLang:'en-US' },
  { id:'es_ph10', type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Of course.',         answer:'Por supuesto.',       variants:['Por supuesto','Claro.','Claro'],                   promptLang:'en-US' },
]

const DB_ES_SPORT: DrillItem[] = [
  { id:'es_sp1', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'ball',         answer:'el balón',      variants:['balón','la pelota','pelota'],   promptLang:'en-US' },
  { id:'es_sp2', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'team',         answer:'el equipo',     variants:['equipo'],                      promptLang:'en-US' },
  { id:'es_sp3', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'match',        answer:'el partido',    variants:['partido'],                     promptLang:'en-US' },
  { id:'es_sp4', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'player',       answer:'el jugador',    variants:['jugador','la jugadora'],       promptLang:'en-US' },
  { id:'es_sp5', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'score',        answer:'el marcador',   variants:['marcador'],                    promptLang:'en-US' },
  { id:'es_sp6', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'stadium',      answer:'el estadio',    variants:['estadio'],                     promptLang:'en-US' },
  { id:'es_sp7', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:"What's the score?",  answer:'¿Cuál es el marcador?', variants:['Cuál es el marcador'],       promptLang:'en-US' },
  { id:'es_sp8', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:'We won!',            answer:'¡Ganamos!',             variants:['Ganamos!','Ganamos'],         promptLang:'en-US' },
  { id:'es_sp9', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:"Let's play.",         answer:'Vamos a jugar.',        variants:['Vamos a jugar'],              promptLang:'en-US' },
]

const DB_ES_TECH: DrillItem[] = [
  { id:'es_tc1', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'phone',        answer:'el teléfono',             variants:['teléfono','el telefono','telefono'], promptLang:'en-US' },
  { id:'es_tc2', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'computer',     answer:'el ordenador',            variants:['ordenador','la computadora','computadora'], promptLang:'en-US' },
  { id:'es_tc3', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'internet',     answer:'el internet',             variants:['internet'],                          promptLang:'en-US' },
  { id:'es_tc4', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'email',        answer:'el correo electrónico',   variants:['correo electrónico','el correo','correo'], promptLang:'en-US' },
  { id:'es_tc5', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'app',          answer:'la aplicación',           variants:['aplicación','la app','app'],         promptLang:'en-US' },
  { id:'es_tc6', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'password',     answer:'la contraseña',           variants:['contraseña'],                        promptLang:'en-US' },
  { id:'es_tc7', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:"What's the wifi password?", answer:'¿Cuál es la contraseña del wifi?', variants:['Cuál es la contraseña del wifi'], promptLang:'en-US' },
  { id:'es_tc8', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:'My phone is dead.',         answer:'Mi teléfono se quedó sin batería.', variants:['Mi teléfono se quedo sin batería','Mi telefono no tiene batería'], promptLang:'en-US' },
  { id:'es_tc9', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:'Can I use the wifi?',       answer:'¿Puedo usar el wifi?', variants:['Puedo usar el wifi'],             promptLang:'en-US' },
]

const DB_ES_FOOD: DrillItem[] = [
  { id:'es_fd1', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'restaurant',   answer:'el restaurante',  variants:['restaurante'],           promptLang:'en-US' },
  { id:'es_fd2', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'menu',         answer:'el menú',         variants:['menú','menu'],           promptLang:'en-US' },
  { id:'es_fd3', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'bread',        answer:'el pan',          variants:['pan'],                   promptLang:'en-US' },
  { id:'es_fd4', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'coffee',       answer:'el café',         variants:['café','cafe'],           promptLang:'en-US' },
  { id:'es_fd5', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'wine',         answer:'el vino',         variants:['vino'],                  promptLang:'en-US' },
  { id:'es_fd6', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'bill',         answer:'la cuenta',       variants:['cuenta'],                promptLang:'en-US' },
  { id:'es_fd7', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:'The bill, please.',  answer:'La cuenta, por favor.',  variants:['La cuenta por favor'],  promptLang:'en-US' },
  { id:'es_fd8', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:"It's delicious!",    answer:'¡Está delicioso!',       variants:['Está delicioso!','Está delicioso'],  promptLang:'en-US' },
  { id:'es_fd9', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:'A table for two, please.', answer:'Una mesa para dos, por favor.', variants:['Una mesa para dos por favor'], promptLang:'en-US' },
]

const DB_ES_WORK: DrillItem[] = [
  { id:'es_wk1', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'office',       answer:'la oficina',     variants:['oficina'],              promptLang:'en-US' },
  { id:'es_wk2', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'meeting',      answer:'la reunión',     variants:['reunión','reunion'],    promptLang:'en-US' },
  { id:'es_wk3', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'colleague',    answer:'el colega',      variants:['colega','el compañero','compañero'], promptLang:'en-US' },
  { id:'es_wk4', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'report',       answer:'el informe',     variants:['informe'],              promptLang:'en-US' },
  { id:'es_wk5', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'deadline',     answer:'el plazo',       variants:['plazo','la fecha límite','fecha limite'], promptLang:'en-US' },
  { id:'es_wk6', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'manager',      answer:'el gerente',     variants:['gerente','el jefe','jefe'], promptLang:'en-US' },
  { id:'es_wk7', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:'We have a meeting.',        answer:'Tenemos una reunión.',         variants:['Tenemos una reunion'],  promptLang:'en-US' },
  { id:'es_wk8', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:"I'll send you an email.",    answer:'Le enviaré un correo electrónico.', variants:['Te enviaré un correo','Le enviare un correo'], promptLang:'en-US' },
  { id:'es_wk9', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:'The deadline is on Monday.', answer:'El plazo es el lunes.',        variants:['El plazo es lunes'],   promptLang:'en-US' },
]

// Backwards compat
export const DB = DB_ES

// ── French ────────────────────────────────────────────────────────────────────

const DB_FR: DrillItem[] = [
  { id:'fr_tr1',  type:'translation', topic:'daily',  instruction:'Translate to French.', prompt:'Good morning.',                    answer:'Bonjour.',                                                     promptLang:'en-US' },
  { id:'fr_tr2',  type:'translation', topic:'travel', instruction:'Translate to French.', prompt:'Where is the hotel?',              answer:"Où est l'hôtel?",                                              variants:["Où est l'hotel"], promptLang:'en-US' },
  { id:'fr_tr3',  type:'translation', topic:'daily',  instruction:'Translate to French.', prompt:'I do not understand.',             answer:'Je ne comprends pas.',                                         promptLang:'en-US' },
  { id:'fr_tr4',  type:'translation', topic:'daily',  instruction:'Translate to French.', prompt:'Please speak more slowly.',        answer:"Parlez plus lentement, s'il vous plaît.",                     variants:["Parlez plus lentement, s'il vous plait"], promptLang:'en-US' },
  { id:'fr_tr5',  type:'translation', topic:'travel', instruction:'Translate to French.', prompt:'We need a taxi.',                  answer:"Nous avons besoin d'un taxi.",                                 promptLang:'en-US' },
  { id:'fr_tr6',  type:'translation', topic:'travel', instruction:'Translate to French.', prompt:'What time does the train leave?',  answer:'À quelle heure part le train?',                               variants:['A quelle heure part le train?'], promptLang:'en-US' },
  { id:'fr_tr7',  type:'translation', topic:'travel', instruction:'Translate to French.', prompt:'I am looking for the embassy.',    answer:"Je cherche l'ambassade.",                                      promptLang:'en-US' },
  { id:'fr_tr8',  type:'translation', topic:'travel', instruction:'Translate to French.', prompt:'How much does this cost?',         answer:'Combien ça coûte?',                                            variants:['Combien ca coute?','Combien ça coute?','Combien ca coûte?'], promptLang:'en-US' },
  { id:'fr_tr9',  type:'translation', topic:'travel', instruction:'Translate to French.', prompt:'My passport is at the hotel.',     answer:"Mon passeport est à l'hôtel.",                                 promptLang:'en-US' },
  { id:'fr_tr10', type:'translation', topic:'daily',  instruction:'Translate to French.', prompt:'Do you speak English?',            answer:'Parlez-vous anglais?',                                         promptLang:'en-US' },
  { id:'fr_sub1', type:'substitution', topic:'daily',  instruction:'Substitute the cued element. Adjust agreement.', prompt:'Je parle anglais. → [nous]',                         answer:'Nous parlons anglais.',          promptLang:'fr-FR' },
  { id:'fr_sub2', type:'substitution', topic:'daily',  instruction:'Substitute the cued element. Adjust agreement.', prompt:'Elle habite à Paris. → [ils]',                        answer:'Ils habitent à Paris.',          promptLang:'fr-FR' },
  { id:'fr_sub3', type:'substitution', topic:'work',   instruction:'Substitute the cued element. Adjust agreement.', prompt:'Vous travaillez ici. → [tu]',                         answer:'Tu travailles ici.',             promptLang:'fr-FR' },
  { id:'fr_sub4', type:'substitution', topic:'travel', instruction:'Substitute the cued element.',                   prompt:"Le train arrive à trois heures. → [l'avion]",         answer:"L'avion arrive à trois heures.", promptLang:'fr-FR' },
  { id:'fr_sub5', type:'substitution', topic:'daily',  instruction:'Substitute the cued element. Adjust agreement.', prompt:'Je comprends le français. → [elle]',                  answer:'Elle comprend le français.',     promptLang:'fr-FR' },
  { id:'fr_tf1',  type:'transformation', topic:'work',   instruction:'Make the sentence negative.',    prompt:'Il travaille ici.',              answer:'Il ne travaille pas ici.',          promptLang:'fr-FR' },
  { id:'fr_tf2',  type:'transformation', topic:'daily',  instruction:'Make the sentence negative.',    prompt:'Ils habitent à Lyon.',           answer:"Ils n'habitent pas à Lyon.",        promptLang:'fr-FR' },
  { id:'fr_tf3',  type:'transformation', topic:'daily',  instruction:'Remove the negation.',           prompt:"Je n'ai pas d'argent.",          answer:"J'ai de l'argent.",                promptLang:'fr-FR' },
  { id:'fr_tf4',  type:'transformation', topic:'daily',  instruction:'Convert to a yes/no question.',  prompt:'Vous parlez français.',          answer:'Parlez-vous français?',             promptLang:'fr-FR' },
  { id:'fr_tf5',  type:'transformation', topic:'daily',  instruction:'Make the sentence negative.',    prompt:'Nous parlons espagnol.',         answer:'Nous ne parlons pas espagnol.',    promptLang:'fr-FR' },
]

const DB_FR_VOCAB: DrillItem[] = [
  { id:'fr_v1',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'water',    answer:"l'eau",         variants:['eau'],               promptLang:'en-US' },
  { id:'fr_v2',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'house',    answer:'la maison',     variants:['maison'],            promptLang:'en-US' },
  { id:'fr_v3',  type:'translation', category:'vocab', topic:'food',   instruction:'Translate the word.', prompt:'food',     answer:'la nourriture', variants:['nourriture'],        promptLang:'en-US' },
  { id:'fr_v4',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'money',    answer:"l'argent",      variants:['argent'],            promptLang:'en-US' },
  { id:'fr_v5',  type:'translation', category:'vocab', topic:'work',   instruction:'Translate the word.', prompt:'work',     answer:'le travail',    variants:['travail'],           promptLang:'en-US' },
  { id:'fr_v6',  type:'translation', category:'vocab', topic:'travel', instruction:'Translate the word.', prompt:'city',     answer:'la ville',      variants:['ville'],             promptLang:'en-US' },
  { id:'fr_v7',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'time',     answer:'le temps',      variants:['temps'],             promptLang:'en-US' },
  { id:'fr_v8',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'book',     answer:'le livre',      variants:['livre'],             promptLang:'en-US' },
  { id:'fr_v9',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'door',     answer:'la porte',      variants:['porte'],             promptLang:'en-US' },
  { id:'fr_v10', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'day',      answer:'le jour',       variants:['jour'],              promptLang:'en-US' },
  { id:'fr_v11', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'night',    answer:'la nuit',       variants:['nuit'],              promptLang:'en-US' },
  { id:'fr_v12', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'man',      answer:"l'homme",       variants:['homme'],             promptLang:'en-US' },
  { id:'fr_v13', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'woman',    answer:'la femme',      variants:['femme'],             promptLang:'en-US' },
  { id:'fr_v14', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'friend',   answer:"l'ami",         variants:['ami',"l'amie",'amie'], promptLang:'en-US' },
  { id:'fr_v15', type:'translation', category:'vocab', topic:'travel', instruction:'Translate the word.', prompt:'country',  answer:'le pays',       variants:['pays'],              promptLang:'en-US' },
]

const DB_FR_PHRASES: DrillItem[] = [
  { id:'fr_ph1',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Thank you.',         answer:'Merci.',              variants:['Merci'],                         promptLang:'en-US' },
  { id:'fr_ph2',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:"You're welcome.",    answer:'De rien.',            variants:['De rien'],                       promptLang:'en-US' },
  { id:'fr_ph3',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Excuse me.',         answer:'Excusez-moi.',        variants:['Excusez-moi','Pardon.','Pardon'], promptLang:'en-US' },
  { id:'fr_ph4',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:"I'm sorry.",         answer:'Je suis désolé.',     variants:['Je suis désolé','Je suis desolé','Je suis désolée.','Je suis désolée'], promptLang:'en-US' },
  { id:'fr_ph5',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'How are you?',       answer:'Comment allez-vous?', variants:['Comment allez-vous','Comment vas-tu?','Comment vas-tu'], promptLang:'en-US' },
  { id:'fr_ph6',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Nice to meet you.',  answer:'Enchanté.',           variants:['Enchanté','Enchantée.','Enchantée'], promptLang:'en-US' },
  { id:'fr_ph7',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'See you later.',     answer:'À bientôt.',          variants:['À bientôt','A bientôt','A bientot','À bientot'], promptLang:'en-US' },
  { id:'fr_ph8',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Good luck.',         answer:'Bonne chance.',       variants:['Bonne chance'],                  promptLang:'en-US' },
  { id:'fr_ph9',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Of course.',         answer:'Bien sûr.',           variants:['Bien sûr','Bien sur','Bien sur.'], promptLang:'en-US' },
  { id:'fr_ph10', type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'No problem.',        answer:'Pas de problème.',    variants:['Pas de problème','Pas de probleme','Pas de probleme.'], promptLang:'en-US' },
]

const DB_FR_SPORT: DrillItem[] = [
  { id:'fr_sp1', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'ball',       answer:'le ballon',    variants:['ballon'],    promptLang:'en-US' },
  { id:'fr_sp2', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'team',       answer:"l'équipe",     variants:['équipe'],    promptLang:'en-US' },
  { id:'fr_sp3', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'match',      answer:'le match',     variants:['match'],     promptLang:'en-US' },
  { id:'fr_sp4', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'player',     answer:'le joueur',    variants:['joueur'],    promptLang:'en-US' },
  { id:'fr_sp5', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'score',      answer:'le score',     variants:['score'],     promptLang:'en-US' },
  { id:'fr_sp6', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'stadium',    answer:'le stade',     variants:['stade'],     promptLang:'en-US' },
  { id:'fr_sp7', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:"What's the score?", answer:'Quel est le score?',    variants:['Quel est le score'],    promptLang:'en-US' },
  { id:'fr_sp8', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:'We won!',           answer:'Nous avons gagné!',     variants:['Nous avons gagné','On a gagné!','On a gagné'], promptLang:'en-US' },
  { id:'fr_sp9', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:"Let's play.",        answer:'Jouons.',               variants:['Allons jouer.','Allons jouer'], promptLang:'en-US' },
]

const DB_FR_TECH: DrillItem[] = [
  { id:'fr_tc1', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'phone',      answer:'le téléphone',   variants:['téléphone','telephone'],   promptLang:'en-US' },
  { id:'fr_tc2', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'computer',   answer:"l'ordinateur",   variants:['ordinateur'],              promptLang:'en-US' },
  { id:'fr_tc3', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'internet',   answer:"l'internet",     variants:['internet'],                promptLang:'en-US' },
  { id:'fr_tc4', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'email',      answer:"l'e-mail",       variants:['e-mail','email','le mail'], promptLang:'en-US' },
  { id:'fr_tc5', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'app',        answer:"l'application",  variants:['application','appli'],     promptLang:'en-US' },
  { id:'fr_tc6', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'password',   answer:'le mot de passe', variants:['mot de passe'],           promptLang:'en-US' },
  { id:'fr_tc7', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:"What's the wifi password?", answer:'Quel est le mot de passe wifi?', variants:['Quel est le mot de passe wifi'], promptLang:'en-US' },
  { id:'fr_tc8', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:'My phone is dead.',         answer:'Mon téléphone est mort.',       variants:['Mon telephone est mort'],       promptLang:'en-US' },
  { id:'fr_tc9', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:'Can I use the wifi?',       answer:'Puis-je utiliser le wifi?',     variants:['Je peux utiliser le wifi?'],   promptLang:'en-US' },
]

const DB_FR_FOOD: DrillItem[] = [
  { id:'fr_fd1', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'restaurant',  answer:'le restaurant',  variants:['restaurant'],   promptLang:'en-US' },
  { id:'fr_fd2', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'menu',        answer:'la carte',       variants:['carte','menu'], promptLang:'en-US' },
  { id:'fr_fd3', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'bread',       answer:'le pain',        variants:['pain'],         promptLang:'en-US' },
  { id:'fr_fd4', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'coffee',      answer:'le café',        variants:['café','cafe'],  promptLang:'en-US' },
  { id:'fr_fd5', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'wine',        answer:'le vin',         variants:['vin'],          promptLang:'en-US' },
  { id:'fr_fd6', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'bill',        answer:"l'addition",     variants:['addition'],     promptLang:'en-US' },
  { id:'fr_fd7', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:'The bill, please.',       answer:"L'addition, s'il vous plaît.", variants:["L'addition s'il vous plait","L'addition, s'il vous plait"], promptLang:'en-US' },
  { id:'fr_fd8', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:"It's delicious!",         answer:"C'est délicieux!",            variants:["C'est delicieux!","C'est délicieux"],                        promptLang:'en-US' },
  { id:'fr_fd9', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:'A table for two, please.', answer:'Une table pour deux, s\'il vous plaît.', variants:["Une table pour deux s'il vous plait"], promptLang:'en-US' },
]

const DB_FR_WORK: DrillItem[] = [
  { id:'fr_wk1', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'office',      answer:'le bureau',       variants:['bureau'],              promptLang:'en-US' },
  { id:'fr_wk2', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'meeting',     answer:'la réunion',      variants:['réunion','reunion'],   promptLang:'en-US' },
  { id:'fr_wk3', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'colleague',   answer:'le collègue',     variants:['collègue','collegue'], promptLang:'en-US' },
  { id:'fr_wk4', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'report',      answer:'le rapport',      variants:['rapport'],             promptLang:'en-US' },
  { id:'fr_wk5', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'deadline',    answer:'la date limite',  variants:['date limite'],         promptLang:'en-US' },
  { id:'fr_wk6', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'manager',     answer:'le directeur',    variants:['directeur','le manager','manager'], promptLang:'en-US' },
  { id:'fr_wk7', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:'We have a meeting.',        answer:'Nous avons une réunion.',       variants:['Nous avons une reunion'],     promptLang:'en-US' },
  { id:'fr_wk8', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:"I'll send you an email.",    answer:'Je vous enverrai un e-mail.',   variants:['Je vous enverrai un email','Je t\'enverrai un email'], promptLang:'en-US' },
  { id:'fr_wk9', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:'The deadline is on Monday.',  answer:'La date limite est lundi.',     variants:['La date limite est le lundi'], promptLang:'en-US' },
]

// ── German ────────────────────────────────────────────────────────────────────

const DB_DE: DrillItem[] = [
  { id:'de_tr1',  type:'translation', topic:'daily',  instruction:'Translate to German.', prompt:'Good morning.',                    answer:'Guten Morgen.',                   promptLang:'en-US' },
  { id:'de_tr2',  type:'translation', topic:'travel', instruction:'Translate to German.', prompt:'Where is the hotel?',              answer:'Wo ist das Hotel?',               promptLang:'en-US' },
  { id:'de_tr3',  type:'translation', topic:'daily',  instruction:'Translate to German.', prompt:'I do not understand.',             answer:'Ich verstehe nicht.',             promptLang:'en-US' },
  { id:'de_tr4',  type:'translation', topic:'daily',  instruction:'Translate to German.', prompt:'Please speak more slowly.',        answer:'Bitte sprechen Sie langsamer.',   promptLang:'en-US' },
  { id:'de_tr5',  type:'translation', topic:'travel', instruction:'Translate to German.', prompt:'We need a taxi.',                  answer:'Wir brauchen ein Taxi.',          promptLang:'en-US' },
  { id:'de_tr6',  type:'translation', topic:'travel', instruction:'Translate to German.', prompt:'What time does the train leave?',  answer:'Wann fährt der Zug ab?',          variants:['Wann fahrt der Zug ab?'], promptLang:'en-US' },
  { id:'de_tr7',  type:'translation', topic:'travel', instruction:'Translate to German.', prompt:'I am looking for the embassy.',    answer:'Ich suche die Botschaft.',        promptLang:'en-US' },
  { id:'de_tr8',  type:'translation', topic:'travel', instruction:'Translate to German.', prompt:'How much does this cost?',         answer:'Was kostet das?',                 promptLang:'en-US' },
  { id:'de_tr9',  type:'translation', topic:'travel', instruction:'Translate to German.', prompt:'My passport is at the hotel.',     answer:'Mein Pass ist im Hotel.',         promptLang:'en-US' },
  { id:'de_tr10', type:'translation', topic:'daily',  instruction:'Translate to German.', prompt:'Do you speak English?',            answer:'Sprechen Sie Englisch?',          promptLang:'en-US' },
  { id:'de_sub1', type:'substitution', topic:'daily',  instruction:'Substitute the cued element. Adjust agreement.', prompt:'Ich spreche Englisch. → [wir]',               answer:'Wir sprechen Englisch.',          promptLang:'de-DE' },
  { id:'de_sub2', type:'substitution', topic:'daily',  instruction:'Substitute the cued element. Adjust agreement.', prompt:'Sie wohnt in Berlin. → [sie (pl.)]',          answer:'Sie wohnen in Berlin.',          promptLang:'de-DE' },
  { id:'de_sub3', type:'substitution', topic:'work',   instruction:'Substitute the cued element. Adjust agreement.', prompt:'Sie arbeiten hier. → [du]',                   answer:'Du arbeitest hier.',             promptLang:'de-DE' },
  { id:'de_sub4', type:'substitution', topic:'travel', instruction:'Substitute the cued element.',                   prompt:'Der Zug kommt um drei Uhr. → [das Flugzeug]', answer:'Das Flugzeug kommt um drei Uhr.',promptLang:'de-DE' },
  { id:'de_sub5', type:'substitution', topic:'travel', instruction:'Substitute the cued element. Adjust agreement.', prompt:'Ich habe den Pass. → [er]',                   answer:'Er hat den Pass.',               promptLang:'de-DE' },
  { id:'de_tf1',  type:'transformation', topic:'work',  instruction:'Make the sentence negative.',    prompt:'Er arbeitet hier.',              answer:'Er arbeitet nicht hier.',                                     promptLang:'de-DE' },
  { id:'de_tf2',  type:'transformation', topic:'daily', instruction:'Make the sentence negative.',    prompt:'Sie wohnen in München.',         answer:'Sie wohnen nicht in München.',                               promptLang:'de-DE' },
  { id:'de_tf3',  type:'transformation', topic:'daily', instruction:'Remove the negation.',           prompt:'Ich habe kein Geld.',            answer:'Ich habe Geld.',                                             promptLang:'de-DE' },
  { id:'de_tf4',  type:'transformation', topic:'daily', instruction:'Convert to a yes/no question.',  prompt:'Sie sprechen Deutsch.',          answer:'Sprechen Sie Deutsch?',                                      promptLang:'de-DE' },
  { id:'de_tf5',  type:'transformation', topic:'daily', instruction:'Make the sentence negative.',    prompt:'Wir sprechen Spanisch.',         answer:'Wir sprechen kein Spanisch.',variants:['Wir sprechen nicht Spanisch.'], promptLang:'de-DE' },
]

const DB_DE_VOCAB: DrillItem[] = [
  { id:'de_v1',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'water',    answer:'das Wasser',   variants:['Wasser'],       promptLang:'en-US' },
  { id:'de_v2',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'house',    answer:'das Haus',     variants:['Haus'],         promptLang:'en-US' },
  { id:'de_v3',  type:'translation', category:'vocab', topic:'food',   instruction:'Translate the word.', prompt:'food',     answer:'das Essen',    variants:['Essen'],        promptLang:'en-US' },
  { id:'de_v4',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'money',    answer:'das Geld',     variants:['Geld'],         promptLang:'en-US' },
  { id:'de_v5',  type:'translation', category:'vocab', topic:'work',   instruction:'Translate the word.', prompt:'work',     answer:'die Arbeit',   variants:['Arbeit'],       promptLang:'en-US' },
  { id:'de_v6',  type:'translation', category:'vocab', topic:'travel', instruction:'Translate the word.', prompt:'city',     answer:'die Stadt',    variants:['Stadt'],        promptLang:'en-US' },
  { id:'de_v7',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'time',     answer:'die Zeit',     variants:['Zeit'],         promptLang:'en-US' },
  { id:'de_v8',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'book',     answer:'das Buch',     variants:['Buch'],         promptLang:'en-US' },
  { id:'de_v9',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'door',     answer:'die Tür',      variants:['Tür','Tur'],    promptLang:'en-US' },
  { id:'de_v10', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'day',      answer:'der Tag',      variants:['Tag'],          promptLang:'en-US' },
  { id:'de_v11', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'night',    answer:'die Nacht',    variants:['Nacht'],        promptLang:'en-US' },
  { id:'de_v12', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'man',      answer:'der Mann',     variants:['Mann'],         promptLang:'en-US' },
  { id:'de_v13', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'woman',    answer:'die Frau',     variants:['Frau'],         promptLang:'en-US' },
  { id:'de_v14', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'friend',   answer:'der Freund',   variants:['Freund','die Freundin','Freundin'], promptLang:'en-US' },
  { id:'de_v15', type:'translation', category:'vocab', topic:'travel', instruction:'Translate the word.', prompt:'country',  answer:'das Land',     variants:['Land'],         promptLang:'en-US' },
]

const DB_DE_PHRASES: DrillItem[] = [
  { id:'de_ph1',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Thank you.',         answer:'Danke.',              variants:['Danke','Danke schön.','Danke schön'],   promptLang:'en-US' },
  { id:'de_ph2',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:"You're welcome.",    answer:'Bitte.',              variants:['Bitte'],                                promptLang:'en-US' },
  { id:'de_ph3',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Excuse me.',         answer:'Entschuldigung.',     variants:['Entschuldigung'],                       promptLang:'en-US' },
  { id:'de_ph4',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:"I'm sorry.",         answer:'Es tut mir leid.',    variants:['Es tut mir leid'],                      promptLang:'en-US' },
  { id:'de_ph5',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'How are you?',       answer:'Wie geht es Ihnen?',  variants:['Wie geht es Ihnen','Wie geht es dir?','Wie geht es dir'], promptLang:'en-US' },
  { id:'de_ph6',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Nice to meet you.',  answer:'Freut mich.',         variants:['Freut mich'],                           promptLang:'en-US' },
  { id:'de_ph7',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'See you later.',     answer:'Auf Wiedersehen.',    variants:['Auf Wiedersehen','Tschüss.','Tschüss'],  promptLang:'en-US' },
  { id:'de_ph8',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Good luck.',         answer:'Viel Glück.',         variants:['Viel Glück','Viel Glueck','Viel Glueck.'], promptLang:'en-US' },
  { id:'de_ph9',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Of course.',         answer:'Natürlich.',          variants:['Natürlich','Naturlich','Selbstverständlich.','Selbstverständlich'], promptLang:'en-US' },
  { id:'de_ph10', type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'No problem.',        answer:'Kein Problem.',       variants:['Kein Problem'],                         promptLang:'en-US' },
]

const DB_DE_SPORT: DrillItem[] = [
  { id:'de_sp1', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'ball',       answer:'der Ball',        variants:['Ball'],       promptLang:'en-US' },
  { id:'de_sp2', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'team',       answer:'die Mannschaft',  variants:['Mannschaft'], promptLang:'en-US' },
  { id:'de_sp3', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'match',      answer:'das Spiel',       variants:['Spiel'],      promptLang:'en-US' },
  { id:'de_sp4', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'player',     answer:'der Spieler',     variants:['Spieler'],    promptLang:'en-US' },
  { id:'de_sp5', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'score',      answer:'der Stand',       variants:['Stand'],      promptLang:'en-US' },
  { id:'de_sp6', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'stadium',    answer:'das Stadion',     variants:['Stadion'],    promptLang:'en-US' },
  { id:'de_sp7', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:"What's the score?", answer:'Wie ist der Stand?', variants:['Wie ist der Stand'],     promptLang:'en-US' },
  { id:'de_sp8', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:'We won!',           answer:'Wir haben gewonnen!', variants:['Wir haben gewonnen'],  promptLang:'en-US' },
  { id:'de_sp9', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:"Let's play.",        answer:'Lass uns spielen.',   variants:['Lasst uns spielen.','Lass uns spielen'], promptLang:'en-US' },
]

const DB_DE_TECH: DrillItem[] = [
  { id:'de_tc1', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'phone',      answer:'das Telefon',     variants:['Telefon','das Handy','Handy'],  promptLang:'en-US' },
  { id:'de_tc2', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'computer',   answer:'der Computer',    variants:['Computer'],                     promptLang:'en-US' },
  { id:'de_tc3', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'internet',   answer:'das Internet',    variants:['Internet'],                     promptLang:'en-US' },
  { id:'de_tc4', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'email',      answer:'die E-Mail',      variants:['E-Mail','Email'],               promptLang:'en-US' },
  { id:'de_tc5', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'app',        answer:'die App',         variants:['App'],                          promptLang:'en-US' },
  { id:'de_tc6', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'password',   answer:'das Passwort',    variants:['Passwort'],                     promptLang:'en-US' },
  { id:'de_tc7', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:"What's the wifi password?", answer:'Was ist das WLAN-Passwort?',   variants:['Was ist das WLAN Passwort?'],  promptLang:'en-US' },
  { id:'de_tc8', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:'My phone is dead.',         answer:'Mein Handy ist leer.',         variants:['Mein Handy hat keinen Akku'], promptLang:'en-US' },
  { id:'de_tc9', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:'Can I use the wifi?',       answer:'Kann ich das WLAN benutzen?',  variants:['Kann ich das WLAN nutzen?'],  promptLang:'en-US' },
]

const DB_DE_FOOD: DrillItem[] = [
  { id:'de_fd1', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'restaurant',  answer:'das Restaurant',    variants:['Restaurant'],         promptLang:'en-US' },
  { id:'de_fd2', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'menu',        answer:'die Speisekarte',   variants:['Speisekarte','die Karte','Karte'], promptLang:'en-US' },
  { id:'de_fd3', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'bread',       answer:'das Brot',          variants:['Brot'],               promptLang:'en-US' },
  { id:'de_fd4', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'coffee',      answer:'der Kaffee',        variants:['Kaffee'],             promptLang:'en-US' },
  { id:'de_fd5', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'wine',        answer:'der Wein',          variants:['Wein'],               promptLang:'en-US' },
  { id:'de_fd6', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'bill',        answer:'die Rechnung',      variants:['Rechnung'],           promptLang:'en-US' },
  { id:'de_fd7', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:'The bill, please.',       answer:'Die Rechnung, bitte.',     variants:['Die Rechnung bitte'],   promptLang:'en-US' },
  { id:'de_fd8', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:"It's delicious!",         answer:'Es ist köstlich!',         variants:['Es ist kostlich!','Es ist lecker!','Es ist lecker'], promptLang:'en-US' },
  { id:'de_fd9', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:'A table for two, please.', answer:'Einen Tisch für zwei, bitte.', variants:['Einen Tisch fur zwei bitte','Einen Tisch für zwei bitte'], promptLang:'en-US' },
]

const DB_DE_WORK: DrillItem[] = [
  { id:'de_wk1', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'office',      answer:'das Büro',          variants:['Büro','Buro'],                  promptLang:'en-US' },
  { id:'de_wk2', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'meeting',     answer:'die Besprechung',   variants:['Besprechung','das Meeting','Meeting'], promptLang:'en-US' },
  { id:'de_wk3', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'colleague',   answer:'der Kollege',       variants:['Kollege','die Kollegin','Kollegin'],   promptLang:'en-US' },
  { id:'de_wk4', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'report',      answer:'der Bericht',       variants:['Bericht'],                      promptLang:'en-US' },
  { id:'de_wk5', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'deadline',    answer:'die Frist',         variants:['Frist','der Termin','Termin'],  promptLang:'en-US' },
  { id:'de_wk6', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'manager',     answer:'der Vorgesetzte',   variants:['Vorgesetzte','der Manager','Manager'], promptLang:'en-US' },
  { id:'de_wk7', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:'We have a meeting.',        answer:'Wir haben eine Besprechung.',      variants:['Wir haben ein Meeting'],      promptLang:'en-US' },
  { id:'de_wk8', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:"I'll send you an email.",    answer:'Ich werde Ihnen eine E-Mail schicken.', variants:['Ich werde dir eine E-Mail schicken'], promptLang:'en-US' },
  { id:'de_wk9', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:'The deadline is on Monday.', answer:'Die Frist ist am Montag.',        variants:['Der Termin ist Montag'],      promptLang:'en-US' },
]

// ── Chinese ───────────────────────────────────────────────────────────────────

const DB_ZH: DrillItem[] = [
  { id:'zh_tr1',  type:'translation', topic:'daily',  instruction:'Translate to Chinese.', prompt:'Good morning.',                    answer:'早上好',       variants:['早上好。','zǎoshang hǎo','zaoshang hao'],                                                              promptLang:'en-US' },
  { id:'zh_tr2',  type:'translation', topic:'travel', instruction:'Translate to Chinese.', prompt:'Where is the hotel?',              answer:'酒店在哪里',   variants:['酒店在哪里？','jiǔdiàn zài nǎlǐ','jiudian zai nali'],                                                  promptLang:'en-US' },
  { id:'zh_tr3',  type:'translation', topic:'daily',  instruction:'Translate to Chinese.', prompt:'I do not understand.',             answer:'我不明白',     variants:['我不明白。','wǒ bù míngbai','wo bu mingbai'],                                                            promptLang:'en-US' },
  { id:'zh_tr4',  type:'translation', topic:'daily',  instruction:'Translate to Chinese.', prompt:'Please speak more slowly.',        answer:'请说慢一点',   variants:['请说慢一点。','qǐng shuō màn yīdiǎn','qing shuo man yidian'],                                            promptLang:'en-US' },
  { id:'zh_tr5',  type:'translation', topic:'travel', instruction:'Translate to Chinese.', prompt:'We need a taxi.',                  answer:'我们需要出租车',variants:['我们需要出租车。','wǒmen xūyào chūzūchē','women xuyao chuzuche'],                                       promptLang:'en-US' },
  { id:'zh_tr6',  type:'translation', topic:'travel', instruction:'Translate to Chinese.', prompt:'What time does the train leave?',  answer:'火车几点出发',  variants:['火车几点出发？','huǒchē jǐ diǎn chūfā','huoche ji dian chufa'],                                          promptLang:'en-US' },
  { id:'zh_tr7',  type:'translation', topic:'travel', instruction:'Translate to Chinese.', prompt:'I am looking for the embassy.',    answer:'我在找大使馆',  variants:['我在找大使馆。','wǒ zài zhǎo dàshǐguǎn','wo zai zhao dashiguan'],                                         promptLang:'en-US' },
  { id:'zh_tr8',  type:'translation', topic:'travel', instruction:'Translate to Chinese.', prompt:'How much does this cost?',         answer:'这个多少钱',   variants:['这个多少钱？','zhège duōshao qián','zhege duoshao qian'],                                                 promptLang:'en-US' },
  { id:'zh_tr9',  type:'translation', topic:'travel', instruction:'Translate to Chinese.', prompt:'My passport is at the hotel.',     answer:'我的护照在酒店',variants:['我的护照在酒店。','wǒde hùzhào zài jiǔdiàn','wode huzhao zai jiudian'],                                   promptLang:'en-US' },
  { id:'zh_tr10', type:'translation', topic:'daily',  instruction:'Translate to Chinese.', prompt:'Do you speak English?',            answer:'你会说英语吗',  variants:['你会说英语吗？','nǐ huì shuō yīngyǔ ma','ni hui shuo yingyu ma'],                                         promptLang:'en-US' },
  { id:'zh_tr11', type:'translation', topic:'daily',  instruction:'Translate to Chinese.', prompt:'Thank you.',                       answer:'谢谢',         variants:['谢谢。','xièxiè','xiexie','谢谢你','谢谢你。'],                                                            promptLang:'en-US' },
  { id:'zh_tr12', type:'translation', topic:'daily',  instruction:'Translate to Chinese.', prompt:'Excuse me.',                       answer:'对不起',       variants:['对不起。','duìbuqǐ','duibuqi','不好意思','不好意思。','bu hao yi si'],                                    promptLang:'en-US' },
]

const DB_ZH_VOCAB: DrillItem[] = [
  { id:'zh_v1',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'water',    answer:'水',    variants:['水。','shuǐ','shui'],                                                        promptLang:'en-US' },
  { id:'zh_v2',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'house',    answer:'房子',  variants:['房子。','fángzi','fangzi'],                                                   promptLang:'en-US' },
  { id:'zh_v3',  type:'translation', category:'vocab', topic:'food',   instruction:'Translate the word.', prompt:'food',     answer:'食物',  variants:['食物。','shíwù','shiwu','饭','饭。','fàn','fan'],                             promptLang:'en-US' },
  { id:'zh_v4',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'money',    answer:'钱',    variants:['钱。','qián','qian'],                                                         promptLang:'en-US' },
  { id:'zh_v5',  type:'translation', category:'vocab', topic:'work',   instruction:'Translate the word.', prompt:'work',     answer:'工作',  variants:['工作。','gōngzuò','gongzuo'],                                                 promptLang:'en-US' },
  { id:'zh_v6',  type:'translation', category:'vocab', topic:'travel', instruction:'Translate the word.', prompt:'city',     answer:'城市',  variants:['城市。','chéngshì','chengshi'],                                               promptLang:'en-US' },
  { id:'zh_v7',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'time',     answer:'时间',  variants:['时间。','shíjiān','shijian'],                                                 promptLang:'en-US' },
  { id:'zh_v8',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'book',     answer:'书',    variants:['书。','shū','shu'],                                                           promptLang:'en-US' },
  { id:'zh_v9',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'door',     answer:'门',    variants:['门。','mén','men'],                                                           promptLang:'en-US' },
  { id:'zh_v10', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'day',      answer:'天',    variants:['天。','tiān','tian','日','日。','rì','ri'],                                    promptLang:'en-US' },
  { id:'zh_v11', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'man',      answer:'男人',  variants:['男人。','nánrén','nanren'],                                                   promptLang:'en-US' },
  { id:'zh_v12', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'woman',    answer:'女人',  variants:['女人。','nǚrén','nüren'],                                                     promptLang:'en-US' },
  { id:'zh_v13', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'friend',   answer:'朋友',  variants:['朋友。','péngyou','pengyou'],                                                 promptLang:'en-US' },
  { id:'zh_v14', type:'translation', category:'vocab', topic:'travel', instruction:'Translate the word.', prompt:'country',  answer:'国家',  variants:['国家。','guójiā','guojia'],                                                   promptLang:'en-US' },
  { id:'zh_v15', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'night',    answer:'晚上',  variants:['晚上。','wǎnshang','wanshang','夜','夜。','yè','ye'],                          promptLang:'en-US' },
]

const DB_ZH_PHRASES: DrillItem[] = [
  { id:'zh_ph1',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:"You're welcome.",   answer:'不客气',   variants:['不客气。','bù kèqi','bu keqi','不用谢','不用谢。'],                          promptLang:'en-US' },
  { id:'zh_ph2',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Hello.',             answer:'你好',     variants:['你好。','nǐ hǎo','ni hao'],                                                   promptLang:'en-US' },
  { id:'zh_ph3',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Goodbye.',           answer:'再见',     variants:['再见。','zàijiàn','zaijian'],                                                 promptLang:'en-US' },
  { id:'zh_ph4',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Please.',            answer:'请',       variants:['请。','qǐng','qing'],                                                         promptLang:'en-US' },
  { id:'zh_ph5',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'How are you?',       answer:'你好吗',   variants:['你好吗？','nǐ hǎo ma','ni hao ma'],                                           promptLang:'en-US' },
  { id:'zh_ph6',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Nice to meet you.',  answer:'很高兴认识你', variants:['很高兴认识你。','hěn gāoxìng rènshi nǐ','hen gaoxing renshi ni'],         promptLang:'en-US' },
  { id:'zh_ph7',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'OK.',                answer:'好的',     variants:['好的。','hǎo de','hao de','好。','好'],                                       promptLang:'en-US' },
  { id:'zh_ph8',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Wait a moment.',     answer:'等一下',   variants:['等一下。','děng yīxià','deng yixia','稍等','稍等。'],                          promptLang:'en-US' },
  { id:'zh_ph9',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'I know.',            answer:'我知道',   variants:['我知道。','wǒ zhīdào','wo zhidao'],                                           promptLang:'en-US' },
  { id:'zh_ph10', type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'No problem.',        answer:'没问题',   variants:['没问题。','méi wèntí','mei wenti'],                                           promptLang:'en-US' },
]

const DB_ZH_SPORT: DrillItem[] = [
  { id:'zh_sp1', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'ball',       answer:'球',     variants:['球。','qiú','qiu'],                                             promptLang:'en-US' },
  { id:'zh_sp2', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'team',       answer:'队伍',   variants:['队伍。','duìwu','duiwu'],                                        promptLang:'en-US' },
  { id:'zh_sp3', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'match',      answer:'比赛',   variants:['比赛。','bǐsài','bisai'],                                        promptLang:'en-US' },
  { id:'zh_sp4', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'player',     answer:'球员',   variants:['球员。','qiúyuán','qiuyuan'],                                    promptLang:'en-US' },
  { id:'zh_sp5', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'score',      answer:'比分',   variants:['比分。','bǐfēn','bifen'],                                        promptLang:'en-US' },
  { id:'zh_sp6', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'stadium',    answer:'体育场', variants:['体育场。','tǐyùchǎng','tiyuchang'],                              promptLang:'en-US' },
  { id:'zh_sp7', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:"What's the score?", answer:'现在比分多少',  variants:['现在比分多少？','xiànzài bǐfēn duōshao'],  promptLang:'en-US' },
  { id:'zh_sp8', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:'We won!',           answer:'我们赢了',      variants:['我们赢了！','wǒmen yíng le'],              promptLang:'en-US' },
  { id:'zh_sp9', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:"Let's play.",        answer:'我们来玩吧',    variants:['我们来玩吧。','wǒmen lái wán ba'],         promptLang:'en-US' },
]

const DB_ZH_TECH: DrillItem[] = [
  { id:'zh_tc1', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'phone',      answer:'手机',    variants:['手机。','shǒujī','shouji'],                                          promptLang:'en-US' },
  { id:'zh_tc2', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'computer',   answer:'电脑',    variants:['电脑。','diànnǎo','diannao'],                                        promptLang:'en-US' },
  { id:'zh_tc3', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'internet',   answer:'互联网',  variants:['互联网。','hùliánwǎng','hulianwang'],                                promptLang:'en-US' },
  { id:'zh_tc4', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'email',      answer:'电子邮件', variants:['电子邮件。','diànzǐ yóujiàn','dianzi youjian'],                   promptLang:'en-US' },
  { id:'zh_tc5', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'app',        answer:'应用程序', variants:['应用程序。','yìngyòng chéngxù','yingyong chengxu','应用','应用。'],  promptLang:'en-US' },
  { id:'zh_tc6', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'password',   answer:'密码',    variants:['密码。','mìmǎ','mima'],                                              promptLang:'en-US' },
  { id:'zh_tc7', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:"What's the wifi password?", answer:'无线网络密码是什么',  variants:['无线网络密码是什么？','wifi密码是什么'],   promptLang:'en-US' },
  { id:'zh_tc8', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:'My phone is dead.',         answer:'我手机没电了',        variants:['我的手机没电了。'],                          promptLang:'en-US' },
  { id:'zh_tc9', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:'Can I use the wifi?',       answer:'我可以用网络吗',      variants:['我可以用wifi吗？','可以用网络吗'],            promptLang:'en-US' },
]

const DB_ZH_FOOD: DrillItem[] = [
  { id:'zh_fd1', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'restaurant',  answer:'餐厅',   variants:['餐厅。','cāntīng','canting'],                                    promptLang:'en-US' },
  { id:'zh_fd2', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'menu',        answer:'菜单',   variants:['菜单。','càidān','caidan'],                                      promptLang:'en-US' },
  { id:'zh_fd3', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'bread',       answer:'面包',   variants:['面包。','miànbāo','mianbao'],                                    promptLang:'en-US' },
  { id:'zh_fd4', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'coffee',      answer:'咖啡',   variants:['咖啡。','kāfēi','kafei'],                                        promptLang:'en-US' },
  { id:'zh_fd5', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'wine',        answer:'红酒',   variants:['红酒。','hóngjiǔ','hongjiu'],                                    promptLang:'en-US' },
  { id:'zh_fd6', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'bill',        answer:'账单',   variants:['账单。','zhàngdān','zhangdan'],                                  promptLang:'en-US' },
  { id:'zh_fd7', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:'The bill, please.',       answer:'买单，谢谢',       variants:['买单谢谢','买单，谢谢。'],           promptLang:'en-US' },
  { id:'zh_fd8', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:"It's delicious!",         answer:'非常好吃',         variants:['非常好吃！','太好吃了！','太好吃了'], promptLang:'en-US' },
  { id:'zh_fd9', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:'A table for two, please.', answer:'两位，请',         variants:['两个人，谢谢','两位请'],             promptLang:'en-US' },
]

const DB_ZH_WORK: DrillItem[] = [
  { id:'zh_wk1', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'office',      answer:'办公室',   variants:['办公室。','bàngōngshì','bangongshi'],                                 promptLang:'en-US' },
  { id:'zh_wk2', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'meeting',     answer:'会议',     variants:['会议。','huìyì','huiyi'],                                             promptLang:'en-US' },
  { id:'zh_wk3', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'colleague',   answer:'同事',     variants:['同事。','tóngshì','tongshi'],                                         promptLang:'en-US' },
  { id:'zh_wk4', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'report',      answer:'报告',     variants:['报告。','bàogào','baogao'],                                           promptLang:'en-US' },
  { id:'zh_wk5', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'deadline',    answer:'截止日期', variants:['截止日期。','jiézhǐ rìqī','jiezhi riqi'],                              promptLang:'en-US' },
  { id:'zh_wk6', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'manager',     answer:'经理',     variants:['经理。','jīnglǐ','jingli'],                                           promptLang:'en-US' },
  { id:'zh_wk7', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:'We have a meeting.',        answer:'我们有个会议',     variants:['我们有个会议。','我们有会议'],          promptLang:'en-US' },
  { id:'zh_wk8', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:"I'll send you an email.",    answer:'我给你发邮件',     variants:['我给你发邮件。','我会发邮件给你'],       promptLang:'en-US' },
  { id:'zh_wk9', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:'The deadline is on Monday.', answer:'截止日期是周一',   variants:['截止日期是周一。','周一截止'],           promptLang:'en-US' },
]

// ── Spanish: new topics ───────────────────────────────────────────────────────

const DB_ES_HEALTH: DrillItem[] = [
  { id:'es_hl1', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'doctor',       answer:'el médico',          variants:['médico','el doctor','doctor'],           promptLang:'en-US' },
  { id:'es_hl2', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'hospital',     answer:'el hospital',        variants:['hospital'],                             promptLang:'en-US' },
  { id:'es_hl3', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'medicine',     answer:'el medicamento',     variants:['medicamento','la medicina','medicina'],  promptLang:'en-US' },
  { id:'es_hl4', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'pain',         answer:'el dolor',           variants:['dolor'],                                promptLang:'en-US' },
  { id:'es_hl5', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'fever',        answer:'la fiebre',          variants:['fiebre'],                               promptLang:'en-US' },
  { id:'es_hl6', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'I feel sick.',           answer:'Me siento mal.',             variants:['Me siento enfermo','Me siento enferma'], promptLang:'en-US' },
  { id:'es_hl7', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'Call an ambulance!',     answer:'¡Llame una ambulancia!',     variants:['Llame una ambulancia','Llame al 112'], promptLang:'en-US' },
  { id:'es_hl8', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'I need a doctor.',       answer:'Necesito un médico.',        variants:['Necesito un doctor'],                   promptLang:'en-US' },
  { id:'es_hl9', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'Where is the pharmacy?', answer:'¿Dónde está la farmacia?',  variants:['Dónde está la farmacia'],               promptLang:'en-US' },
]

const DB_ES_MONEY: DrillItem[] = [
  { id:'es_mn1', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'bank',         answer:'el banco',           variants:['banco'],                                promptLang:'en-US' },
  { id:'es_mn2', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'ATM',          answer:'el cajero automático',variants:['cajero automático','cajero'],            promptLang:'en-US' },
  { id:'es_mn3', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'credit card',  answer:'la tarjeta de crédito',variants:['tarjeta de crédito','tarjeta'],         promptLang:'en-US' },
  { id:'es_mn4', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'exchange rate', answer:'el tipo de cambio', variants:['tipo de cambio'],                       promptLang:'en-US' },
  { id:'es_mn5', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'coin',         answer:'la moneda',          variants:['moneda'],                               promptLang:'en-US' },
  { id:'es_mn6', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Can I pay by card?',     answer:'¿Puedo pagar con tarjeta?', variants:['Puedo pagar con tarjeta'],               promptLang:'en-US' },
  { id:'es_mn7', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Where is the ATM?',      answer:'¿Dónde está el cajero?',    variants:['Dónde está el cajero automático'],        promptLang:'en-US' },
  { id:'es_mn8', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'I want to exchange money.',answer:'Quiero cambiar dinero.',    variants:['Quiero cambiar divisas'],                promptLang:'en-US' },
  { id:'es_mn9', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Do you accept dollars?',  answer:'¿Aceptan dólares?',         variants:['Aceptan dólares'],                       promptLang:'en-US' },
]

const DB_ES_FAMILY: DrillItem[] = [
  { id:'es_fm1', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'mother',       answer:'la madre',           variants:['madre','mamá','mama'],                  promptLang:'en-US' },
  { id:'es_fm2', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'father',       answer:'el padre',           variants:['padre','papá','papa'],                  promptLang:'en-US' },
  { id:'es_fm3', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'sister',       answer:'la hermana',         variants:['hermana'],                              promptLang:'en-US' },
  { id:'es_fm4', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'brother',      answer:'el hermano',         variants:['hermano'],                              promptLang:'en-US' },
  { id:'es_fm5', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'grandparents', answer:'los abuelos',        variants:['abuelos'],                              promptLang:'en-US' },
  { id:'es_fm6', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'My family is big.',      answer:'Mi familia es grande.',      variants:['Mi familia es numerosa'],                promptLang:'en-US' },
  { id:'es_fm7', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'I have two sisters.',    answer:'Tengo dos hermanas.',        variants:['Yo tengo dos hermanas'],                 promptLang:'en-US' },
  { id:'es_fm8', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'Are you married?',       answer:'¿Está usted casado?',        variants:['¿Está casado?','¿Estás casado?'],         promptLang:'en-US' },
  { id:'es_fm9', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'I have three children.', answer:'Tengo tres hijos.',          variants:['Yo tengo tres hijos'],                   promptLang:'en-US' },
]

const DB_ES_NATURE: DrillItem[] = [
  { id:'es_nt1', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'mountain',     answer:'la montaña',         variants:['montaña'],                              promptLang:'en-US' },
  { id:'es_nt2', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'river',        answer:'el río',             variants:['río','rio'],                            promptLang:'en-US' },
  { id:'es_nt3', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'forest',       answer:'el bosque',          variants:['bosque'],                               promptLang:'en-US' },
  { id:'es_nt4', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'weather',      answer:'el tiempo',          variants:['tiempo','el clima','clima'],             promptLang:'en-US' },
  { id:'es_nt5', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'sun',          answer:'el sol',             variants:['sol'],                                  promptLang:'en-US' },
  { id:'es_nt6', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:'The weather is nice.',   answer:'El tiempo está bien.',       variants:['El clima es bueno'],                     promptLang:'en-US' },
  { id:'es_nt7', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:"It's raining.",          answer:'Está lloviendo.',            variants:['Llueve.','Llueve'],                       promptLang:'en-US' },
  { id:'es_nt8', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:"It's very hot today.",   answer:'Hace mucho calor hoy.',      variants:['Hace mucho calor'],                      promptLang:'en-US' },
  { id:'es_nt9', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:'I love the mountains.',  answer:'Me encantan las montañas.',  variants:['Amo las montañas'],                      promptLang:'en-US' },
]

const DB_ES_EDUCATION: DrillItem[] = [
  { id:'es_ed1', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'school',       answer:'la escuela',         variants:['escuela'],                              promptLang:'en-US' },
  { id:'es_ed2', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'student',      answer:'el estudiante',      variants:['estudiante'],                           promptLang:'en-US' },
  { id:'es_ed3', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'teacher',      answer:'el profesor',        variants:['profesor','la profesora','profesora'],  promptLang:'en-US' },
  { id:'es_ed4', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'class',        answer:'la clase',           variants:['clase'],                                promptLang:'en-US' },
  { id:'es_ed5', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'exam',         answer:'el examen',          variants:['examen'],                               promptLang:'en-US' },
  { id:'es_ed6', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'I study Spanish.',       answer:'Estudio español.',           variants:['Yo estudio español'],                    promptLang:'en-US' },
  { id:'es_ed7', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'What is the homework?',  answer:'¿Cuál es la tarea?',         variants:['Cuál es la tarea'],                      promptLang:'en-US' },
  { id:'es_ed8', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'The exam is tomorrow.',  answer:'El examen es mañana.',       variants:['El examen es mañana'],                   promptLang:'en-US' },
  { id:'es_ed9', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'I go to university.',    answer:'Voy a la universidad.',      variants:['Yo voy a la universidad'],               promptLang:'en-US' },
]

const DB_ES_CULTURE: DrillItem[] = [
  { id:'es_cu1', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'museum',       answer:'el museo',           variants:['museo'],                                promptLang:'en-US' },
  { id:'es_cu2', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'art',          answer:'el arte',            variants:['arte'],                                 promptLang:'en-US' },
  { id:'es_cu3', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'music',        answer:'la música',          variants:['música','musica'],                       promptLang:'en-US' },
  { id:'es_cu4', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'festival',     answer:'el festival',        variants:['festival','la fiesta','fiesta'],         promptLang:'en-US' },
  { id:'es_cu5', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'tradition',    answer:'la tradición',       variants:['tradición','tradicion'],                promptLang:'en-US' },
  { id:'es_cu6', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'I love this music.',     answer:'Me encanta esta música.',    variants:['Me encanta esta musica'],                promptLang:'en-US' },
  { id:'es_cu7', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'Where is the museum?',   answer:'¿Dónde está el museo?',      variants:['Dónde está el museo'],                   promptLang:'en-US' },
  { id:'es_cu8', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'I like local food.',     answer:'Me gusta la comida local.',  variants:['Me gusta la comida típica'],             promptLang:'en-US' },
  { id:'es_cu9', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'Is there a festival today?',answer:'¿Hay un festival hoy?',    variants:['Hay algún festival hoy'],                promptLang:'en-US' },
]

const DB_ES_POLITICS: DrillItem[] = [
  { id:'es_po1', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'government',   answer:'el gobierno',        variants:['gobierno'],                             promptLang:'en-US' },
  { id:'es_po2', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'election',     answer:'la elección',        variants:['elección','eleccion'],                  promptLang:'en-US' },
  { id:'es_po3', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'law',          answer:'la ley',             variants:['ley'],                                  promptLang:'en-US' },
  { id:'es_po4', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'vote',         answer:'el voto',            variants:['voto'],                                 promptLang:'en-US' },
  { id:'es_po5', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'president',    answer:'el presidente',      variants:['presidente'],                           promptLang:'en-US' },
  { id:'es_po6', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'When is the election?',  answer:'¿Cuándo es la elección?',    variants:['Cuándo es la elección'],                 promptLang:'en-US' },
  { id:'es_po7', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'I follow the news.',     answer:'Sigo las noticias.',         variants:['Leo las noticias'],                      promptLang:'en-US' },
  { id:'es_po8', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'The new law passed.',    answer:'La nueva ley fue aprobada.', variants:['Se aprobó la nueva ley'],                promptLang:'en-US' },
  { id:'es_po9', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'Did you vote?',          answer:'¿Votó usted?',               variants:['¿Votaste?','Votaste'],                   promptLang:'en-US' },
]

const DB_ES_SCIENCE: DrillItem[] = [
  { id:'es_sc1', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'experiment',   answer:'el experimento',     variants:['experimento'],                          promptLang:'en-US' },
  { id:'es_sc2', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'laboratory',   answer:'el laboratorio',     variants:['laboratorio'],                          promptLang:'en-US' },
  { id:'es_sc3', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'theory',       answer:'la teoría',          variants:['teoría','teoria'],                      promptLang:'en-US' },
  { id:'es_sc4', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'data',         answer:'los datos',          variants:['datos'],                                promptLang:'en-US' },
  { id:'es_sc5', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'research',     answer:'la investigación',   variants:['investigación','investigacion'],         promptLang:'en-US' },
  { id:'es_sc6', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'The results are interesting.', answer:'Los resultados son interesantes.', variants:['Los resultados son interesantes'], promptLang:'en-US' },
  { id:'es_sc7', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'I study biology.',       answer:'Estudio biología.',          variants:['Estudio biologia'],                      promptLang:'en-US' },
  { id:'es_sc8', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'We need more data.',     answer:'Necesitamos más datos.',     variants:['Necesitamos mas datos'],                 promptLang:'en-US' },
  { id:'es_sc9', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'The hypothesis is confirmed.', answer:'La hipótesis está confirmada.', variants:['La hipotesis se confirmo'], promptLang:'en-US' },
]

const DB_ES_SHOPPING: DrillItem[] = [
  { id:'es_sh1', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'store',        answer:'la tienda',          variants:['tienda'],                               promptLang:'en-US' },
  { id:'es_sh2', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'price',        answer:'el precio',          variants:['precio'],                               promptLang:'en-US' },
  { id:'es_sh3', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'sale',         answer:'la oferta',          variants:['oferta','la rebaja','rebaja'],           promptLang:'en-US' },
  { id:'es_sh4', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'size',         answer:'la talla',           variants:['talla','el tamaño','tamaño'],            promptLang:'en-US' },
  { id:'es_sh5', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'receipt',      answer:'el recibo',          variants:['recibo'],                               promptLang:'en-US' },
  { id:'es_sh6', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Do you have this in large?', answer:'¿Lo tiene en talla grande?', variants:['Lo tienen en talla grande'],            promptLang:'en-US' },
  { id:'es_sh7', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:"I'm just looking.",      answer:'Solo estoy mirando.',        variants:['Solo miro'],                             promptLang:'en-US' },
  { id:'es_sh8', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Is this on sale?',       answer:'¿Está en oferta?',           variants:['Está en rebaja'],                        promptLang:'en-US' },
  { id:'es_sh9', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Can I try it on?',       answer:'¿Puedo probármelo?',         variants:['Puedo probarlo'],                        promptLang:'en-US' },
]

const DB_ES_EMERGENCY: DrillItem[] = [
  { id:'es_em1', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'police',       answer:'la policía',         variants:['policía','policia'],                    promptLang:'en-US' },
  { id:'es_em2', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'fire',         answer:'el incendio',        variants:['incendio','el fuego','fuego'],           promptLang:'en-US' },
  { id:'es_em3', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'ambulance',    answer:'la ambulancia',      variants:['ambulancia'],                           promptLang:'en-US' },
  { id:'es_em4', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'accident',     answer:'el accidente',       variants:['accidente'],                            promptLang:'en-US' },
  { id:'es_em5', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'help',         answer:'la ayuda',           variants:['ayuda','auxilio'],                       promptLang:'en-US' },
  { id:'es_em6', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'Help!',                  answer:'¡Auxilio!',                  variants:['¡Ayuda!','Auxilio','Ayuda'],              promptLang:'en-US' },
  { id:'es_em7', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'Call the police!',       answer:'¡Llame a la policía!',       variants:['Llame a la policia'],                    promptLang:'en-US' },
  { id:'es_em8', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'This is an emergency.',  answer:'Esto es una emergencia.',    variants:['Es una emergencia'],                     promptLang:'en-US' },
  { id:'es_em9', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'I have been robbed.',    answer:'Me han robado.',             variants:['Me robaron'],                            promptLang:'en-US' },
]

// ── French: new topics ────────────────────────────────────────────────────────

const DB_FR_HEALTH: DrillItem[] = [
  { id:'fr_hl1', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'doctor',       answer:'le médecin',         variants:['médecin','le docteur','docteur'],        promptLang:'en-US' },
  { id:'fr_hl2', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'hospital',     answer:"l'hôpital",          variants:['hôpital','hopital'],                    promptLang:'en-US' },
  { id:'fr_hl3', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'medicine',     answer:'le médicament',      variants:['médicament','medicament'],              promptLang:'en-US' },
  { id:'fr_hl4', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'pain',         answer:'la douleur',         variants:['douleur'],                              promptLang:'en-US' },
  { id:'fr_hl5', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'fever',        answer:'la fièvre',          variants:['fièvre','fievre'],                       promptLang:'en-US' },
  { id:'fr_hl6', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'I feel sick.',           answer:'Je me sens malade.',         variants:['Je suis malade'],                        promptLang:'en-US' },
  { id:'fr_hl7', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'Call an ambulance!',     answer:"Appelez une ambulance!",     variants:['Appelez le SAMU!'],                      promptLang:'en-US' },
  { id:'fr_hl8', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'I need a doctor.',       answer:"J'ai besoin d'un médecin.",  variants:["J'ai besoin d'un docteur"],              promptLang:'en-US' },
  { id:'fr_hl9', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'Where is the pharmacy?', answer:'Où est la pharmacie?',       variants:['Où se trouve la pharmacie?'],            promptLang:'en-US' },
]

const DB_FR_MONEY: DrillItem[] = [
  { id:'fr_mn1', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'bank',         answer:'la banque',          variants:['banque'],                               promptLang:'en-US' },
  { id:'fr_mn2', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'ATM',          answer:'le distributeur',    variants:['distributeur','le DAB','DAB'],           promptLang:'en-US' },
  { id:'fr_mn3', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'credit card',  answer:'la carte de crédit', variants:['carte de crédit','carte de credit'],    promptLang:'en-US' },
  { id:'fr_mn4', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'exchange rate', answer:'le taux de change',  variants:['taux de change'],                       promptLang:'en-US' },
  { id:'fr_mn5', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'coin',         answer:'la pièce',           variants:['pièce','piece'],                         promptLang:'en-US' },
  { id:'fr_mn6', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Can I pay by card?',     answer:'Puis-je payer par carte?',   variants:['Je peux payer par carte?'],              promptLang:'en-US' },
  { id:'fr_mn7', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Where is the ATM?',      answer:'Où est le distributeur?',    variants:['Où est le DAB?'],                        promptLang:'en-US' },
  { id:'fr_mn8', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'I want to exchange money.',answer:'Je veux changer de l\'argent.',variants:["Je veux changer de l'argent"],         promptLang:'en-US' },
  { id:'fr_mn9', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Do you accept dollars?',  answer:'Acceptez-vous les dollars?', variants:['Vous acceptez les dollars?'],            promptLang:'en-US' },
]

const DB_FR_FAMILY: DrillItem[] = [
  { id:'fr_fm1', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'mother',       answer:'la mère',            variants:['mère','mere','maman'],                  promptLang:'en-US' },
  { id:'fr_fm2', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'father',       answer:'le père',            variants:['père','pere','papa'],                   promptLang:'en-US' },
  { id:'fr_fm3', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'sister',       answer:'la sœur',            variants:['sœur','soeur'],                         promptLang:'en-US' },
  { id:'fr_fm4', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'brother',      answer:'le frère',           variants:['frère','frere'],                         promptLang:'en-US' },
  { id:'fr_fm5', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'grandparents', answer:'les grands-parents', variants:['grands-parents'],                       promptLang:'en-US' },
  { id:'fr_fm6', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'My family is big.',      answer:'Ma famille est grande.',     variants:['Ma famille est nombreuse'],              promptLang:'en-US' },
  { id:'fr_fm7', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'I have two sisters.',    answer:"J'ai deux sœurs.",           variants:["J'ai deux soeurs"],                      promptLang:'en-US' },
  { id:'fr_fm8', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'Are you married?',       answer:'Êtes-vous marié?',           variants:['Es-tu marié?'],                          promptLang:'en-US' },
  { id:'fr_fm9', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'I have three children.', answer:"J'ai trois enfants.",        variants:["J'ai trois enfants"],                    promptLang:'en-US' },
]

const DB_FR_NATURE: DrillItem[] = [
  { id:'fr_nt1', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'mountain',     answer:'la montagne',        variants:['montagne'],                             promptLang:'en-US' },
  { id:'fr_nt2', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'river',        answer:'la rivière',         variants:['rivière','riviere','le fleuve','fleuve'],promptLang:'en-US' },
  { id:'fr_nt3', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'forest',       answer:'la forêt',           variants:['forêt','foret'],                         promptLang:'en-US' },
  { id:'fr_nt4', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'weather',      answer:'la météo',           variants:['météo','meteo','le temps','temps'],      promptLang:'en-US' },
  { id:'fr_nt5', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'sun',          answer:'le soleil',          variants:['soleil'],                               promptLang:'en-US' },
  { id:'fr_nt6', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:'The weather is nice.',   answer:'Il fait beau.',              variants:['Le temps est beau'],                     promptLang:'en-US' },
  { id:'fr_nt7', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:"It's raining.",          answer:'Il pleut.',                  variants:['Il pleut'],                              promptLang:'en-US' },
  { id:'fr_nt8', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:"It's very hot today.",   answer:"Il fait très chaud aujourd'hui.", variants:["Il fait tres chaud aujourd'hui"],    promptLang:'en-US' },
  { id:'fr_nt9', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:'I love the mountains.',  answer:"J'adore les montagnes.",     variants:["J'aime les montagnes"],                  promptLang:'en-US' },
]

const DB_FR_EDUCATION: DrillItem[] = [
  { id:'fr_ed1', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'school',       answer:"l'école",            variants:['école','ecole'],                        promptLang:'en-US' },
  { id:'fr_ed2', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'student',      answer:"l'étudiant",         variants:['étudiant','etudiant'],                  promptLang:'en-US' },
  { id:'fr_ed3', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'teacher',      answer:'le professeur',      variants:['professeur'],                           promptLang:'en-US' },
  { id:'fr_ed4', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'class',        answer:'le cours',           variants:['cours','la classe','classe'],            promptLang:'en-US' },
  { id:'fr_ed5', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'exam',         answer:"l'examen",           variants:['examen'],                               promptLang:'en-US' },
  { id:'fr_ed6', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'I study French.',        answer:"J'étudie le français.",      variants:["J'etudie le francais"],                  promptLang:'en-US' },
  { id:'fr_ed7', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'What is the homework?',  answer:"Quel est le devoir?",        variants:['Quels sont les devoirs?'],               promptLang:'en-US' },
  { id:'fr_ed8', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'The exam is tomorrow.',  answer:"L'examen est demain.",       variants:["L'examen est demain"],                   promptLang:'en-US' },
  { id:'fr_ed9', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'I go to university.',    answer:"Je vais à l'université.",    variants:["Je vais a l'universite"],                promptLang:'en-US' },
]

const DB_FR_CULTURE: DrillItem[] = [
  { id:'fr_cu1', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'museum',       answer:'le musée',           variants:['musée','musee'],                         promptLang:'en-US' },
  { id:'fr_cu2', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'art',          answer:"l'art",              variants:['art'],                                  promptLang:'en-US' },
  { id:'fr_cu3', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'music',        answer:'la musique',         variants:['musique'],                              promptLang:'en-US' },
  { id:'fr_cu4', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'festival',     answer:'le festival',        variants:['festival','la fête','fête','fete'],      promptLang:'en-US' },
  { id:'fr_cu5', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'tradition',    answer:'la tradition',       variants:['tradition'],                            promptLang:'en-US' },
  { id:'fr_cu6', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'I love this music.',     answer:"J'adore cette musique.",     variants:["J'aime cette musique"],                  promptLang:'en-US' },
  { id:'fr_cu7', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'Where is the museum?',   answer:'Où est le musée?',           variants:['Où se trouve le musée?'],                promptLang:'en-US' },
  { id:'fr_cu8', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'I like local food.',     answer:'J\'aime la cuisine locale.', variants:["J'aime la cuisine du coin"],             promptLang:'en-US' },
  { id:'fr_cu9', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'Is there a festival today?',answer:"Y a-t-il un festival aujourd'hui?", variants:["Il y a un festival aujourd'hui?"], promptLang:'en-US' },
]

const DB_FR_POLITICS: DrillItem[] = [
  { id:'fr_po1', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'government',   answer:'le gouvernement',    variants:['gouvernement'],                         promptLang:'en-US' },
  { id:'fr_po2', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'election',     answer:"l'élection",         variants:['élection','election'],                  promptLang:'en-US' },
  { id:'fr_po3', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'law',          answer:'la loi',             variants:['loi'],                                  promptLang:'en-US' },
  { id:'fr_po4', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'vote',         answer:'le vote',            variants:['vote','le scrutin'],                    promptLang:'en-US' },
  { id:'fr_po5', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'president',    answer:'le président',       variants:['président','president'],                promptLang:'en-US' },
  { id:'fr_po6', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'When is the election?',  answer:"Quand est l'élection?",      variants:["Quand ont lieu les élections?"],         promptLang:'en-US' },
  { id:'fr_po7', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'I follow the news.',     answer:'Je suis les actualités.',    variants:["Je lis les nouvelles"],                  promptLang:'en-US' },
  { id:'fr_po8', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'The new law passed.',    answer:'La nouvelle loi a été votée.',variants:['La loi a été adoptée'],                promptLang:'en-US' },
  { id:'fr_po9', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'Did you vote?',          answer:'Avez-vous voté?',            variants:['Tu as voté?'],                           promptLang:'en-US' },
]

const DB_FR_SCIENCE: DrillItem[] = [
  { id:'fr_sc1', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'experiment',   answer:"l'expérience",       variants:['expérience','experience'],              promptLang:'en-US' },
  { id:'fr_sc2', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'laboratory',   answer:'le laboratoire',     variants:['laboratoire'],                          promptLang:'en-US' },
  { id:'fr_sc3', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'theory',       answer:'la théorie',         variants:['théorie','theorie'],                    promptLang:'en-US' },
  { id:'fr_sc4', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'data',         answer:'les données',        variants:['données','donnees'],                    promptLang:'en-US' },
  { id:'fr_sc5', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'research',     answer:'la recherche',       variants:['recherche'],                            promptLang:'en-US' },
  { id:'fr_sc6', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'The results are interesting.', answer:'Les résultats sont intéressants.', variants:['Les résultats sont interessants'], promptLang:'en-US' },
  { id:'fr_sc7', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'I study biology.',       answer:"J'étudie la biologie.",      variants:["J'etudie la biologie"],                  promptLang:'en-US' },
  { id:'fr_sc8', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'We need more data.',     answer:"Nous avons besoin de plus de données.", variants:["Il nous faut plus de données"], promptLang:'en-US' },
  { id:'fr_sc9', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'The hypothesis is confirmed.', answer:"L'hypothèse est confirmée.", variants:["L'hypothese est confirmee"], promptLang:'en-US' },
]

const DB_FR_SHOPPING: DrillItem[] = [
  { id:'fr_sh1', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'store',        answer:'le magasin',         variants:['magasin','la boutique','boutique'],     promptLang:'en-US' },
  { id:'fr_sh2', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'price',        answer:'le prix',            variants:['prix'],                                 promptLang:'en-US' },
  { id:'fr_sh3', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'sale',         answer:'les soldes',         variants:['soldes','la promotion','promotion'],    promptLang:'en-US' },
  { id:'fr_sh4', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'size',         answer:'la taille',          variants:['taille'],                               promptLang:'en-US' },
  { id:'fr_sh5', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'receipt',      answer:'le reçu',            variants:['reçu','recu'],                           promptLang:'en-US' },
  { id:'fr_sh6', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Do you have this in large?', answer:"L'avez-vous en grande taille?", variants:["Vous avez ça en grand?"],         promptLang:'en-US' },
  { id:'fr_sh7', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:"I'm just looking.",      answer:'Je regarde seulement.',      variants:['Je fais du lèche-vitrine'],              promptLang:'en-US' },
  { id:'fr_sh8', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Is this on sale?',       answer:'Est-ce en solde?',           variants:["C'est en promotion?"],                   promptLang:'en-US' },
  { id:'fr_sh9', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Can I try it on?',       answer:'Puis-je l\'essayer?',        variants:["Je peux l'essayer?"],                    promptLang:'en-US' },
]

const DB_FR_EMERGENCY: DrillItem[] = [
  { id:'fr_em1', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'police',       answer:'la police',          variants:['police'],                               promptLang:'en-US' },
  { id:'fr_em2', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'fire',         answer:"l'incendie",         variants:['incendie','le feu','feu'],               promptLang:'en-US' },
  { id:'fr_em3', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'ambulance',    answer:"l'ambulance",        variants:['ambulance'],                            promptLang:'en-US' },
  { id:'fr_em4', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'accident',     answer:"l'accident",         variants:['accident'],                             promptLang:'en-US' },
  { id:'fr_em5', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'help',         answer:"l'aide",             variants:['aide','secours'],                       promptLang:'en-US' },
  { id:'fr_em6', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'Help!',                  answer:'Au secours!',                variants:['À l\'aide!','Au secours'],               promptLang:'en-US' },
  { id:'fr_em7', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'Call the police!',       answer:'Appelez la police!',         variants:['Appelez la police'],                     promptLang:'en-US' },
  { id:'fr_em8', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'This is an emergency.',  answer:"C'est une urgence.",         variants:["C'est urgent"],                          promptLang:'en-US' },
  { id:'fr_em9', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'I have been robbed.',    answer:"J'ai été volé.",             variants:["On m'a volé"],                           promptLang:'en-US' },
]

// ── German: new topics ────────────────────────────────────────────────────────

const DB_DE_HEALTH: DrillItem[] = [
  { id:'de_hl1', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'doctor',       answer:'der Arzt',           variants:['Arzt','die Ärztin','Ärztin'],            promptLang:'en-US' },
  { id:'de_hl2', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'hospital',     answer:'das Krankenhaus',    variants:['Krankenhaus'],                          promptLang:'en-US' },
  { id:'de_hl3', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'medicine',     answer:'das Medikament',     variants:['Medikament','die Medizin','Medizin'],    promptLang:'en-US' },
  { id:'de_hl4', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'pain',         answer:'der Schmerz',        variants:['Schmerz'],                              promptLang:'en-US' },
  { id:'de_hl5', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'fever',        answer:'das Fieber',         variants:['Fieber'],                               promptLang:'en-US' },
  { id:'de_hl6', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'I feel sick.',           answer:'Ich fühle mich krank.',      variants:['Mir ist schlecht'],                      promptLang:'en-US' },
  { id:'de_hl7', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'Call an ambulance!',     answer:'Rufen Sie einen Krankenwagen!', variants:['Ruf einen Krankenwagen!'],            promptLang:'en-US' },
  { id:'de_hl8', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'I need a doctor.',       answer:'Ich brauche einen Arzt.',    variants:['Ich brauche einen Doktor'],              promptLang:'en-US' },
  { id:'de_hl9', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'Where is the pharmacy?', answer:'Wo ist die Apotheke?',       variants:['Wo finde ich eine Apotheke?'],           promptLang:'en-US' },
]

const DB_DE_MONEY: DrillItem[] = [
  { id:'de_mn1', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'bank',         answer:'die Bank',           variants:['Bank'],                                 promptLang:'en-US' },
  { id:'de_mn2', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'ATM',          answer:'der Geldautomat',    variants:['Geldautomat'],                          promptLang:'en-US' },
  { id:'de_mn3', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'credit card',  answer:'die Kreditkarte',    variants:['Kreditkarte'],                          promptLang:'en-US' },
  { id:'de_mn4', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'exchange rate', answer:'der Wechselkurs',    variants:['Wechselkurs'],                          promptLang:'en-US' },
  { id:'de_mn5', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'coin',         answer:'die Münze',          variants:['Münze','Munze'],                         promptLang:'en-US' },
  { id:'de_mn6', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Can I pay by card?',     answer:'Kann ich mit Karte zahlen?', variants:['Kann ich mit Kreditkarte bezahlen?'],    promptLang:'en-US' },
  { id:'de_mn7', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Where is the ATM?',      answer:'Wo ist der Geldautomat?',    variants:['Wo finde ich einen Geldautomaten?'],     promptLang:'en-US' },
  { id:'de_mn8', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'I want to exchange money.',answer:'Ich möchte Geld wechseln.',  variants:['Ich will Geld tauschen'],                promptLang:'en-US' },
  { id:'de_mn9', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Do you accept dollars?',  answer:'Akzeptieren Sie Dollar?',    variants:['Nehmen Sie Dollar?'],                    promptLang:'en-US' },
]

const DB_DE_FAMILY: DrillItem[] = [
  { id:'de_fm1', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'mother',       answer:'die Mutter',         variants:['Mutter','Mama'],                        promptLang:'en-US' },
  { id:'de_fm2', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'father',       answer:'der Vater',          variants:['Vater','Papa'],                         promptLang:'en-US' },
  { id:'de_fm3', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'sister',       answer:'die Schwester',      variants:['Schwester'],                            promptLang:'en-US' },
  { id:'de_fm4', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'brother',      answer:'der Bruder',         variants:['Bruder'],                               promptLang:'en-US' },
  { id:'de_fm5', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'grandparents', answer:'die Großeltern',     variants:['Großeltern','Grosseltern'],              promptLang:'en-US' },
  { id:'de_fm6', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'My family is big.',      answer:'Meine Familie ist groß.',    variants:['Meine Familie ist gross'],               promptLang:'en-US' },
  { id:'de_fm7', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'I have two sisters.',    answer:'Ich habe zwei Schwestern.',  variants:['Ich habe zwei Schwestern'],              promptLang:'en-US' },
  { id:'de_fm8', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'Are you married?',       answer:'Sind Sie verheiratet?',      variants:['Bist du verheiratet?'],                  promptLang:'en-US' },
  { id:'de_fm9', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'I have three children.', answer:'Ich habe drei Kinder.',      variants:['Ich habe drei Kinder'],                  promptLang:'en-US' },
]

const DB_DE_NATURE: DrillItem[] = [
  { id:'de_nt1', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'mountain',     answer:'der Berg',           variants:['Berg'],                                 promptLang:'en-US' },
  { id:'de_nt2', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'river',        answer:'der Fluss',          variants:['Fluss'],                                promptLang:'en-US' },
  { id:'de_nt3', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'forest',       answer:'der Wald',           variants:['Wald'],                                 promptLang:'en-US' },
  { id:'de_nt4', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'weather',      answer:'das Wetter',         variants:['Wetter'],                               promptLang:'en-US' },
  { id:'de_nt5', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'sun',          answer:'die Sonne',          variants:['Sonne'],                                promptLang:'en-US' },
  { id:'de_nt6', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:'The weather is nice.',   answer:'Das Wetter ist schön.',      variants:['Das Wetter ist gut'],                    promptLang:'en-US' },
  { id:'de_nt7', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:"It's raining.",          answer:'Es regnet.',                 variants:['Es regnet'],                             promptLang:'en-US' },
  { id:'de_nt8', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:"It's very hot today.",   answer:'Es ist heute sehr heiß.',    variants:['Es ist sehr heiss heute'],               promptLang:'en-US' },
  { id:'de_nt9', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:'I love the mountains.',  answer:'Ich liebe die Berge.',       variants:['Ich mag die Berge'],                     promptLang:'en-US' },
]

const DB_DE_EDUCATION: DrillItem[] = [
  { id:'de_ed1', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'school',       answer:'die Schule',         variants:['Schule'],                               promptLang:'en-US' },
  { id:'de_ed2', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'student',      answer:'der Student',        variants:['Student','die Studentin','Studentin'],   promptLang:'en-US' },
  { id:'de_ed3', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'teacher',      answer:'der Lehrer',         variants:['Lehrer','die Lehrerin','Lehrerin'],      promptLang:'en-US' },
  { id:'de_ed4', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'class',        answer:'die Klasse',         variants:['Klasse','der Kurs','Kurs'],              promptLang:'en-US' },
  { id:'de_ed5', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'exam',         answer:'die Prüfung',        variants:['Prüfung','Prufung'],                     promptLang:'en-US' },
  { id:'de_ed6', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'I study German.',        answer:'Ich lerne Deutsch.',         variants:['Ich studiere Deutsch'],                  promptLang:'en-US' },
  { id:'de_ed7', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'What is the homework?',  answer:'Was sind die Hausaufgaben?', variants:['Was ist die Hausaufgabe?'],               promptLang:'en-US' },
  { id:'de_ed8', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'The exam is tomorrow.',  answer:'Die Prüfung ist morgen.',    variants:['Die Prufung ist morgen'],                promptLang:'en-US' },
  { id:'de_ed9', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'I go to university.',    answer:'Ich gehe zur Universität.',  variants:['Ich gehe zur Uni'],                      promptLang:'en-US' },
]

const DB_DE_CULTURE: DrillItem[] = [
  { id:'de_cu1', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'museum',       answer:'das Museum',         variants:['Museum'],                               promptLang:'en-US' },
  { id:'de_cu2', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'art',          answer:'die Kunst',          variants:['Kunst'],                                promptLang:'en-US' },
  { id:'de_cu3', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'music',        answer:'die Musik',          variants:['Musik'],                                promptLang:'en-US' },
  { id:'de_cu4', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'festival',     answer:'das Festival',       variants:['Festival','das Fest','Fest'],            promptLang:'en-US' },
  { id:'de_cu5', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'tradition',    answer:'die Tradition',      variants:['Tradition'],                            promptLang:'en-US' },
  { id:'de_cu6', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'I love this music.',     answer:'Ich liebe diese Musik.',     variants:['Ich mag diese Musik'],                   promptLang:'en-US' },
  { id:'de_cu7', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'Where is the museum?',   answer:'Wo ist das Museum?',         variants:['Wo finde ich das Museum?'],              promptLang:'en-US' },
  { id:'de_cu8', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'I like local food.',     answer:'Ich mag die lokale Küche.',  variants:['Ich esse gerne lokales Essen'],           promptLang:'en-US' },
  { id:'de_cu9', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'Is there a festival today?',answer:'Gibt es heute ein Fest?',   variants:['Ist heute ein Festival?'],               promptLang:'en-US' },
]

const DB_DE_POLITICS: DrillItem[] = [
  { id:'de_po1', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'government',   answer:'die Regierung',      variants:['Regierung'],                            promptLang:'en-US' },
  { id:'de_po2', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'election',     answer:'die Wahl',           variants:['Wahl'],                                 promptLang:'en-US' },
  { id:'de_po3', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'law',          answer:'das Gesetz',         variants:['Gesetz'],                               promptLang:'en-US' },
  { id:'de_po4', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'vote',         answer:'die Stimme',         variants:['Stimme','das Votum'],                   promptLang:'en-US' },
  { id:'de_po5', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'president',    answer:'der Präsident',      variants:['Präsident','Prasident'],                promptLang:'en-US' },
  { id:'de_po6', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'When is the election?',  answer:'Wann ist die Wahl?',         variants:['Wann findet die Wahl statt?'],           promptLang:'en-US' },
  { id:'de_po7', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'I follow the news.',     answer:'Ich verfolge die Nachrichten.', variants:['Ich lese Nachrichten'],                promptLang:'en-US' },
  { id:'de_po8', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'The new law passed.',    answer:'Das neue Gesetz wurde verabschiedet.', variants:['Das Gesetz wurde beschlossen'], promptLang:'en-US' },
  { id:'de_po9', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'Did you vote?',          answer:'Haben Sie gewählt?',         variants:['Hast du gewählt?'],                      promptLang:'en-US' },
]

const DB_DE_SCIENCE: DrillItem[] = [
  { id:'de_sc1', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'experiment',   answer:'das Experiment',     variants:['Experiment'],                           promptLang:'en-US' },
  { id:'de_sc2', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'laboratory',   answer:'das Labor',          variants:['Labor'],                                promptLang:'en-US' },
  { id:'de_sc3', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'theory',       answer:'die Theorie',        variants:['Theorie'],                              promptLang:'en-US' },
  { id:'de_sc4', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'data',         answer:'die Daten',          variants:['Daten'],                                promptLang:'en-US' },
  { id:'de_sc5', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'research',     answer:'die Forschung',      variants:['Forschung'],                            promptLang:'en-US' },
  { id:'de_sc6', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'The results are interesting.', answer:'Die Ergebnisse sind interessant.', variants:['Die Resultate sind interessant'], promptLang:'en-US' },
  { id:'de_sc7', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'I study biology.',       answer:'Ich studiere Biologie.',     variants:['Ich lerne Biologie'],                    promptLang:'en-US' },
  { id:'de_sc8', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'We need more data.',     answer:'Wir brauchen mehr Daten.',   variants:['Wir benötigen mehr Daten'],              promptLang:'en-US' },
  { id:'de_sc9', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'The hypothesis is confirmed.', answer:'Die Hypothese ist bestätigt.', variants:['Die Hypothese wurde bestätigt'], promptLang:'en-US' },
]

const DB_DE_SHOPPING: DrillItem[] = [
  { id:'de_sh1', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'store',        answer:'das Geschäft',       variants:['Geschäft','Geschaft','der Laden','Laden'],promptLang:'en-US' },
  { id:'de_sh2', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'price',        answer:'der Preis',          variants:['Preis'],                                promptLang:'en-US' },
  { id:'de_sh3', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'sale',         answer:'der Ausverkauf',     variants:['Ausverkauf','das Angebot','Angebot'],    promptLang:'en-US' },
  { id:'de_sh4', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'size',         answer:'die Größe',          variants:['Größe','Grosse'],                         promptLang:'en-US' },
  { id:'de_sh5', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'receipt',      answer:'der Kassenbon',      variants:['Kassenbon','die Quittung','Quittung'],   promptLang:'en-US' },
  { id:'de_sh6', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Do you have this in large?', answer:'Haben Sie das in Groß?',     variants:['Gibt es das in groß?'],                  promptLang:'en-US' },
  { id:'de_sh7', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:"I'm just looking.",      answer:'Ich schaue nur.',            variants:['Ich sehe mich nur um'],                  promptLang:'en-US' },
  { id:'de_sh8', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Is this on sale?',       answer:'Ist das im Angebot?',        variants:['Ist das reduziert?'],                    promptLang:'en-US' },
  { id:'de_sh9', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Can I try it on?',       answer:'Kann ich das anprobieren?',  variants:['Darf ich das anprobieren?'],             promptLang:'en-US' },
]

const DB_DE_EMERGENCY: DrillItem[] = [
  { id:'de_em1', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'police',       answer:'die Polizei',        variants:['Polizei'],                              promptLang:'en-US' },
  { id:'de_em2', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'fire',         answer:'das Feuer',          variants:['Feuer','der Brand','Brand'],             promptLang:'en-US' },
  { id:'de_em3', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'ambulance',    answer:'der Krankenwagen',   variants:['Krankenwagen'],                         promptLang:'en-US' },
  { id:'de_em4', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'accident',     answer:'der Unfall',         variants:['Unfall'],                               promptLang:'en-US' },
  { id:'de_em5', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'help',         answer:'die Hilfe',          variants:['Hilfe'],                                promptLang:'en-US' },
  { id:'de_em6', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'Help!',                  answer:'Hilfe!',                     variants:['Hilfe'],                                 promptLang:'en-US' },
  { id:'de_em7', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'Call the police!',       answer:'Rufen Sie die Polizei!',     variants:['Ruf die Polizei!'],                      promptLang:'en-US' },
  { id:'de_em8', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'This is an emergency.',  answer:'Das ist ein Notfall.',        variants:['Es ist ein Notfall'],                    promptLang:'en-US' },
  { id:'de_em9', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'I have been robbed.',    answer:'Ich wurde bestohlen.',        variants:['Man hat mich beraubt'],                  promptLang:'en-US' },
]

// ── Chinese: new topics ───────────────────────────────────────────────────────

const DB_ZH_HEALTH: DrillItem[] = [
  { id:'zh_hl1', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'doctor',       answer:'医生',   variants:['医生。','yīshēng','yisheng'],                                      promptLang:'en-US' },
  { id:'zh_hl2', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'hospital',     answer:'医院',   variants:['医院。','yīyuàn','yiyuan'],                                        promptLang:'en-US' },
  { id:'zh_hl3', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'medicine',     answer:'药',     variants:['药。','yào','yao','药物','药物。'],                                  promptLang:'en-US' },
  { id:'zh_hl4', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'pain',         answer:'疼痛',   variants:['疼痛。','téng tòng','teng tong','疼','疼。'],                        promptLang:'en-US' },
  { id:'zh_hl5', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'fever',        answer:'发烧',   variants:['发烧。','fāshāo','fashao'],                                        promptLang:'en-US' },
  { id:'zh_hl6', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'I feel sick.',           answer:'我感觉不舒服',   variants:['我感觉不舒服。','wǒ gǎnjué bù shūfu'],   promptLang:'en-US' },
  { id:'zh_hl7', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'Call an ambulance!',     answer:'叫救护车',       variants:['叫救护车！','jiào jiùhùchē'],              promptLang:'en-US' },
  { id:'zh_hl8', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'I need a doctor.',       answer:'我需要医生',     variants:['我需要医生。','wǒ xūyào yīshēng'],         promptLang:'en-US' },
  { id:'zh_hl9', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'Where is the pharmacy?', answer:'药店在哪里',     variants:['药店在哪里？','yàodiàn zài nǎlǐ'],         promptLang:'en-US' },
]

const DB_ZH_MONEY: DrillItem[] = [
  { id:'zh_mn1', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'bank',         answer:'银行',   variants:['银行。','yínháng','yinhang'],                                      promptLang:'en-US' },
  { id:'zh_mn2', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'ATM',          answer:'取款机', variants:['取款机。','qǔkuǎnjī','qukanji','ATM机','ATM机。'],                  promptLang:'en-US' },
  { id:'zh_mn3', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'credit card',  answer:'信用卡', variants:['信用卡。','xìnyòngkǎ','xinyongka'],                               promptLang:'en-US' },
  { id:'zh_mn4', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'exchange rate', answer:'汇率',  variants:['汇率。','huìlǜ','huilü'],                                          promptLang:'en-US' },
  { id:'zh_mn5', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'coin',         answer:'硬币',   variants:['硬币。','yìngbì','yingbi'],                                        promptLang:'en-US' },
  { id:'zh_mn6', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Can I pay by card?',     answer:'我可以用信用卡付款吗', variants:['可以刷卡吗？','wǒ kěyǐ yòng xìnyòngkǎ fùkuǎn ma'], promptLang:'en-US' },
  { id:'zh_mn7', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Where is the ATM?',      answer:'取款机在哪里',         variants:['取款机在哪里？','ATM在哪'],                promptLang:'en-US' },
  { id:'zh_mn8', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'I want to exchange money.',answer:'我想换钱',            variants:['我想换钱。','wǒ xiǎng huàn qián'],         promptLang:'en-US' },
  { id:'zh_mn9', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Do you accept dollars?',  answer:'你们接受美元吗',       variants:['接受美元吗？','nǐmen jiēshòu měiyuán ma'],  promptLang:'en-US' },
]

const DB_ZH_FAMILY: DrillItem[] = [
  { id:'zh_fm1', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'mother',       answer:'妈妈',   variants:['妈妈。','māmā','mama','母亲','母亲。'],                               promptLang:'en-US' },
  { id:'zh_fm2', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'father',       answer:'爸爸',   variants:['爸爸。','bàbā','baba','父亲','父亲。'],                               promptLang:'en-US' },
  { id:'zh_fm3', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'sister',       answer:'姐姐',   variants:['姐姐。','jiějie','jiejie','妹妹','妹妹。'],                           promptLang:'en-US' },
  { id:'zh_fm4', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'brother',      answer:'哥哥',   variants:['哥哥。','gēgē','gege','弟弟','弟弟。'],                               promptLang:'en-US' },
  { id:'zh_fm5', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'grandparents', answer:'祖父母', variants:['祖父母。','zǔfùmǔ','zufumu','爷爷奶奶','外公外婆'],                  promptLang:'en-US' },
  { id:'zh_fm6', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'My family is big.',      answer:'我的家庭很大',   variants:['我的家庭很大。','我家人很多'],              promptLang:'en-US' },
  { id:'zh_fm7', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'I have two sisters.',    answer:'我有两个姐妹',   variants:['我有两个姐妹。','wǒ yǒu liǎng gè jiěmèi'], promptLang:'en-US' },
  { id:'zh_fm8', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'Are you married?',       answer:'你结婚了吗',     variants:['你结婚了吗？','nǐ jiéhūn le ma'],           promptLang:'en-US' },
  { id:'zh_fm9', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'I have three children.', answer:'我有三个孩子',   variants:['我有三个孩子。','wǒ yǒu sān gè háizi'],     promptLang:'en-US' },
]

const DB_ZH_NATURE: DrillItem[] = [
  { id:'zh_nt1', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'mountain',     answer:'山',     variants:['山。','shān','shan'],                                              promptLang:'en-US' },
  { id:'zh_nt2', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'river',        answer:'河流',   variants:['河流。','héliú','heliu','河','河。'],                                 promptLang:'en-US' },
  { id:'zh_nt3', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'forest',       answer:'森林',   variants:['森林。','sēnlín','senlin'],                                         promptLang:'en-US' },
  { id:'zh_nt4', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'weather',      answer:'天气',   variants:['天气。','tiānqì','tianqi'],                                         promptLang:'en-US' },
  { id:'zh_nt5', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'sun',          answer:'太阳',   variants:['太阳。','tàiyáng','taiyang'],                                       promptLang:'en-US' },
  { id:'zh_nt6', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:'The weather is nice.',   answer:'天气很好',     variants:['天气很好。','tiānqì hěn hǎo'],               promptLang:'en-US' },
  { id:'zh_nt7', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:"It's raining.",          answer:'下雨了',       variants:['下雨了。','xià yǔ le'],                       promptLang:'en-US' },
  { id:'zh_nt8', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:"It's very hot today.",   answer:'今天很热',     variants:['今天很热。','jīntiān hěn rè'],                promptLang:'en-US' },
  { id:'zh_nt9', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:'I love the mountains.',  answer:'我喜欢山',     variants:['我喜欢山。','我爱山'],                         promptLang:'en-US' },
]

const DB_ZH_EDUCATION: DrillItem[] = [
  { id:'zh_ed1', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'school',       answer:'学校',   variants:['学校。','xuéxiào','xuexiao'],                                      promptLang:'en-US' },
  { id:'zh_ed2', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'student',      answer:'学生',   variants:['学生。','xuéshēng','xuesheng'],                                    promptLang:'en-US' },
  { id:'zh_ed3', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'teacher',      answer:'老师',   variants:['老师。','lǎoshī','laoshi'],                                        promptLang:'en-US' },
  { id:'zh_ed4', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'class',        answer:'课',     variants:['课。','kè','ke','课程','课程。'],                                    promptLang:'en-US' },
  { id:'zh_ed5', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'exam',         answer:'考试',   variants:['考试。','kǎoshì','kaoshi'],                                        promptLang:'en-US' },
  { id:'zh_ed6', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'I study Chinese.',       answer:'我学中文',     variants:['我学中文。','我学习汉语'],                   promptLang:'en-US' },
  { id:'zh_ed7', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'What is the homework?',  answer:'作业是什么',   variants:['作业是什么？','zuòyè shì shénme'],            promptLang:'en-US' },
  { id:'zh_ed8', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'The exam is tomorrow.',  answer:'考试是明天',   variants:['考试是明天。','明天有考试'],                   promptLang:'en-US' },
  { id:'zh_ed9', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'I go to university.',    answer:'我上大学',     variants:['我上大学。','wǒ shàng dàxué'],                promptLang:'en-US' },
]

const DB_ZH_CULTURE: DrillItem[] = [
  { id:'zh_cu1', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'museum',       answer:'博物馆', variants:['博物馆。','bówùguǎn','bowuguan'],                                  promptLang:'en-US' },
  { id:'zh_cu2', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'art',          answer:'艺术',   variants:['艺术。','yìshù','yishu'],                                          promptLang:'en-US' },
  { id:'zh_cu3', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'music',        answer:'音乐',   variants:['音乐。','yīnyuè','yinyue'],                                        promptLang:'en-US' },
  { id:'zh_cu4', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'festival',     answer:'节日',   variants:['节日。','jiérì','jieri'],                                          promptLang:'en-US' },
  { id:'zh_cu5', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'tradition',    answer:'传统',   variants:['传统。','chuántǒng','chuantong'],                                  promptLang:'en-US' },
  { id:'zh_cu6', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'I love this music.',     answer:'我喜欢这个音乐', variants:['我喜欢这音乐。','wǒ xǐhuān zhège yīnyuè'], promptLang:'en-US' },
  { id:'zh_cu7', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'Where is the museum?',   answer:'博物馆在哪里',   variants:['博物馆在哪里？','bówùguǎn zài nǎlǐ'],       promptLang:'en-US' },
  { id:'zh_cu8', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'I like local food.',     answer:'我喜欢当地食物', variants:['我喜欢本地美食。'],                          promptLang:'en-US' },
  { id:'zh_cu9', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'Is there a festival today?',answer:'今天有节日吗', variants:['今天有节日吗？','jīntiān yǒu jiérì ma'],     promptLang:'en-US' },
]

const DB_ZH_POLITICS: DrillItem[] = [
  { id:'zh_po1', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'government',   answer:'政府',   variants:['政府。','zhèngfǔ','zhengfu'],                                      promptLang:'en-US' },
  { id:'zh_po2', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'election',     answer:'选举',   variants:['选举。','xuǎnjǔ','xuanju'],                                        promptLang:'en-US' },
  { id:'zh_po3', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'law',          answer:'法律',   variants:['法律。','fǎlǜ','falü','法','法。'],                                  promptLang:'en-US' },
  { id:'zh_po4', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'vote',         answer:'投票',   variants:['投票。','tóupiào','toupiao'],                                      promptLang:'en-US' },
  { id:'zh_po5', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'president',    answer:'总统',   variants:['总统。','zǒngtǒng','zongtong'],                                    promptLang:'en-US' },
  { id:'zh_po6', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'When is the election?',  answer:'选举是什么时候',   variants:['选举是什么时候？','xuǎnjǔ shì shénme shíhòu'], promptLang:'en-US' },
  { id:'zh_po7', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'I follow the news.',     answer:'我看新闻',         variants:['我看新闻。','wǒ kàn xīnwén'],                  promptLang:'en-US' },
  { id:'zh_po8', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'The new law passed.',    answer:'新法律通过了',     variants:['新法律通过了。','xīn fǎlǜ tōngguò le'],       promptLang:'en-US' },
  { id:'zh_po9', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'Did you vote?',          answer:'你投票了吗',       variants:['你投票了吗？','nǐ tóupiào le ma'],              promptLang:'en-US' },
]

const DB_ZH_SCIENCE: DrillItem[] = [
  { id:'zh_sc1', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'experiment',   answer:'实验',   variants:['实验。','shíyàn','shiyan'],                                        promptLang:'en-US' },
  { id:'zh_sc2', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'laboratory',   answer:'实验室', variants:['实验室。','shíyànshì','shiyanshi'],                                promptLang:'en-US' },
  { id:'zh_sc3', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'theory',       answer:'理论',   variants:['理论。','lǐlùn','lilun'],                                          promptLang:'en-US' },
  { id:'zh_sc4', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'data',         answer:'数据',   variants:['数据。','shùjù','shuju'],                                          promptLang:'en-US' },
  { id:'zh_sc5', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'research',     answer:'研究',   variants:['研究。','yánjiū','yanjiu'],                                        promptLang:'en-US' },
  { id:'zh_sc6', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'The results are interesting.', answer:'结果很有趣',   variants:['结果很有趣。','jiéguǒ hěn yǒuqù'],           promptLang:'en-US' },
  { id:'zh_sc7', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'I study biology.',       answer:'我学生物学',   variants:['我学生物学。','wǒ xué shēngwùxué'],             promptLang:'en-US' },
  { id:'zh_sc8', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'We need more data.',     answer:'我们需要更多数据', variants:['需要更多数据。','wǒmen xūyào gèng duō shùjù'], promptLang:'en-US' },
  { id:'zh_sc9', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'The hypothesis is confirmed.', answer:'假设已被证实', variants:['假设被证实了。','jiǎshè yǐ bèi zhèngshí'],  promptLang:'en-US' },
]

const DB_ZH_SHOPPING: DrillItem[] = [
  { id:'zh_sh1', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'store',        answer:'商店',   variants:['商店。','shāngdiàn','shangdian'],                                  promptLang:'en-US' },
  { id:'zh_sh2', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'price',        answer:'价格',   variants:['价格。','jiàgé','jiage'],                                          promptLang:'en-US' },
  { id:'zh_sh3', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'sale',         answer:'打折',   variants:['打折。','dǎzhé','dazhe','促销','促销。'],                             promptLang:'en-US' },
  { id:'zh_sh4', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'size',         answer:'尺寸',   variants:['尺寸。','chǐcùn','chicun','码','码。'],                               promptLang:'en-US' },
  { id:'zh_sh5', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'receipt',      answer:'收据',   variants:['收据。','shōujù','shouju'],                                        promptLang:'en-US' },
  { id:'zh_sh6', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Do you have this in large?', answer:'有大号的吗',   variants:['有大号的吗？','yǒu dà hào de ma'],            promptLang:'en-US' },
  { id:'zh_sh7', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:"I'm just looking.",      answer:'我只是看看',   variants:['我只是看看。','wǒ zhǐshì kàn kàn'],           promptLang:'en-US' },
  { id:'zh_sh8', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Is this on sale?',       answer:'这个打折吗',   variants:['这个打折吗？','zhège dǎzhé ma'],                promptLang:'en-US' },
  { id:'zh_sh9', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Can I try it on?',       answer:'我可以试穿吗', variants:['可以试穿吗？','wǒ kěyǐ shì chuān ma'],         promptLang:'en-US' },
]

const DB_ZH_EMERGENCY: DrillItem[] = [
  { id:'zh_em1', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'police',       answer:'警察',   variants:['警察。','jǐngchá','jingcha'],                                      promptLang:'en-US' },
  { id:'zh_em2', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'fire',         answer:'火灾',   variants:['火灾。','huǒzāi','huozai','火','火。'],                               promptLang:'en-US' },
  { id:'zh_em3', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'ambulance',    answer:'救护车', variants:['救护车。','jiùhùchē','jiuhuche'],                                  promptLang:'en-US' },
  { id:'zh_em4', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'accident',     answer:'事故',   variants:['事故。','shìgù','shigu'],                                          promptLang:'en-US' },
  { id:'zh_em5', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'help',         answer:'帮助',   variants:['帮助。','bāngzhù','bangzhu'],                                      promptLang:'en-US' },
  { id:'zh_em6', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'Help!',                  answer:'救命',         variants:['救命！','jiùmìng'],                           promptLang:'en-US' },
  { id:'zh_em7', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'Call the police!',       answer:'叫警察',       variants:['叫警察！','jiào jǐngchá'],                    promptLang:'en-US' },
  { id:'zh_em8', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'This is an emergency.',  answer:'这是紧急情况', variants:['这是紧急情况！','zhè shì jǐnjí qíngkuàng'],   promptLang:'en-US' },
  { id:'zh_em9', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'I have been robbed.',    answer:'我被偷了',     variants:['我被抢了。','wǒ bèi tōu le'],                 promptLang:'en-US' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const NEW_TOPICS_ES = [...DB_ES_HEALTH, ...DB_ES_MONEY, ...DB_ES_FAMILY, ...DB_ES_NATURE, ...DB_ES_EDUCATION, ...DB_ES_CULTURE, ...DB_ES_POLITICS, ...DB_ES_SCIENCE, ...DB_ES_SHOPPING, ...DB_ES_EMERGENCY]
const NEW_TOPICS_FR = [...DB_FR_HEALTH, ...DB_FR_MONEY, ...DB_FR_FAMILY, ...DB_FR_NATURE, ...DB_FR_EDUCATION, ...DB_FR_CULTURE, ...DB_FR_POLITICS, ...DB_FR_SCIENCE, ...DB_FR_SHOPPING, ...DB_FR_EMERGENCY]
const NEW_TOPICS_DE = [...DB_DE_HEALTH, ...DB_DE_MONEY, ...DB_DE_FAMILY, ...DB_DE_NATURE, ...DB_DE_EDUCATION, ...DB_DE_CULTURE, ...DB_DE_POLITICS, ...DB_DE_SCIENCE, ...DB_DE_SHOPPING, ...DB_DE_EMERGENCY]
const NEW_TOPICS_ZH = [...DB_ZH_HEALTH, ...DB_ZH_MONEY, ...DB_ZH_FAMILY, ...DB_ZH_NATURE, ...DB_ZH_EDUCATION, ...DB_ZH_CULTURE, ...DB_ZH_POLITICS, ...DB_ZH_SCIENCE, ...DB_ZH_SHOPPING, ...DB_ZH_EMERGENCY]

// ── Japanese ──────────────────────────────────────────────────────────────────

const DB_JA: DrillItem[] = [
  { id:'ja_tr1',  type:'translation', topic:'daily',  instruction:'Translate to Japanese.', prompt:'Good morning.',                    answer:'おはようございます',       variants:['おはよう','Ohayou gozaimasu'],                                       promptLang:'en-US' },
  { id:'ja_tr2',  type:'translation', topic:'travel', instruction:'Translate to Japanese.', prompt:'Where is the hotel?',              answer:'ホテルはどこですか',        variants:['ホテルはどこですか？','Hoteru wa doko desu ka'],                     promptLang:'en-US' },
  { id:'ja_tr3',  type:'translation', topic:'daily',  instruction:'Translate to Japanese.', prompt:'I do not understand.',             answer:'わかりません',             variants:['わかりません。','Wakarimasen'],                                       promptLang:'en-US' },
  { id:'ja_tr4',  type:'translation', topic:'daily',  instruction:'Translate to Japanese.', prompt:'Please speak more slowly.',        answer:'もっとゆっくり話してください',variants:['もっとゆっくりはなしてください','Motto yukkuri hanashite kudasai'],  promptLang:'en-US' },
  { id:'ja_tr5',  type:'translation', topic:'travel', instruction:'Translate to Japanese.', prompt:'We need a taxi.',                  answer:'タクシーが必要です',        variants:['タクシーがひつようです','Takushii ga hitsuyou desu'],                 promptLang:'en-US' },
  { id:'ja_tr6',  type:'translation', topic:'travel', instruction:'Translate to Japanese.', prompt:'What time does the train leave?',  answer:'電車は何時に出発しますか',   variants:['電車は何時に出発しますか？','Densha wa nanji ni shuppatsu shimasu ka'], promptLang:'en-US' },
  { id:'ja_tr7',  type:'translation', topic:'travel', instruction:'Translate to Japanese.', prompt:'I am looking for the embassy.',    answer:'大使館を探しています',      variants:['大使館をさがしています','Taishikan o sagashite imasu'],               promptLang:'en-US' },
  { id:'ja_tr8',  type:'translation', topic:'travel', instruction:'Translate to Japanese.', prompt:'How much does this cost?',         answer:'これはいくらですか',        variants:['これはいくらですか？','Kore wa ikura desu ka'],                      promptLang:'en-US' },
  { id:'ja_tr9',  type:'translation', topic:'travel', instruction:'Translate to Japanese.', prompt:'My passport is at the hotel.',     answer:'パスポートはホテルにあります',variants:['パスポートはホテルにあります。'],                                    promptLang:'en-US' },
  { id:'ja_tr10', type:'translation', topic:'daily',  instruction:'Translate to Japanese.', prompt:'Do you speak English?',            answer:'英語を話せますか',          variants:['英語を話せますか？','えいごをはなせますか','Eigo o hanasemasu ka'],   promptLang:'en-US' },
  { id:'ja_sub1', type:'substitution', topic:'daily',  instruction:'Substitute the cued element.', prompt:'私は英語を話します。→ [私たち]',      answer:'私たちは英語を話します。',    promptLang:'ja-JP' },
  { id:'ja_sub2', type:'substitution', topic:'daily',  instruction:'Substitute the cued element.', prompt:'彼女は東京に住んでいます。→ [彼ら]',  answer:'彼らは東京に住んでいます。',  promptLang:'ja-JP' },
  { id:'ja_sub3', type:'substitution', topic:'work',   instruction:'Substitute the cued element.', prompt:'あなたはここで働いています。→ [彼]',  answer:'彼はここで働いています。',    promptLang:'ja-JP' },
  { id:'ja_sub4', type:'substitution', topic:'travel', instruction:'Substitute the cued element.', prompt:'電車は三時に着きます。→ [飛行機]',   answer:'飛行機は三時に着きます。',    promptLang:'ja-JP' },
  { id:'ja_sub5', type:'substitution', topic:'travel', instruction:'Substitute the cued element.', prompt:'私はパスポートを持っています。→ [彼女]',answer:'彼女はパスポートを持っています。', promptLang:'ja-JP' },
  { id:'ja_tf1',  type:'transformation', topic:'work',  instruction:'Make the sentence negative.',   prompt:'彼はここで働いています。',   answer:'彼はここで働いていません。',   promptLang:'ja-JP' },
  { id:'ja_tf2',  type:'transformation', topic:'daily', instruction:'Make the sentence negative.',   prompt:'彼らは大阪に住んでいます。', answer:'彼らは大阪に住んでいません。', promptLang:'ja-JP' },
  { id:'ja_tf3',  type:'transformation', topic:'daily', instruction:'Remove the negation.',          prompt:'私はお金を持っていません。', answer:'私はお金を持っています。',    promptLang:'ja-JP' },
  { id:'ja_tf4',  type:'transformation', topic:'daily', instruction:'Convert to a yes/no question.', prompt:'あなたは日本語を話します。', answer:'あなたは日本語を話しますか。', variants:['あなたは日本語を話しますか？'], promptLang:'ja-JP' },
  { id:'ja_tf5',  type:'transformation', topic:'daily', instruction:'Make the sentence negative.',   prompt:'私たちは日本語を話します。', answer:'私たちは日本語を話しません。', promptLang:'ja-JP' },
]

const DB_JA_VOCAB: DrillItem[] = [
  { id:'ja_v1',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'water',   answer:'水',     variants:['みず','mizu'],                           promptLang:'en-US' },
  { id:'ja_v2',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'house',   answer:'家',     variants:['いえ','ie','うち'],                       promptLang:'en-US' },
  { id:'ja_v3',  type:'translation', category:'vocab', topic:'food',   instruction:'Translate the word.', prompt:'food',    answer:'食べ物',  variants:['たべもの','tabemono'],                    promptLang:'en-US' },
  { id:'ja_v4',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'money',   answer:'お金',   variants:['おかね','okane','かね'],                  promptLang:'en-US' },
  { id:'ja_v5',  type:'translation', category:'vocab', topic:'work',   instruction:'Translate the word.', prompt:'work',    answer:'仕事',   variants:['しごと','shigoto'],                       promptLang:'en-US' },
  { id:'ja_v6',  type:'translation', category:'vocab', topic:'travel', instruction:'Translate the word.', prompt:'city',    answer:'都市',   variants:['とし','toshi','まち'],                    promptLang:'en-US' },
  { id:'ja_v7',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'time',    answer:'時間',   variants:['じかん','jikan'],                         promptLang:'en-US' },
  { id:'ja_v8',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'book',    answer:'本',     variants:['ほん','hon'],                             promptLang:'en-US' },
  { id:'ja_v9',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'door',    answer:'ドア',   variants:['doa'],                                    promptLang:'en-US' },
  { id:'ja_v10', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'day',     answer:'日',     variants:['にち','ひ','hi','nichi'],                 promptLang:'en-US' },
  { id:'ja_v11', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'night',   answer:'夜',     variants:['よる','yoru'],                            promptLang:'en-US' },
  { id:'ja_v12', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'man',     answer:'男性',   variants:['だんせい','dansei','男'],                 promptLang:'en-US' },
  { id:'ja_v13', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'woman',   answer:'女性',   variants:['じょせい','josei','女'],                  promptLang:'en-US' },
  { id:'ja_v14', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'friend',  answer:'友達',   variants:['ともだち','tomodachi'],                   promptLang:'en-US' },
  { id:'ja_v15', type:'translation', category:'vocab', topic:'travel', instruction:'Translate the word.', prompt:'country', answer:'国',     variants:['くに','kuni'],                            promptLang:'en-US' },
]

const DB_JA_PHRASES: DrillItem[] = [
  { id:'ja_ph1',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Thank you.',         answer:'ありがとうございます', variants:['ありがとう','Arigatou gozaimasu'],               promptLang:'en-US' },
  { id:'ja_ph2',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:"You're welcome.",    answer:'どういたしまして',     variants:['Dou itashimashite'],                            promptLang:'en-US' },
  { id:'ja_ph3',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Excuse me.',         answer:'すみません',           variants:['Sumimasen'],                                    promptLang:'en-US' },
  { id:'ja_ph4',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:"I'm sorry.",         answer:'ごめんなさい',         variants:['Gomen nasai'],                                  promptLang:'en-US' },
  { id:'ja_ph5',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'How are you?',       answer:'お元気ですか',         variants:['お元気ですか？','Ogenki desu ka'],               promptLang:'en-US' },
  { id:'ja_ph6',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Nice to meet you.',  answer:'はじめまして',         variants:['Hajimemashite'],                                promptLang:'en-US' },
  { id:'ja_ph7',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'See you later.',     answer:'またね',               variants:['さようなら','Mata ne','Sayounara'],              promptLang:'en-US' },
  { id:'ja_ph8',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Good luck.',         answer:'がんばってください',   variants:['がんばって','Ganbatte kudasai'],                 promptLang:'en-US' },
  { id:'ja_ph9',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Of course.',         answer:'もちろん',             variants:['Mochiron'],                                     promptLang:'en-US' },
  { id:'ja_ph10', type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'No problem.',        answer:'大丈夫です',           variants:['だいじょうぶ','Daijoubu desu'],                  promptLang:'en-US' },
]

const DB_JA_SPORT: DrillItem[] = [
  { id:'ja_sp1', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'ball',       answer:'ボール',   variants:['booru'],                                        promptLang:'en-US' },
  { id:'ja_sp2', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'team',       answer:'チーム',   variants:['chiimu'],                                       promptLang:'en-US' },
  { id:'ja_sp3', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'match',      answer:'試合',     variants:['しあい','shiai'],                               promptLang:'en-US' },
  { id:'ja_sp4', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'player',     answer:'選手',     variants:['せんしゅ','senshu'],                            promptLang:'en-US' },
  { id:'ja_sp5', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'score',      answer:'スコア',   variants:['sukoa'],                                        promptLang:'en-US' },
  { id:'ja_sp6', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'stadium',    answer:'スタジアム',variants:['sutajiamu'],                                    promptLang:'en-US' },
  { id:'ja_sp7', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:"What's the score?", answer:'スコアはいくつですか', variants:['スコアはいくつですか？'],  promptLang:'en-US' },
  { id:'ja_sp8', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:'We won!',           answer:'勝ちました',          variants:['かちました','勝ちました！'], promptLang:'en-US' },
  { id:'ja_sp9', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:"Let's play.",        answer:'遊びましょう',        variants:['あそびましょう','やりましょう'], promptLang:'en-US' },
]

const DB_JA_TECH: DrillItem[] = [
  { id:'ja_tc1', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'phone',      answer:'スマホ',      variants:['電話','でんわ','denwa'],                          promptLang:'en-US' },
  { id:'ja_tc2', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'computer',   answer:'コンピュータ', variants:['パソコン','pasokon'],                            promptLang:'en-US' },
  { id:'ja_tc3', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'internet',   answer:'インターネット',variants:['intaanetto'],                                    promptLang:'en-US' },
  { id:'ja_tc4', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'email',      answer:'メール',      variants:['meeru'],                                         promptLang:'en-US' },
  { id:'ja_tc5', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'app',        answer:'アプリ',      variants:['apuri'],                                         promptLang:'en-US' },
  { id:'ja_tc6', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'password',   answer:'パスワード',  variants:['pasuwaado'],                                     promptLang:'en-US' },
  { id:'ja_tc7', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:"What's the wifi password?", answer:'ワイファイのパスワードは何ですか', variants:['WiFiのパスワードは何ですか？'], promptLang:'en-US' },
  { id:'ja_tc8', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:'My phone is dead.',         answer:'スマホの充電が切れました',      variants:['スマホのバッテリーが切れました'],          promptLang:'en-US' },
  { id:'ja_tc9', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:'Can I use the wifi?',       answer:'ワイファイを使ってもいいですか', variants:['WiFiを使ってもいいですか？'],              promptLang:'en-US' },
]

const DB_JA_FOOD: DrillItem[] = [
  { id:'ja_fd1', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'restaurant',  answer:'レストラン',variants:['resutoran'],                                       promptLang:'en-US' },
  { id:'ja_fd2', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'menu',        answer:'メニュー',  variants:['menyuu'],                                          promptLang:'en-US' },
  { id:'ja_fd3', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'bread',       answer:'パン',      variants:['pan'],                                             promptLang:'en-US' },
  { id:'ja_fd4', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'coffee',      answer:'コーヒー',  variants:['koohii'],                                          promptLang:'en-US' },
  { id:'ja_fd5', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'wine',        answer:'ワイン',    variants:['wain'],                                            promptLang:'en-US' },
  { id:'ja_fd6', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'bill',        answer:'お会計',    variants:['おかいけい','okaikei'],                            promptLang:'en-US' },
  { id:'ja_fd7', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:'The bill, please.',       answer:'お会計をお願いします',   variants:['お会計をおねがいします'],              promptLang:'en-US' },
  { id:'ja_fd8', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:"It's delicious!",         answer:'おいしい',              variants:['おいしい！','美味しいです'],            promptLang:'en-US' },
  { id:'ja_fd9', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:'A table for two, please.', answer:'二人席をお願いします',   variants:['ふたりせきをおねがいします'],          promptLang:'en-US' },
]

const DB_JA_WORK: DrillItem[] = [
  { id:'ja_wk1', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'office',      answer:'オフィス', variants:['ofisu'],                                           promptLang:'en-US' },
  { id:'ja_wk2', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'meeting',     answer:'会議',     variants:['かいぎ','kaigi'],                                  promptLang:'en-US' },
  { id:'ja_wk3', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'colleague',   answer:'同僚',     variants:['どうりょう','douryou'],                            promptLang:'en-US' },
  { id:'ja_wk4', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'report',      answer:'レポート', variants:['報告書','ほうこくしょ','repooto'],                 promptLang:'en-US' },
  { id:'ja_wk5', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'deadline',    answer:'締め切り', variants:['しめきり','shimekiri'],                            promptLang:'en-US' },
  { id:'ja_wk6', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'manager',     answer:'上司',     variants:['じょうし','joushi','マネージャー'],                promptLang:'en-US' },
  { id:'ja_wk7', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:'We have a meeting.',        answer:'会議があります',       variants:['かいぎがあります'],               promptLang:'en-US' },
  { id:'ja_wk8', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:"I'll send you an email.",    answer:'メールを送ります',     variants:['メールをおくります'],             promptLang:'en-US' },
  { id:'ja_wk9', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:'The deadline is on Monday.', answer:'締め切りは月曜日です', variants:['しめきりはげつようびです'],       promptLang:'en-US' },
]

// ── Japanese: new topics ──────────────────────────────────────────────────────

const DB_JA_HEALTH: DrillItem[] = [
  { id:'ja_hl1', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'doctor',       answer:'医者',     variants:['いしゃ','isha','お医者さん'],                      promptLang:'en-US' },
  { id:'ja_hl2', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'hospital',     answer:'病院',     variants:['びょういん','byouin'],                            promptLang:'en-US' },
  { id:'ja_hl3', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'medicine',     answer:'薬',       variants:['くすり','kusuri'],                                promptLang:'en-US' },
  { id:'ja_hl4', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'pain',         answer:'痛み',     variants:['いたみ','itami'],                                 promptLang:'en-US' },
  { id:'ja_hl5', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'fever',        answer:'熱',       variants:['ねつ','netsu'],                                   promptLang:'en-US' },
  { id:'ja_hl6', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'I feel sick.',           answer:'気分が悪いです',       variants:['きぶんがわるいです','体調が悪いです'], promptLang:'en-US' },
  { id:'ja_hl7', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'Call an ambulance!',     answer:'救急車を呼んでください', variants:['きゅうきゅうしゃをよんでください'],    promptLang:'en-US' },
  { id:'ja_hl8', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'I need a doctor.',       answer:'医者が必要です',       variants:['いしゃがひつようです'],               promptLang:'en-US' },
  { id:'ja_hl9', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'Where is the pharmacy?', answer:'薬局はどこですか',     variants:['薬局はどこですか？','やっきょくはどこですか'], promptLang:'en-US' },
]

const DB_JA_MONEY: DrillItem[] = [
  { id:'ja_mn1', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'bank',          answer:'銀行',       variants:['ぎんこう','ginkou'],                              promptLang:'en-US' },
  { id:'ja_mn2', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'ATM',           answer:'ATM',         variants:['エーティーエム'],                                 promptLang:'en-US' },
  { id:'ja_mn3', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'credit card',   answer:'クレジットカード',variants:['kurejitto kaado'],                           promptLang:'en-US' },
  { id:'ja_mn4', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'exchange rate',  answer:'為替レート', variants:['かわせレート','kawase reeto'],                    promptLang:'en-US' },
  { id:'ja_mn5', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'coin',          answer:'硬貨',       variants:['こうか','kouka','コイン'],                        promptLang:'en-US' },
  { id:'ja_mn6', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Can I pay by card?',      answer:'カードで払えますか',   variants:['カードで払えますか？'],              promptLang:'en-US' },
  { id:'ja_mn7', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Where is the ATM?',       answer:'ATMはどこですか',     variants:['ATMはどこですか？'],                  promptLang:'en-US' },
  { id:'ja_mn8', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'I want to exchange money.',answer:'お金を両替したいです', variants:['おかねをりょうがえしたいです'],        promptLang:'en-US' },
  { id:'ja_mn9', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Do you accept dollars?',   answer:'ドルは使えますか',    variants:['ドルは使えますか？','ドルで払えますか'], promptLang:'en-US' },
]

const DB_JA_FAMILY: DrillItem[] = [
  { id:'ja_fm1', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'mother',       answer:'お母さん', variants:['おかあさん','okaasan','母','はは'],                promptLang:'en-US' },
  { id:'ja_fm2', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'father',       answer:'お父さん', variants:['おとうさん','otousan','父','ちち'],                promptLang:'en-US' },
  { id:'ja_fm3', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'sister',       answer:'姉',       variants:['あね','ane','妹','いもうと'],                      promptLang:'en-US' },
  { id:'ja_fm4', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'brother',      answer:'兄',       variants:['あに','ani','弟','おとうと'],                      promptLang:'en-US' },
  { id:'ja_fm5', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'grandparents', answer:'祖父母',   variants:['そふぼ','sofubo'],                                promptLang:'en-US' },
  { id:'ja_fm6', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'My family is big.',      answer:'家族が多いです',   variants:['かぞくがおおいです'],                    promptLang:'en-US' },
  { id:'ja_fm7', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'I have two sisters.',    answer:'姉妹が二人います', variants:['しまいがふたりいます'],                  promptLang:'en-US' },
  { id:'ja_fm8', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'Are you married?',       answer:'結婚していますか', variants:['けっこんしていますか？'],                promptLang:'en-US' },
  { id:'ja_fm9', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'I have three children.', answer:'子供が三人います', variants:['こどもがさんにんいます'],                promptLang:'en-US' },
]

const DB_JA_NATURE: DrillItem[] = [
  { id:'ja_nt1', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'mountain',   answer:'山',   variants:['やま','yama'],                                     promptLang:'en-US' },
  { id:'ja_nt2', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'river',      answer:'川',   variants:['かわ','kawa'],                                     promptLang:'en-US' },
  { id:'ja_nt3', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'forest',     answer:'森',   variants:['もり','mori'],                                     promptLang:'en-US' },
  { id:'ja_nt4', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'weather',    answer:'天気', variants:['てんき','tenki'],                                  promptLang:'en-US' },
  { id:'ja_nt5', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'sun',        answer:'太陽', variants:['たいよう','taiyou'],                               promptLang:'en-US' },
  { id:'ja_nt6', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:'The weather is nice.',  answer:'いい天気ですね',    variants:['いいてんきですね'],                  promptLang:'en-US' },
  { id:'ja_nt7', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:"It's raining.",         answer:'雨が降っています',  variants:['あめがふっています'],                promptLang:'en-US' },
  { id:'ja_nt8', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:"It's very hot today.",  answer:'今日はとても暑いです',variants:['きょうはとてもあついです'],          promptLang:'en-US' },
  { id:'ja_nt9', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:'I love the mountains.', answer:'山が大好きです',    variants:['やまがだいすきです'],                promptLang:'en-US' },
]

const DB_JA_EDUCATION: DrillItem[] = [
  { id:'ja_ed1', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'school',    answer:'学校', variants:['がっこう','gakkou'],                               promptLang:'en-US' },
  { id:'ja_ed2', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'student',   answer:'学生', variants:['がくせい','gakusei'],                              promptLang:'en-US' },
  { id:'ja_ed3', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'teacher',   answer:'先生', variants:['せんせい','sensei'],                               promptLang:'en-US' },
  { id:'ja_ed4', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'class',     answer:'授業', variants:['じゅぎょう','jugyou','クラス'],                    promptLang:'en-US' },
  { id:'ja_ed5', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'exam',      answer:'試験', variants:['しけん','shiken','テスト'],                        promptLang:'en-US' },
  { id:'ja_ed6', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'I study Japanese.',      answer:'日本語を勉強しています', variants:['にほんごをべんきょうしています'], promptLang:'en-US' },
  { id:'ja_ed7', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'What is the homework?',  answer:'宿題は何ですか',         variants:['しゅくだいはなんですか？'],        promptLang:'en-US' },
  { id:'ja_ed8', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'The exam is tomorrow.',  answer:'明日試験があります',     variants:['あしたしけんがあります'],          promptLang:'en-US' },
  { id:'ja_ed9', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'I go to university.',    answer:'大学に通っています',     variants:['だいがくにかよっています'],        promptLang:'en-US' },
]

const DB_JA_CULTURE: DrillItem[] = [
  { id:'ja_cu1', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'museum',    answer:'博物館', variants:['はくぶつかん','hakubutsukan'],                      promptLang:'en-US' },
  { id:'ja_cu2', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'art',       answer:'芸術',   variants:['げいじゅつ','geijutsu'],                           promptLang:'en-US' },
  { id:'ja_cu3', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'music',     answer:'音楽',   variants:['おんがく','ongaku'],                               promptLang:'en-US' },
  { id:'ja_cu4', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'festival',  answer:'祭り',   variants:['まつり','matsuri'],                                promptLang:'en-US' },
  { id:'ja_cu5', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'tradition', answer:'伝統',   variants:['でんとう','dentou'],                               promptLang:'en-US' },
  { id:'ja_cu6', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'I love this music.',        answer:'この音楽が大好きです', variants:['このおんがくがだいすきです'],   promptLang:'en-US' },
  { id:'ja_cu7', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'Where is the museum?',      answer:'博物館はどこですか',   variants:['はくぶつかんはどこですか？'],   promptLang:'en-US' },
  { id:'ja_cu8', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'I like local food.',        answer:'地元の料理が好きです', variants:['じもとのりょうりがすきです'],   promptLang:'en-US' },
  { id:'ja_cu9', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'Is there a festival today?', answer:'今日祭りがありますか', variants:['きょうまつりがありますか？'],   promptLang:'en-US' },
]

const DB_JA_POLITICS: DrillItem[] = [
  { id:'ja_po1', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'government', answer:'政府',   variants:['せいふ','seifu'],                                  promptLang:'en-US' },
  { id:'ja_po2', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'election',   answer:'選挙',   variants:['せんきょ','senkyo'],                               promptLang:'en-US' },
  { id:'ja_po3', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'law',        answer:'法律',   variants:['ほうりつ','houritsu'],                             promptLang:'en-US' },
  { id:'ja_po4', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'vote',       answer:'投票',   variants:['とうひょう','touhyou'],                            promptLang:'en-US' },
  { id:'ja_po5', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'president',  answer:'大統領', variants:['だいとうりょう','daitouryou'],                     promptLang:'en-US' },
  { id:'ja_po6', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'When is the election?', answer:'選挙はいつですか',     variants:['せんきょはいつですか？'],          promptLang:'en-US' },
  { id:'ja_po7', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'I follow the news.',    answer:'ニュースを見ています',  variants:['ニュースをみています'],            promptLang:'en-US' },
  { id:'ja_po8', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'The new law passed.',   answer:'新しい法律が通りました', variants:['あたらしいほうりつがとおりました'], promptLang:'en-US' },
  { id:'ja_po9', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'Did you vote?',         answer:'投票しましたか',       variants:['とうひょうしましたか？'],          promptLang:'en-US' },
]

const DB_JA_SCIENCE: DrillItem[] = [
  { id:'ja_sc1', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'experiment', answer:'実験',   variants:['じっけん','jikken'],                               promptLang:'en-US' },
  { id:'ja_sc2', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'laboratory', answer:'実験室', variants:['じっけんしつ','jikkenshitsu','ラボ'],              promptLang:'en-US' },
  { id:'ja_sc3', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'theory',     answer:'理論',   variants:['りろん','riron'],                                  promptLang:'en-US' },
  { id:'ja_sc4', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'data',       answer:'データ', variants:['deeta'],                                          promptLang:'en-US' },
  { id:'ja_sc5', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'research',   answer:'研究',   variants:['けんきゅう','kenkyuu'],                            promptLang:'en-US' },
  { id:'ja_sc6', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'The results are interesting.', answer:'結果が面白いです',    variants:['けっかがおもしろいです'],       promptLang:'en-US' },
  { id:'ja_sc7', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'I study biology.',            answer:'生物学を勉強しています',variants:['せいぶつがくをべんきょうしています'], promptLang:'en-US' },
  { id:'ja_sc8', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'We need more data.',          answer:'もっとデータが必要です',variants:['もっとデータがひつようです'],   promptLang:'en-US' },
  { id:'ja_sc9', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'The hypothesis is confirmed.', answer:'仮説が確認されました', variants:['かせつがかくにんされました'],   promptLang:'en-US' },
]

const DB_JA_SHOPPING: DrillItem[] = [
  { id:'ja_sh1', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'store',    answer:'店',     variants:['みせ','mise','お店'],                              promptLang:'en-US' },
  { id:'ja_sh2', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'price',    answer:'値段',   variants:['ねだん','nedan'],                                  promptLang:'en-US' },
  { id:'ja_sh3', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'sale',     answer:'セール', variants:['seeru'],                                          promptLang:'en-US' },
  { id:'ja_sh4', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'size',     answer:'サイズ', variants:['saizu'],                                          promptLang:'en-US' },
  { id:'ja_sh5', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'receipt',  answer:'レシート',variants:['reshiito'],                                     promptLang:'en-US' },
  { id:'ja_sh6', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Do you have this in large?', answer:'大きいサイズはありますか', variants:['おおきいサイズはありますか？'], promptLang:'en-US' },
  { id:'ja_sh7', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:"I'm just looking.",      answer:'見ているだけです', variants:['みているだけです'],             promptLang:'en-US' },
  { id:'ja_sh8', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Is this on sale?',       answer:'セール中ですか',   variants:['セールちゅうですか？'],         promptLang:'en-US' },
  { id:'ja_sh9', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Can I try it on?',       answer:'試着できますか',   variants:['しちゃくできますか？'],         promptLang:'en-US' },
]

const DB_JA_EMERGENCY: DrillItem[] = [
  { id:'ja_em1', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'police',    answer:'警察',   variants:['けいさつ','keisatsu'],                             promptLang:'en-US' },
  { id:'ja_em2', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'fire',      answer:'火事',   variants:['かじ','kaji'],                                     promptLang:'en-US' },
  { id:'ja_em3', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'ambulance', answer:'救急車', variants:['きゅうきゅうしゃ','kyuukyuusha'],                  promptLang:'en-US' },
  { id:'ja_em4', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'accident',  answer:'事故',   variants:['じこ','jiko'],                                     promptLang:'en-US' },
  { id:'ja_em5', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'help',      answer:'助け',   variants:['たすけ','tasuke'],                                 promptLang:'en-US' },
  { id:'ja_em6', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'Help!',                 answer:'助けてください',     variants:['たすけてください！','助けて！'],    promptLang:'en-US' },
  { id:'ja_em7', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'Call the police!',      answer:'警察を呼んでください', variants:['けいさつをよんでください！'],      promptLang:'en-US' },
  { id:'ja_em8', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'This is an emergency.', answer:'緊急事態です',       variants:['きんきゅうじたいです'],            promptLang:'en-US' },
  { id:'ja_em9', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'I have been robbed.',   answer:'盗まれました',       variants:['ぬすまれました','スリに遭いました'], promptLang:'en-US' },
]

// ── Korean ────────────────────────────────────────────────────────────────────

const DB_KO: DrillItem[] = [
  { id:'ko_tr1',  type:'translation', topic:'daily',  instruction:'Translate to Korean.', prompt:'Good morning.',                    answer:'안녕하세요',           variants:['안녕하세요.','annyeonghaseyo'],                                    promptLang:'en-US' },
  { id:'ko_tr2',  type:'translation', topic:'travel', instruction:'Translate to Korean.', prompt:'Where is the hotel?',              answer:'호텔이 어디예요',       variants:['호텔이 어디예요?','hoteli eodiyeyo'],                              promptLang:'en-US' },
  { id:'ko_tr3',  type:'translation', topic:'daily',  instruction:'Translate to Korean.', prompt:'I do not understand.',             answer:'이해가 안 돼요',        variants:['이해가 안 돼요.','모르겠어요','ihaega an dwaeyo'],                 promptLang:'en-US' },
  { id:'ko_tr4',  type:'translation', topic:'daily',  instruction:'Translate to Korean.', prompt:'Please speak more slowly.',        answer:'더 천천히 말씀해 주세요', variants:['더 천천히 말해 주세요','deo cheoncheonhi malssumhae juseyo'],    promptLang:'en-US' },
  { id:'ko_tr5',  type:'translation', topic:'travel', instruction:'Translate to Korean.', prompt:'We need a taxi.',                  answer:'택시가 필요해요',       variants:['택시가 필요해요.','taeksiga piryohaeyo'],                          promptLang:'en-US' },
  { id:'ko_tr6',  type:'translation', topic:'travel', instruction:'Translate to Korean.', prompt:'What time does the train leave?',  answer:'기차가 몇 시에 출발해요', variants:['기차가 몇 시에 출발해요?','gichaga myeot sie chulbalhaeyo'],     promptLang:'en-US' },
  { id:'ko_tr7',  type:'translation', topic:'travel', instruction:'Translate to Korean.', prompt:'I am looking for the embassy.',    answer:'대사관을 찾고 있어요',   variants:['대사관을 찾고 있어요.','daesagwaneul chatgo isseoyo'],            promptLang:'en-US' },
  { id:'ko_tr8',  type:'translation', topic:'travel', instruction:'Translate to Korean.', prompt:'How much does this cost?',         answer:'이게 얼마예요',         variants:['이게 얼마예요?','ige eolmayeyo'],                                 promptLang:'en-US' },
  { id:'ko_tr9',  type:'translation', topic:'travel', instruction:'Translate to Korean.', prompt:'My passport is at the hotel.',     answer:'제 여권은 호텔에 있어요', variants:['제 여권은 호텔에 있어요.','je yeokkwoneun hotere isseoyo'],      promptLang:'en-US' },
  { id:'ko_tr10', type:'translation', topic:'daily',  instruction:'Translate to Korean.', prompt:'Do you speak English?',            answer:'영어를 하세요',         variants:['영어를 하세요?','영어 할 줄 아세요?','yeongoreul haseyo'],        promptLang:'en-US' },
  { id:'ko_sub1', type:'substitution', topic:'daily',  instruction:'Substitute the cued element.', prompt:'저는 영어를 해요. → [우리]',      answer:'우리는 영어를 해요.',    promptLang:'ko-KR' },
  { id:'ko_sub2', type:'substitution', topic:'daily',  instruction:'Substitute the cued element.', prompt:'그녀는 서울에 살아요. → [그들]',  answer:'그들은 서울에 살아요.',  promptLang:'ko-KR' },
  { id:'ko_sub3', type:'substitution', topic:'work',   instruction:'Substitute the cued element.', prompt:'당신은 여기서 일해요. → [그]',   answer:'그는 여기서 일해요.',    promptLang:'ko-KR' },
  { id:'ko_sub4', type:'substitution', topic:'travel', instruction:'Substitute the cued element.', prompt:'기차가 세 시에 도착해요. → [비행기]',answer:'비행기가 세 시에 도착해요.', promptLang:'ko-KR' },
  { id:'ko_sub5', type:'substitution', topic:'travel', instruction:'Substitute the cued element.', prompt:'저는 여권을 가지고 있어요. → [그녀]',answer:'그녀는 여권을 가지고 있어요.', promptLang:'ko-KR' },
  { id:'ko_tf1',  type:'transformation', topic:'work',  instruction:'Make the sentence negative.',   prompt:'그는 여기서 일해요.',   answer:'그는 여기서 일하지 않아요.',  variants:['그는 여기서 일 안 해요.'], promptLang:'ko-KR' },
  { id:'ko_tf2',  type:'transformation', topic:'daily', instruction:'Make the sentence negative.',   prompt:'그들은 부산에 살아요.', answer:'그들은 부산에 살지 않아요.',  promptLang:'ko-KR' },
  { id:'ko_tf3',  type:'transformation', topic:'daily', instruction:'Remove the negation.',          prompt:'저는 돈이 없어요.',     answer:'저는 돈이 있어요.',           promptLang:'ko-KR' },
  { id:'ko_tf4',  type:'transformation', topic:'daily', instruction:'Convert to a yes/no question.', prompt:'당신은 한국어를 해요.', answer:'당신은 한국어를 해요?',       promptLang:'ko-KR' },
  { id:'ko_tf5',  type:'transformation', topic:'daily', instruction:'Make the sentence negative.',   prompt:'우리는 스페인어를 해요.',answer:'우리는 스페인어를 하지 않아요.',variants:['우리는 스페인어를 안 해요.'], promptLang:'ko-KR' },
]

const DB_KO_VOCAB: DrillItem[] = [
  { id:'ko_v1',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'water',   answer:'물',   variants:['물.','mul'],                                     promptLang:'en-US' },
  { id:'ko_v2',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'house',   answer:'집',   variants:['집.','jip'],                                     promptLang:'en-US' },
  { id:'ko_v3',  type:'translation', category:'vocab', topic:'food',   instruction:'Translate the word.', prompt:'food',    answer:'음식', variants:['음식.','eumsik'],                                promptLang:'en-US' },
  { id:'ko_v4',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'money',   answer:'돈',   variants:['돈.','don'],                                     promptLang:'en-US' },
  { id:'ko_v5',  type:'translation', category:'vocab', topic:'work',   instruction:'Translate the word.', prompt:'work',    answer:'일',   variants:['일.','il'],                                      promptLang:'en-US' },
  { id:'ko_v6',  type:'translation', category:'vocab', topic:'travel', instruction:'Translate the word.', prompt:'city',    answer:'도시', variants:['도시.','dosi'],                                  promptLang:'en-US' },
  { id:'ko_v7',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'time',    answer:'시간', variants:['시간.','sigan'],                                 promptLang:'en-US' },
  { id:'ko_v8',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'book',    answer:'책',   variants:['책.','chaek'],                                   promptLang:'en-US' },
  { id:'ko_v9',  type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'door',    answer:'문',   variants:['문.','mun'],                                     promptLang:'en-US' },
  { id:'ko_v10', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'day',     answer:'날',   variants:['날.','nal'],                                     promptLang:'en-US' },
  { id:'ko_v11', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'night',   answer:'밤',   variants:['밤.','bam'],                                     promptLang:'en-US' },
  { id:'ko_v12', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'man',     answer:'남자', variants:['남자.','namja'],                                 promptLang:'en-US' },
  { id:'ko_v13', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'woman',   answer:'여자', variants:['여자.','yeoja'],                                 promptLang:'en-US' },
  { id:'ko_v14', type:'translation', category:'vocab', topic:'daily',  instruction:'Translate the word.', prompt:'friend',  answer:'친구', variants:['친구.','chingu'],                                promptLang:'en-US' },
  { id:'ko_v15', type:'translation', category:'vocab', topic:'travel', instruction:'Translate the word.', prompt:'country', answer:'나라', variants:['나라.','nara'],                                  promptLang:'en-US' },
]

const DB_KO_PHRASES: DrillItem[] = [
  { id:'ko_ph1',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Thank you.',         answer:'감사합니다',     variants:['감사합니다.','고마워요','gamsahamnida'],    promptLang:'en-US' },
  { id:'ko_ph2',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:"You're welcome.",    answer:'천만에요',       variants:['천만에요.','cheonmaneyo'],                 promptLang:'en-US' },
  { id:'ko_ph3',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Excuse me.',         answer:'실례합니다',     variants:['실례합니다.','죄송합니다','sillyehamnida'], promptLang:'en-US' },
  { id:'ko_ph4',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:"I'm sorry.",         answer:'죄송합니다',     variants:['죄송합니다.','미안해요','joesonghamnida'],  promptLang:'en-US' },
  { id:'ko_ph5',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'How are you?',       answer:'잘 지내세요',    variants:['잘 지내세요?','jal jinaeseyo'],             promptLang:'en-US' },
  { id:'ko_ph6',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Nice to meet you.',  answer:'만나서 반가워요', variants:['만나서 반가워요.','mannaseo bangawoyo'],   promptLang:'en-US' },
  { id:'ko_ph7',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'See you later.',     answer:'또 만나요',      variants:['또 만나요.','tto mannayo'],                promptLang:'en-US' },
  { id:'ko_ph8',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Good luck.',         answer:'행운을 빌어요',  variants:['행운을 빌어요.','haenguneul bireoyo'],     promptLang:'en-US' },
  { id:'ko_ph9',  type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'Of course.',         answer:'물론이죠',       variants:['물론이죠.','mullonjyo'],                   promptLang:'en-US' },
  { id:'ko_ph10', type:'translation', category:'phrase', topic:'daily', instruction:'Translate the phrase.', prompt:'No problem.',        answer:'괜찮아요',       variants:['괜찮아요.','gwaenchanhayo'],               promptLang:'en-US' },
]

const DB_KO_SPORT: DrillItem[] = [
  { id:'ko_sp1', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'ball',    answer:'공',     variants:['gong'],                                           promptLang:'en-US' },
  { id:'ko_sp2', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'team',    answer:'팀',     variants:['tim'],                                            promptLang:'en-US' },
  { id:'ko_sp3', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'match',   answer:'경기',   variants:['gyeonggi'],                                       promptLang:'en-US' },
  { id:'ko_sp4', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'player',  answer:'선수',   variants:['seonsu'],                                         promptLang:'en-US' },
  { id:'ko_sp5', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'score',   answer:'점수',   variants:['jeomsu'],                                         promptLang:'en-US' },
  { id:'ko_sp6', type:'translation', category:'vocab',  topic:'sport', instruction:'Translate the word.',   prompt:'stadium', answer:'경기장', variants:['gyeonggijang'],                                   promptLang:'en-US' },
  { id:'ko_sp7', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:"What's the score?", answer:'점수가 몇이에요',  variants:['점수가 몇이에요?','jeomsu ga myeot ieyo'],  promptLang:'en-US' },
  { id:'ko_sp8', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:'We won!',           answer:'이겼어요',         variants:['이겼어요!','igyeosseoyo'],                  promptLang:'en-US' },
  { id:'ko_sp9', type:'translation', category:'phrase', topic:'sport', instruction:'Translate the phrase.', prompt:"Let's play.",        answer:'같이 해요',        variants:['같이 합시다','gachi haeyo'],                promptLang:'en-US' },
]

const DB_KO_TECH: DrillItem[] = [
  { id:'ko_tc1', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'phone',    answer:'폰',     variants:['스마트폰','pon','seumateupon'],                     promptLang:'en-US' },
  { id:'ko_tc2', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'computer', answer:'컴퓨터', variants:['keompyuteo'],                                      promptLang:'en-US' },
  { id:'ko_tc3', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'internet', answer:'인터넷', variants:['inteonet'],                                        promptLang:'en-US' },
  { id:'ko_tc4', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'email',    answer:'이메일', variants:['imeil'],                                           promptLang:'en-US' },
  { id:'ko_tc5', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'app',      answer:'앱',     variants:['aep'],                                             promptLang:'en-US' },
  { id:'ko_tc6', type:'translation', category:'vocab',  topic:'tech', instruction:'Translate the word.',   prompt:'password', answer:'비밀번호', variants:['bimilbeonho'],                                   promptLang:'en-US' },
  { id:'ko_tc7', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:"What's the wifi password?", answer:'와이파이 비밀번호가 뭐예요', variants:['와이파이 비밀번호가 뭐예요?'], promptLang:'en-US' },
  { id:'ko_tc8', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:'My phone is dead.',         answer:'폰 배터리가 없어요',         variants:['배터리가 다 됐어요'],          promptLang:'en-US' },
  { id:'ko_tc9', type:'translation', category:'phrase', topic:'tech', instruction:'Translate the phrase.', prompt:'Can I use the wifi?',       answer:'와이파이 써도 돼요',         variants:['와이파이 사용해도 돼요?'],     promptLang:'en-US' },
]

const DB_KO_FOOD: DrillItem[] = [
  { id:'ko_fd1', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'restaurant',  answer:'식당',   variants:['레스토랑','sikdang'],                              promptLang:'en-US' },
  { id:'ko_fd2', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'menu',        answer:'메뉴',   variants:['menyu'],                                           promptLang:'en-US' },
  { id:'ko_fd3', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'bread',       answer:'빵',     variants:['ppang'],                                           promptLang:'en-US' },
  { id:'ko_fd4', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'coffee',      answer:'커피',   variants:['keopi'],                                           promptLang:'en-US' },
  { id:'ko_fd5', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'wine',        answer:'와인',   variants:['wain'],                                            promptLang:'en-US' },
  { id:'ko_fd6', type:'translation', category:'vocab',  topic:'food', instruction:'Translate the word.',   prompt:'bill',        answer:'계산서', variants:['gyesanseo'],                                       promptLang:'en-US' },
  { id:'ko_fd7', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:'The bill, please.',       answer:'계산해 주세요',   variants:['계산해 주세요.','gyesan hae juseyo'],    promptLang:'en-US' },
  { id:'ko_fd8', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:"It's delicious!",         answer:'맛있어요',        variants:['맛있어요!','massisseoyo'],                promptLang:'en-US' },
  { id:'ko_fd9', type:'translation', category:'phrase', topic:'food', instruction:'Translate the phrase.', prompt:'A table for two, please.', answer:'두 명이에요',      variants:['두 명입니다','du myeongiyeyo'],           promptLang:'en-US' },
]

const DB_KO_WORK: DrillItem[] = [
  { id:'ko_wk1', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'office',    answer:'사무실', variants:['samusil'],                                         promptLang:'en-US' },
  { id:'ko_wk2', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'meeting',   answer:'회의',   variants:['hoeui'],                                           promptLang:'en-US' },
  { id:'ko_wk3', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'colleague', answer:'동료',   variants:['dongnyo'],                                         promptLang:'en-US' },
  { id:'ko_wk4', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'report',    answer:'보고서', variants:['bogoseo'],                                         promptLang:'en-US' },
  { id:'ko_wk5', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'deadline',  answer:'마감',   variants:['magam'],                                           promptLang:'en-US' },
  { id:'ko_wk6', type:'translation', category:'vocab',  topic:'work', instruction:'Translate the word.',   prompt:'manager',   answer:'상사',   variants:['sangsa','매니저','maenijeo'],                       promptLang:'en-US' },
  { id:'ko_wk7', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:'We have a meeting.',        answer:'회의가 있어요',   variants:['회의가 있어요.','hoeuiga isseoyo'],      promptLang:'en-US' },
  { id:'ko_wk8', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:"I'll send you an email.",    answer:'이메일 보낼게요', variants:['이메일 보내겠습니다','imeil bonaelgeyo'], promptLang:'en-US' },
  { id:'ko_wk9', type:'translation', category:'phrase', topic:'work', instruction:'Translate the phrase.', prompt:'The deadline is on Monday.', answer:'마감이 월요일이에요', variants:['마감은 월요일이에요'],             promptLang:'en-US' },
]

// ── Korean: new topics ────────────────────────────────────────────────────────

const DB_KO_HEALTH: DrillItem[] = [
  { id:'ko_hl1', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'doctor',       answer:'의사',   variants:['uisa'],                                            promptLang:'en-US' },
  { id:'ko_hl2', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'hospital',     answer:'병원',   variants:['byeongwon'],                                       promptLang:'en-US' },
  { id:'ko_hl3', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'medicine',     answer:'약',     variants:['yak'],                                             promptLang:'en-US' },
  { id:'ko_hl4', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'pain',         answer:'통증',   variants:['tongjeung'],                                       promptLang:'en-US' },
  { id:'ko_hl5', type:'translation', category:'vocab',  topic:'health', instruction:'Translate the word.',   prompt:'fever',        answer:'열',     variants:['yeol'],                                            promptLang:'en-US' },
  { id:'ko_hl6', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'I feel sick.',           answer:'몸이 안 좋아요',     variants:['몸이 안 좋아요.','기분이 안 좋아요'],  promptLang:'en-US' },
  { id:'ko_hl7', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'Call an ambulance!',     answer:'구급차를 불러주세요', variants:['구급차 불러주세요!'],                  promptLang:'en-US' },
  { id:'ko_hl8', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'I need a doctor.',       answer:'의사가 필요해요',     variants:['의사 선생님이 필요해요'],              promptLang:'en-US' },
  { id:'ko_hl9', type:'translation', category:'phrase', topic:'health', instruction:'Translate the phrase.', prompt:'Where is the pharmacy?', answer:'약국이 어디예요',     variants:['약국이 어디예요?'],                    promptLang:'en-US' },
]

const DB_KO_MONEY: DrillItem[] = [
  { id:'ko_mn1', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'bank',          answer:'은행',   variants:['eunhaeng'],                                        promptLang:'en-US' },
  { id:'ko_mn2', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'ATM',           answer:'ATM',     variants:['현금기','hyeongeumgi'],                            promptLang:'en-US' },
  { id:'ko_mn3', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'credit card',   answer:'신용카드', variants:['sinyongkadeu'],                                   promptLang:'en-US' },
  { id:'ko_mn4', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'exchange rate',  answer:'환율',   variants:['hwanyul'],                                         promptLang:'en-US' },
  { id:'ko_mn5', type:'translation', category:'vocab',  topic:'money', instruction:'Translate the word.',   prompt:'coin',          answer:'동전',   variants:['dongjeon'],                                        promptLang:'en-US' },
  { id:'ko_mn6', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Can I pay by card?',      answer:'카드로 계산할 수 있어요', variants:['카드 돼요?'],              promptLang:'en-US' },
  { id:'ko_mn7', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Where is the ATM?',       answer:'ATM이 어디예요',         variants:['ATM이 어디예요?'],         promptLang:'en-US' },
  { id:'ko_mn8', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'I want to exchange money.',answer:'환전하고 싶어요',         variants:['환전하고 싶어요.'],         promptLang:'en-US' },
  { id:'ko_mn9', type:'translation', category:'phrase', topic:'money', instruction:'Translate the phrase.', prompt:'Do you accept dollars?',   answer:'달러도 받아요',           variants:['달러도 받아요?'],          promptLang:'en-US' },
]

const DB_KO_FAMILY: DrillItem[] = [
  { id:'ko_fm1', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'mother',       answer:'어머니', variants:['엄마','eomeoni','eomma'],                           promptLang:'en-US' },
  { id:'ko_fm2', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'father',       answer:'아버지', variants:['아빠','abeoji','appa'],                            promptLang:'en-US' },
  { id:'ko_fm3', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'sister',       answer:'언니',   variants:['여동생','eonni','yeodongsaeng'],                    promptLang:'en-US' },
  { id:'ko_fm4', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'brother',      answer:'오빠',   variants:['남동생','oppa','namdongsaeng'],                     promptLang:'en-US' },
  { id:'ko_fm5', type:'translation', category:'vocab',  topic:'family', instruction:'Translate the word.',   prompt:'grandparents', answer:'조부모', variants:['할머니 할아버지','jobumo'],                         promptLang:'en-US' },
  { id:'ko_fm6', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'My family is big.',      answer:'저는 대가족이에요',  variants:['저는 대가족이에요.'],                promptLang:'en-US' },
  { id:'ko_fm7', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'I have two sisters.',    answer:'여동생이 두 명 있어요', variants:['언니가 두 명 있어요'],              promptLang:'en-US' },
  { id:'ko_fm8', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'Are you married?',       answer:'결혼했어요',         variants:['결혼했어요?','결혼하셨어요?'],      promptLang:'en-US' },
  { id:'ko_fm9', type:'translation', category:'phrase', topic:'family', instruction:'Translate the phrase.', prompt:'I have three children.', answer:'아이가 세 명 있어요', variants:['아이가 세 명이에요'],               promptLang:'en-US' },
]

const DB_KO_NATURE: DrillItem[] = [
  { id:'ko_nt1', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'mountain', answer:'산',   variants:['san'],                                             promptLang:'en-US' },
  { id:'ko_nt2', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'river',    answer:'강',   variants:['gang'],                                            promptLang:'en-US' },
  { id:'ko_nt3', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'forest',   answer:'숲',   variants:['sup'],                                             promptLang:'en-US' },
  { id:'ko_nt4', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'weather',  answer:'날씨', variants:['nalssi'],                                          promptLang:'en-US' },
  { id:'ko_nt5', type:'translation', category:'vocab',  topic:'nature', instruction:'Translate the word.',   prompt:'sun',      answer:'해',   variants:['태양','hae','taeyang'],                            promptLang:'en-US' },
  { id:'ko_nt6', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:'The weather is nice.',  answer:'날씨가 좋아요',     variants:['날씨가 좋아요.'],              promptLang:'en-US' },
  { id:'ko_nt7', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:"It's raining.",         answer:'비가 와요',         variants:['비가 와요.','비가 내려요'],    promptLang:'en-US' },
  { id:'ko_nt8', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:"It's very hot today.",  answer:'오늘 너무 더워요',   variants:['오늘 많이 더워요'],            promptLang:'en-US' },
  { id:'ko_nt9', type:'translation', category:'phrase', topic:'nature', instruction:'Translate the phrase.', prompt:'I love the mountains.', answer:'산을 정말 좋아해요', variants:['저는 산이 좋아요'],            promptLang:'en-US' },
]

const DB_KO_EDUCATION: DrillItem[] = [
  { id:'ko_ed1', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'school',  answer:'학교',  variants:['hakgyo'],                                          promptLang:'en-US' },
  { id:'ko_ed2', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'student', answer:'학생',  variants:['haksaeng'],                                        promptLang:'en-US' },
  { id:'ko_ed3', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'teacher', answer:'선생님', variants:['seonsaengnim'],                                   promptLang:'en-US' },
  { id:'ko_ed4', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'class',   answer:'수업',  variants:['sueop'],                                           promptLang:'en-US' },
  { id:'ko_ed5', type:'translation', category:'vocab',  topic:'education', instruction:'Translate the word.',   prompt:'exam',    answer:'시험',  variants:['siheom'],                                          promptLang:'en-US' },
  { id:'ko_ed6', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'I study Korean.',        answer:'한국어를 공부해요',   variants:['한국어 공부해요'],              promptLang:'en-US' },
  { id:'ko_ed7', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'What is the homework?',  answer:'숙제가 뭐예요',       variants:['숙제가 뭐예요?'],              promptLang:'en-US' },
  { id:'ko_ed8', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'The exam is tomorrow.',  answer:'내일 시험이 있어요',   variants:['내일 시험 있어요'],            promptLang:'en-US' },
  { id:'ko_ed9', type:'translation', category:'phrase', topic:'education', instruction:'Translate the phrase.', prompt:'I go to university.',    answer:'대학교에 다녀요',     variants:['대학교 다녀요'],               promptLang:'en-US' },
]

const DB_KO_CULTURE: DrillItem[] = [
  { id:'ko_cu1', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'museum',    answer:'박물관', variants:['bangmulgwan'],                                     promptLang:'en-US' },
  { id:'ko_cu2', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'art',       answer:'예술',   variants:['yesul'],                                           promptLang:'en-US' },
  { id:'ko_cu3', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'music',     answer:'음악',   variants:['eumak'],                                           promptLang:'en-US' },
  { id:'ko_cu4', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'festival',  answer:'축제',   variants:['chukje'],                                          promptLang:'en-US' },
  { id:'ko_cu5', type:'translation', category:'vocab',  topic:'culture', instruction:'Translate the word.',   prompt:'tradition', answer:'전통',   variants:['jeontong'],                                        promptLang:'en-US' },
  { id:'ko_cu6', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'I love this music.',        answer:'이 음악이 너무 좋아요', variants:['이 음악이 좋아요'],          promptLang:'en-US' },
  { id:'ko_cu7', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'Where is the museum?',      answer:'박물관이 어디예요',     variants:['박물관이 어디예요?'],         promptLang:'en-US' },
  { id:'ko_cu8', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'I like local food.',        answer:'현지 음식이 좋아요',    variants:['현지 음식 좋아요'],           promptLang:'en-US' },
  { id:'ko_cu9', type:'translation', category:'phrase', topic:'culture', instruction:'Translate the phrase.', prompt:'Is there a festival today?', answer:'오늘 축제가 있어요',    variants:['오늘 축제 있어요?'],          promptLang:'en-US' },
]

const DB_KO_POLITICS: DrillItem[] = [
  { id:'ko_po1', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'government', answer:'정부',   variants:['jeongbu'],                                         promptLang:'en-US' },
  { id:'ko_po2', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'election',   answer:'선거',   variants:['seongeo'],                                         promptLang:'en-US' },
  { id:'ko_po3', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'law',        answer:'법률',   variants:['beomnyul','법'],                                   promptLang:'en-US' },
  { id:'ko_po4', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'vote',       answer:'투표',   variants:['tupyo'],                                           promptLang:'en-US' },
  { id:'ko_po5', type:'translation', category:'vocab',  topic:'politics', instruction:'Translate the word.',   prompt:'president',  answer:'대통령', variants:['daetongnyeong'],                                   promptLang:'en-US' },
  { id:'ko_po6', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'When is the election?', answer:'선거가 언제예요',   variants:['선거가 언제예요?'],              promptLang:'en-US' },
  { id:'ko_po7', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'I follow the news.',    answer:'뉴스를 봐요',       variants:['뉴스 봐요'],                     promptLang:'en-US' },
  { id:'ko_po8', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'The new law passed.',   answer:'새 법이 통과됐어요', variants:['새 법 통과됐어요'],             promptLang:'en-US' },
  { id:'ko_po9', type:'translation', category:'phrase', topic:'politics', instruction:'Translate the phrase.', prompt:'Did you vote?',         answer:'투표했어요',         variants:['투표했어요?'],                  promptLang:'en-US' },
]

const DB_KO_SCIENCE: DrillItem[] = [
  { id:'ko_sc1', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'experiment', answer:'실험',   variants:['silheom'],                                         promptLang:'en-US' },
  { id:'ko_sc2', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'laboratory', answer:'실험실', variants:['silheomsil'],                                      promptLang:'en-US' },
  { id:'ko_sc3', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'theory',     answer:'이론',   variants:['iron'],                                            promptLang:'en-US' },
  { id:'ko_sc4', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'data',       answer:'데이터', variants:['deiteo'],                                          promptLang:'en-US' },
  { id:'ko_sc5', type:'translation', category:'vocab',  topic:'science', instruction:'Translate the word.',   prompt:'research',   answer:'연구',   variants:['yeongu'],                                          promptLang:'en-US' },
  { id:'ko_sc6', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'The results are interesting.', answer:'결과가 흥미로워요',   variants:['결과가 흥미로워요.'],        promptLang:'en-US' },
  { id:'ko_sc7', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'I study biology.',            answer:'생물학을 공부해요',   variants:['생물학 공부해요'],           promptLang:'en-US' },
  { id:'ko_sc8', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'We need more data.',          answer:'데이터가 더 필요해요', variants:['데이터 더 필요해요'],        promptLang:'en-US' },
  { id:'ko_sc9', type:'translation', category:'phrase', topic:'science', instruction:'Translate the phrase.', prompt:'The hypothesis is confirmed.', answer:'가설이 확인됐어요',   variants:['가설이 확인되었어요'],       promptLang:'en-US' },
]

const DB_KO_SHOPPING: DrillItem[] = [
  { id:'ko_sh1', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'store',    answer:'가게',   variants:['gage','매장'],                                     promptLang:'en-US' },
  { id:'ko_sh2', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'price',    answer:'가격',   variants:['gagyeok'],                                         promptLang:'en-US' },
  { id:'ko_sh3', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'sale',     answer:'할인',   variants:['harin'],                                           promptLang:'en-US' },
  { id:'ko_sh4', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'size',     answer:'사이즈', variants:['saijeu'],                                          promptLang:'en-US' },
  { id:'ko_sh5', type:'translation', category:'vocab',  topic:'shopping', instruction:'Translate the word.',   prompt:'receipt',  answer:'영수증', variants:['yeongsujeung'],                                    promptLang:'en-US' },
  { id:'ko_sh6', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Do you have this in large?', answer:'큰 사이즈 있어요',   variants:['큰 사이즈 있어요?'],          promptLang:'en-US' },
  { id:'ko_sh7', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:"I'm just looking.",      answer:'그냥 보는 거예요',   variants:['그냥 구경하는 거예요'],          promptLang:'en-US' },
  { id:'ko_sh8', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Is this on sale?',       answer:'이거 할인해요',      variants:['이거 할인해요?','세일 해요?'],   promptLang:'en-US' },
  { id:'ko_sh9', type:'translation', category:'phrase', topic:'shopping', instruction:'Translate the phrase.', prompt:'Can I try it on?',       answer:'입어봐도 돼요',      variants:['입어봐도 돼요?'],               promptLang:'en-US' },
]

const DB_KO_EMERGENCY: DrillItem[] = [
  { id:'ko_em1', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'police',    answer:'경찰',   variants:['gyeongchal'],                                      promptLang:'en-US' },
  { id:'ko_em2', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'fire',      answer:'화재',   variants:['hwajae','불'],                                     promptLang:'en-US' },
  { id:'ko_em3', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'ambulance', answer:'구급차', variants:['gugeupcha'],                                       promptLang:'en-US' },
  { id:'ko_em4', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'accident',  answer:'사고',   variants:['sago'],                                            promptLang:'en-US' },
  { id:'ko_em5', type:'translation', category:'vocab',  topic:'emergency', instruction:'Translate the word.',   prompt:'help',      answer:'도움',   variants:['doum'],                                            promptLang:'en-US' },
  { id:'ko_em6', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'Help!',                 answer:'도와주세요',         variants:['도와주세요!'],                   promptLang:'en-US' },
  { id:'ko_em7', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'Call the police!',      answer:'경찰 불러주세요',    variants:['경찰 불러주세요!'],              promptLang:'en-US' },
  { id:'ko_em8', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'This is an emergency.', answer:'긴급 상황이에요',    variants:['긴급 상황이에요.'],              promptLang:'en-US' },
  { id:'ko_em9', type:'translation', category:'phrase', topic:'emergency', instruction:'Translate the phrase.', prompt:'I have been robbed.',   answer:'도둑맞았어요',       variants:['도둑맞았어요.','소매치기 당했어요'], promptLang:'en-US' },
]

// ── ENGLISH: Basic → Advanced ─────────────────────────────────────

const DB_EN = englishDrillData.filter(item => item.group === 'DB_EN') as DrillItem[]

const DB_EN_VOCAB = englishDrillData.filter(item => item.group === 'DB_EN_VOCAB') as DrillItem[]

const DB_EN_PHRASES = englishDrillData.filter(item => item.group === 'DB_EN_PHRASES') as DrillItem[]

const DB_EN_SPORT = englishDrillData.filter(item => item.group === 'DB_EN_SPORT') as DrillItem[]

const DB_EN_TECH = englishDrillData.filter(item => item.group === 'DB_EN_TECH') as DrillItem[]

const DB_EN_FOOD = englishDrillData.filter(item => item.group === 'DB_EN_FOOD') as DrillItem[]

const DB_EN_WORK = englishDrillData.filter(item => item.group === 'DB_EN_WORK') as DrillItem[]

const DB_EN_HEALTH = englishDrillData.filter(item => item.group === 'DB_EN_HEALTH') as DrillItem[]

const DB_EN_MONEY = englishDrillData.filter(item => item.group === 'DB_EN_MONEY') as DrillItem[]

const DB_EN_FAMILY = englishDrillData.filter(item => item.group === 'DB_EN_FAMILY') as DrillItem[]

const DB_EN_NATURE = englishDrillData.filter(item => item.group === 'DB_EN_NATURE') as DrillItem[]

const DB_EN_EDUCATION = englishDrillData.filter(item => item.group === 'DB_EN_EDUCATION') as DrillItem[]

const DB_EN_CULTURE = englishDrillData.filter(item => item.group === 'DB_EN_CULTURE') as DrillItem[]

const DB_EN_POLITICS = englishDrillData.filter(item => item.group === 'DB_EN_POLITICS') as DrillItem[]

const DB_EN_SCIENCE = englishDrillData.filter(item => item.group === 'DB_EN_SCIENCE') as DrillItem[]

const DB_EN_SHOPPING = englishDrillData.filter(item => item.group === 'DB_EN_SHOPPING') as DrillItem[]

const DB_EN_EMERGENCY = englishDrillData.filter(item => item.group === 'DB_EN_EMERGENCY') as DrillItem[]

const NEW_TOPICS_EN = [...DB_EN_HEALTH, ...DB_EN_MONEY, ...DB_EN_FAMILY, ...DB_EN_NATURE, ...DB_EN_EDUCATION, ...DB_EN_CULTURE, ...DB_EN_POLITICS, ...DB_EN_SCIENCE, ...DB_EN_SHOPPING, ...DB_EN_EMERGENCY]

const NEW_TOPICS_JA = [...DB_JA_HEALTH, ...DB_JA_MONEY, ...DB_JA_FAMILY, ...DB_JA_NATURE, ...DB_JA_EDUCATION, ...DB_JA_CULTURE, ...DB_JA_POLITICS, ...DB_JA_SCIENCE, ...DB_JA_SHOPPING, ...DB_JA_EMERGENCY]
const NEW_TOPICS_KO = [...DB_KO_HEALTH, ...DB_KO_MONEY, ...DB_KO_FAMILY, ...DB_KO_NATURE, ...DB_KO_EDUCATION, ...DB_KO_CULTURE, ...DB_KO_POLITICS, ...DB_KO_SCIENCE, ...DB_KO_SHOPPING, ...DB_KO_EMERGENCY]

export function getDB(language: Language): DrillItem[] {
  switch (language) {
    case 'fr': return [...DB_FR, ...DB_FR_VOCAB, ...DB_FR_PHRASES, ...DB_FR_SPORT, ...DB_FR_TECH, ...DB_FR_FOOD, ...DB_FR_WORK, ...NEW_TOPICS_FR]
    case 'de': return [...DB_DE, ...DB_DE_VOCAB, ...DB_DE_PHRASES, ...DB_DE_SPORT, ...DB_DE_TECH, ...DB_DE_FOOD, ...DB_DE_WORK, ...NEW_TOPICS_DE]
    case 'zh': return [...DB_ZH, ...DB_ZH_VOCAB, ...DB_ZH_PHRASES, ...DB_ZH_SPORT, ...DB_ZH_TECH, ...DB_ZH_FOOD, ...DB_ZH_WORK, ...NEW_TOPICS_ZH]
    case 'ja': return [...DB_JA, ...DB_JA_VOCAB, ...DB_JA_PHRASES, ...DB_JA_SPORT, ...DB_JA_TECH, ...DB_JA_FOOD, ...DB_JA_WORK, ...NEW_TOPICS_JA]
    case 'ko': return [...DB_KO, ...DB_KO_VOCAB, ...DB_KO_PHRASES, ...DB_KO_SPORT, ...DB_KO_TECH, ...DB_KO_FOOD, ...DB_KO_WORK, ...NEW_TOPICS_KO]
    case 'en': return [...DB_EN, ...DB_EN_VOCAB, ...DB_EN_PHRASES, ...DB_EN_SPORT, ...DB_EN_TECH, ...DB_EN_FOOD, ...DB_EN_WORK, ...NEW_TOPICS_EN]
    default:   return [...DB_ES, ...DB_ES_VOCAB, ...DB_ES_PHRASES, ...DB_ES_SPORT, ...DB_ES_TECH, ...DB_ES_FOOD, ...DB_ES_WORK, ...NEW_TOPICS_ES]
  }
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildItems(
  type: DrillType,
  count: number,
  language: Language = 'es',
  customItems?: DrillItem[],
  topic?: DrillTopic,
): DrillItem[] {
  if (type === 'custom') {
    if (!customItems || customItems.length === 0) return []
    return shuffle(customItems).slice(0, count)
  }
  const db = getDB(language)
  let pool: DrillItem[]
  if (type === 'sentence')            pool = db.filter(d => !d.category || d.category === 'sentence')
  else if (type === 'vocab')          pool = db.filter(d => d.category === 'vocab')
  else if (type === 'phrase')         pool = db.filter(d => d.category === 'phrase')
  else if (type === 'mixed')          pool = db
  else if (type === 'translation')    pool = db.filter(d => d.type === 'translation')
  else if (type === 'substitution')   pool = db.filter(d => d.type === 'substitution')
  else if (type === 'transformation') pool = db.filter(d => d.type === 'transformation')
  else pool = db
  if (topic) pool = pool.filter(d => d.topic === topic)
  return shuffle(pool).slice(0, Math.min(count, pool.length))
}

export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase()
    .replace(/[¿¡？！。，]/g, '')
    .replace(/[.,;:!?]+$/, '')
    .replace(/\s+/g, ' ')
}

export function checkAnswer(input: string, item: DrillItem): boolean {
  const u = normalizeAnswer(input)
  return [item.answer, ...(item.variants ?? [])].map(normalizeAnswer).includes(u)
}
