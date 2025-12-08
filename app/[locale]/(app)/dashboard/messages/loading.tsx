import { ChatListSkeleton, MessagesSkeleton, Skeleton } from '@/components/skeletons';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Skeleton */}
        <Skeleton className="h-8 w-48 mb-6" />

        {/* Chat Layout Skeleton */}
        <div className="flex h-[calc(100vh-12rem)] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Conversation List */}
          <div className="w-80 border-r border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <Skeleton className="h-10 w-full" />
            </div>
            <ChatListSkeleton />
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1">
              <MessagesSkeleton />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-3">
                <Skeleton className="flex-1 h-12" />
                <Skeleton className="h-12 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
