import ChatSearch from './components/ChatSearch';

export default async function HomePage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Full-screen chat search component */}
      <ChatSearch />
    </div>
  );
}
