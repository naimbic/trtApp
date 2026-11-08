#!/usr/bin/env node
/**
 * Screenshots of the client area for the help center guide (LOCAL stack only: Next on 3000, Vite on 3200, the test database).
 *   node scripts/help-center/shots.mjs <email> <password> [lang,lang,...]
 * Signs in to the client area as that contact, in each language, and writes web/public/help-guide/<lang>/<name>.webp.
 * The client needs some data to show (invoices, a task, an idea, a ticket...): see the notes in the changelog of 0.205.9.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import sharp from 'sharp'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const [email, password, only] = process.argv.slice(2)
const LANGS = (only || 'en,fr,es,ja,ar').split(',')
const BASE = 'http://localhost:3200'
const OUT = path.join(root, 'web/public/help-guide')
const dict = {}
for (const l of ['fr', 'es', 'ja', 'ar']) dict[l] = (await import(pathToFileURL(path.join(root, 'web/src/views/portal/lang', `${l}.js`)).href)).default
const tr = (l, s) => dict[l]?.[s] ?? s
// what a person would type in the demo request, per language
const DEMO = {
    en: ['The contact form of our website does not send emails', 'Since this week, nobody receives the messages sent from the contact page.'],
    fr: ["Le formulaire de contact de notre site n'envoie pas d'e-mails", "Depuis cette semaine, personne ne reçoit les messages envoyés depuis la page contact."],
    es: ['El formulario de contacto de nuestra web no envía correos', 'Desde esta semana nadie recibe los mensajes enviados desde la página de contacto.'],
    ja: ['ウェブサイトのお問い合わせフォームからメールが届きません', '今週から、お問い合わせページから送信されたメッセージが誰にも届いていません。'],
    ar: ['نموذج الاتصال في موقعنا لا يرسل رسائل بريد إلكتروني', 'منذ هذا الأسبوع لا يصل أحد أي رسائل مرسلة من صفحة الاتصال.'],
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
for (const lang of LANGS) {
    const dir = path.join(OUT, lang)
    fs.mkdirSync(dir, { recursive: true })
    const ctx = await browser.newContext({ viewport: { width: 1120, height: 680 }, locale: lang === 'ja' ? 'ja-JP' : lang })
    await ctx.addInitScript((l) => { try { for (const k of ['fr', 'french', 'en', 'english', 'es', 'spanish', 'ja', 'japanese', 'ar', 'arabic']) sessionStorage.setItem(`portal-lang:${k}`, '1'); localStorage.setItem('locale', JSON.stringify({ state: { currentLang: l }, version: 1 })); localStorage.setItem('theme', JSON.stringify({ state: { mode: 'light' }, version: 0 })) } catch { /* */ } }, lang)
    const page = await ctx.newPage()
    const shot = async (name, opts = {}) => {
        await page.waitForTimeout(opts.wait ?? 900)
        const buf = await page.screenshot({ type: 'png', ...(opts.clip ? { clip: opts.clip } : {}) })
        await sharp(buf).webp({ quality: 70 }).toFile(path.join(dir, `${name}.webp`))
        console.log(lang, name)
    }
    const go = async (p) => { await page.goto(`${BASE}${p}`); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(700) }
    const clickText = async (text, scope = page) => { await scope.getByRole('button', { name: text }).first().click({ timeout: 8000 }) }

    // sign in
    await go('/portal/sign-in')
    await shot('signin')
    await page.locator('input[type=email], input[type=text]').first().fill(email)
    await page.locator('input[type=password]').first().fill(password)
    await page.keyboard.press('Enter')
    await page.waitForURL(/\/portal\/?$/, { timeout: 30000 })
    await page.waitForLoadState('networkidle').catch(() => {})
    await go('/portal')
    await shot('overview', { wait: 1500 })
    await shot('header', { clip: { x: 0, y: 0, width: 1120, height: 96 }, wait: 100 })

    for (const [name, p] of [['invoices', '/portal/invoices'], ['estimates', '/portal/estimates'], ['proposals', '/portal/proposals'], ['contracts', '/portal/contracts'], ['projects', '/portal/projects'], ['tasks', '/portal/tasks'], ['ideas', '/portal/ideas']]) { await go(p); await shot(name) }
    // a task and an idea in detail
    await go('/portal/tasks'); const task = page.locator('a[href^="/portal/tasks/"]').first()
    if (await task.count()) { await task.click(); await page.waitForTimeout(1200); await shot('task') }
    await go('/portal/ideas'); const idea = page.locator('a[href^="/portal/ideas/"]').first()
    if (await idea.count()) { await idea.click(); await page.waitForTimeout(1200); await shot('idea') }
    else { const card = page.locator('main [class*=cursor-pointer], a').filter({ hasText: /./ }).first(); void card }

    // requests: the new request dialog, then one request
    await go('/portal/requests')
    await clickText(tr(lang, 'New request'))
    await page.waitForTimeout(900)
    await shot('request-new')
    await page.getByPlaceholder(tr(lang, 'What is wrong, or what do you need?')).fill(DEMO[lang][0])
    await page.locator('[contenteditable=true]').first().click(); await page.keyboard.type(DEMO[lang][1])
    await clickText(tr(lang, 'Send the request'))
    await page.waitForURL(/\/portal\/requests\/[a-f0-9]+/, { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await shot('request')
    await go('/portal/requests'); await shot('requests')

    // support: list, new request dialog, one thread
    await go('/portal/tickets'); await shot('tickets')
    await clickText(tr(lang, 'New request'))
    await page.waitForTimeout(900); await shot('ticket-new'); await page.keyboard.press('Escape')
    await go('/portal/tickets'); const tk = page.locator('a[href^="/portal/tickets/"]').first()
    if (await tk.count()) { await tk.click(); await page.waitForTimeout(1400); await shot('ticket') }

    await go('/portal/help'); await shot('help')

    await go('/portal/profile'); await shot('profile')
    await page.evaluate(() => { const el = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,div')].reverse().find((e) => e.children.length === 0 && /notif/i.test(e.textContent) && e.getBoundingClientRect().height < 40); el?.scrollIntoView({ block: 'start' }); window.scrollBy(0, -90) })
    await shot('profile-notifications', { wait: 600 })

    // the avatar menu, then the install dialog
    await go('/portal')
    await page.locator('.header-action-item').last().click(); await page.waitForTimeout(500)
    await shot('menu', { clip: { x: 640, y: 0, width: 480, height: 300 }, wait: 200 })
    await page.getByText(tr(lang, 'Install the app'), { exact: true }).first().click().catch(() => {})
    await page.waitForTimeout(1200); await shot('install'); await page.keyboard.press('Escape')

    // the chat
    await go('/portal')
    const bubble = page.locator(`[title="${tr(lang, 'Chat with our team')}"], [aria-label="${tr(lang, 'Chat with our team')}"]`).first()
    if (await bubble.count()) { await bubble.click(); await page.waitForTimeout(1500); await shot('chat') }
    await ctx.close()
}
await browser.close()
