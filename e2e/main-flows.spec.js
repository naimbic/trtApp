import { test, expect, request as pwRequest } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { E2E } from './env.mjs'

// The main flows of the CRM, in one browser, in order: sign in, a lead from creation to client, bulk actions, saved views,
// lists edited in place, a task, the notifications. Everything made is named "zz e2e ..." and removed afterwards.
test.describe.configure({ mode: 'serial' })
const name = (what) => `${E2E.tag} ${what} ${Date.now() % 100000}`

test('sign in', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByPlaceholder('Email').fill(E2E.email)
    await page.getByPlaceholder('Password').fill(E2E.password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).not.toHaveURL(/sign-in/)
    await expect(page.getByRole('navigation', { name: /main navigation/i })).toBeVisible()
})

test.describe('signed in', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/sign-in')
        await page.getByPlaceholder('Email').fill(E2E.email)
        await page.getByPlaceholder('Password').fill(E2E.password)
        await page.getByRole('button', { name: 'Sign In' }).click()
        await expect(page).not.toHaveURL(/sign-in/)
    })

    test('a lead is created and converted to a client', async ({ page }) => {
        const title = name('new lead')
        await page.goto('/crm/leads')
        await page.getByRole('button', { name: 'New lead', exact: true }).click()
        await page.getByRole('dialog').getByText('Name', { exact: true }).first().locator('xpath=following::input[1]').fill(title)
        await page.getByRole('button', { name: 'Create lead' }).click()
        const card = page.locator('.rp-pl-card', { hasText: title })
        await expect(card).toBeVisible()
        await card.locator('.rp-face-tools button').last().click()
        await page.getByText('Convert to client').click()
        await page.getByRole('button', { name: 'Convert', exact: true }).click()
        await expect(page).toHaveURL(/\/crm\/clients\//)
    })

    test('several leads are changed at once, and a view is saved', async ({ page }) => {
        await page.goto('/crm/leads')
        await page.getByRole('button', { name: 'List' }).click()
        const rows = page.locator('tbody tr', { hasText: `${E2E.tag} lead` })
        await expect(rows).toHaveCount(2)
        await rows.nth(0).getByRole('checkbox').check()
        await rows.nth(1).getByRole('checkbox').check()
        await expect(page.getByRole('toolbar')).toContainText('2 selected')
        await page.getByRole('toolbar').getByRole('button', { name: 'Mark lost' }).click()
        await expect(page.getByText(/2 done/)).toBeVisible()
        await expect(rows).toHaveCount(0) // lost leads leave the Active list

        // a saved view: search, save, clear, apply again
        await page.getByPlaceholder('Search leads').fill('Acme')
        await page.getByRole('button', { name: 'Views' }).click()
        await page.getByPlaceholder('Name this view…').fill(`${E2E.tag} view`)
        await page.getByRole('button', { name: 'Save current' }).click()
        await expect(page.getByText('View saved')).toBeVisible()
        await page.keyboard.press('Escape')
        await page.getByPlaceholder('Search leads').fill('')
        await page.getByRole('button', { name: 'Views', exact: true }).click()
        await page.getByRole('dialog', { name: 'Saved views' }).getByRole('button', { name: `${E2E.tag} view` }).click()
        await expect(page.getByPlaceholder('Search leads')).toHaveValue('Acme')
    })

    test('a list is edited in place', async ({ page }) => {
        const source = name('source')
        await page.goto('/crm/lists?area=leads')
        const list = page.locator('[data-list="lead-sources"]')
        await list.locator('button[aria-label="Add"]').click() // the + of the list opens it and shows the add row
        await list.getByPlaceholder(/New lead source/i).fill(source)
        const created = page.waitForResponse((r) => r.url().includes('/api/crm/lead-sources') && r.request().method() === 'POST')
        await page.keyboard.press('Enter')
        expect((await created).ok()).toBeTruthy()
        // after a reload the new row is there; rename it in place, saved when the field is left
        await page.reload()
        const row = (n) => page.locator('[data-list="lead-sources"] div.grid', { has: page.locator(`input[value="${n}"]`) })
        const search = page.locator('[data-list="lead-sources"]').getByPlaceholder('Search…') // a long list is paged: the new row may be on the last page
        if (await search.count()) await search.fill(source)
        await expect(row(source)).toBeVisible()
        const field = await row(source).locator(`input[value="${source}"]`).elementHandle() // a handle: the selector stops matching as soon as the text changes
        await field.fill(`${source} b`)
        await field.press('Enter')
        await page.waitForTimeout(800)
        await page.reload()
        if (await search.count()) await search.fill(source)
        await expect(row(`${source} b`)).toBeVisible()
        // delete it
        await row(`${source} b`).getByRole('button').last().click()
        await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
        await page.reload()
        await expect(page.locator(`input[value="${source} b"]`)).toHaveCount(0)
    })

    test('a possible duplicate is flagged while typing', async ({ page }) => {
        await page.goto('/crm/leads')
        await page.getByRole('button', { name: 'New lead', exact: true }).click()
        await page.getByRole('dialog').getByText('Company', { exact: true }).first().locator('xpath=following::input[1]').fill(`${E2E.tag} company A`)
        await expect(page.getByRole('status').filter({ hasText: 'Possible duplicate' })).toBeVisible()
        await expect(page.getByRole('status')).toContainText('same company')
    })

    test('a deal value feeds the forecast', async ({ page }) => {
        await page.goto('/crm/leads')
        const saved = await page.request.post('/api/crm/pipeline/leads', { data: { name: `${E2E.tag} deal`, value: 1000, probability: 50, expectedClose: new Date().toISOString().slice(0, 10) } })
        expect(saved.ok()).toBeTruthy()
        await page.reload()
        await expect(page.getByText('Open pipeline')).toBeVisible()
        await expect(page.getByText('Expected this month').locator('xpath=following-sibling::div[1]')).toContainText('500')
    })

    test('an accepted estimate becomes a contract, once', async ({ page }) => {
        const est = { id: process.env.E2E_ESTIMATE_ID }
        expect(est.id).toBeTruthy()
        const first = await page.request.post('/api/crm/sales/contracts/from-document', { data: { kind: 'estimate', id: est.id } })
        const a = await first.json()
        expect(a.id).toBeTruthy()
        const second = await (await page.request.post('/api/crm/sales/contracts/from-document', { data: { kind: 'estimate', id: est.id } })).json()
        expect(second.id).toBe(a.id)
        expect(second.existing).toBe(true)
    })

    test('the team opening a public page is not counted as the client', async ({ page, baseURL }) => {
        const id = process.env.E2E_ESTIMATE_ID
        const prisma = new PrismaClient()
        try {
            const views = () => prisma.crmViewTracking.count({ where: { relType: 'estimate', relId: id } })
            // a signed-in team member (the page's browser has the session)
            const mine = await page.request.get(`/api/crm/public/estimate/${id}/zze2e`, { headers: { 'x-forwarded-for': '203.0.113.50' } })
            expect(mine.ok()).toBeTruthy()
            await page.waitForTimeout(600)
            expect(await views()).toBe(0)
            // somebody else (no session, an address nobody on the team used)
            const outsider = await pwRequest.newContext({ baseURL, extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.77' } })
            expect((await outsider.get(`/api/crm/public/estimate/${id}/zze2e`)).ok()).toBeTruthy()
            await page.waitForTimeout(600)
            expect(await views()).toBe(1)
            await outsider.dispose()
        } finally {
            await prisma.crmViewTracking.deleteMany({ where: { relType: 'estimate', relId: id } })
            await prisma.$disconnect()
        }
    })

    test('a task is created and shows on the board', async ({ page }) => {
        const title = name('task')
        await page.goto('/crm/tasks-board')
        await page.getByRole('button', { name: 'New task' }).first().click()
        await page.getByRole('dialog').getByRole('textbox').first().fill(title)
        await page.getByRole('button', { name: /Create task|Save/ }).first().click()
        await expect(page.locator('.rp-pl-card', { hasText: title })).toBeVisible()
    })

    test('a notification is read without opening it', async ({ page }) => {
        await page.goto('/crm/notifications')
        const card = page.locator('div', { hasText: `${E2E.tag} please check the quote` }).last()
        await expect(card).toBeVisible()
        await page.getByRole('button', { name: 'Mark as read' }).first().click()
        await expect(page.getByRole('button', { name: 'Mark as unread' }).first()).toBeVisible()
        await expect(page).toHaveURL(/notifications/)
    })
})
