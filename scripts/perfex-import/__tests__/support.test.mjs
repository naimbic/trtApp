import assert from 'node:assert/strict'
import support from '../tables/support.mjs'
import { oid } from '../lib.mjs'

const t = support.tickets.map({
    ticketid: '7', adminreplying: '0', userid: '12', contactid: '30', email: 'a@b.ma', name: 'A',
    department: '2', priority: '3', status: '5', service: '0', ticketkey: 'abc', subject: 'Help',
    message: 'Hi', admin: null, date: '2023-05-04 10:11:12', projectid: '0', lastreply: '2023-05-05 08:00:00',
    clientread: '1', adminread: '1', assigned: '4', cc: '', merged_ticket_id: null,
})
assert.equal(t.id, oid('tickets', 7))
assert.equal(t.clientId, oid('clients', 12))
assert.equal(t.statusId, oid('tickets_status', 5))
assert.equal(t.priorityId, oid('tickets_priorities', 3))
assert.equal(t.serviceId, null)
assert.equal(t.projectId, null)
assert.equal(t.adminId, null)
assert.equal(t.assignedId, oid('staff', 4))
assert.equal(t.createdAt.toISOString(), '2023-05-04T10:11:12.000Z')
assert.equal(t.cc, null)

const r = support.ticket_replies.map({
    id: '9', ticketid: '7', userid: '0', contactid: '0', name: 'Staff', email: 'x@y.ma',
    date: '2023-05-04 12:00:00', message: 'Reply', attachment: '0', admin: '4', ip: '1.2.3.4',
})
assert.equal(r.ticketId, oid('tickets', 7))
assert.equal(r.adminId, oid('staff', 4))
assert.equal(r.clientId, null)
assert.equal(r.createdAt.toISOString(), '2023-05-04T12:00:00.000Z')

const a = support.ticket_attachments.map({ id: '1', ticketid: '7', replyid: '0', file_name: 'x.pdf', filetype: 'application/pdf', dateadded: '2023-05-04 10:11:12' })
assert.equal(a.replyId, null)
assert.equal(a.fileName, 'x.pdf')
assert.equal(a.fileType, 'application/pdf')
assert.equal(a.missing, false)

const k = support.knowledge_base.map({
    articleid: '3', articlegroup: '2', subject: 'S', description: '<p>d</p>', slug: 's', active: '1',
    datecreated: '2022-01-02 03:04:05', article_order: '0', staff_article: '0',
})
assert.equal(k.groupId, oid('knowledge_base_groups', 2))
assert.equal(k.active, true)
assert.equal(k.staffArticle, false)
assert.equal(k.createdAt.toISOString(), '2022-01-02T03:04:05.000Z')

const tm = support.tracked_mails.map({ id: '1', uid: 'u', rel_id: '5', rel_type: 'invoice', date: '2023-01-01 00:00:00', email: 'e', opened: '0', date_opened: null })
assert.equal(tm.relId, oid('invoices', 5))
console.log('support mapper tests passed')
