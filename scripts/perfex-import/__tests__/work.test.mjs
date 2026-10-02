import assert from 'node:assert/strict'
import { oid } from '../lib.mjs'
import work from '../tables/work.mjs'

// projects
const p = work.projects.map({
    id: '7', name: 'Site web', description: null, status: '2', clientid: '12', billing_type: '3',
    start_date: '2023-01-05', deadline: '0000-00-00', project_created: '2023-01-01', date_finished: null,
    progress: '40', progress_from_tasks: '1', project_cost: '1500.00', project_rate_per_hour: '0.00',
    estimated_hours: '20', addedfrom: '1',
})
assert.equal(p.id, oid('projects', 7))
assert.equal(p.clientId, oid('clients', 12))
assert.equal(p.status, 2)
assert.equal(p.deadline, null)
assert.equal(p.progressFromTasks, true)
assert.equal(p.projectCost, 1500)
assert.equal(p.createdAt.toISOString(), '2023-01-01T00:00:00.000Z')

// tasks: rel_type project
const t = work.tasks.map({
    id: '30', name: 'Do it', description: 'x', priority: '3', dateadded: '2023-02-01 10:30:00', startdate: '2023-02-01',
    duedate: '2023-02-10', datefinished: null, addedfrom: '2', is_added_from_contact: '0', status: '4',
    recurring_type: null, repeat_every: '0', recurring: '0', is_recurring_from: null, cycles: '0', total_cycles: '0',
    custom_recurring: '0', last_recurring_date: null, rel_id: '7', rel_type: 'project', is_public: '0', billable: '1',
    billed: '0', invoice_id: '0', hourly_rate: '50.00', milestone: '3', kanban_order: '1', milestone_order: '0',
    visible_to_client: '1', deadline_notified: '0',
})
assert.equal(t.status, 4)
assert.equal(t.relType, 'project')
assert.equal(t.relId, oid('projects', 7))
assert.equal(t.milestoneId, oid('milestones', 3))
assert.equal(t.invoiceId, null)
assert.equal(t.visibleToClient, true)
assert.equal(t.billable, true)
assert.equal(t.createdAt.toISOString(), '2023-02-01T10:30:00.000Z')
assert.equal(t.hourlyRate, 50)

// tasks: no relation
const t2 = work.tasks.map({ id: '31', name: 'Standalone', status: '5', rel_id: null, rel_type: '', priority: '2', dateadded: '2023-03-01 00:00:00' })
assert.equal(t2.relType, null)
assert.equal(t2.relId, null)
assert.equal(t2.status, 5)

// tasks: customer / credit_note
assert.equal(work.tasks.map({ id: '32', name: 'c', rel_type: 'customer', rel_id: '5' }).relId, oid('clients', 5))
assert.equal(work.tasks.map({ id: '33', name: 'c', rel_type: 'credit_note', rel_id: '5' }).relId, oid('creditnotes', 5))

// task_assigned
const a = work.task_assigned.map({ id: '9', staffid: '3', taskid: '30', assigned_from: '1', is_assigned_from_contact: '0' })
assert.equal(a.taskId, oid('tasks', 30))
assert.equal(a.staffId, oid('staff', 3))
assert.equal(a.assignedFrom, oid('staff', 1))

// taskstimers
const tm = work.taskstimers.map({ id: '4', task_id: '30', start_time: '1675247400', end_time: '1675251000', staff_id: '3', hourly_rate: '25.5', note: 'n' })
assert.equal(tm.taskId, oid('tasks', 30))
assert.equal(tm.startTime.toISOString(), '2023-02-01T10:30:00.000Z')
assert.equal(tm.endTime.getTime() - tm.startTime.getTime(), 3600000)
assert.equal(tm.hourlyRate, 25.5)
assert.equal(work.taskstimers.map({ id: '5', task_id: '30', start_time: '1675247400', end_time: null }).endTime, null)

// timesheets extra
const ts = work.timesheets_timesheet.map({ id: '1', staff_id: '3', date_work: '2023-02-01', value: 'W:8', foo: 'bar' })
assert.deepEqual(ts.extra, { foo: 'bar' })

console.log('work mapper tests passed')
