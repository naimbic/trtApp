const httpError = (message, status = 400) => Object.assign(new Error(message), { status })

/** The fields of a member form that are not plain text: dates, and (super administrators only) salary, bank and CNSS. */
export function extras(body, admin, current = {}) {
    const data = {}
    for (const k of ['hireDate', 'fireDate']) if (body[k] !== undefined) {
        const v = body[k] ? new Date(body[k]) : null
        if (v && Number.isNaN(+v)) throw httpError(k === 'hireDate' ? 'The hire date is not valid' : 'The fire date is not valid')
        data[k] = v
    }
    const hire = data.hireDate !== undefined ? data.hireDate : current.hireDate
    const fire = data.fireDate !== undefined ? data.fireDate : current.fireDate
    if (hire && fire && +fire < +hire) throw httpError('The fire date is before the hire date')
    if (['salary', 'salaryCurrencyId', 'payDay', 'rib', 'cnss'].some((k) => body[k] !== undefined)) {
        if (!admin) throw httpError('Only a super administrator can change salary and bank details', 403)
        if (body.salary !== undefined) {
            const n = body.salary === '' || body.salary === null ? null : Number(body.salary)
            if (n !== null && (!Number.isFinite(n) || n < 0)) throw httpError('The salary must be a positive number')
            data.salary = n
        }
        if (body.salaryCurrencyId !== undefined) data.salaryCurrencyId = body.salaryCurrencyId || null
        if (body.payDay !== undefined) {
            const n = body.payDay === '' || body.payDay === null ? null : Math.round(Number(body.payDay))
            if (n !== null && !(n >= 1 && n <= 31)) throw httpError('The pay day is a day of the month, 1 to 31')
            data.payDay = n
        }
        if (body.rib !== undefined) {
            const v = String(body.rib ?? '').replace(/\s+/g, '').toUpperCase()
            if (v && !/^[0-9A-Z]{10,34}$/.test(v)) throw httpError('The RIB must be 10 to 34 digits or letters')
            data.rib = v || null
        }
        if (body.cnss !== undefined) data.cnss = !!body.cnss
    }
    return data
}
