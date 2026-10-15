import { cloneElement } from 'react'
import Logo from '@/components/template/Logo'

const Side = ({ children, ...rest }) => {
    return (
        <div className="flex h-full p-6 bg-white dark:bg-gray-800">
            <div className=" flex flex-col justify-center items-center flex-1">
                <div className="w-full xl:max-w-[450px] px-8 max-w-[380px]">
                    {children
                        ? cloneElement(children, {
                              ...rest,
                          })
                        : null}
                </div>
            </div>
            <div className="py-6 px-10 lg:flex flex-col flex-1 justify-between hidden rounded-3xl items-end relative xl:max-w-[520px] 2xl:max-w-[720px]">
                <img src="/img/others/auth-side-bg.png" alt="" className="absolute left-0 top-0 h-full w-full rounded-3xl object-cover" />
                <div className="absolute left-0 top-0 h-full w-full rounded-3xl bg-gradient-to-br from-primary/80 via-primary-deep/40 to-primary-deep/70" />
                <div className="relative z-10 flex h-full w-full flex-col justify-between text-white">
                    <Logo mode="dark" type="full" logoWidth={210} imgClass="h-14 w-full object-contain object-left brightness-0 invert" />
                    <div>
                    <h2 className="text-white">trtCRM</h2>
                    <p className="mt-3 max-w-md text-base font-semibold opacity-80">Clients, sales, projects, tasks and support in one place.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Side
