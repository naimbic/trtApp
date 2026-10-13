const getFileType = (type) => {
    switch (type) {
        case 'pdf':
            return 'PDF'
        case 'xls':
            return 'XLS'
        case 'doc':
            return 'DOC'
        case 'ppt':
            return 'PPT'
        case 'figma':
            return 'Figma'
        case 'image/jpeg':
            return 'JPEG'
        case 'directory':
            return 'Folder'
        default:
            return <></>
    }
}

const FileType = ({ type }) => {
    return <>{getFileType(type)}</>
}

export default FileType
