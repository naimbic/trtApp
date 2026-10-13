// Plain node test: node scripts/perfex-import/__tests__/admin.test.mjs
import assert from 'node:assert/strict'
import admin, { relOid } from '../tables/admin.mjs'
import { oid } from '../lib.mjs'

const isOid = (s) => /^[0-9a-f]{24}$/.test(s)
let n = 0
const t = (name, fn) => { fn(); n++; console.log('ok -', name) }

t('every mapper has model/id/map', () => {
    for (const [k, m] of Object.entries(admin)) {
        assert.ok(m.model && m.id && typeof m.map === 'function', k)
    }
})

t('staff', () => {
    const row = { staffid: '3', email: 'a@trt.ma', firstname: 'Amine', lastname: 'B', facebook: '', linkedin: null,
        phonenumber: '0600', skype: null, password: '$2y$10$abc', datecreated: '2020-05-01 10:20:30', profile_image: 'p.png',
        last_ip: '1.2.3.4', last_login: '2024-01-02 03:04:05', last_activity: '0000-00-00 00:00:00', admin: '1', role: '0',
        active: '1', default_language: 'french', direction: '', media_path_slug: 'amine', is_not_staff: '0', hourly_rate: '12.50',
        two_factor_auth_enabled: '0', email_signature: '<p>sig</p>' }
    const o = admin.staff.map(row)
    assert.equal(o.id, oid('staff', 3)); assert.ok(isOid(o.id))
    assert.equal(o.legacyId, 3); assert.equal(o.passwordHash, '$2y$10$abc')
    assert.equal(o.admin, true); assert.equal(o.roleId, null); assert.equal(o.active, true)
    assert.equal(o.isNotStaff, false); assert.equal(o.hourlyRate, 12.5)
    assert.equal(o.facebook, null); assert.equal(o.lastActivity, null)
    assert.equal(o.createdAt.toISOString(), '2020-05-01T10:20:30.000Z')
    const o2 = admin.staff.map({ ...row, staffid: '4', role: '2', admin: '0', active: '0', is_not_staff: '1' })
    assert.equal(o2.roleId, oid('roles', 2)); assert.equal(o2.admin, false); assert.equal(o2.active, false); assert.equal(o2.isNotStaff, true)
})

t('options', () => {
    const o = admin.options.map({ id: '12', name: 'company_name', value: 'TRT Digital', autoload: '1' })
    assert.deepEqual(o, { id: oid('options', 12), legacyId: 12, name: 'company_name', value: 'TRT Digital', autoload: true })
    const e = admin.options.map({ id: '13', name: 'x', value: '', autoload: '0' })
    assert.equal(e.value, ''); assert.equal(e.autoload, false)
    assert.equal(admin.options.map({ id: '14', name: 'y', value: null, autoload: '1' }).value, null)
})

t('roles', () => {
    const o = admin.roles.map({ roleid: '1', name: 'Sales', permissions: 'a:1:{s:9:"customers";a:1:{i:0;s:4:"view";}}' })
    assert.equal(o.id, oid('roles', 1)); assert.equal(o.name, 'Sales'); assert.match(o.permissionsRaw, /customers/)
})

t('staff_permissions / departments', () => {
    const o = admin.staff_permissions.map({ staff_id: '3', feature: 'invoices', capability: 'view' })
    assert.equal(o.staffId, oid('staff', 3)); assert.equal(o.feature, 'invoices'); assert.ok(isOid(o.id))
    assert.notEqual(o.id, admin.staff_permissions.map({ staff_id: '3', feature: 'invoices', capability: 'edit' }).id)
    const sd = admin.staff_departments.map({ staffdepartmentid: '5', staffid: '3', departmentid: '2' })
    assert.equal(sd.departmentId, oid('departments', 2))
    assert.equal(admin.staff_departments.map({ staffdepartmentid: '6', staffid: '0', departmentid: '2' }), null)
    const d = admin.departments.map({ departmentid: '2', name: 'Support', password: 'secret', hidefromclient: '0', delete_after_import: '1' })
    assert.equal(d.deleteAfterImport, true); assert.ok(!('password' in d))
})

t('emailtemplates', () => {
    const o = admin.emailtemplates.map({ emailtemplateid: '9', type: 'invoice', slug: 'invoice-send-to-client', language: 'english',
        name: 'Send Invoice to Customer', subject: 'Invoice {invoice_number}', message: '<p>Hi</p>', fromname: '{companyname}',
        fromemail: '', plaintext: '0', active: '1', order: '4' })
    assert.equal(o.id, oid('emailtemplates', 9)); assert.equal(o.slug, 'invoice-send-to-client')
    assert.equal(o.fromEmail, null); assert.equal(o.plainText, false); assert.equal(o.active, true); assert.equal(o.sortOrder, 4)
})

t('customfields / values', () => {
    const o = admin.customfields.map({ id: '2', fieldto: 'customers', name: 'ICE', slug: 'customers_ice', required: '1', type: 'input',
        options: '', display_inline: '0', field_order: '3', active: '1', show_on_pdf: '1', show_on_ticket_form: '0', only_admin: '0',
        show_on_table: '1', show_on_client_portal: '0', disalow_client_to_edit: '1', bs_column: '12', default_value: null })
    assert.equal(o.fieldTo, 'customers'); assert.equal(o.required, true); assert.equal(o.options, null)
    assert.equal(o.disallowClientToEdit, true); assert.equal(o.bsColumn, 12); assert.equal(o.fieldOrder, 3)
    const v = admin.customfieldsvalues.map({ id: '7', relid: '15', fieldid: '2', fieldto: 'customers', value: '001234' })
    assert.equal(v.relId, oid('clients', 15)); assert.equal(v.fieldId, oid('customfields', 2))
    assert.equal(admin.customfieldsvalues.map({ id: '8', relid: '0', fieldid: '2', fieldto: 'company', value: 'x' }).relId, null)
})

t('polymorphic rel_type mapping (notes, reminders, taggables, files)', () => {
    const n = admin.notes.map({ id: '1', rel_id: '10', rel_type: 'customer', description: 'called', date_contacted: '2021-01-01 09:00:00', addedfrom: '3', dateadded: '2021-01-01 09:05:00' })
    assert.equal(n.relId, oid('clients', 10)); assert.equal(n.addedFrom, oid('staff', 3)); assert.equal(n.createdAt.toISOString(), '2021-01-01T09:05:00.000Z')
    assert.equal(relOid('credit_note', 4), oid('creditnotes', 4))
    assert.equal(relOid('lead', 4), oid('leads', 4))
    assert.equal(relOid('ticket', 4), oid('tickets', 4))
    const r = admin.reminders.map({ id: '1', description: 'x', date: '2022-02-02 10:00:00', isnotified: '0', rel_id: '5', staff: '3', rel_type: 'invoice', notify_by_email: '1', creator: '1' })
    assert.equal(r.relId, oid('invoices', 5)); assert.equal(r.staffId, oid('staff', 3)); assert.equal(r.notifyByEmail, true)
    const tg = admin.taggables.map({ rel_id: '8', rel_type: 'task', tag_id: '2', tag_order: '1' })
    assert.equal(tg.relId, oid('tasks', 8)); assert.equal(tg.tagId, oid('tags', 2))
    const f = admin.files.map({ id: '1', rel_id: '3', rel_type: 'project', file_name: 'a.pdf', filetype: 'application/pdf', visible_to_customer: '1', staffid: '3', contact_id: '0', dateadded: '2023-03-03 00:00:00' })
    assert.equal(f.relId, oid('projects', 3)); assert.equal(f.contactId, null); assert.equal(f.visibleToCustomer, true)
})

t('activity_log non numeric staffid, events, todos', () => {
    const a = admin.activity_log.map({ id: '1', description: 'cron ran', date: '2023-01-01 00:00:00', staffid: '[CRON]' })
    assert.equal(a.staffId, null); assert.equal(a.staffName, '[CRON]')
    const a2 = admin.activity_log.map({ id: '2', description: 'x', date: '2023-01-01 00:00:00', staffid: '3' })
    assert.equal(a2.staffId, oid('staff', 3)); assert.equal(a2.staffName, null)
    const e = admin.events.map({ eventid: '1', title: 'Meet', description: null, userid: '3', start: '2023-01-01 10:00:00', end: '2023-01-01 11:00:00', public: '1', color: '#ff0', isstartnotified: '0', reminder_before: '30', reminder_before_type: 'minutes' })
    assert.equal(e.isPublic, true); assert.equal(e.reminderBefore, 30)
    const td = admin.todos.map({ todoid: '1', description: 'do', staffid: '3', dateadded: '2023-01-01 00:00:00', finished: '1', datefinished: '2023-01-02 00:00:00', item_order: '1' })
    assert.equal(td.finished, true); assert.equal(td.dateFinished.toISOString(), '2023-01-02T00:00:00.000Z')
})

t('dismissed announcements, goals, surveys', () => {
    const d = admin.dismissed_announcements.map({ dismissedannouncementid: '1', announcementid: '2', staff: '1', userid: '3' })
    assert.equal(d.userId, oid('staff', 3)); assert.equal(d.announcementId, oid('announcements', 2))
    const dc = admin.dismissed_announcements.map({ dismissedannouncementid: '2', announcementid: '2', staff: '0', userid: '9' })
    assert.equal(dc.userId, oid('contacts', 9))
    const g = admin.goals.map({ id: '1', subject: 'Revenue', description: '', start_date: '2023-01-01', end_date: '2023-12-31', goal_type: '1', contract_type: '0', achievement: '100000', notify_when_fail: '1', notify_when_achieve: '0', notified: '0', staff_id: '0' })
    assert.equal(g.staffId, null); assert.equal(g.achievement, 100000); assert.equal(g.startDate.toISOString(), '2023-01-01T00:00:00.000Z')
    const q = admin.form_questions.map({ questionid: '4', rel_id: '2', rel_type: 'survey', question: 'Q?', required: '1', question_order: '1' })
    assert.equal(q.relId, oid('surveys', 2))
    const s = admin.surveyresults.map({ resultid: '1', boxid: '3', boxdescriptionid: '5', rel_id: '2', rel_type: 'survey', questionid: '4', answer: 'yes', resultsetid: '6' })
    assert.equal(s.surveyId, oid('surveys', 2)); assert.equal(s.resultSetId, oid('surveyresultsets', 6))
})

console.log(`\n${n} test groups passed`)
