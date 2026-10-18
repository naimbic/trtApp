import { useState, useRef, useEffect } from 'react'
import classNames from '@/utils/classNames'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import ScrollBar from '@/components/ui/ScrollBar'
import navigationIcon from '@/configs/navigation-icon.config'
import { apiGetSearchResult } from '@/services/CommonService'
import debounce from 'lodash/debounce'
import { HiOutlineSearch, HiChevronRight } from 'react-icons/hi'
import { PiMagnifyingGlassDuotone } from 'react-icons/pi'
import { Link, useLocation } from 'react-router'
import navigationConfig from '@/configs/navigation.config'
import useTranslation from '@/utils/hooks/useTranslation'
import appConfig from '@/configs/app.config'
import { useSessionUser } from '@/store/authStore'
import { NAV_DESC } from './rapport/navDescriptions'
import Highlighter from 'react-highlight-words'
import { tr } from '@/utils/t'

const SUGGESTED = ['invoices', 'clients', 'leads', 'estimates', 'projects', 'my-tasks', 'tickets', 'calendar', 'reports']
const RECENT_KEY = 'trt_recent_pages'
const readRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] } }

/** Every page of the menu the person may open, flat: { key, title, path, icon }. */
const flatMenu = (authority, t) => {
    const out = []
    const ok = (n) => !n.authority?.length || !authority.length || n.authority.some((a) => authority.includes(a))
    const walk = (nodes) => nodes.forEach((n) => {
        if (!ok(n)) return
        if (n.path && !n.isExternalLink) out.push({ key: String(n.key).replace(/^crm\./, ''), title: t(n.translateKey, n.title), path: n.path, icon: n.icon })
        if (n.subMenu?.length) walk(n.subMenu)
    })
    walk(navigationConfig)
    return out
}

const ListItem = (props) => {
    const { icon, label, url = '', keyWord, onNavigate, desc } = props

    return (
        <Link to={url} onClick={onNavigate}>
            <div
                className={classNames(
                    'flex items-center justify-between rounded-xl p-3 cursor-pointer user-select',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                )}
            >
                <div className="flex items-center gap-2">
                    <div
                        className={classNames(
                            'rounded-lg border-2 border-gray-200 shadow-xs text-xl group-hover:shadow-sm h-10 w-10 flex items-center justify-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
                        )}
                    >
                        {icon && navigationIcon[icon]}
                    </div>
                    <div className="text-gray-900 dark:text-gray-300 leading-tight">
                        <Highlighter
                            autoEscape
                            highlightClassName={classNames(
                                'text-primary',
                                'underline bg-transparent font-semibold dark:text-white',
                            )}
                            searchWords={[keyWord]}
                            textToHighlight={label}
                        />
                        {desc && <small className="block text-xs text-gray-400">{desc}</small>}
                    </div>
                </div>
                <HiChevronRight className="text-lg" />
            </div>
        </Link>
    )
}

const _Search = ({ className }) => {
    const [searchDialogOpen, setSearchDialogOpen] = useState(false)
    const { pathname } = useLocation()
    const authority = useSessionUser((st) => st.user.authority) || []
    const { t } = useTranslation(!appConfig.activeNavTranslation)
    // suggestions when the box is empty: the pages you were on lately, then the ones most people reach for
    const [recent, setRecent] = useState(readRecent)
    const flat = flatMenu(authority, t)
    const byPath = Object.fromEntries(flat.map((f) => [f.path, f]))
    const withDesc = (f) => ({ title: f.title, path: f.path, icon: f.icon, desc: NAV_DESC[f.key] ? tr(NAV_DESC[f.key]) : null })
    const recommendedSearch = [
        ...(recent.length ? [{ title: tr('Recent'), data: recent.map((p) => byPath[p]).filter(Boolean).slice(0, 5).map(withDesc) }] : []),
        { title: tr('Suggested'), data: SUGGESTED.map((k) => flat.find((f) => f.key === k)).filter(Boolean).map(withDesc) },
    ].filter((g) => g.data.length)
    const [searchResult, setSearchResult] = useState(null)
    const shown = searchResult || recommendedSearch
    useEffect(() => {
        if (!pathname || pathname === '/dashboard') return
        const next = [pathname, ...readRecent().filter((p) => p !== pathname)].slice(0, 8)
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* private window */ }
        setRecent(next)
    }, [pathname])
    const [noResult, setNoResult] = useState(false)

    const inputRef = useRef(null)

    const handleReset = () => {
        setNoResult(false)
        setSearchResult(null)
    }

    const handleSearchOpen = () => {
        setSearchDialogOpen(true)
    }

    const handleSearchClose = () => {
        setSearchDialogOpen(false)
        handleReset()
    }

    const debounceFn = debounce(handleDebounceFn, 200)

    async function handleDebounceFn(query) {
        if (!query) {
            setSearchResult(null)
            return
        }

        if (noResult) {
            setNoResult(false)
        }

        const respond = await apiGetSearchResult({ query })

        if (respond) {
            if (respond.length === 0) {
                setNoResult(true)
            }
            setSearchResult(respond)
        }
    }

    const handleSearch = (e) => {
        debounceFn(e.target.value)
    }

    useEffect(() => {
        if (searchDialogOpen) {
            const timeout = setTimeout(() => inputRef.current?.focus(), 100)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [searchDialogOpen])

    const handleNavigate = () => {
        handleSearchClose()
    }

    return (
        <>
            <div
                className={classNames(className, 'text-2xl')}
                onClick={handleSearchOpen}
            >
                <PiMagnifyingGlassDuotone />
            </div>
            <Dialog
                contentClassName="p-0"
                isOpen={searchDialogOpen}
                closable={false}
                onRequestClose={handleSearchClose}
            >
                <div>
                    <div className="px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-600">
                        <div className="flex items-center">
                            <HiOutlineSearch className="text-xl" />
                            <input
                                ref={inputRef}
                                className="ring-0 outline-hidden block w-full p-4 text-base bg-transparent text-gray-900 dark:text-gray-100"
                                placeholder={tr("Search...")}
                                onChange={handleSearch}
                            />
                        </div>
                        <Button size="xs" onClick={handleSearchClose}>
                            {tr("Esc")}
                        </Button>
                    </div>
                    <div className="py-6 px-5">
                        <ScrollBar className=" max-h-[350px] overflow-y-auto">
                            {shown.map((result) => (
                                <div key={result.title} className="mb-4">
                                    <h6 className="mb-3">{result.title}</h6>
                                    {result.data.map((data, index) => (
                                        <ListItem
                                            key={data.title + index}
                                            icon={data.icon}
                                            label={data.title}
                                            desc={data.desc}
                                            url={data.path}
                                            keyWord={
                                                inputRef.current?.value || ''
                                            }
                                            onNavigate={handleNavigate}
                                        />
                                    ))}
                                </div>
                            ))}
                            {searchResult && searchResult.length === 0 && noResult && (
                                <div className="my-10 text-center text-lg">
                                    <span>{tr("No results for")} </span>
                                    <span className="heading-text">
                                        {`'`}
                                        {inputRef.current?.value}
                                        {`'`}
                                    </span>
                                </div>
                            )}
                        </ScrollBar>
                    </div>
                </div>
            </Dialog>
        </>
    )
}

const Search = withHeaderItem(_Search)

export default Search
