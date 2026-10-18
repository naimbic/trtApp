import classNames from 'classnames'
import Segment from '@/components/ui/Segment'
import { useThemeStore } from '@/store/themeStore'
import {
    LAYOUT_COLLAPSIBLE_SIDE,
    LAYOUT_STACKED_SIDE,
    LAYOUT_TOP_BAR_CLASSIC,
    LAYOUT_FRAMELESS_SIDE,
    LAYOUT_CONTENT_OVERLAY,
    LAYOUT_BLANK,
    LAYOUT_RAPPORT,
} from '@/constants/theme.constant'
import CollapsibleSideSvg from '@/assets/svg/CollapsibleSideSvg'
import StackedSideSvg from '@/assets/svg/StackedSideSvg'
import TopBarClassicSvg from '@/assets/svg/TopBarClassicSvg'
import FrameLessSideSvg from '@/assets/svg/FrameLessSideSvg'
import ContentOverlaySvg from '@/assets/svg/ContentOverlaySvg'
import BlankSvg from '@/assets/svg/BlankSvg'
import { tr } from '@/utils/t'

const RapportThumb = () => (
    <svg viewBox="0 0 120 80" width="100%" height="100%" aria-hidden="true"><rect width="120" height="80" rx="6" fill="#ebe8e1" /><rect x="6" y="18" width="7" height="44" rx="3.5" fill="#17191a" /><rect x="30" y="6" width="60" height="8" rx="4" fill="#fff" opacity=".8" /><rect x="52" y="7" width="14" height="6" rx="3" fill="#17191a" /><rect x="22" y="22" width="44" height="22" rx="6" fill="#fff" opacity=".7" /><rect x="70" y="22" width="40" height="22" rx="6" fill="#17191a" /><rect x="22" y="48" width="30" height="24" rx="6" fill="#2f5c50" /><rect x="56" y="48" width="54" height="24" rx="6" fill="#fff" opacity=".7" /></svg>
)

const layouts = [
    {
        value: LAYOUT_RAPPORT,
        label: tr("Rapport"),
        svg: <RapportThumb />,
    },
    {
        value: LAYOUT_COLLAPSIBLE_SIDE,
        label: tr("Collapsible"),
        src: '/img/thumbs/layouts/classic.jpg',
        srcDark: '/img/thumbs/layouts/classic-dark.jpg',
        svg: <CollapsibleSideSvg height={'100%'} width={'100%'} />,
    },
    {
        value: LAYOUT_STACKED_SIDE,
        label: tr("Stacked"),
        src: '/img/thumbs/layouts/modern.jpg',
        srcDark: '/img/thumbs/layouts/modern-dark.jpg',
        svg: <StackedSideSvg height={'100%'} width={'100%'} />,
    },
    {
        value: LAYOUT_TOP_BAR_CLASSIC,
        label: tr("Top bar"),
        src: '/img/thumbs/layouts/stackedSide.jpg',
        srcDark: '/img/thumbs/layouts/stackedSide-dark.jpg',
        svg: <TopBarClassicSvg height={'100%'} width={'100%'} />,
    },
    {
        value: LAYOUT_FRAMELESS_SIDE,
        label: tr("Frameless"),
        src: '/img/thumbs/layouts/simple.jpg',
        srcDark: '/img/thumbs/layouts/simple-dark.jpg',
        svg: <FrameLessSideSvg height={'100%'} width={'100%'} />,
    },
    {
        value: LAYOUT_CONTENT_OVERLAY,
        label: tr("Overlay"),
        src: '/img/thumbs/layouts/decked.jpg',
        srcDark: '/img/thumbs/layouts/decked-dark.jpg',
        svg: <ContentOverlaySvg height={'100%'} width={'100%'} />,
    },
    {
        value: LAYOUT_BLANK,
        label: tr("Blank"),
        src: '/img/thumbs/layouts/blank.jpg',
        srcDark: '/img/thumbs/layouts/blank-dark.jpg',
        svg: <BlankSvg height={'100%'} width={'100%'} />,
    },
]

const LayoutSwitcher = () => {
    const themeLayout = useThemeStore((state) => state.layout)
    const setLayout = useThemeStore((state) => state.setLayout)

    return (
        <div>
            <Segment
                className="w-full bg-transparent dark:bg-transparent p-0"
                value={[]}
                onChange={(val) => setLayout(val)}
            >
                <div className="grid grid-cols-3 gap-4 w-full">
                    {layouts.map((layout) => (
                        <Segment.Item key={layout.value} value={layout.value}>
                            {({ onSegmentItemClick }) => {
                                const active = themeLayout.type === layout.value
                                return (
                                    <div className="text-center">
                                        <button
                                            className={classNames(
                                                'border-2 rounded-xl overflow-hidden',
                                                active
                                                    ? 'border-primary dark:border-primary'
                                                    : 'border-gray-200 dark:border-gray-700',
                                            )}
                                            onClick={onSegmentItemClick}
                                        >
                                            {layout.svg}
                                        </button>
                                        <div className="mt-2 font-semibold">
                                            {layout.label}
                                        </div>
                                    </div>
                                )
                            }}
                        </Segment.Item>
                    ))}
                </div>
            </Segment>
        </div>
    )
}

export default LayoutSwitcher
