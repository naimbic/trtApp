'use client'
import { useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Button from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import { Form, FormItem } from '@/components/ui/Form'
import dayjs from 'dayjs'
import RelationSelect from './RelationSelect'

const toInputDefault = (field, v) => {
    if (v === undefined) return field.type === 'boolean' ? false : field.type === 'multiselect' || field.type === 'tags' ? [] : ''
    if (v === null) return field.type === 'boolean' ? false : field.type === 'multiselect' || field.type === 'tags' ? [] : ''
    if (field.type === 'date' || field.type === 'datetime') return v ? new Date(v) : null
    if (field.type === 'json') return typeof v === 'string' ? v : JSON.stringify(v, null, 2)
    return v
}

const FieldControl = ({ field, controllerProps }) => {
    const { field: rhf } = controllerProps
    const { type } = field
    switch (type) {
        case 'textarea':
        case 'richtext':
        case 'json':
            return <Input textArea rows={type === 'json' ? 6 : 4} {...rhf} value={rhf.value ?? ''} />
        case 'number':
        case 'money':
            return <Input type="number" step={type === 'money' ? '0.01' : 'any'} {...rhf} value={rhf.value ?? ''} />
        case 'boolean':
            return <Switcher checked={!!rhf.value} onChange={(checked) => rhf.onChange(checked)} />
        case 'date':
            return <DatePicker value={rhf.value || null} onChange={(d) => rhf.onChange(d)} />
        case 'datetime':
            return (
                <Input
                    type="datetime-local"
                    value={rhf.value ? dayjs(rhf.value).format('YYYY-MM-DDTHH:mm') : ''}
                    onChange={(e) => rhf.onChange(e.target.value ? new Date(e.target.value) : null)}
                />
            )
        case 'select':
            return (
                <Select
                    isClearable
                    options={field.options || []}
                    value={(field.options || []).find((o) => String(o.value) === String(rhf.value)) || null}
                    onChange={(o) => rhf.onChange(o ? o.value : null)}
                />
            )
        case 'multiselect':
        case 'tags':
            return (
                <Input
                    value={Array.isArray(rhf.value) ? rhf.value.join(', ') : ''}
                    placeholder="comma, separated"
                    onChange={(e) => rhf.onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                />
            )
        case 'relation':
            return <RelationSelect resource={field.resource} value={rhf.value || null} onChange={rhf.onChange} />
        case 'color':
            return <Input type="color" {...rhf} value={rhf.value || '#000000'} />
        case 'email':
            return <Input type="email" {...rhf} value={rhf.value ?? ''} />
        default:
            return <Input type={type === 'url' ? 'url' : 'text'} {...rhf} value={rhf.value ?? ''} />
    }
}

/**
 * Generic form driven by a resource config.
 * props: resource, defaultValues, onSubmit(values), submitting, onCancel
 */
const ResourceForm = ({ resource, defaultValues = {}, onSubmit, submitting, onCancel }) => {
    const fields = useMemo(() => (resource.fields || []).filter((f) => !f.hidden), [resource])
    const sections = useMemo(() => {
        const map = new Map()
        for (const f of fields) {
            const s = f.section || 'General'
            if (!map.has(s)) map.set(s, [])
            map.get(s).push(f)
        }
        return [...map.entries()]
    }, [fields])

    const initial = useMemo(() => {
        const out = {}
        for (const f of fields) out[f.key] = toInputDefault(f, defaultValues[f.key])
        return out
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(defaultValues), fields])

    const { control, handleSubmit, formState: { errors } } = useForm({ defaultValues: initial, values: initial })

    return (
        <Form onSubmit={handleSubmit(onSubmit)} containerClassName="flex flex-col gap-4">
            {sections.map(([title, list]) => (
                <Card key={title}>
                    <h4 className="mb-6">{title}</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                        {list.map((f) => (
                            <FormItem
                                key={f.key}
                                label={f.label}
                                className={['textarea', 'richtext', 'json'].includes(f.type) ? 'md:col-span-2' : ''}
                                invalid={Boolean(errors[f.key])}
                                errorMessage={errors[f.key]?.message}
                            >
                                <Controller
                                    name={f.key}
                                    control={control}
                                    rules={f.required ? { required: `${f.label} is required` } : undefined}
                                    render={(props) => <FieldControl field={f} controllerProps={props} />}
                                />
                            </FormItem>
                        ))}
                    </div>
                </Card>
            ))}
            <div className="flex justify-end gap-2">
                {onCancel && <Button type="button" onClick={onCancel}>Cancel</Button>}
                <Button variant="solid" type="submit" loading={submitting}>Save</Button>
            </div>
        </Form>
    )
}

export default ResourceForm
