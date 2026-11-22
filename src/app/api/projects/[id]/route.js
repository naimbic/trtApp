import { needSession } from '@/lib/needSession'
import { NextResponse } from 'next/server'
import { projectListData, projectDetailsData } from '@/mock/data/projectsData'

export async function GET(_, { params }) {
    const denied = await needSession()
    if (denied) return denied
    const id = (await params).id

    try {
        let project = projectListData.find((product) => product.id === id)

        if (!project) {
            project = projectListData[0]
        }

        return NextResponse.json({ ...projectDetailsData, ...project })
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: error }, { status: 500 })
    }
}
