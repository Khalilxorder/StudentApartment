import { memo } from 'react';
import type { Message } from './types';

interface ChatHistoryProps {
  messages: Message[];
  chatExpanded: boolean;
  chatHovered: boolean;
  onToggleExpand: () => void;
  onHistoryHover?: (hovered: boolean) => void;
}

function ChatHistoryComponent({
  messages,
  chatExpanded,
  chatHovered,
  onToggleExpand,
  onHistoryHover,
}: ChatHistoryProps) {
  if (messages.length === 0 || (!chatExpanded && !chatHovered)) {
    return null;
  }

  const renderedMessages = chatExpanded ? messages : messages.slice(-3);

  return (
    <div
      className="flex-1 px-3 py-2 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white overflow-y-auto min-h-0"
      onMouseEnter={() => onHistoryHover?.(true)}
      onMouseLeave={() => onHistoryHover?.(false)}
    >
      <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center justify-between sticky top-0 bg-gradient-to-b from-gray-50 to-gray-50/90 z-10 px-1 py-1 -mt-1 backdrop-blur-sm">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          Chat ({messages.length})
        </span>
        <button
          onClick={onToggleExpand}
          className="text-xs px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-md border border-gray-200 shadow-sm transition-all hover:shadow font-medium"
          type="button"
        >
          {chatExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div className="space-y-2.5">
        {renderedMessages.map(message => {
          const alignment =
            message.from === 'user'
              ? 'justify-end'
              : message.from === 'ai'
                ? 'justify-start'
                : 'justify-start';

          const bubbleStyle =
            message.from === 'user'
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-br-sm shadow-sm'
              : message.from === 'ai'
                ? 'bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-100'
                : 'bg-yellow-50 text-yellow-900 border border-yellow-200';

          return (
            <div key={message.id} className={`flex ${alignment} text-xs`}>
              {message.from === 'ai' && (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center mr-2 flex-shrink-0 text-[9px] font-bold shadow-sm">
                  AI
                </div>
              )}

              <div className={`max-w-xs px-3 py-2 rounded-xl ${bubbleStyle}`}>{message.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ChatHistory = memo(ChatHistoryComponent);

export default ChatHistory;
