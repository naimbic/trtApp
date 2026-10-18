/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router'
import lottie from 'lottie-web/build/player/lottie_light'
import animation from '@/assets/lottie/trtLogo.json'
import { useDashFilters, accentHex } from '@/store/dashFilterStore'
import { useThemeStore } from '@/store/themeStore'
import { tr } from '@/utils/t'

const TRT = ['24', '29', '34'] // the letters t r t
const CRM = ['9', '14', '19'] // the letters C R M
const DOT = [0.941, 0.329, 0.329] // the dot's colour at the end of the animation

const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] }
const paintFills = (node, color) => {
    if (Array.isArray(node)) node.forEach((x) => paintFills(x, color))
    else if (node && typeof node === 'object') {
        if (node.ty === 'fl' && node.c && Array.isArray(node.c.k) && typeof node.c.k[0] === 'number') node.c.k = [...color, 1]
        Object.values(node).forEach((x) => paintFills(x, color))
    }
}

/** The animation with its colours set: "trt" in the text colour, "CRM" and the dot in the colour picked in the dock. */
export const colored = (accentColor, textColor, custom) => {
    const data = JSON.parse(JSON.stringify(animation))
    const a = rgb(accentColor), t = rgb(textColor)
    data.assets.forEach((as) => { if (TRT.includes(as.id)) paintFills(as, t); else if (CRM.includes(as.id)) paintFills(as, custom ? a : t) })
    const dot = data.layers[0]
    ;(function w(o) {
        if (Array.isArray(o)) return o.forEach(w)
        if (o && typeof o === 'object') {
            if (o.ty === 'fl' && o.c && Array.isArray(o.c.k)) o.c.k.forEach((kf) => { if (kf.s && Math.abs(kf.s[0] - DOT[0]) < 0.01 && Math.abs(kf.s[1] - DOT[1]) < 0.01) kf.s = [...a, 1] })
            Object.values(o).forEach(w)
        }
    })(dot)
    return data
}

/**
 * The animated logo (Lottie). "trt" follows the text colour (light in dark mode), "CRM" and the dot take the colour picked in the dock.
 * It plays when the page is loaded and each time you go to another page; there is no hover effect. Still when motion is reduced.
 */
const LottieLogo = ({ height = 34, className = '' }) => {
    const box = useRef(null)
    const anim = useRef(null)
    const first = useRef(true)
    const { pathname } = useLocation()
    const accent = useDashFilters((s) => s.accent)
    const customHex = useDashFilters((s) => s.customHex)
    const mode = useThemeStore((s) => s.mode)
    const accentColor = useMemo(() => (accent && accent !== 'blue' ? accentHex(accent) : '#f05454'), [accent, customHex]) // eslint-disable-line react-hooks/exhaustive-deps
    const textColor = mode === 'dark' ? '#f1eee8' : '#222831'
    const last = animation.op - 1

    // (re)build when a colour changes: it appears finished, without replaying
    useEffect(() => {
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        const play = first.current && !reduced
        const a = lottie.loadAnimation({ container: box.current, renderer: 'svg', loop: false, autoplay: play, animationData: colored(accentColor, textColor, !!(accent && accent !== 'blue')) })
        if (!play) a.goToAndStop(last, true)
        anim.current = a
        first.current = false
        return () => a.destroy()
    }, [accentColor, textColor, accent, last])

    // each new page: play again
    const prev = useRef(pathname)
    useEffect(() => {
        if (prev.current === pathname) return
        prev.current = pathname
        if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) anim.current?.goToAndPlay(0, true)
    }, [pathname])

    return <div ref={box} className={`lottie-logo ${className}`} style={{ height, width: (height * animation.w) / animation.h }} role="img" aria-label={tr("{APP_NAME} logo", { APP_NAME: 'trtDigital' })} />
}

export default LottieLogo
