import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { components } from 'react-select'
import { TbChecks } from 'react-icons/tb'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Switcher from '@/components/ui/Switcher'
import DatePicker from '@/components/ui/DatePicker'
import { Form, FormItem } from '@/components/ui/Form'

const { Control } = components

export const COLORS = [
    { value: 'red', label: 'red', color: 'bg-red-400' },
    { value: 'orange', label: 'orange', color: 'bg-orange-400' },
    { value: 'yellow', label: 'yellow', color: 'bg-yellow-400' },
    { value: 'green', label: 'green', color: 'bg-green-400' },
    { value: 'blue', label: 'blue', color: 'bg-blue-400' },
    { value: 'purple', label: 'purple', color: 'bg-purple-400' },
]

const ColorOption = ({ innerProps, label, data, isSelected }) => (
    <div className={`flex items-center justify-between rounded-lg p-2 ${isSelected ? 'bg-gray-100 dark:bg-gray-500' : 'hover:bg-gray-50 dark:hover:bg-gray-600'}`} {...innerProps}>
        <div className="flex items-center">
            <Badge className={data.color} />
            <span className="ml-2 capitalize">{label}</span>
        </div>
        {isSelected && <TbChecks className="text-emerald-500 text-xl" />}
    </div>
)

const ColorControl = ({ children, ...props }) => {
    const selected = props.getValue()[0]
    return (
        <Control className="capitalize" {...props}>
            {selected && <Badge className={`${selected.color} ltr:ml-4`} />}
            {children}
        </Control>
    )
}

/** props: open, selected {type:'NEW'|'EDIT', id?, title, description, start, end, eventColor, isPublic}, saving, onSubmit(values), onDelete(), onClose() */
const EventDialog = ({ open, selected, saving, onSubmit, onDelete, onClose }) => {
    const [v, setV] = useState({ title: '', description: '', start: null, end: null, color: 'blue', isPublic: false })
    const [error, setError] = useState('')

    useEffect(() => {
        if (!selected) return
        setError('')
        setV({
            title: selected.title || '',
            description: selected.description || '',
            start: selected.start ? dayjs(selected.start).toDate() : null,
            end: selected.end ? dayjs(selected.end).toDate() : null,
            color: selected.eventColor || 'blue',
            isPublic: !!selected.isPublic,
        })
    }, [selected])

    const edit = selected?.type === 'EDIT'
    const submit = (e) => {
        e.preventDefault()
        if (!v.title.trim()) return setError('Event title is required')
        if (!v.start) return setError('Please select a start date')
        if (v.end && v.end < v.start) return setError('End must be after the start')
        setError('')
        onSubmit({ title: v.title.trim(), description: v.description, start: v.start.toISOString(), end: v.end ? v.end.toISOString() : null, color: v.color, isPublic: v.isPublic })
    }

    return (
        <Dialog isOpen={open} onClose={onClose} onRequestClose={onClose}>
            <h5 className="mb-4">{edit ? 'Edit event' : 'Add new event'}</h5>
            <Form className="flex flex-1 flex-col" onSubmit={submit}>
                <FormItem label="Event title" invalid={!!error && !v.title.trim()} errorMessage={error}>
                    <Input type="text" autoComplete="off" placeholder="Event title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
                </FormItem>
                <FormItem label="Description">
                    <Input textArea rows={3} placeholder="Optional details" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
                </FormItem>
                <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                    <FormItem label="Start">
                        <DatePicker.DateTimepicker value={v.start} onChange={(d) => setV({ ...v, start: d })} />
                    </FormItem>
                    <FormItem label="End">
                        <DatePicker.DateTimepicker value={v.end} onChange={(d) => setV({ ...v, end: d })} />
                    </FormItem>
                </div>
                <FormItem label="Event color">
                    <Select
                        options={COLORS}
                        value={COLORS.filter((o) => o.value === v.color)}
                        components={{ Option: ColorOption, Control: ColorControl }}
                        onChange={(o) => setV({ ...v, color: o?.value || 'blue' })}
                    />
                </FormItem>
                <FormItem label="Visible to everyone">
                    <Switcher checked={v.isPublic} onChange={(checked) => setV({ ...v, isPublic: checked })} />
                </FormItem>
                <div className="mt-2 flex items-center gap-2">
                    {edit && (
                        <Button type="button" variant="plain" className="text-red-500" onClick={onDelete} disabled={saving}>Delete</Button>
                    )}
                    <div className="ml-auto flex gap-2">
                        <Button type="button" onClick={onClose}>Cancel</Button>
                        <Button variant="solid" type="submit" loading={saving}>{edit ? 'Update' : 'Create'}</Button>
                    </div>
                </div>
            </Form>
        </Dialog>
    )
}

export default EventDialog
