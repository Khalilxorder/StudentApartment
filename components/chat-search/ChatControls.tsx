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
    <div className="px-6 py-3">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          onFocus={onFocusInput}
          className="flex-1 border-2 border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-orange-500"
          placeholder="Tell me what you're looking for..."
          disabled={loading}
        />

        <button
          type="submit"
          className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-full transition disabled:opacity-50 font-medium text-sm flex-shrink-0"
          disabled={disableSubmit}
        >
          {loading ? 'Loading...' : 'Send'}
        </button>

        <button
          type="button"
          onClick={onClear}
          className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-full transition text-sm flex-shrink-0 font-semibold"
        >
          Clear
        </button>
      </form>

      {followUps.length > 0 && chatExpanded && (
        <div className="mt-3">
          <div className="text-xs text-gray-600 mb-2">Suggestions:</div>
          <div className="flex flex-wrap gap-2">
            {followUps.map((suggestion, index) => (
              <button
                key={`${suggestion}-${index}`}
                onClick={() => onFollowUpClick(suggestion)}
                className="text-xs bg-gray-100 hover:bg-orange-50 px-2 py-1 rounded border hover:border-orange-300 transition"
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
