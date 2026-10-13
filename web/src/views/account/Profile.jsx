import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import dayjs from 'dayjs'
import { TbBrandFacebook, TbBrandLinkedin, TbBrandSkype, TbBrandWhatsapp, TbWorld } from 'react-icons/tb'
import Container from '@/components/shared/Container'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Segment from '@/components/ui/Segment'
import Switcher from '@/components/ui/Switcher'
import Tabs from '@/components/ui/Tabs'
import Spinner from '@/components/ui/Spinner'
import Dialog from '@/components/ui/Dialog'
import PasswordInput from '@/components/shared/PasswordInput'
import { useAuth } from '@/auth'
import Alert from '@/components/ui/Alert'
import ImageUpload from '@/components/crm/ImageUpload'
import { countryList } from '@/constants/countries.constant'
import { useSessionUser } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { api, notify } from '@/views/crm/kit/api'
import { resetMe } from '@/utils/hooks/useMe'
import Security from './Security'

const { TabList, TabNav, TabContent } = Tabs

const LANGUAGES = ['english', 'french', 'arabic', 'spanish', 'german', 'italian', 'portuguese', 'dutch', 'turkish'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))
const DIAL = [...new Map(countryList.map((c) => [c.dialCode, { value: c.dialCode, label: `${c.dialCode}  ${c.label}` }])).values()]
const COUNTRIES = countryList.map((c) => ({ value: c.value, label: c.label }))
const ZONES = (typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC', 'Africa/Casablanca', 'Europe/Paris']).map((z) => ({ value: z, label: z.replace(/_/g, ' ') }))
const NOTIFY = [
    ['invoicePaid', 'Invoice paid', 'When a client pays one of your invoices'],
    ['taskAssigned', 'Task assigned to me', 'When someone gives you a task'],
    ['ticketReply', 'Support ticket replies', 'When a client answers a ticket'],
    ['eventReminder', 'Event reminders', 'Before meetings and calendar events'],
    ['dailyDigest', 'Daily summary', 'One email each morning with what needs attention'],
    ['desktop', 'Browser notifications', 'Pop-ups while the CRM is open'],
]

const Field = ({ label, hint, children, className = '' }) => (
    <div className={className}>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</label>
        {children}
        {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
)
const Section = ({ title, desc, children }) => (
    <Card className="mb-4">
        <h5 className="mb-0.5">{title}</h5>
        {desc && <p className="mb-5 text-sm text-gray-500">{desc}</p>}
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">{children}</div>
    </Card>
)

const completion = (u, s) => {
    const checks = [u.image, u.firstName, u.lastName, u.title, u.phone, u.country, u.city, s?.bio, s?.timezone, s?.linkedin || s?.website]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

const Profile = () => {
    const setUser = useSessionUser((st) => st.setUser)
    const sessionUser = useSessionUser((st) => st.user)
    const setMode = useThemeStore((st) => st.setMode)
    const [data, setData] = useState(null)
    const [form, setForm] = useState(null)
    const [saved, setSaved] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [params] = useSearchParams()
    const [tab, setTab] = useState(params.get('tab') || 'profile')
    const { signOut } = useAuth()
    const [emailDlg, setEmailDlg] = useState(false)
    const [newEmail, setNewEmail] = useState('')
    const [emailPw, setEmailPw] = useState('')
    const [emailBusy, setEmailBusy] = useState(false)
    const [emailErr, setEmailErr] = useState('')

    const load = useCallback(async () => {
        try {
            const d = await api('/api/crm/profile')
            setData(d)
            const f = { user: d.user, staff: d.staff || {}, preferences: d.preferences }
            setForm(f); setSaved(JSON.stringify(f))
        } catch (e) { setError(e.message) }
    }, [])
    useEffect(() => { load() }, [load])

    const dirty = useMemo(() => !!form && JSON.stringify(form) !== saved, [form, saved])
    if (error) return <Container><Alert showIcon type="danger">{error}</Alert></Container>
    if (!form) return <Container><div className="flex h-60 items-center justify-center"><Spinner size={32} /></div></Container>

    const u = form.user, s = form.staff, p = form.preferences
    const setU = (patch) => setForm((f) => ({ ...f, user: { ...f.user, ...patch } }))
    const setS = (patch) => setForm((f) => ({ ...f, staff: { ...f.staff, ...patch } }))
    const setN = (k, v) => setForm((f) => ({ ...f, preferences: { ...f.preferences, notify: { ...f.preferences.notify, [k]: v } } }))
    const setD = (k, v) => setForm((f) => ({ ...f, preferences: { ...f.preferences, display: { ...f.preferences.display, [k]: v } } }))
    const fullName = `${u.firstName} ${u.lastName}`.trim() || u.email
    const pct = completion(u, s)

    const save = async () => {
        setSaving(true)
        try {
            const d = await api('/api/crm/profile', { method: 'PUT', body: { user: { firstName: u.firstName, lastName: u.lastName, title: u.title, phone: u.phone, dialCode: u.dialCode, country: u.country, address: u.address, city: u.city, postcode: u.postcode, birthday: u.birthday }, staff: { facebook: s.facebook, linkedin: s.linkedin, website: s.website, skype: s.skype, whatsapp: s.whatsapp, bio: s.bio, timezone: s.timezone, defaultLanguage: s.defaultLanguage, direction: s.direction, emailSignature: s.emailSignature }, preferences: p } })
            const f = { user: d.user, staff: d.staff || {}, preferences: d.preferences }
            setData(d); setForm(f); setSaved(JSON.stringify(f))
            setUser({ ...sessionUser, userName: `${d.user.firstName} ${d.user.lastName}`.trim() })
            if (d.preferences.display.theme !== 'system') setMode(d.preferences.display.theme)
            resetMe()
            notify('success', 'Profile saved')
        } catch (e) { notify('danger', e.message) } finally { setSaving(false) }
    }
    const changeEmail = async () => {
        setEmailBusy(true); setEmailErr('')
        try {
            await api('/api/crm/profile', { method: 'POST', body: { newEmail, password: emailPw } })
            notify('success', 'Email changed. Sign in again with the new address.')
            setEmailDlg(false)
            await signOut()
        } catch (e) { setEmailErr(e.message) } finally { setEmailBusy(false) }
    }
    const onAvatar = (url) => { setU({ image: url }); setSaved((x) => JSON.stringify({ ...JSON.parse(x), user: { ...JSON.parse(x).user, image: url } })); setUser({ ...sessionUser, avatar: url || '' }); resetMe() }

    return (
        <Container>
            <Card bodyClass="p-0" className="mb-4 overflow-hidden">
                <div className="h-28 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 sm:h-32" />
                <div className="flex flex-col gap-4 px-6 pb-5 sm:flex-row sm:items-end">
                    <div className="-mt-14 sm:-mt-16"><ImageUpload url={u.image} name={fullName} size={112} uploadUrl="/api/crm/profile/avatar" onChange={onAvatar} /></div>
                    <div className="min-w-0 flex-1 sm:pb-1">
                        <h3 className="truncate">{fullName}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                            {u.title && <span>{u.title}</span>}
                            {data.staff?.role && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{data.admin ? 'Super admin' : data.staff.role}</span>}
                            <span>{u.email}</span>
                            {data.staff?.departments?.length > 0 && <span>{data.staff.departments.map((d) => d.name).join(' · ')}</span>}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">Member since {dayjs(u.createdAt).format('MMMM YYYY')}{data.staff?.lastLogin ? ` · last sign-in ${dayjs(data.staff.lastLogin).format('DD MMM YYYY, HH:mm')}` : ''}</div>
                    </div>
                    <div className="w-full sm:w-52">
                        <div className="mb-1 flex justify-between text-xs"><span className="font-semibold">Profile completeness</span><span>{pct}%</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
                    </div>
                </div>
            </Card>

            <Tabs value={tab} onChange={setTab}>
                <TabList>
                    <TabNav value="profile">Profile</TabNav>
                    <TabNav value="security">Security</TabNav>
                    <TabNav value="notifications">Notifications</TabNav>
                    <TabNav value="preferences">Preferences</TabNav>
                    <TabNav value="access">Access</TabNav>
                </TabList>
                <div className="pt-5">
                    <TabContent value="profile">
                        <Section title="Personal information" desc="Shown to your team and on documents you send.">
                            <Field label="First name"><Input value={u.firstName} onChange={(e) => setU({ firstName: e.target.value })} /></Field>
                            <Field label="Last name"><Input value={u.lastName} onChange={(e) => setU({ lastName: e.target.value })} /></Field>
                            <Field label="Job title"><Input placeholder="e.g. Account manager" value={u.title} onChange={(e) => setU({ title: e.target.value })} /></Field>
                            <Field label="Birthday"><Input type="date" max={dayjs().format('YYYY-MM-DD')} value={u.birthday} onChange={(e) => setU({ birthday: e.target.value })} /></Field>
                            <Field label="About you" hint={`${(s.bio || '').length}/500`} className="md:col-span-2"><Input textArea rows={3} maxLength={500} placeholder="A few words about what you do" value={s.bio} onChange={(e) => setS({ bio: e.target.value })} /></Field>
                        </Section>
                        <Section title="Contact" desc={data.canChangeEmail ? 'Your sign-in email can be changed here; you will sign in again afterwards.' : 'Your sign-in email can only be changed by an administrator.'}>
                            <Field label="Email" hint={data.canChangeEmail ? undefined : 'Ask an administrator to change it, or to give you the “Change own sign-in email” permission.'}>
                                <div className="flex gap-2"><Input disabled value={u.email} />{data.canChangeEmail && <Button onClick={() => { setNewEmail(''); setEmailPw(''); setEmailErr(''); setEmailDlg(true) }}>Change</Button>}</div>
                            </Field>
                            <Field label="Phone">
                                <div className="flex gap-2">
                                    <div className="w-44"><Select placeholder="+212" options={DIAL} value={DIAL.find((d) => d.value === u.dialCode) || null} onChange={(o) => setU({ dialCode: o?.value || '' })} /></div>
                                    <Input placeholder="6 12 34 56 78" value={u.phone} onChange={(e) => setU({ phone: e.target.value })} />
                                </div>
                            </Field>
                            <Field label="WhatsApp" className="md:col-span-1"><Input prefix={<TbBrandWhatsapp className="text-lg" />} placeholder="+212 6 12 34 56 78" value={s.whatsapp} onChange={(e) => setS({ whatsapp: e.target.value })} /></Field>
                            <Field label="Country"><Select isClearable placeholder="Select country" options={COUNTRIES} value={COUNTRIES.find((c) => c.value === u.country) || null} onChange={(o) => setU({ country: o?.value || '' })} /></Field>
                            <Field label="Address" className="md:col-span-2"><Input value={u.address} onChange={(e) => setU({ address: e.target.value })} /></Field>
                            <Field label="City"><Input value={u.city} onChange={(e) => setU({ city: e.target.value })} /></Field>
                            <Field label="Postal code"><Input value={u.postcode} onChange={(e) => setU({ postcode: e.target.value })} /></Field>
                        </Section>
                        <Section title="Online" desc="Links must start with https://">
                            <Field label="Website"><Input prefix={<TbWorld className="text-lg" />} placeholder="https://" value={s.website} onChange={(e) => setS({ website: e.target.value })} /></Field>
                            <Field label="LinkedIn"><Input prefix={<TbBrandLinkedin className="text-lg" />} placeholder="https://linkedin.com/in/…" value={s.linkedin} onChange={(e) => setS({ linkedin: e.target.value })} /></Field>
                            <Field label="Facebook"><Input prefix={<TbBrandFacebook className="text-lg" />} placeholder="https://facebook.com/…" value={s.facebook} onChange={(e) => setS({ facebook: e.target.value })} /></Field>
                            <Field label="Skype"><Input prefix={<TbBrandSkype className="text-lg" />} value={s.skype} onChange={(e) => setS({ skype: e.target.value })} /></Field>
                        </Section>
                        <Section title="Language & time" desc="Used for dates in the calendar and for emails sent in your name.">
                            <Field label="Language"><Select isClearable placeholder="Company default" options={LANGUAGES} value={LANGUAGES.find((l) => l.value === s.defaultLanguage) || null} onChange={(o) => setS({ defaultLanguage: o?.value || '' })} /></Field>
                            <Field label="Time zone"><Select isClearable placeholder="Browser default" options={ZONES} value={ZONES.find((z) => z.value === s.timezone) || null} onChange={(o) => setS({ timezone: o?.value || '' })} /></Field>
                            <Field label="Text direction"><Segment value={s.direction || 'ltr'} onChange={(v) => v && setS({ direction: v })}><Segment.Item value="ltr">Left to right</Segment.Item><Segment.Item value="rtl">Right to left</Segment.Item></Segment></Field>
                        </Section>
                        <Section title="Email signature" desc="Added at the end of emails you send from the CRM.">
                            <Field label="Signature" className="md:col-span-2"><Input textArea rows={4} maxLength={2000} placeholder={'Best regards,\n' + fullName} value={s.emailSignature} onChange={(e) => setS({ emailSignature: e.target.value })} /></Field>
                            {s.emailSignature && <div className="md:col-span-2"><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Preview</div><div className="whitespace-pre-line rounded-xl border border-dashed border-gray-300 p-4 text-sm dark:border-gray-600">{s.emailSignature}</div></div>}
                        </Section>
                    </TabContent>
                    <TabContent value="security"><Security embedded /></TabContent>
                    <TabContent value="notifications">
                        <Card>
                            <h5 className="mb-0.5">Notifications</h5>
                            <p className="mb-4 text-sm text-gray-500">Choose what reaches you.</p>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {NOTIFY.map(([k, label, desc]) => (
                                    <div key={k} className="flex items-center justify-between gap-4 py-3.5"><div><div className="font-semibold">{label}</div><div className="text-sm text-gray-500">{desc}</div></div><Switcher checked={!!p.notify[k]} onChange={(v) => setN(k, v)} /></div>
                                ))}
                            </div>
                        </Card>
                    </TabContent>
                    <TabContent value="preferences">
                        <Card>
                            <h5 className="mb-0.5">Display</h5>
                            <p className="mb-5 text-sm text-gray-500">How the CRM looks and behaves for you.</p>
                            <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                                <Field label="Theme"><Segment value={p.display.theme} onChange={(v) => v && setD('theme', v)}><Segment.Item value="light">Light</Segment.Item><Segment.Item value="dark">Dark</Segment.Item><Segment.Item value="system">Automatic</Segment.Item></Segment></Field>
                                <Field label="Time format" hint="Used in the calendar"><Segment value={p.display.timeFormat || 'default'} onChange={(v) => v && setD('timeFormat', v === 'default' ? '' : v)}><Segment.Item value="default">Platform default</Segment.Item><Segment.Item value="24h">24 hours</Segment.Item><Segment.Item value="12h">12 hours</Segment.Item></Segment></Field>
                                <Field label="Week starts on" hint="Used in the calendar">
                                    <Segment value={p.display.weekStart === '' ? 'default' : String(p.display.weekStart)} onChange={(v) => v && setD('weekStart', v === 'default' ? '' : Number(v))}><Segment.Item value="default">Platform default</Segment.Item><Segment.Item value="1">Monday</Segment.Item><Segment.Item value="0">Sunday</Segment.Item><Segment.Item value="6">Saturday</Segment.Item></Segment>
                                </Field>
                            </div>
                        </Card>
                    </TabContent>
                    <TabContent value="access">
                        <Card>
                            <h5 className="mb-0.5">Your access</h5>
                            <p className="mb-4 text-sm text-gray-500">Roles and permissions are managed by an administrator.</p>
                            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                                <div><div className="text-gray-500">Role</div><div className="font-semibold">{data.admin ? 'Super admin' : data.staff?.role || 'No role'}</div></div>
                                <div><div className="text-gray-500">Departments</div><div className="font-semibold">{data.staff?.departments?.map((d) => d.name).join(', ') || '—'}</div></div>
                                <div><div className="text-gray-500">Last sign-in</div><div className="font-semibold">{data.staff?.lastLogin ? dayjs(data.staff.lastLogin).format('DD MMM YYYY, HH:mm') : '—'}</div></div>
                            </div>
                        </Card>
                    </TabContent>
                </div>
            </Tabs>

            <Dialog isOpen={emailDlg} width={440} onClose={() => setEmailDlg(false)} onRequestClose={() => setEmailDlg(false)}>
                <h5 className="mb-1">Change your sign-in email</h5>
                <p className="mb-4 text-sm text-gray-500">You will be signed out everywhere and sign in again with the new address. We also tell your old address about the change.</p>
                {emailErr && <Alert showIcon type="danger" className="mb-3">{emailErr}</Alert>}
                <div className="flex flex-col gap-3">
                    <Field label="New email"><Input type="email" autoFocus value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="name@company.com" /></Field>
                    <Field label="Current password"><PasswordInput autoComplete="current-password" value={emailPw} onChange={(e) => setEmailPw(e.target.value)} /></Field>
                </div>
                <div className="mt-5 flex justify-end gap-2"><Button onClick={() => setEmailDlg(false)}>Cancel</Button><Button variant="solid" loading={emailBusy} disabled={!newEmail || !emailPw} onClick={changeEmail}>Change email</Button></div>
            </Dialog>

            {dirty && tab !== 'security' && (
                <div className="sticky bottom-4 z-10 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-lg dark:border-gray-600 dark:bg-gray-800">
                    <span className="text-sm text-gray-500">You have unsaved changes</span>
                    <div className="flex gap-2"><Button onClick={() => setForm(JSON.parse(saved))}>Discard</Button><Button variant="solid" loading={saving} onClick={save}>Save changes</Button></div>
                </div>
            )}
        </Container>
    )
}

export default Profile
