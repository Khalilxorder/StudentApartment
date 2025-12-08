import { Message } from './chat-search/types';
import ChatHistory from './chat-search/ChatHistory';
import ChatControls from './chat-search/ChatControls';
import SearchGoalCard, { SearchGoal } from './SearchGoalCard';

interface FloatingChatPanelProps {
    messages: Message[];
    query: string;
    loading: boolean;
    followUps: string[];
    chatExpanded: boolean;
    chatHovered: boolean;
    goal?: SearchGoal;
    onQueryChange: (query: string) => void;
    onFocusInput: () => void;
    onSubmit: (event?: React.FormEvent) => void;
    onFollowUpClick: (question: string) => void;
    onClear: () => void;
    onToggleExpand: () => void;
    onChatHoverChange: (hovered: boolean) => void;
}

export default function FloatingChatPanel({
    messages,
    query,
    loading,
    followUps,
    chatExpanded,
    chatHovered,
    goal,
    onQueryChange,
    onFocusInput,
    onSubmit,
    onFollowUpClick,
    onClear,
    onToggleExpand,
    onChatHoverChange,
}: FloatingChatPanelProps) {
    return (
        <>
            {/* Backdrop overlay when expanded for better focus */}
            {chatExpanded && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
                    style={{ zIndex: 9998 }}
                    onClick={onToggleExpand}
                />
            )}
            <div
                className="bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-2xl transition-all duration-300 ease-in-out overflow-hidden"
                style={{
                    position: 'fixed',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bottom: 0,
                    height: chatExpanded ? '520px' : chatHovered ? '150px' : '80px',
                    width: '100%',
                    maxWidth: '896px',
                    minWidth: '320px',
                    zIndex: 9999,
                    borderRadius: '20px 20px 0 0',
                    boxShadow: chatExpanded
                        ? '0 -10px 60px -10px rgba(0, 0, 0, 0.25), 0 -4px 20px -4px rgba(0, 0, 0, 0.1)'
                        : '0 -4px 20px -4px rgba(0, 0, 0, 0.15)',
                }}
                onMouseEnter={() => !chatExpanded && onChatHoverChange(true)}
                onMouseLeave={() => !chatExpanded && onChatHoverChange(false)}
            >
                {/* Minimize Button */}
                {chatExpanded && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand();
                        }}
                        className="absolute top-3 right-3 p-2 bg-white/80 hover:bg-gray-100 text-gray-500 hover:text-gray-700 rounded-full shadow-sm border border-gray-200 transition-all z-50"
                        title="Minimize chat"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="4 14 12 22 20 14"></polyline>
                            <polyline points="4 6 12 14 20 6"></polyline>
                        </svg>
                    </button>
                )}
                <div className="h-full flex flex-col justify-end">

                    {/* Search Goal Dashboard - Only show when expanded */}
                    {chatExpanded && goal && (
                        <SearchGoalCard goal={goal} />
                    )}

                    <ChatHistory
                        messages={messages}
                        chatExpanded={chatExpanded}
                        chatHovered={chatHovered}
                        onToggleExpand={onToggleExpand}
                    />

                    <ChatControls
                        query={query}
                        loading={loading}
                        followUps={followUps}
                        chatExpanded={chatExpanded}
                        onQueryChange={onQueryChange}
                        onFocusInput={onFocusInput}
                        onSubmit={onSubmit}
                        onFollowUpClick={onFollowUpClick}
                        onClear={onClear}
                    />
                </div>
            </div>
        </>
    );
}
