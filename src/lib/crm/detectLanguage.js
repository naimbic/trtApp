/* Guesses the language a text is written in, among the languages a lead can have (the Language box of the lead).
   No outside service: the alphabet decides for Arabic, Japanese and Russian; for the others the most common small words are counted.
   Returns the language name ('french', 'english', …) or null when the text is too short or no language clearly wins. */
const WORDS = {
    english: ['the', 'and', 'you', 'for', 'with', 'this', 'that', 'have', 'are', 'your', 'our', 'would', 'please', 'hello', 'thanks', 'thank', 'from', 'will', 'can', 'we', 'is', 'of', 'to', 'regards', 'need', 'about'],
    french: ['le', 'la', 'les', 'des', 'et', 'vous', 'nous', 'pour', 'avec', 'une', 'est', 'dans', 'bonjour', 'merci', 'votre', 'notre', 'je', 'que', 'pas', 'sur', 'du', 'au', 'cordialement', 'besoin', 'souhaite', 'devis'],
    spanish: ['el', 'los', 'las', 'y', 'para', 'con', 'una', 'que', 'por', 'hola', 'gracias', 'usted', 'nuestro', 'está', 'como', 'del', 'saludos', 'necesito', 'quiero', 'nos', 'muy', 'pero', 'es', 'su', 'presupuesto'],
    german: ['der', 'die', 'das', 'und', 'ich', 'sie', 'nicht', 'mit', 'für', 'ist', 'wir', 'eine', 'ein', 'hallo', 'danke', 'bitte', 'auf', 'von', 'zu', 'grüße', 'haben', 'unsere', 'können', 'sehr'],
    italian: ['il', 'gli', 'che', 'per', 'con', 'una', 'sono', 'non', 'ciao', 'grazie', 'buongiorno', 'vostro', 'nostro', 'della', 'del', 'saluti', 'vorrei', 'siamo', 'anche', 'più', 'di', 'è', 'preventivo'],
    portuguese: ['os', 'as', 'para', 'com', 'uma', 'que', 'não', 'olá', 'obrigado', 'obrigada', 'você', 'nosso', 'está', 'em', 'do', 'da', 'um', 'por', 'gostaria', 'bom', 'dia', 'são', 'mais', 'orçamento'],
    dutch: ['de', 'het', 'een', 'en', 'ik', 'u', 'niet', 'met', 'voor', 'van', 'is', 'wij', 'hallo', 'bedankt', 'dank', 'groet', 'graag', 'onze', 'zijn', 'op', 'te', 'dat', 'hebben', 'offerte'],
    turkish: ['ve', 'bir', 'bu', 'için', 'ile', 'merhaba', 'teşekkürler', 'teşekkür', 'siz', 'biz', 'çok', 'ne', 'da', 'de', 'olarak', 'var', 'ben', 'mi', 'lütfen', 'saygılarımla', 'istiyorum', 'hakkında'],
}

export function detectLanguage(input) {
    const text = String(input || '').replace(/<[^>]*>/g, ' ').replace(/https?:\/\/\S+|\S+@\S+/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ')
    const letters = (text.match(/\p{L}/gu) || []).length
    if (letters < 12) return null
    const share = (re) => (text.match(re) || []).length / letters
    if (share(/[぀-ヿ]/g) > 0.1) return 'japanese' // kana: Japanese only
    if (share(/[؀-ۿ]/g) > 0.4) return 'arabic'
    if (share(/[Ѐ-ӿ]/g) > 0.4) return 'russian'
    if (share(/[一-鿿]/g) > 0.4) return null // Chinese: not in the list
    const tokens = text.toLowerCase().match(/[\p{L}']+/gu) || []
    if (tokens.length < 4) return null
    const scores = Object.entries(WORDS).map(([lang, words]) => { const set = new Set(words); return [lang, tokens.filter((t) => set.has(t)).length] }).sort((a, b) => b[1] - a[1])
    const [best, second] = scores
    // a clear winner only: at least two of its words, and ahead of the next language
    return best[1] >= 2 && best[1] > second[1] ? best[0] : null
}
