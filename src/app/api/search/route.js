import { needSession } from '@/lib/needSession'
import { NextResponse } from 'next/server'
import { searchQueryPoolData } from '@/mock/data/commonData'
import wildCardSearch from '@/utils/wildCardSearch'

export async function GET(request) {
    const denied = await needSession()
    if (denied) return denied
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('query')

    try {
        const result = wildCardSearch(searchQueryPoolData, query, 'title')

        const categories = []

        result.forEach((elm) => {
            if (!categories.includes(elm.categoryTitle)) {
                categories.push(elm.categoryTitle)
            }
        })

        const data = categories.map((category) => {
            return {
                title: category,
                data: result
                    .filter((elm) => elm.categoryTitle === category)
                    .filter((_, index) => index < 5),
            }
        })

        return NextResponse.json(data)
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: error }, { status: 500 })
    }
}
