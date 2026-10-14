import { PiPhoneCallFill, PiPhoneDisconnectFill, PiMicrophoneFill, PiMicrophoneSlashFill, PiPhoneIncomingFill } from 'react-icons/pi'

/** Incoming / outgoing / running call card, shown on top of any page. */
const CallOverlay = ({ c }) => {
    const { call, muted, seconds, error, clearError, accept, decline, hangup, toggleMute, fmt } = c
    if (call.phase === 'idle' && !error) return null
    return (
        <div className="fixed left-1/2 top-4 z-50 w-[min(360px,calc(100vw-24px))] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
            {call.phase === 'idle' ? (
                <div className="flex items-center justify-between gap-3 text-sm"><span className="text-red-500">{error}</span><button type="button" className="font-semibold text-primary" onClick={clearError}>OK</button></div>
            ) : (
                <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl text-white ${call.phase === 'connected' ? 'bg-emerald-500' : 'animate-pulse bg-primary'}`}>{call.phase === 'incoming' ? <PiPhoneIncomingFill /> : <PiPhoneCallFill />}</div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate font-bold text-gray-900 dark:text-gray-100">{call.peer?.name || 'Call'}</div>
                        <div className="text-xs text-gray-500">{call.phase === 'incoming' ? 'Incoming voice call…' : call.phase === 'calling' ? 'Calling…' : call.phase === 'connecting' ? 'Connecting…' : fmt(seconds)}</div>
                    </div>
                    {call.phase === 'incoming' ? (
                        <>
                            <button type="button" onClick={decline} className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-xl text-white" title="Decline"><PiPhoneDisconnectFill /></button>
                            <button type="button" onClick={accept} className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-xl text-white" title="Answer"><PiPhoneCallFill /></button>
                        </>
                    ) : (
                        <>
                            {call.phase === 'connected' && <button type="button" onClick={toggleMute} className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${muted ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200'}`} title={muted ? 'Unmute' : 'Mute'}>{muted ? <PiMicrophoneSlashFill /> : <PiMicrophoneFill />}</button>}
                            <button type="button" onClick={hangup} className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-xl text-white" title="Hang up"><PiPhoneDisconnectFill /></button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default CallOverlay
