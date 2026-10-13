import EditArticleHeader from './components/EditArticleHeader'
import EditArticleBody from './components/EditArticleBody'
import EditArticleFooter from './components/EditArticleFooter'
import { apiGetSupportHubArticle } from '@/services/HelpCenterService'
import { useParams } from 'react-router'
import useSWR from 'swr'

const EditArticle = () => {
    const { id } = useParams()

    const { data } = useSWR(
        [`/api/helps/articles/${id}`, { id: id }],
        // eslint-disable-next-line no-unused-vars
        ([_, params]) => apiGetSupportHubArticle(params),
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            evalidateOnFocus: false,
        },
    )

    return (
        <>
            <div className="max-w-[1200px] mx-auto w-full">
                {data && (
                    <div className="flex flex-col gap-2">
                        <EditArticleHeader {...data} />
                        <EditArticleBody content={data.content} />
                    </div>
                )}
            </div>
            <EditArticleFooter />
        </>
    )
}

export default EditArticle
