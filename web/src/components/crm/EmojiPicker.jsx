/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PiSmileyDuotone } from 'react-icons/pi'
import classNames from '@/utils/classNames'
import { tr } from '@/utils/t'

const GROUPS = [
    ['😀', '😀😃😄😁😆😅😂🤣🥲☺️😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🥸🤩🥳😏😒😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😮‍💨😤😠😡🤬🤯😳🥵🥶😱😨😰😥😓🫣🤗🫡🤔🫢🤭🤫🤥😶😐😑😬🫠🙄😯😦😧😮😲🥱😴🤤😪😵🤐🥴🤢🤮🤧😷🤒🤕🤑🤠😈👿👹👺🤡💩👻💀☠️👽👾🤖😺😸😹😻😼😽🙀😿😾'],
    ['👍', '👍👎👊✊🤛🤜👏🙌🫶👐🤲🤝🙏✌️🤞🫰🤟🤘👌🤌🤏👈👉👆👇☝️🫵✋🤚🖐️🖖👋🤙💪🦾🖕✍️🤳💅🙋‍♂️🙋‍♀️🤷‍♂️🤷‍♀️🤦‍♂️🤦‍♀️🙆‍♂️🙆‍♀️🙅‍♂️🙅‍♀️💁‍♂️💁‍♀️🙇‍♂️🙇‍♀️👀👁️👂👃🧠🫀🦷👅👄💋👶🧒👦👧🧑👨👩🧓👴👵'],
    ['❤️', '❤️🧡💛💚💙💜🖤🤍🤎💔❤️‍🔥❣️💕💞💓💗💖💘💝💟☮️✝️☪️🕉️☯️🔯🕎♈♉♊♋♌♍♎♏♐♑♒♓💯💢💥💫💦💨🕳️💬🗨️💭💤✨🌟⭐🌠🔥⚡🌈☀️🌤️⛅☁️🌧️⛈️❄️☃️💧🌊'],
    ['🐶', '🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🙈🙉🙊🐔🐧🐦🦆🦅🦉🦇🐺🐗🐴🦄🐝🐛🦋🐌🐞🐜🐢🐍🦎🐙🦑🦐🦀🐠🐟🐬🐳🦈🐊🐅🐘🦒🐪🌵🎄🌲🌳🌴🌱🍀☘️🍁🍂🍃🌷🌹🌺🌸🌼🌻'],
    ['🍕', '🍏🍎🍐🍊🍋🍌🍉🍇🍓🫐🍒🍑🥭🍍🥥🥝🍅🥑🥦🥕🌽🌶️🥔🍞🥐🥖🧀🥚🍳🥞🥓🥩🍗🍖🌭🍔🍟🍕🥪🌮🌯🥗🍝🍜🍲🍛🍣🍱🍤🍙🍚🍘🍥🍦🍧🍨🍩🍪🎂🍰🧁🍫🍬🍭🍮🍯☕🍵🥤🧃🍺🍻🥂🍷🥃🍸🍹🍾'],
    ['⚽', '⚽🏀🏈⚾🎾🏐🏉🎱🏓🏸🥊🥋⛳🎣🎽🛹🎿🏂🏋️🤸🚴🏆🥇🥈🥉🏅🎖️🎗️🎫🎟️🎪🎭🎨🎬🎤🎧🎼🎹🥁🎷🎺🎸🎻🎲🎯🎳🎮🎰🧩✈️🚀🛸🚁🚗🚕🚌🏎️🚓🚑🚒🚲🛵🏍️🚂🚢⛵🏠🏢🏦🏥🏫🏭🗼🗽🗺️🌍🌎🌏🏝️🏖️⛰️🏔️'],
    ['💡', '⌚📱💻⌨️🖥️🖨️🖱️💾💿📷📸📹🎥📞☎️📟📠📺📻🔋🔌💡🔦🕯️🧯💸💵💴💶💷💰💳🧾📈📉📊📋📌📍📎🖇️📏📐✂️🗃️🗂️📁📂🗒️🗓️📆📅📇🔒🔓🔑🗝️🔨🪓⛏️⚒️🛠️🗡️⚔️🔧🔩⚙️🧲🔬🔭📡💊💉🩺🧬🧪🧫🧹🧺🧼🛒📦📫📬📭📮✉️📧📨📩📝📖📚📰🏷️'],
    ['✅', '✅☑️✔️❌❎➕➖➗✖️♻️⚠️🚫⛔📛🔞❓❔❗❕‼️⁉️🔔🔕🔰⭕🔴🟠🟡🟢🔵🟣⚫⚪🟤▶️⏸️⏹️⏺️⏭️⏮️🔀🔁🔂🔼🔽⏫⏬➡️⬅️⬆️⬇️↗️↘️↙️↖️↕️↔️🔃🔄🔙🔚🔛🔜🔝🏳️🏴🏁🚩🏳️‍🌈🇲🇦🇫🇷🇪🇸🇯🇵🇸🇦🇺🇸🇬🇧🇩🇪🇮🇹🇪🇬🇹🇳🇩🇿🇦🇪🇨🇦'],
]

/** A small smiley button that opens a grid of emojis; `onPick(emoji)` gets the one chosen. Opens upwards or downwards, always inside the window. */
const EmojiPicker = ({ onPick, className, title }) => {
    const [pos, setPos] = useState(null)
    const [g, setG] = useState(0)
    const btn = useRef(null)
    useEffect(() => {
        if (!pos) return undefined
        const away = (e) => { if (!btn.current?.contains(e.target) && !e.target.closest?.('[data-emoji-picker]')) setPos(null) }
        const esc = (e) => { if (e.key === 'Escape') setPos(null) }
        document.addEventListener('pointerdown', away, true)
        document.addEventListener('keydown', esc)
        return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', esc) }
    }, [pos])
    const open = () => {
        const r = btn.current.getBoundingClientRect()
        const w = 288, h = 250
        const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8))
        const up = r.top > h + 16
        setPos({ left, top: up ? r.top - h - 6 : Math.min(r.bottom + 6, window.innerHeight - h - 8) })
    }
    const chars = (s) => (typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].map((x) => x.segment) : [...s])
    return (
        <>
            <button ref={btn} type="button" title={title || tr('Emoji')} aria-label={title || tr('Emoji')} onMouseDown={(e) => e.preventDefault()} onClick={() => (pos ? setPos(null) : open())} className={classNames('grid size-7 place-items-center rounded-md text-[17px] text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-700', pos && 'bg-primary/15 text-primary', className)}><PiSmileyDuotone /></button>
            {pos && createPortal(
                <div data-emoji-picker style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 100002, width: 288 }} className="rounded-xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-600 dark:bg-gray-800" onMouseDown={(e) => e.preventDefault()}>
                    <div className="mb-1 flex gap-1 border-b border-gray-100 pb-1 dark:border-gray-700">{GROUPS.map(([icon], i) => <button key={icon} type="button" onClick={() => setG(i)} className={classNames('flex-1 rounded-md py-0.5 text-lg', g === i ? 'bg-primary/10' : 'hover:bg-gray-100 dark:hover:bg-gray-700')}>{icon}</button>)}</div>
                    <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto">
                        {chars(GROUPS[g][1]).filter((x) => x.trim()).map((e, i) => <button key={`${e}${i}`} type="button" onClick={() => { onPick(e); setPos(null) }} className="rounded-md py-0.5 text-xl transition hover:scale-125 hover:bg-gray-100 dark:hover:bg-gray-700">{e}</button>)}
                    </div>
                </div>, document.body)}
        </>
    )
}

export default EmojiPicker
