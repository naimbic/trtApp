import { useEffect, useState } from 'react'
import { TbDownload, TbExternalLink } from 'react-icons/tb'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Segment from '@/components/ui/Segment'
import Skeleton from '@/components/ui/Skeleton'
import Table from '@/components/ui/Table'
import { portal, money } from './api'
import { StatusTag, date, Empty } from './ui'

const { Tr, Th, Td, THead, TBody } = Table
const TITLE = { invoices: ['Invoices', 'Open an invoice to read it, print it or download the PDF.'], estimates: ['Estimates', 'Open an estimate to accept or decline it, or to ask a question.'], proposals: ['Proposals', 'Open a proposal to read it, accept or decline it.'], contracts: ['Contracts', 'Open a contract to read it and sign it on screen.'] }

const Documents = ({ kind }) => {
    const [d, setD] = useState(null)
    const [filter, setFilter] = useState('all')
    const [error, setError] = useState('')
    useEffect(() => { setD(null); setFilter('all'); portal(`/${kind}`).then(setD).catch((e) => setError(e.message)) }, [kind])
    const [title, hint] = TITLE[kind]
    const list = (d?.list || []).filter((x) => filter === 'all' || (filter === 'due' ? x.due > 0 : filter === 'open' ? [1, 4, 5, 2].includes(x.status) && !x.due : true))
    const waiting = (x) => (kind === 'invoices' ? x.due > 0 : kind === 'estimates' ? x.status === 2 : kind === 'contracts' ? x.status === 4 : [1, 4, 5].includes(x.status))
    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3>{title}</h3><p className="text-sm text-gray-500">{hint}</p></div>
                <Segment size="sm" value={filter} onChange={(v) => setFilter(Array.isArray(v) ? v[0] : v)}><Segment.Item value="all">All</Segment.Item><Segment.Item value="wait">{kind === 'invoices' ? 'To pay' : 'Waiting for me'}</Segment.Item></Segment>
            </div>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <Card bodyClass="p-0 sm:p-0">
                {!d ? <div className="p-6"><Skeleton height={120} /></div> : (
                    <div className="overflow-x-auto">
                        <Table>
                            <THead><Tr><Th>{kind === 'proposals' ? 'Proposal' : kind === 'contracts' ? 'Contract' : 'Number'}</Th><Th>Date</Th>{kind === 'invoices' && <Th>Due</Th>}{kind === 'estimates' && <Th>Valid until</Th>}{kind === 'proposals' && <Th>Open until</Th>}{kind === 'contracts' && <Th>Ends</Th>}<Th className="text-right">{kind === 'contracts' ? 'Value' : 'Total'}</Th>{kind === 'invoices' && <Th className="text-right">To pay</Th>}<Th>Status</Th><Th /></Tr></THead>
                            <TBody>
                                {list.filter((x) => filter === 'all' || waiting(x)).map((x) => (
                                    <Tr key={x.id}>
                                        <Td><a href={x.link} target="_blank" rel="noreferrer" className="font-semibold heading-text hover:text-primary">{x.number}</a>{x.subject && <div className="max-w-[280px] truncate text-xs text-gray-500">{x.subject}</div>}</Td>
                                        <Td>{date(x.date)}</Td>
                                        {kind === 'invoices' && <Td className={x.status === 4 ? 'font-semibold text-red-500' : ''}>{date(x.dueDate)}</Td>}
                                        {kind === 'estimates' && <Td>{date(x.expiryDate)}</Td>}
                                        {kind === 'proposals' && <Td>{date(x.openTill)}</Td>}{kind === 'contracts' && <Td>{x.endDate ? date(x.endDate) : 'No end'}</Td>}
                                        <Td className="text-right tabular-nums">{x.total != null ? money(x.total, x.currency) : '—'}</Td>
                                        {kind === 'invoices' && <Td className="text-right tabular-nums">{x.due > 0 ? money(x.due, x.currency) : '—'}</Td>}
                                        <Td><StatusTag label={x.statusLabel} /></Td>
                                        <Td><div className="flex justify-end gap-1"><a href={x.link} target="_blank" rel="noreferrer"><Button size="xs" icon={<TbExternalLink />}>Open</Button></a><a href={x.pdf} target="_blank" rel="noreferrer"><Button size="xs" icon={<TbDownload />}>PDF</Button></a></div></Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                        {!list.filter((x) => filter === 'all' || waiting(x)).length && <Empty>{filter === 'all' ? `No ${kind} yet.` : 'Nothing is waiting for you. 🎉'}</Empty>}
                    </div>
                )}
            </Card>
        </div>
    )
}

export default Documents
