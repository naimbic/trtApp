const DAY = 86400000

/** Combine the parts that can be measured (null = nothing to measure yet) into one 0-100 score. */
export function combineScore(parts) {
    const used = Object.values(parts).filter((v) => v !== null && v !== undefined)
    return used.length ? Math.round(used.reduce((a, b) => a + b, 0) / used.length) : null
}

/** Working days (Mon-Fri) between two dates, both included. */
export function workdays(from, to) {
    let n = 0
    for (let t = +new Date(from); t <= +new Date(to); t += DAY) { const d = new Date(t).getDay(); if (d !== 0 && d !== 6) n++ }
    return n
}
