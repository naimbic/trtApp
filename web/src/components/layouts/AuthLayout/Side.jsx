import { cloneElement, useEffect, useState } from 'react'
import { TbArrowUpRight, TbWorld } from 'react-icons/tb'
import { CHANGELOG } from '@/configs/changelog'
import { tr } from '@/utils/t'

const QUOTES = [
    { text: tr("Websites that turn visitors into clients."), by: 'trtDigital' },
    { text: tr("SEO that gets your business found on Google."), by: 'trtSEO' },
    { text: tr("Ads that bring qualified leads, not just clicks."), by: 'trtAds' },
    { text: tr("One team for your website, your ranking and your advertising."), by: 'trtDigital' },
]

// all our domains (trt-domains-48.xlsx); 8 random ones are shown each time the slide comes round
const DOMAINS = [
    '120.ma',
    'adword.ma',
    'analytic.ma',
    'ccjm.ma',
    'clinic.ma',
    'deploy.ma',
    'digitale.ma',
    'gfx.ma',
    'ibit.ma',
    'jabaroot.ma',
    'jac.ma',
    'jibril.ma',
    'meeza.ma',
    'naim.ma',
    'naim.tokyo',
    'naimhost.com',
    'newtechjp.com',
    'pilimpi.ch',
    'pilimpi.com',
    'pilimpi.eu',
    'pilimpi.fr',
    'rip.ma',
    'sea.ma',
    'sngine.fr',
    'sngine.ma',
    'task.ma',
    'tokyo.ma',
    'trt.ma',
    'trtagadir.com',
    'trtbio.fr',
    'trtcrm.com',
    'trtdigital.ae',
    'trtdigital.ch',
    'trtdigital.eu',
    'trtdigital.fr',
    'trtdigital.it',
    'trtdigital.jp',
    'trtdigital.ma',
    'trtdigitals.com',
    'trtfx.ma',
    'trtmaroc.com',
    'trtpos.com',
    'trtpos.ma',
    'trtseo.com',
    'trtweb.fr',
    'trtwhats.com',
    'vercel.ma',
    'webfx.ma',
]
const pick8 = () => [...DOMAINS].sort(() => Math.random() - 0.5).slice(0, 8)

// our websites, then the quotes
const SLIDES = [{ type: 'sites' }, ...QUOTES.map((q) => ({ type: 'quote', ...q }))]

const glass = 'rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md transition'

const Slides = () => {
    const [i, setI] = useState(0)
    const [paused, setPaused] = useState(false)
    const [sites, setSites] = useState(pick8)
    useEffect(() => {
        if (paused) return undefined
        const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), 6000)
        return () => clearInterval(t)
    }, [paused])
    const slide = SLIDES[i]
    useEffect(() => {
        if (SLIDES[i].type === 'sites') setSites(pick8())
    }, [i])
    return (
        <div className="relative mx-auto w-full max-w-xl" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div key={i} className="flex h-[300px] flex-col items-center justify-center animate-[popup-fade-in_0.6s_ease-out]">
                {slide.type === 'sites' ? (
                    <div className="grid w-full grid-cols-2 gap-2.5">
                        {sites.map((host) => (
                            <a key={host} href={`https://${host}`} target="_blank" rel="noopener noreferrer" className={`group flex items-center gap-2.5 px-4 py-3 hover:bg-white/20 ${glass}`}>
                                <TbWorld className="shrink-0 text-xl text-white/70" />
                                <span className="min-w-0 flex-1 truncate text-base font-semibold text-white">{host}</span>
                                <TbArrowUpRight className="shrink-0 text-lg text-white/40 transition group-hover:text-white" />
                            </a>
                        ))}
                    </div>
                ) : (
                    <figure className="text-center">
                        <div className="font-serif text-7xl leading-none text-white/30">&ldquo;</div>
                        <blockquote className="-mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">{slide.text}</blockquote>
                        <figcaption className="mt-6 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white ring-1 ring-white/25">{slide.by}</figcaption>
                    </figure>
                )}
            </div>
            <div className="absolute left-0 right-0 top-full mt-6 flex justify-center gap-2">
                {SLIDES.map((_, n) => (
                    <button key={n} type="button" aria-label={tr("Slide {v1}", { v1: n + 1 })} onClick={() => setI(n)} className={`h-2 rounded-full transition-all ${n === i ? 'w-10 bg-white' : 'w-3 bg-white/35 hover:bg-white/60'}`} />
                ))}
            </div>
        </div>
    )
}

const Side = ({ children, ...rest }) => {
    return (
        <main className="grid h-full min-h-screen bg-white dark:bg-gray-800 lg:grid-cols-2">
            {/* Left: sign-in form */}
            <div className="flex flex-col items-center justify-center px-6 py-10">
                <div className="w-full max-w-sm">
                    {children ? cloneElement(children, { ...rest }) : null}
                    <footer className="mt-10 text-center text-xs text-gray-400">
                        {tr("trtCRM developed by")} <span className="font-semibold">{tr("trtDigital")}</span>
                        <span className="mx-1.5">&middot;</span>
                        <span className="font-mono">v{CHANGELOG[0].version}</span>
                    </footer>
                </div>
            </div>

            {/* Right: wide picture panel with slides */}
            <aside className="relative hidden items-center overflow-hidden bg-primary-deep p-14 text-white lg:flex xl:p-20">
                <img src="/img/others/auth-side-bg.png" alt="" className="absolute inset-0 h-full w-full origin-right scale-[1.35] object-cover object-right opacity-40" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary via-primary-deep to-black/70" />
                <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 animate-pulse rounded-full bg-white/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-32 -right-16 h-[28rem] w-[28rem] animate-pulse rounded-full bg-primary/60 blur-3xl [animation-duration:5s]" />
                <Slides />
            </aside>
        </main>
    )
}

export default Side
