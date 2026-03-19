import es from './dictionaries/es.json'

// For now, we only have Spanish, but the structure allows for expansion
const dictionaries: Record<string, any> = {
  es,
}

export const getDictionary = (locale: string = 'es') => {
  return dictionaries[locale] || dictionaries.es
}
