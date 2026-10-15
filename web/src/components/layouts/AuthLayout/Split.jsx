import { cloneElement } from 'react'
import Logo from '@/components/template/Logo'
import { tr } from '@/utils/t'

const Split = ({ children, content, ...rest }) => {
    return (
        <div className="grid lg:grid-cols-2 h-full p-6 bg-white dark:bg-gray-800">
            <div className="bg-no-repeat bg-cover py-6 px-16 flex-col justify-center items-center hidden lg:flex bg-primary rounded-3xl">
                <div className="flex flex-col items-center gap-12">
                    <Logo mode="dark" type="full" logoWidth={220} imgClass="h-16 w-full object-contain brightness-0 invert" />
                    <div className="text-center max-w-[550px]">
                        <h1 className="text-neutral">
                            {tr("Everything for your clients in one place")}
                        </h1>
                        <p className="text-neutral opacity-80 mx-auto mt-8 font-semibold">
                            {tr("Experience seamless project management with trtCRM. Simplify your workflow, and achieve your goals efficiently with our powerful and intuitive tools.")}
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex flex-col justify-center items-center ">
                <div className="w-full xl:max-w-[450px] px-8 max-w-[380px]">
                    <div className="mb-8">{content}</div>
                    {children
                        ? cloneElement(children, {
                              ...rest,
                          })
                        : null}
                </div>
            </div>
        </div>
    )
}

export default Split
