/*! © 2026 TRT Digital — trtCRM. */
import { useEffect, useState } from 'react'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { tr } from '@/utils/t'

/**
 * "Are you sure?" before something that cannot be undone — one dialog for the whole app (<ConfirmHost /> is mounted once in App).
 *   confirmDelete(tr('Delete this comment?'), () => remove(c))
 * `run` only happens after the person presses the red button. Options: { text, confirmText, type }.
 */
let show = null
export const confirmDelete = (title, run, opts = {}) => {
    if (show) show({ title, run, ...opts })
    else run?.() // no host mounted (should not happen) — do not block the action forever
}

export const ConfirmHost = () => {
    const [state, setState] = useState(null)
    useEffect(() => { show = setState; return () => { if (show === setState) show = null } }, [])
    const close = () => setState(null)
    return (
        <ConfirmDialog
            isOpen={!!state}
            type={state?.type || 'danger'}
            title={state?.title || ''}
            confirmText={state?.confirmText || tr('Delete')}
            cancelText={tr('Cancel')}
            onClose={close}
            onRequestClose={close}
            onCancel={close}
            onConfirm={() => { const go = state?.run; close(); go?.() }}
        >
            <p>{state?.text || tr('This cannot be undone.')}</p>
        </ConfirmDialog>
    )
}

export default confirmDelete
