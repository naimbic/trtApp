import { cloneElement, useEffect, useState } from 'react'
import { TbArrowUpRight } from 'react-icons/tb'
import Logo from '@/components/template/Logo'
import { CHANGELOG } from '@/configs/changelog'

const QUOTES = [
    { text: 'Well done is better than well said.', by: 'Benjamin Franklin' },
    { text: 'Efficiency is doing things right; effectiveness is doing the right things.', by: 'Peter Drucker' },
    { text: 'Quality is more important than quantity.', by: 'Steve Jobs' },
]

const SITES = [
    { host: 'trtdigital.ma', note: 'Digital agency' },
    { host: 'sea.ma', note: '' },
    { host: 'trtseo.com', note: 'SEO' },
    { host: 'trtads.com', note: 'Advertising' },
    { host: 'adsagency.ma', note: 'Ads agency' },
]

// quote, our websites, quote, quote
const SLIDES = [{ type: 'quote', ...QUOTES[0] }, { type: 'sites' }, { type: 'quote', ...QUOTES[1] }, { type: 'quote', ...QUOTES[2] }]

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
        <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div key={i} className="min-h-[250px] animate-[popup-fade-in_0.5s_ease-out]">
                {slide.type === 'quote' ? (
                    <figure>
                        <div className="text-6xl font-serif leading-none text-white/25">&ldquo;</div>
                        <blockquote className="-mt-2 max-w-md text-2xl font-semibold leading-snug text-white">{slide.text}</blockquote>
                        <figcaption className="mt-4 text-sm text-white/60">{slide.by}</figcaption>
                    </figure>
                ) : (
                    <div>
                        <div className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">Our websites</div>
                        <div className="grid max-w-md gap-2 sm:grid-cols-2">
                            {SITES.map((s) => (
                                <a key={s.host} href={`https://${s.host}`} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition hover:border-white/30 hover:bg-white/10">
                                    <span>
                                        <span className="block text-sm font-semibold">{s.host}</span>
                                        {s.note && <span className="block text-xs text-white/50">{s.note}</span>}
                                    </span>
                                    <TbArrowUpRight className="text-lg text-white/40 transition group-hover:text-white" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-6 flex gap-2">
                {SLIDES.map((_, n) => (
                    <button key={n} type="button" aria-label={`Slide ${n + 1}`} onClick={() => setI(n)} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-8 bg-white' : 'w-3 bg-white/30 hover:bg-white/50'}`} />
                ))}
            </div>
        </div>
    )
}

const Side = ({ children, ...rest }) => {
    return (
        <div className="flex h-full p-6 bg-white dark:bg-gray-800">
            <div className=" flex flex-col justify-center items-center flex-1">
                <div className="w-full xl:max-w-[450px] px-8 max-w-[380px]">
                    {children
                        ? cloneElement(children, {
                              ...rest,
                          })
                        : null}
                </div>
            </div>
            <div className="py-10 px-12 lg:flex flex-col flex-1 justify-between hidden rounded-3xl items-end relative overflow-hidden xl:max-w-[520px] 2xl:max-w-[720px]">
                <div className="absolute inset-0 rounded-3xl bg-gray-900" />
                <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.10),transparent_60%)]" />
                <div className="relative z-10 flex h-full w-full flex-col justify-between text-white">
                    <Logo mode="dark" type="full" logoWidth={190} imgClass="h-12 w-full object-contain object-left brightness-0 invert" />
                    <Slides />
                    <div className="text-xs text-white/40">trtCRM by trtDigital &middot; v{CHANGELOG[0].version}</div>
                </div>
            </div>
        </div>
    )
}

export default Side
