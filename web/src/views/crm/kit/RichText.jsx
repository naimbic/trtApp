import { cleanHtml } from '@/lib/crm/richText'
import classNames from '@/utils/classNames'

export const STYLE = '[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_a]:text-primary [&_a]:underline [&_blockquote]:border-s-2 [&_blockquote]:ps-3 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h2]:mt-3 [&_h3]:mt-2 [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_li]:mb-0.5 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:mb-1 [&_p:last-child]:mb-0 [&_table]:my-2 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1 [&_td]:align-top [&_td_p]:mb-0 [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:px-2 [&_th]:py-1 [&_th]:text-start [&_th]:font-semibold [&_th_p]:mb-0 dark:[&_td]:border-gray-600 dark:[&_th]:border-gray-600 dark:[&_th]:bg-gray-700 [&_.selectedCell]:bg-primary/10 [&_ul]:list-disc [&_ul]:ps-5'

/** Formatted text from an item description or a note: harmless HTML is shown as formatted text, never as tags. */
const RichText = ({ html, className }) => {
    const clean = cleanHtml(html)
    if (!clean) return null
    return <div className={classNames('rich-view break-words', STYLE, className)} dangerouslySetInnerHTML={{ __html: clean }} />
}

export default RichText
