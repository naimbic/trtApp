import { TbBook2, TbEye, TbThumbUp, TbSearch, TbFolder } from 'react-icons/tb'
import dayjs from 'dayjs'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Tag from '@/components/ui/Tag'
import classNames from '@/utils/classNames'
import { tr, trn } from '@/utils/t'

export const Hero = ({ title, text, value, onChange, onSearch, children, placeholder = tr("Type to search an article") }) => (
    <section className="flex min-h-[260px] flex-col justify-center rounded-2xl bg-linear-to-tr from-cyan-100 via-violet-100 to-fuchsia-100 px-4 py-10 dark:from-cyan-500 dark:via-violet-500 dark:to-fuchsia-500">
        <div className="flex flex-col items-center">
            <div className="mb-6 flex flex-col items-center"><h2 className="mb-3 text-center">{title}</h2><p className="max-w-[420px] text-center dark:text-gray-200">{text}</p></div>
            <div className="flex min-h-[50px] w-full max-w-[760px] flex-col rounded-xl border border-gray-200 bg-white px-3 dark:border-gray-700">
                <div className="flex h-[56px] w-full items-center gap-2">
                    <input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSearch?.()} className="heading-text h-full flex-1 bg-transparent font-semibold placeholder:font-semibold placeholder:text-gray-400 focus:outline-hidden" placeholder={placeholder} />
                    <Button size="xs" shape="circle" variant="solid" icon={<TbSearch />} onClick={onSearch} />
                </div>
            </div>
            {children}
        </div>
    </section>
)

export const GroupCard = ({ g, onClick }) => (
    <div role="button" onClick={onClick} className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-7 shadow-sm transition-colors hover:border-primary hover:bg-primary dark:border-transparent dark:bg-gray-700">
        <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-gray-100 p-4 transition-colors group-hover:bg-white/25 dark:bg-gray-600"><span className="text-2xl transition-colors group-hover:text-neutral" style={{ color: g.color || undefined }}><TbFolder /></span></div>
            <h5 className="mt-2 text-center font-bold transition-colors group-hover:text-neutral">{g.name}</h5>
            <p className="min-h-[40px] max-w-[260px] text-center text-sm transition-colors group-hover:text-neutral">{g.description}</p>
            <div className="font-bold text-primary transition-colors group-hover:text-neutral">{trn(g.count, "article")}</div>
        </div>
    </div>
)

export const ArticleRow = ({ a, onClick, last, showState, unit = 'min read' }) => (
    <div role="button" onClick={onClick} className={classNames('group flex cursor-pointer items-center justify-between gap-4 border-gray-200 py-5 dark:border-gray-700', !last && 'border-b')}>
        <div className="flex min-w-0 items-center gap-4">
            <Avatar className="bg-gray-100 dark:bg-gray-700" size={46} shape="round" icon={<span className="heading-text"><TbBook2 /></span>} />
            <div className="min-w-0">
                <h6 className="truncate font-bold group-hover:text-primary">{a.subject}</h6>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500"><span>{a.minutes} {unit}</span>{a.group && <><span>•</span><span>{a.group.name}</span></>}{showState && a.staffOnly && <Tag className="bg-amber-100 text-amber-700">{tr("Staff only")}</Tag>}{showState && !a.active && <Tag className="bg-gray-200 text-gray-600">{tr("Draft")}</Tag>}</div>
                {a.excerpt && <p className="mt-1 line-clamp-1 text-sm text-gray-500">{a.excerpt}</p>}
            </div>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-sm font-semibold text-gray-600 dark:text-gray-300"><span className="inline-flex items-center gap-1" title={tr("Views")}><TbEye className="text-xl" />{a.views}</span><span className="inline-flex items-center gap-1" title={tr("Found it helpful")}><TbThumbUp className="text-xl" />{a.helpful}</span></div>
    </div>
)

/** Article text + "In this page" box, shared by the staff and client-area article pages. */
export const ArticleLayout = ({ article, toc, related, onRelated, headExtra, footer, backTo, labels = {} }) => (
    <div className="lg:flex lg:gap-6">
        <div className="mx-auto my-2 w-full max-w-[820px]">
            {backTo}
            <h3>{article.subject}</h3>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">{article.group && <Tag className="bg-primary/10 text-primary">{article.group.name}</Tag>}<span>{tr("Updated")} {dayjs(article.updatedAt).format('DD MMM YYYY')}</span><span>•</span><span>{article.minutes} {tr("min read")}</span>{headExtra}</div>
            <div className="prose mt-8 max-w-none dark:prose-invert prose-headings:font-bold prose-p:mt-2 [&_img]:h-auto [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: article.html || `<p>${labels.empty || tr("This article has no text yet.")}</p>` }} />
            {footer}
        </div>
        {(toc.length > 0 || related.length > 0) && (
            <aside className="mt-4 hidden shrink-0 lg:block lg:w-[320px]">
                <div className="sticky top-24 flex flex-col gap-4">
                    {toc.length > 0 && <Card><h6 className="font-bold">{labels.toc || tr("In this page")}</h6><ul className="mt-3 font-medium text-gray-500 dark:text-gray-400">{toc.map((t) => <li key={t.id} className={t.level === 3 ? 'pl-4' : ''}><button type="button" className="block w-full py-1.5 text-left transition-colors hover:text-primary" onClick={() => document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{t.label}</button></li>)}</ul></Card>}
                    {related.length > 0 && <Card><h6 className="font-bold">{labels.related || tr("More in this group")}</h6><ul className="mt-3">{related.map((r) => <li key={r.id}><button type="button" className="block w-full py-1.5 text-left text-gray-600 transition-colors hover:text-primary dark:text-gray-300" onClick={() => onRelated(r.id)}>{r.subject}</button></li>)}</ul></Card>}
                </div>
            </aside>
        )}
    </div>
)
