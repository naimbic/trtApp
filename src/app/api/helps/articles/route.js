import { needSession } from '@/lib/needSession'
import { NextResponse } from 'next/server'
import { articleListData, articleList } from '@/mock/data/helpCenterData'
import wildCardSearch from '@/utils/wildCardSearch'

export async function GET(request) {
    const denied = await needSession()
    if (denied) return denied
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('query')
    const topic = searchParams.get('topic')

    const articles = articleListData

    try {
        if (query) {
            return NextResponse.json(wildCardSearch(articles, query))
        }

        if (topic) {
            return NextResponse.json(
                articles.filter((article) => article.category === topic),
            )
        }

        return NextResponse.json(articles)
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: error }, { status: 500 })
    }
}

export async function DELETE(request) {
    const denied = await needSession()
    if (denied) return denied
    const { articleIds } = await request.json()

    const data = articleList.getList()

    try {
        const filteredData = data.filter(
            (item) => !articleIds.includes(item.id),
        )

        articleList.setList(filteredData)

        return NextResponse.json({})
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: error }, { status: 500 })
    }
}
