import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import SearchBar from './SearchBar';
import SaveSearchButton from '@/components/SaveSearchButton';
import {
  Bed,
  Bath,
  MapPin,
  Ruler,
  TrainFront,
  Clock,
  ShieldCheck,
  PawPrint,
  Sparkles,
  Filter,
} from 'lucide-react';
import { SaveApartmentButton } from '@/components/SaveApartmentButton';

type ContextChip = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

// Logo component
const Logo = ({ className }: { className?: string }) => (
  <svg
    width="54"
    height="43"
    viewBox="0 0 54 43"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="11" y="18" width="32" height="25" rx="1" fill="#823D00" />
    <path
      d="M25.5675 1.47034C26.3525 0.664564 27.6475 0.664563 28.4325 1.47034L47.0744 20.6043C48.309 21.8716 47.4111 24 45.6418 24H8.35816C6.58888 24 5.69098 21.8716 6.92564 20.6043L25.5675 1.47034Z"
      fill="url(#paint0_linear_32_2)"
    />
    <path
      d="M23 34C23 33.4477 23.4477 33 24 33H30C30.5523 33 31 33.4477 31 34V42C31 42.5523 30.5523 43 30 43H24C23.4477 43 23 42.5523 23 42V34Z"
      fill="#482100"
    />
    <rect x="24" y="12" width="6" height="6" rx="1" fill="#AE5100" />
    <defs>
      <linearGradient
        id="paint0_linear_32_2"
        x1="27"
        y1="0"
        x2="27"
        y2="32"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#823D00" />
        <stop offset="1" stopColor="#1C0D00" />
      </linearGradient>
    </defs>
  </svg>
);

export default async function ApartmentsPage({
  searchParams,
}: {
  searchParams: Record<string, string> | undefined;
}) {
  const supabase = createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const searchTerm = searchParams?.search?.trim();
  const leaseTerm = searchParams?.term;
  const maxCommute = searchParams?.max_commute;

  // Build query based on search parameters
  let query = supabase
    .from('apartments')
    .select('*', { count: 'exact' })
    .eq('is_available', true);

  // Apply filters from search params
  const normalizeDistrictParam = (value: string) => value.trim().match(/\d{1,2}/)?.[0] ?? null;

  const districtFilter = searchParams?.district
    ? normalizeDistrictParam(searchParams.district)
    : null;

  if (districtFilter) {
    query = query.eq('district', districtFilter);
  }
  if (searchParams?.bedrooms) {
    query = query.gte('bedrooms', parseInt(searchParams.bedrooms));
  }
  if (searchParams?.min_price) {
    const minPrice = parseInt(searchParams.min_price, 10);
    if (!Number.isNaN(minPrice)) {
      query = query.gte('monthly_rent_huf', minPrice);
    }
  }
  if (searchParams?.max_price) {
    const maxPrice = parseInt(searchParams.max_price, 10);
    if (!Number.isNaN(maxPrice)) {
      query = query.lte('monthly_rent_huf', maxPrice);
    }
  }
  if (searchTerm) {
    const sanitized = searchTerm.replace(/['%_]/g, ' ');
    query = query.or(
      `title.ilike.%${sanitized}%,description.ilike.%${sanitized}%,address.ilike.%${sanitized}%`
    );
  }
  if (leaseTerm === 'short') {
    query = query.lte('lease_min_months', 6);
  } else if (leaseTerm === 'long') {
    query = query.gte('lease_min_months', 7);
  }
  if (maxCommute) {
    const minutes = parseInt(maxCommute, 10);
    if (!Number.isNaN(minutes)) {
      const maxDistanceMeters = minutes * 80;
      query = query.lte('distance_to_university_m', maxDistanceMeters);
    }
  }

  // Order by date
  query = query.order('created_at', { ascending: false });

  // Pagination
  const page = parseInt(searchParams?.page || '1');
  const itemsPerPage = 12;
  const from = (page - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  query = query.range(from, to);

  const { data: apartments, count } = await query;
  const activeFilters: Array<{ key: string; label: string }> = [];

  if (searchTerm) {
    activeFilters.push({
      key: 'search',
      label: `"${searchTerm}"`,
    });
  }
  if (districtFilter) {
    activeFilters.push({
      key: 'district',
      label: `District ${districtFilter}`,
    });
  }
  if (searchParams?.bedrooms) {
    activeFilters.push({
      key: 'bedrooms',
      label: `${searchParams.bedrooms}+ bedrooms`,
    });
  }
  if (searchParams?.min_price) {
    const minPriceValue = parseInt(searchParams.min_price, 10);
    if (!Number.isNaN(minPriceValue)) {
      activeFilters.push({
        key: 'min_price',
        label: `>= ${minPriceValue.toLocaleString()} HUF`,
      });
    }
  }
  if (searchParams?.max_price) {
    const maxPriceValue = parseInt(searchParams.max_price, 10);
    if (!Number.isNaN(maxPriceValue)) {
      activeFilters.push({
        key: 'max_price',
        label: `<= ${maxPriceValue.toLocaleString()} HUF`,
      });
    }
  }
  if (leaseTerm === 'long') {
    activeFilters.push({ key: 'term', label: 'Long-term leases' });
  } else if (leaseTerm === 'short') {
    activeFilters.push({ key: 'term', label: 'Short stay ready' });
  }
  if (maxCommute) {
    activeFilters.push({
      key: 'commute',
      label: `<= ${maxCommute} min to campus`,
    });
  }

  return (
    <div className='min-h-screen bg-gray-100'>
      {/* Main Content */}
      <div className='max-w-6xl mx-auto p-4'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-2xl font-bold'>Browse Apartments</h2>
        </div>

        <SearchBar initialParams={searchParams} />

        {activeFilters.length > 0 && (
          <div className="mt-4 mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <Filter className="h-3 w-3" />
              Active filters
            </span>
            {activeFilters.map((filter) => (
              <span
                key={filter.key}
                className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
              >
                {filter.label}
              </span>
            ))}
          </div>
        )}

        <div className='mb-4 flex flex-wrap gap-2'>
          <Link href='/apartments' className='px-4 py-2 bg-gray-200 rounded'>Clear Filters</Link>
          <SaveSearchButton searchParams={searchParams} session={session} />
        </div>

        <p className='mb-4 text-lg font-semibold'>Found {count || 0} apartments</p>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {apartments?.map((apartment: any) => {
            const bedrooms = apartment.bedrooms ?? 0;
            const bathrooms = apartment.bathrooms ?? 1;
            const size = apartment.size_sqm;
            const leaseMonths = apartment.lease_min_months ?? null;
            const commuteMinutes =
              typeof apartment.distance_to_university_m === 'number'
                ? Math.round(apartment.distance_to_university_m / 80)
                : null;
            const metroMinutes =
              typeof apartment.distance_to_metro_m === 'number'
                ? Math.round(apartment.distance_to_metro_m / 80)
                : null;
            const amenities = Array.isArray(apartment.amenities)
              ? new Set(
                (apartment.amenities as string[]).map((value) =>
                  value.toLowerCase()
                )
              )
              : new Set<string>();

            const contextChips: ContextChip[] = [];

            if (apartment.district) {
              contextChips.push({
                label: `District ${apartment.district}`,
                icon: MapPin,
              });
            }
            if (commuteMinutes !== null) {
              contextChips.push({
                label: `${commuteMinutes} min to campus`,
                icon: Clock,
              });
            }
            if (metroMinutes !== null) {
              contextChips.push({
                label: `${metroMinutes} min to metro`,
                icon: TrainFront,
              });
            }
            if (size && apartment.price_huf) {
              const pricePerSqm = Math.round(Number(apartment.price_huf) / size);
              contextChips.push({
                label: `${pricePerSqm.toLocaleString()} HUF / sqm`,
                icon: Ruler,
              });
            }
            if (apartment.owner_verified) {
              contextChips.push({
                label: 'Verified owner',
                icon: ShieldCheck,
              });
            }
            if (apartment.pet_friendly) {
              contextChips.push({
                label: 'Pet friendly',
                icon: PawPrint,
              });
            }
            if (amenities.has('balcony')) {
              contextChips.push({
                label: 'Balcony',
                icon: Sparkles,
              });
            }
            if (amenities.has('terrace')) {
              contextChips.push({
                label: 'Terrace',
                icon: Sparkles,
              });
            }

            const chipsToRender = contextChips.slice(0, 4);

            return (
              <div
                key={apartment.id}
                className='bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden group'
              >
                <Link href={`/apartments/${apartment.id}`} className='block relative h-48 bg-gray-200'>
                  {apartment.image_urls && apartment.image_urls[0] ? (
                    <Image
                      src={apartment.image_urls[0]}
                      alt={apartment.title}
                      fill
                      className='object-cover group-hover:scale-105 transition-transform duration-300'
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 33vw"
                    />
                  ) : (
                    <div className='w-full h-full flex items-center justify-center text-gray-400'>
                      <span className='text-4xl font-semibold'>SA</span>
                    </div>
                  )}
                  <div className='absolute top-3 right-3 bg-orange-500 text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg'>
                    {apartment.price_huf
                      ? `${Number(apartment.price_huf).toLocaleString()} HUF`
                      : 'Price on request'}
                  </div>
                </Link>

                <div className='p-5 space-y-4'>
                  <Link href={`/apartments/${apartment.id}`} className='block'>
                    <div>
                      <h3 className='font-semibold text-lg text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2'>
                        {apartment.title}
                      </h3>
                      {apartment.address && (
                        <p className='text-xs text-gray-500 mt-1'>
                          {apartment.address}
                        </p>
                      )}
                    </div>
                  </Link>

                  <div className='flex flex-wrap items-center gap-4 text-sm text-gray-600'>
                    <span className='inline-flex items-center gap-1'>
                      <Bed className='h-4 w-4 text-orange-500' />
                      {bedrooms}+ beds
                    </span>
                    <span className='inline-flex items-center gap-1'>
                      <Bath className='h-4 w-4 text-orange-500' />
                      {bathrooms} bath{bathrooms > 1 ? 's' : ''}
                    </span>
                    {size && (
                      <span className='inline-flex items-center gap-1'>
                        <Ruler className='h-4 w-4 text-orange-500' />
                        {size} sqm
                      </span>
                    )}
                    {leaseMonths && (
                      <span className='inline-flex items-center gap-1 text-gray-500 text-xs'>
                        {leaseMonths} month minimum
                      </span>
                    )}
                  </div>

                  {chipsToRender.length > 0 && (
                    <div className='flex flex-wrap gap-2'>
                      {chipsToRender.map((chip) => (
                        <span
                          key={chip.label}
                          className='inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700'
                        >
                          <chip.icon className='h-3 w-3 text-gray-500' />
                          {chip.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {apartment.owner_name && (
                    <p className='text-xs text-gray-500'>
                      Hosted by {apartment.owner_name}
                    </p>
                  )}

                  <div className='flex items-center justify-between pt-2 text-sm font-semibold text-orange-600'>
                    <Link href={`/apartments/${apartment.id}`} className="hover:underline">
                      View details &rarr;
                    </Link>
                    <SaveApartmentButton apartmentId={apartment.id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>        {/* Pagination */}
        {count && count > itemsPerPage && (
          <div className='mt-8 flex justify-center gap-2'>
            {page > 1 && (
              <Link
                href={`/apartments?page=${page - 1}`}
                className='px-4 py-2 bg-blue-500 text-white rounded'
              >
                Previous
              </Link>
            )}
            <span className='px-4 py-2'>Page {page}</span>
            {from + itemsPerPage < count && (
              <Link
                href={`/apartments?page=${page + 1}`}
                className='px-4 py-2 bg-blue-500 text-white rounded'
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



