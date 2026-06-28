import en from './en.json'
import kn from './kn.json'

const locales = { en, kn }

export function createT(lang) {
  const strings = locales[lang] || locales.en

  return function t(key, params) {
    let value = strings[key]
    if (value === undefined) {
      value = locales.en[key] || key
    }
    if (params && typeof value === 'string') {
      value = value.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? `{{${k}}}`)
    }
    return value
  }
}
