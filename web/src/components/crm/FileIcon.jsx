import { TbFile, TbFileTypePdf, TbFileText, TbFileSpreadsheet, TbPresentation, TbFileZip, TbVideo, TbMusic, TbPhoto, TbFolderFilled } from 'react-icons/tb'

const KINDS = {
    folder: [TbFolderFilled, 'text-amber-400'], image: [TbPhoto, 'text-sky-500'], pdf: [TbFileTypePdf, 'text-red-500'], doc: [TbFileText, 'text-blue-500'],
    text: [TbFileText, 'text-gray-500'], sheet: [TbFileSpreadsheet, 'text-emerald-500'], slides: [TbPresentation, 'text-orange-500'],
    archive: [TbFileZip, 'text-purple-500'], video: [TbVideo, 'text-pink-500'], audio: [TbMusic, 'text-indigo-500'],
}

/** Coloured icon for a media kind (folder, image, pdf, ...). */
const FileIcon = ({ kind, className = 'text-3xl' }) => {
    const [Icon, color] = KINDS[kind] || [TbFile, 'text-gray-400']
    return <Icon className={`${className} ${color}`} />
}

export default FileIcon
