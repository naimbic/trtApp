"use client";

/**
 * Canonical TRT multi-step lead form (portable).
 * Copy into any spoke site and theme it with props — no project-specific design
 * tokens required. Uses neutral Tailwind grays for structure and inline styles
 * for the brand accent, so it looks native anywhere once you pass `brand`.
 *
 * Requires: framer-motion (npm i framer-motion) and Tailwind.
 * Posts to `apiPath` (default /api/contact), sending the current page URL.
 *
 * Example:
 *   <ContactForm
 *     brand="#2563eb"
 *     agencyName="TRT Digital"
 *     privacyHref="/privacy"
 *     whatsappUrl="https://wa.me/2126..."
 *   />
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────── configurable content (sensible defaults) ─────────── */

export type ServiceOption = { id: string; label: string; icon: keyof typeof icons };
export type ChoiceOption = { value: string; label: string; desc: string };

const defaultServices: ServiceOption[] = [
    { id: "google-ads", label: "Google Ads (PPC)", icon: "target" },
    { id: "seo", label: "SEO & Organic", icon: "search" },
    { id: "social-ads", label: "Social Ads (Meta / TikTok)", icon: "social" },
    { id: "geo-ai", label: "GEO & AI Search", icon: "brain" },
    { id: "web-cro", label: "Web & CRO", icon: "code" },
    { id: "content", label: "Content & Creative", icon: "pen" },
    { id: "analytics", label: "Analytics & Strategy", icon: "chart" },
];

const defaultBudgets: ChoiceOption[] = [
    { value: "under-1k", label: "Under $1,000 / mo", desc: "Local SEO, small tests or advisory" },
    { value: "1k-3k", label: "$1,000 – $3,000 / mo", desc: "Great for mid-scale SEO or paid growth" },
    { value: "3k-10k", label: "$3,000 – $10,000 / mo", desc: "Full-service, dedicated team" },
    { value: "10k-plus", label: "$10,000+ / mo", desc: "Large multi-channel campaigns" },
    { value: "one-off", label: "One-off project", desc: "Audit, website build, revamp…" },
    { value: "advice", label: "Not sure / need advice", desc: "We'll recommend based on your goals" },
];

const defaultTimelines: ChoiceOption[] = [
    { value: "asap", label: "As soon as possible", desc: "Urgent — audit, quick wins, fixes" },
    { value: "1-3m", label: "1 to 3 months", desc: "Launch and first optimization" },
    { value: "3-6m", label: "3 to 6 months", desc: "Full strategy execution" },
    { value: "6m-plus", label: "6 months and beyond", desc: "Long-term growth partnership" },
    { value: "flex", label: "Flexible / not sure", desc: "We'll recommend a timeline" },
];

const icons = {
    search: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>,
    target: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
    social: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>,
    brain: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 5a3 3 0 1 0-5.9.6A3 3 0 0 0 4 8.5 3 3 0 0 0 5.5 14 3 3 0 0 0 12 15.5Z" /><path d="M12 5a3 3 0 1 1 5.9.6A3 3 0 0 1 20 8.5a3 3 0 0 1-1.5 5.5A3 3 0 0 1 12 15.5Z" /><path d="M12 5v13" /></svg>,
    code: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6" /></svg>,
    pen: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
    chart: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>,
    check: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
};

type FormData = {
    services: string[]; budget: string; timeline: string;
    name: string; email: string; phone: string; company: string; website: string;
    message: string; consent: boolean; hp: string;
};

const initialForm: FormData = {
    services: [], budget: "", timeline: "",
    name: "", email: "", phone: "", company: "", website: "",
    message: "", consent: false, hp: "",
};

export type ContactFormProps = {
    brand?: string;         // primary brand hex (default blue)
    brandTo?: string;       // gradient end hex (defaults to a lighter brand)
    agencyName?: string;    // shown in consent text
    heading?: string;
    intro?: string;
    services?: ServiceOption[];
    budgets?: ChoiceOption[];
    timelines?: ChoiceOption[];
    privacyHref?: string;
    whatsappUrl?: string;
    apiPath?: string;       // default /api/contact
    formType?: string;      // default "contact"
};

const TOTAL = 4;

export function ContactForm({
    brand = "#2563eb",
    brandTo,
    agencyName = "TRT",
    heading = "Get a free strategy session",
    intro = "Tell us what you need and we'll come back with concrete ideas to improve your performance — no strings attached. We reply within one business day.",
    services = defaultServices,
    budgets = defaultBudgets,
    timelines = defaultTimelines,
    privacyHref = "/privacy",
    whatsappUrl,
    apiPath = "/api/contact",
    formType = "contact",
}: ContactFormProps) {
    const grad = { backgroundImage: `linear-gradient(to right, ${brand}, ${brandTo || brand})` };
    return (
        <section id="contact" className="bg-slate-50 py-20 lg:py-28">
            <div className="mx-auto w-full max-w-6xl px-4">
                <div className="mx-auto max-w-2xl text-center">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: brand }}>Let&apos;s talk</span>
                    <h2 className="mt-4 text-3xl font-extrabold text-slate-900 sm:text-4xl">{heading}</h2>
                    <p className="mt-4 text-slate-500">{intro}</p>
                </div>
                <div className="mt-12">
                    <Wizard {...{ brand, grad, agencyName, services, budgets, timelines, privacyHref, whatsappUrl, apiPath, formType }} />
                </div>
            </div>
        </section>
    );
}

function Wizard({ brand, grad, agencyName, services, budgets, timelines, privacyHref, whatsappUrl, apiPath, formType }: {
    brand: string; grad: React.CSSProperties; agencyName: string;
    services: ServiceOption[]; budgets: ChoiceOption[]; timelines: ChoiceOption[];
    privacyHref: string; whatsappUrl?: string; apiPath: string; formType: string;
}) {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>(initialForm);
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [dir, setDir] = useState(1);

    const set = <K extends keyof FormData>(k: K, v: FormData[K]) => {
        setForm((f) => ({ ...f, [k]: v }));
        if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
    };

    const validate = (s: number): boolean => {
        const e: Partial<Record<keyof FormData, string>> = {};
        if (s === 1 && form.services.length === 0) e.services = "Select at least one service";
        if (s === 2 && !form.budget) e.budget = "Select a budget";
        if (s === 3 && !form.timeline) e.timeline = "Select a timeline";
        if (s === 4) {
            if (!form.name.trim()) e.name = "Your name is required";
            if (!form.email.trim()) e.email = "Your email is required";
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
            if (!form.phone.trim()) e.phone = "Your phone number is required";
            if (!form.company.trim()) e.company = "Company name is required";
            if (!form.website.trim()) e.website = "Your website is required";
            else if (!/\.[a-z]{2,}/i.test(form.website)) e.website = "Enter a valid website";
            if (!form.consent) e.consent = "You must accept to continue";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const next = () => { if (validate(step) && step < TOTAL) { setDir(1); setStep(step + 1); } };
    const back = () => { if (step > 1) { setDir(-1); setStep(step - 1); } };
    const toggleService = (id: string) =>
        set("services", form.services.includes(id) ? form.services.filter((s) => s !== id) : [...form.services, id]);

    const submit = async () => {
        if (!validate(step)) return;
        if (form.hp) return;
        setStatus("loading");
        const serviceLabels = form.services.map((id) => services.find((s) => s.id === id)?.label || id);
        const budgetLabel = budgets.find((b) => b.value === form.budget)?.label || form.budget;
        const timelineLabel = timelines.find((t) => t.value === form.timeline)?.label || form.timeline;
        try {
            const res = await fetch(apiPath, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    form: formType,
                    name: form.name, email: form.email, phone: form.phone,
                    company: form.company, website: form.website,
                    services: serviceLabels, budget: budgetLabel, timeline: timelineLabel,
                    message: form.message, hp: form.hp,
                    pageUrl: typeof window !== "undefined" ? window.location.href : "",
                }),
            });
            if (!res.ok) throw new Error("bad status");
            setStatus("success");
            if (typeof window !== "undefined") window.scrollTo({ top: window.scrollY - 120, behavior: "smooth" });
        } catch {
            setStatus("error");
        }
    };

    if (status === "success") return <SuccessState brand={brand} grad={grad} whatsappUrl={whatsappUrl} />;

    const cardCls = (active: boolean) =>
        `w-full text-left rounded-xl border-2 transition-all duration-200 ${active ? "bg-slate-50" : "border-transparent bg-slate-50 hover:border-slate-300"}`;
    const cardStyle = (active: boolean): React.CSSProperties =>
        active ? { borderColor: brand, backgroundColor: `${brand}0d` } : {};
    const field = "w-full px-4 py-3 bg-slate-50 border-2 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all";
    const fieldCls = (k: keyof FormData) => `${field} ${errors[k] ? "border-red-400" : "border-slate-200"}`;

    return (
        <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_28px_60px_-30px_rgba(18,20,23,0.2)] sm:p-10">
            <div className="mb-8">
                <div className="mb-2 flex gap-2">
                    {Array.from({ length: TOTAL }, (_, i) => (
                        <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <motion.div className="h-full rounded-full" style={grad}
                                initial={{ width: "0%" }} animate={{ width: i < step ? "100%" : "0%" }} transition={{ duration: 0.4, ease: "easeOut" }} />
                        </div>
                    ))}
                </div>
                <p className="text-xs font-medium text-slate-400">Step {step} of {TOTAL}</p>
            </div>

            <AnimatePresence mode="wait" custom={dir}>
                <motion.div key={step} custom={dir}
                    initial={{ opacity: 0, x: dir * 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -28 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}>

                    {step === 1 && (
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-900">Which services are you interested in?</h3>
                            <p className="mb-6 mt-1 text-sm text-slate-500">Select all that apply.</p>
                            {errors.services && <p className="mb-4 text-sm text-red-500">{errors.services}</p>}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {services.map((opt) => {
                                    const active = form.services.includes(opt.id);
                                    return (
                                        <button key={opt.id} type="button" onClick={() => toggleService(opt.id)} className={`relative p-5 ${cardCls(active)}`} style={cardStyle(active)}>
                                            {active && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ backgroundColor: brand }}>{icons.check}</span>}
                                            <span style={{ color: active ? brand : "#94a3b8" }}>{icons[opt.icon]}</span>
                                            <span className={`mt-2 block text-sm font-semibold ${active ? "text-slate-900" : "text-slate-600"}`}>{opt.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <RadioStep title="What's your estimated monthly budget?" sub="This helps us recommend the right scope."
                            options={budgets} value={form.budget} onSelect={(v) => set("budget", v)} error={errors.budget} brand={brand} cardCls={cardCls} cardStyle={cardStyle} />
                    )}

                    {step === 3 && (
                        <RadioStep title="When would you like to start?" sub="Pick the timeline that fits you."
                            options={timelines} value={form.timeline} onSelect={(v) => set("timeline", v)} error={errors.timeline} brand={brand} cardCls={cardCls} cardStyle={cardStyle} />
                    )}

                    {step === 4 && (
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-900">Your details</h3>
                            <p className="mb-6 mt-1 text-sm text-slate-500">We&apos;ll reply within one business day.</p>
                            <input type="text" name="fax" value={form.hp} onChange={(e) => set("hp", e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field label="Full name *" error={errors.name}><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" className={fieldCls("name")} /></Field>
                                <Field label="Business email *" error={errors.email}><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" className={fieldCls("email")} /></Field>
                                <Field label="Phone *" error={errors.phone}><input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+212 6 00 00 00 00" className={fieldCls("phone")} /></Field>
                                <Field label="Company *" error={errors.company}><input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Company name" className={fieldCls("company")} /></Field>
                                <div className="md:col-span-2">
                                    <Field label="Website *" error={errors.website}><input type="url" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://your-site.com" className={fieldCls("website")} /></Field>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Message <span className="font-normal text-slate-400">(optional)</span></label>
                                    <textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={4} placeholder="Tell us about your project, goals or challenges…" className={fieldCls("message") + " resize-y"} />
                                </div>
                            </div>
                            <div className="flex items-start gap-3 pt-4">
                                <button type="button" onClick={() => set("consent", !form.consent)}
                                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors"
                                    style={form.consent ? { borderColor: brand, backgroundColor: brand, color: "#fff" } : { borderColor: "#cbd5e1" }}>
                                    {form.consent && icons.check}
                                </button>
                                <label className="cursor-pointer text-sm leading-relaxed text-slate-600" onClick={() => set("consent", !form.consent)}>
                                    I agree that {agencyName} may process my data to respond to my request. See the{" "}
                                    <a href={privacyHref} className="underline" style={{ color: brand }} onClick={(e) => e.stopPropagation()}>privacy policy</a>.
                                </label>
                            </div>
                            {errors.consent && <p className="mt-1 text-xs text-red-500">{errors.consent}</p>}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {status === "error" && (
                <p className="mt-6 text-center text-sm text-red-500">Something went wrong. Please try again or email us directly.</p>
            )}

            <div className="mt-8 flex justify-between gap-3">
                {step > 1 ? (
                    <button type="button" onClick={back} className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50">Back</button>
                ) : <div />}
                {step < TOTAL ? (
                    <button type="button" onClick={next} className="rounded-xl px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]" style={grad}>Continue</button>
                ) : (
                    <button type="button" onClick={submit} disabled={status === "loading"} className="rounded-xl px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60" style={grad}>
                        {status === "loading" ? "Sending…" : "Send my request"}
                    </button>
                )}
            </div>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                Your data is secure and never shared with third parties.
            </p>
        </div>
    );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
            {children}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function RadioStep({ title, sub, options, value, onSelect, error, brand, cardCls, cardStyle }: {
    title: string; sub: string; options: ChoiceOption[];
    value: string; onSelect: (v: string) => void; error?: string; brand: string;
    cardCls: (active: boolean) => string; cardStyle: (active: boolean) => React.CSSProperties;
}) {
    return (
        <div>
            <h3 className="text-xl font-extrabold text-slate-900">{title}</h3>
            <p className="mb-6 mt-1 text-sm text-slate-500">{sub}</p>
            {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
            <div className="space-y-3">
                {options.map((opt) => {
                    const active = value === opt.value;
                    return (
                        <button key={opt.value} type="button" onClick={() => onSelect(opt.value)} className={`flex w-full items-center gap-4 p-5 ${cardCls(active)}`} style={cardStyle(active)}>
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: active ? brand : "#cbd5e1" }}>
                                {active && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: brand }} />}
                            </span>
                            <span>
                                <span className={`block text-sm font-semibold ${active ? "text-slate-900" : "text-slate-700"}`}>{opt.label}</span>
                                <span className="block text-xs text-slate-400">{opt.desc}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function SuccessState({ brand, grad, whatsappUrl }: { brand: string; grad: React.CSSProperties; whatsappUrl?: string }) {
    return (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
            className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_28px_60px_-30px_rgba(18,20,23,0.2)] sm:p-12">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            </motion.div>
            <h3 className="text-2xl font-extrabold text-slate-900">Thank you!</h3>
            <p className="mx-auto mb-8 mt-3 max-w-md text-slate-500">We&apos;ve received your request and will get back to you within one business day.</p>
            <div className="mx-auto max-w-sm space-y-4 text-left">
                {["Our team reviews your needs (within 24h)", "We prepare a tailored recommendation", "You receive our proposal and next steps"].map((t, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.4 + i * 0.15 }} className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: brand }}>{i + 1}</span>
                        <span className="text-sm text-slate-600">{t}</span>
                    </motion.div>
                ))}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a href="/" className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50">Back to home</a>
                {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-[#25D366] px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90">Chat on WhatsApp</a>}
            </div>
        </motion.div>
    );
}

export default ContactForm;
