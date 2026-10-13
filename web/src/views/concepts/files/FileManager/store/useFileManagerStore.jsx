import { create } from 'zustand'

const initialState = {
    fileList: [],
    layout: 'grid',
    selectedFile: '',
    openedDirectoryId: '',
    directories: [],
    deleteDialog: { open: false, id: '' },
    inviteDialog: { open: false, id: '' },
    renameDialog: { open: false, id: '' },
}

export const useFileManagerStore = create((set, get) => ({
    ...initialState,
    setFileList: (payload) => set(() => ({ fileList: payload })),
    setLayout: (payload) => set(() => ({ layout: payload })),
    setOpenedDirectoryId: (payload) =>
        set(() => ({ openedDirectoryId: payload })),
    setSelectedFile: (payload) => set(() => ({ selectedFile: payload })),
    setDirectories: (payload) => set(() => ({ directories: payload })),
    setDeleteDialog: (payload) => set(() => ({ deleteDialog: payload })),
    setInviteDialog: (payload) => set(() => ({ inviteDialog: payload })),
    setRenameDialog: (payload) => set(() => ({ renameDialog: payload })),
    deleteFile: (payload) =>
        set(() => ({
            fileList: get().fileList.filter((file) => file.id !== payload),
        })),
    renameFile: (payload) =>
        set(() => ({
            fileList: get().fileList.map((file) => {
                if (file.id === payload.id) {
                    const fileAbbreviationArr = file.name.split('.')
                    const fileAbbreviation =
                        fileAbbreviationArr[fileAbbreviationArr.length - 1]

                    if (fileAbbreviationArr.length > 1) {
                        file.name = `${payload.fileName}.${fileAbbreviation}`
                    } else {
                        file.name = payload.fileName
                    }
                }
                return file
            }),
        })),
}))
