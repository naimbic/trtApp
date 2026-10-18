/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useRef } from 'react'
import lottie from 'lottie-web/build/player/lottie_light'
import animation from '@/assets/lottie/trtLogo.json'
import { tr } from '@/utils/t'

/** The animated trtDigital logo (Lottie): plays once when the page opens, again each time the pointer passes over it; still when motion is reduced. */
const LottieLogo = ({ height = 34, className = '' }) => {
    const box = useRef(null)
    const anim = useRef(null)
    useEffect(() => {
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        const a = lottie.loadAnimation({ container: box.current, renderer: 'svg', loop: false, autoplay: !reduced, animationData: animation })
        if (reduced) a.goToAndStop(animation.op - 1, true)
        anim.current = a
        return () => a.destroy()
    }, [])
    return (
        <div ref={box} className={`lottie-logo ${className}`} style={{ height, width: (height * animation.w) / animation.h }} role="img" aria-label={tr("{APP_NAME} logo", { APP_NAME: 'trtDigital' })}
            onPointerEnter={() => { if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) anim.current?.goToAndPlay(0, true) }} />
    )
}

export default LottieLogo
