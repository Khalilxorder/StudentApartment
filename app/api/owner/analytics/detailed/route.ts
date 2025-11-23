import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date range from query params
    const searchParams = request.nextUrl.searchParams;
    const startDate = new Date(searchParams.get('startDate') || new Date().toISOString());
    const endDate = new Date(searchParams.get('endDate') || new Date().toISOString());

    // Calculate previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate.getTime());

    // Get apartments for this owner
    const { data: apartments } = await supabase
      .from('apartments')
      .select('id, title, district, view_count, inquiry_count')
      .eq('owner_id', user.id);

    if (!apartments || apartments.length === 0) {
      return NextResponse.json({
        analytics: {
          totalRevenue: 0,
          monthlyRevenue: 0,
          avgRevenuePerBooking: 0,
          avgRevenuePerListing: 0,
          conversionRate: 0,
          totalListings: 0,
          totalBookings: 0,
          activeBookings: 0,
          pendingBookings: 0,
          apartmentStats: [],
        },
        comparison: {
          currentRevenue: 0,
          previousRevenue: 0,
          currentBookings: 0,
          previousBookings: 0,
          currentConversionRate: 0,
          previousConversionRate: 0,
        },
      });
    }

    const apartmentIds = apartments.map((a) => a.id);

    // Get bookings in current period
    const { data: currentBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('owner_id', user.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Get bookings in previous period for comparison
    const { data: previousBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('owner_id', user.id)
      .gte('created_at', previousStartDate.toISOString())
      .lte('created_at', previousEndDate.toISOString());

    // Calculate current period analytics
    const totalListings = apartments.length;
    const totalCurrentBookings = currentBookings?.length || 0;
    const activeCurrentBookings =
      currentBookings?.filter((b: any) => b.status === 'approved').length || 0;
    const pendingCurrentBookings =
      currentBookings?.filter((b: any) => b.status === 'pending').length || 0;

    const currentRevenue = (currentBookings || [])
      .filter((b: any) => b.status === 'approved')
      .reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);

    const currentConversionRate =
      totalCurrentBookings > 0
        ? (activeCurrentBookings / totalCurrentBookings) * 100
        : 0;

    // Calculate previous period analytics for comparison
    const totalPreviousBookings = previousBookings?.length || 0;
    const activePreviousBookings =
      previousBookings?.filter((b: any) => b.status === 'approved').length || 0;

    const previousRevenue = (previousBookings || [])
      .filter((b: any) => b.status === 'approved')
      .reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);

    const previousConversionRate =
      totalPreviousBookings > 0
        ? (activePreviousBookings / totalPreviousBookings) * 100
        : 0;

    // Calculate apartment-level stats
    const apartmentStats = apartments.map((apartment: any) => {
      const apartmentBookings = currentBookings?.filter(
        (b: any) => b.apartment_id === apartment.id
      ) || [];
      const activeApartmentBookings = apartmentBookings.filter(
        (b: any) => b.status === 'approved'
      );
      const apartmentRevenue = activeApartmentBookings.reduce(
        (sum: number, b: any) => sum + (b.total_amount || 0),
        0
      );

      return {
        id: apartment.id,
        title: apartment.title,
        district: apartment.district,
        views: apartment.view_count || 0,
        inquiries: apartment.inquiry_count || 0,
        bookings: apartmentBookings.length,
        activeBookings: activeApartmentBookings.length,
        revenue: apartmentRevenue,
        occupancyRate:
          apartmentBookings.length > 0
            ? (activeApartmentBookings.length / apartmentBookings.length) * 100
            : 0,
      };
    });

    // Calculate totals
    const totalRevenue = apartmentStats.reduce((sum: number, apt: any) => sum + apt.revenue, 0);
    const avgRevenuePerBooking =
      totalCurrentBookings > 0 ? totalRevenue / totalCurrentBookings : 0;
    const avgRevenuePerListing = totalListings > 0 ? totalRevenue / totalListings : 0;

    return NextResponse.json({
      analytics: {
        totalRevenue,
        monthlyRevenue: currentRevenue,
        avgRevenuePerBooking,
        avgRevenuePerListing,
        conversionRate: Math.round(currentConversionRate),
        totalListings,
        totalBookings: totalCurrentBookings,
        activeBookings: activeCurrentBookings,
        pendingBookings: pendingCurrentBookings,
        apartmentStats: apartmentStats.sort((a, b) => b.revenue - a.revenue),
      },
      comparison: {
        currentRevenue,
        previousRevenue,
        currentBookings: totalCurrentBookings,
        previousBookings: totalPreviousBookings,
        currentConversionRate: Math.round(currentConversionRate),
        previousConversionRate: Math.round(previousConversionRate),
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to load analytics' },
      { status: 500 }
    );
  }
}
