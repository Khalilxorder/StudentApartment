import { memo } from 'react';

interface ChatControlsProps {
  query: string;
  loading: boolean;
  followUps: string[];
  chatExpanded: boolean;
  onQueryChange: (value: string) => void;
  onFocusInput: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFollowUpClick: (question: string) => void;
  onClear: () => void;
}

function ChatControlsComponent({
  query,
  loading,
  followUps,
  chatExpanded,
  onQueryChange,
  onFocusInput,
  onSubmit,
  onFollowUpClick,
  onClear,
}: ChatControlsProps) {
  const disableSubmit = loading || !query.trim();

  return (
    <div className="px-4 py-3 bg-gradient-to-t from-gray-50/50 to-transparent">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          onFocus={onFocusInput}
          className="flex-1 border-2 border-gray-200 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all shadow-sm bg-white placeholder:text-gray-400"
          placeholder="Tell me what you're looking for..."
          disabled={loading}
        />

        <button
          type="submit"
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2.5 rounded-full transition-all disabled:opacity-50 font-semibold text-sm flex-shrink-0 shadow-md hover:shadow-lg"
          disabled={disableSubmit}
        >
          {loading ? 'Loading...' : 'Send'}
        </button>

        <button
          type="button"
          onClick={onClear}
          className="px-4 py-2.5 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-full transition-all text-sm flex-shrink-0 font-medium border border-gray-200 hover:border-red-200"
        >
          Clear
        </button>
      </form>

      {followUps.length > 0 && chatExpanded && (
        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-2 font-medium">Suggestions:</div>
          <div className="flex flex-wrap gap-2">
            {followUps.map((suggestion, index) => (
              <button
                key={`${suggestion}-${index}`}
                onClick={() => onFollowUpClick(suggestion)}
                className="text-xs bg-white hover:bg-orange-50 px-3 py-1.5 rounded-full border border-gray-200 hover:border-orange-300 transition-all shadow-sm hover:shadow font-medium"
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const ChatControls = memo(ChatControlsComponent);

export default ChatControls;
