import { cloneElement, useEffect, useState } from 'react'
import { TbArrowUpRight, TbWorld } from 'react-icons/tb'
import { CHANGELOG } from '@/configs/changelog'

const QUOTES = [
    { text: 'Websites that turn visitors into clients.', by: 'trtDigital' },
    { text: 'SEO that gets your business found on Google.', by: 'trtSEO' },
    { text: 'Ads that bring qualified leads, not just clicks.', by: 'trtAds' },
    { text: 'One team for your website, your ranking and your advertising.', by: 'trtDigital' },
]

const SITES = [
    { host: 'trtdigital.ma', note: 'Digital agency' },
    { host: 'sea.ma', note: '' },
    { host: 'trtseo.com', note: 'SEO' },
    { host: 'trtads.com', note: 'Advertising' },
    { host: 'adsagency.ma', note: 'Ads agency' },
]

// our websites, then the quotes
const SLIDES = [{ type: 'sites' }, ...QUOTES.map((q) => ({ type: 'quote', ...q }))]

const glass = 'rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur transition'

const Slides = () => {
    const [i, setI] = useState(0)
    const [paused, setPaused] = useState(false)
    useEffect(() => {
        if (paused) return undefined
        const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 6000)
        return () => clearInterval(t)
    }, [paused])
    const slide = SLIDES[i]
    return (
        <div className="relative w-full max-w-md" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div key={i} className="flex min-h-[190px] flex-col justify-center animate-[popup-fade-in_0.5s_ease-out]">
                {slide.type === 'sites' ? (
                    <div className="grid grid-cols-2 gap-3">
                        {SITES.map((s, n) => (
                            <a key={s.host} href={`https://${s.host}`} target="_blank" rel="noopener noreferrer" className={`group flex items-center gap-3 p-3.5 text-left hover:bg-white/15 ${glass} ${n === SITES.length - 1 && SITES.length % 2 ? 'col-span-2' : ''}`}>
                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-primary-deep"><TbWorld className="text-2xl" /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-white">{s.host}</span>
                                    {s.note && <span className="block text-xs text-white/60">{s.note}</span>}
                                </span>
                                <TbArrowUpRight className="shrink-0 text-lg text-white/40 transition group-hover:text-white" />
                            </a>
                        ))}
                    </div>
                ) : (
                    <figure className={`p-6 text-center ${glass}`}>
                        <blockquote className="text-xl font-semibold leading-snug text-white">&ldquo;{slide.text}&rdquo;</blockquote>
                        <figcaption className="mt-3 text-sm text-white/70">{slide.by}</figcaption>
                    </figure>
                )}
            </div>
            <div className="mt-5 flex justify-center gap-2">
                {SLIDES.map((_, n) => (
                    <button key={n} type="button" aria-label={`Slide ${n + 1}`} onClick={() => setI(n)} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-7 bg-white' : 'w-2.5 bg-white/30 hover:bg-white/50'}`} />
                ))}
            </div>
        </div>
    )
}

const Side = ({ children, ...rest }) => {
    return (
        <main className="grid h-full min-h-screen bg-white dark:bg-gray-800 lg:grid-cols-2">
            {/* Left: brand panel (picture, brand colour wash, centred content) */}
            <aside className="relative hidden flex-col items-center justify-center gap-8 overflow-hidden p-10 text-center text-white lg:flex xl:p-14">
                <img src="/img/others/auth-side-bg.png" alt="" className="absolute inset-0 h-full w-full origin-right scale-[1.35] object-cover object-right" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary-deep via-primary-deep/85 to-primary-deep/60" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_0%,rgba(255,255,255,0.16),transparent)]" />
                <div className="relative max-w-md">
                    <h1 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">Clients, sales, projects and support in one place.</h1>
                    <p className="mx-auto mt-4 max-w-sm text-white/75">Everything your team needs to serve clients, from the first lead to the paid invoice.</p>
                </div>
                <Slides />
            </aside>

            {/* Right: sign-in card */}
            <div className="flex flex-col items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-900">
                <div className="w-full max-w-sm">
                    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        {children ? cloneElement(children, { ...rest }) : null}
                    </div>
                    <footer className="mt-6 text-center text-xs text-gray-400">
                        trtCRM developed by <span className="font-semibold">trtDigital</span>
                        <span className="mx-1.5">&middot;</span>
                        <span className="font-mono">v{CHANGELOG[0].version}</span>
                    </footer>
                </div>
            </div>
        </main>
    )
}

export default Side
