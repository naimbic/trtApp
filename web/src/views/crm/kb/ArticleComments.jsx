import { useRef, useState } from 'react'
import dayjs from 'dayjs'
import { TbMessageCircle } from 'react-icons/tb'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import RichEditor from '@/components/crm/RichEditor'
import RichView from '@/components/crm/RichView'
import StaffRing from '@/components/crm/StaffRing'
import { plainOf } from '@/components/crm/ShareButton'
import { CommentFoot, CommentThread, CommentEdit, ReplyingTo, startReply } from '@/components/crm/CommentParts'
import { initials } from '../tasks/shared'
import { api, notify } from '../kit/api'
import { tr } from '@/utils/t'

/** The team's comments under an article: newest thread first, replies nested, reactions, mentions, reminders, edit and delete. Clients never see them. */
const ArticleComments = ({ articleId, subject, comments, canComment, onChange }) => {
    const [text, setText] = useState('')
    const [replyTo, setReplyTo] = useState(null)
    const [editing, setEditing] = useState(null)
    const [busy, setBusy] = useState(false)
    const editor = useRef(null)
    const url = `/api/crm/kb/articles/${articleId}/comments`
    const run = async (fn, ok) => { try { await fn(); if (ok) notify('success', ok); await onChange() } catch (e) { notify('danger', e.message) } }
    const send = async () => {
        setBusy(true)
        try { await api(url, { method: 'POST', body: { content: text, replyToId: replyTo?.id } }); setText(''); setReplyTo(null); notify('success', tr("Comment added")); await onChange() } catch (e) { notify('danger', e.message) } finally { setBusy(false) }
    }
    return (
        <section className="mt-10">
            <h4 className="mb-4 flex flex-wrap items-center gap-2"><TbMessageCircle />{tr("Comments")}{comments.length ? ` (${comments.length})` : ''}<span className="text-sm font-normal text-gray-500">· {tr("only the team sees them")}</span></h4>
            {canComment && (
                <div className="mb-5 space-y-2">
                    <ReplyingTo name={replyTo?.name} onCancel={() => setReplyTo(null)} />
                    <RichEditor minHeight={90} placeholder={tr("Write a comment: a correction, a question, an idea. Type @ to tag a colleague.")} value={text} onChange={setText} onReady={(ed) => { editor.current = ed }} />
                    <Button size="sm" variant="solid" loading={busy} disabled={!text.trim()} onClick={send}>{tr("Add comment")}</Button>
                </div>
            )}
            <div className="space-y-3">
                <CommentThread comments={comments} render={(n) => (
                    <div className="group relative flex gap-3">
                        <StaffRing id={n.by?.id} name={n.by?.name} size={30}><Avatar size={30} shape="circle" src={n.by?.image || undefined}>{initials(n.by?.name || '?')}</Avatar></StaffRing>
                        <div className="min-w-0 flex-1">
                            <div className="rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-700/50">
                                <div className="mb-1 flex items-center justify-between text-xs text-gray-500"><span className="font-semibold text-gray-700 dark:text-gray-200">{n.by?.name || tr("Unknown")}</span><span>{dayjs(n.date).format('DD MMM YYYY, HH:mm')}{n.edited ? ` · ${tr('edited')}` : ''}</span></div>
                                {editing === n.id
                                    ? <CommentEdit initial={n.content} onCancel={() => setEditing(null)} onSave={async (t) => { await api(url, { method: 'PUT', body: { noteId: n.id, content: t } }); setEditing(null); await onChange() }} />
                                    : <RichView html={n.content} />}
                            </div>
                            {editing !== n.id && canComment && (
                                <CommentFoot
                                    remind={{ relType: 'kb_article', relId: articleId, note: plainOf(n.content).slice(0, 140) }}
                                    reactions={n.reactions}
                                    onReact={(emoji) => run(() => api(url, { method: 'POST', body: { noteId: n.id, react: emoji } }))}
                                    onMention={(sid) => run(() => api(url, { method: 'POST', body: { noteId: n.id, mention: sid } }), tr('Colleague mentioned'))}
                                    share={{ url: `/crm/knowledge-base/article/${articleId}`, title: subject, text: `${n.by?.name ? `${n.by.name}: ` : ''}${plainOf(n.content)}` }}
                                    onReply={() => { setReplyTo({ id: n.id, name: n.by?.name || tr('Unknown') }); startReply(editor.current, n.by?.name) }}
                                    onEdit={n.canEdit ? () => setEditing(n.id) : null}
                                    onDelete={n.canDelete ? () => run(() => api(`${url}?noteId=${n.id}`, { method: 'DELETE' })) : null}
                                />
                            )}
                        </div>
                    </div>
                )} />
                {!comments.length && <p className="text-sm text-gray-500">{tr("No comments yet.")}</p>}
            </div>
        </section>
    )
}

export default ArticleComments
