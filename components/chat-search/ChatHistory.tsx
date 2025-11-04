import { memo } from 'react';
import type { Message } from './types';

interface ChatHistoryProps {
  messages: Message[];
  chatExpanded: boolean;
  chatHovered: boolean;
  onToggleExpand: () => void;
}

function ChatHistoryComponent({
  messages,
  chatExpanded,
  chatHovered,
  onToggleExpand,
}: ChatHistoryProps) {
  if (messages.length === 0 || (!chatExpanded && !chatHovered)) {
    return null;
  }

  const renderedMessages = chatExpanded ? messages : messages.slice(-3);

  return (
    <div className="px-6 py-2 border-b bg-gray-50 max-h-56 overflow-y-auto">
      <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center justify-between sticky top-0 bg-gray-50">
        <span>Chat ({messages.length})</span>
        <button
          onClick={onToggleExpand}
          className="text-xs px-2 py-1 bg-white hover:bg-gray-200 text-gray-700 rounded border transition"
          type="button"
        >
          {chatExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div className="space-y-2">
        {renderedMessages.map(message => {
          const alignment =
            message.from === 'user'
              ? 'justify-end'
              : message.from === 'ai'
                ? 'justify-start'
                : 'justify-start';

          const bubbleStyle =
            message.from === 'user'
              ? 'bg-orange-500 text-white rounded-br-none'
              : message.from === 'ai'
                ? 'bg-gray-200 text-gray-900 rounded-bl-none'
                : 'bg-yellow-100 text-yellow-900';

          return (
            <div key={message.id} className={`flex ${alignment} text-xs`}>
              {message.from === 'ai' && (
                <div className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center mr-2 flex-shrink-0 text-xs font-bold">
                  AI
                </div>
              )}

              <div className={`max-w-xs px-2 py-1 rounded ${bubbleStyle}`}>{message.text}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ChatHistory = memo(ChatHistoryComponent);

export default ChatHistory;
