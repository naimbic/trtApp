// The top-bar + menu asks a page to open its "new ..." popup: the page may not be mounted yet (we are
// still navigating to it) or may already be open, so the request is kept here and picked up either way.
let pending = null
export const CREATE_EVENT = 'crm:create'
export const requestCreate = (kind) => { pending = kind; window.dispatchEvent(new Event(CREATE_EVENT)) }
export const takeCreate = (kind) => { if (pending !== kind) return false; pending = null; return true }
/** Calls open() when the page is asked to create `kind` (now or right after it mounts); returns the cleanup. */
export const onCreate = (kind, open) => {
    const run = () => { if (takeCreate(kind)) setTimeout(open, 250) } // after the menu has closed
    run()
    window.addEventListener(CREATE_EVENT, run)
    return () => window.removeEventListener(CREATE_EVENT, run)
}
