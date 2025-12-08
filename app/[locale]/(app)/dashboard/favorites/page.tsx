import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import FavoritesList from '@/components/FavoritesList';

export default async function FavoritesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: favorites } = await supabase
    .from('favorites')
    .select('*, apartments(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
            <p className="text-gray-600 mt-2">
              {favorites?.length || 0} saved apartments
            </p>
          </div>

        </div>

        {/* Favorites Grid */}
        <FavoritesList favorites={favorites || []} currentUserId={user.id} />
      </div>
    </div>
  );
}

