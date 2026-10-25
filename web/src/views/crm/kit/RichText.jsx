import { cleanHtml } from '@/lib/crm/richText'
import classNames from '@/utils/classNames'

export const STYLE = '[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_a]:text-primary [&_a]:underline [&_blockquote]:border-s-2 [&_blockquote]:ps-3 [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_li]:mb-0.5 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:mb-1 [&_p:last-child]:mb-0 [&_table]:my-1 [&_td]:border [&_td]:px-1.5 [&_th]:border [&_th]:px-1.5 [&_ul]:list-disc [&_ul]:ps-5'

/** Formatted text from an item description or a note: harmless HTML is shown as formatted text, never as tags. */
const RichText = ({ html, className }) => {
    const clean = cleanHtml(html)
    if (!clean) return null
    return <div className={classNames('break-words', STYLE, className)} dangerouslySetInnerHTML={{ __html: clean }} />
}

export default RichText
