// The language names stored on staff and client records (Perfex style) and the codes of the interface languages.
export const UI_LANGUAGES = [
    { name: 'english', code: 'en', label: 'English' },
    { name: 'french', code: 'fr', label: 'Français' },
    { name: 'spanish', code: 'es', label: 'Español' },
    { name: 'japanese', code: 'ja', label: '日本語' },
    { name: 'arabic', code: 'ar', label: 'العربية' },
]
export const codeOfLanguage = (name) => UI_LANGUAGES.find((l) => l.name === String(name || '').toLowerCase())?.code || null
export const nameOfCode = (code) => UI_LANGUAGES.find((l) => l.code === code)?.name || null
