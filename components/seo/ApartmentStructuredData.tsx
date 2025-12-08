import type { Apartment } from '@/types/apartment';

interface ApartmentStructuredDataProps {
  apartment: Apartment;
}

export function ApartmentStructuredData({ apartment }: ApartmentStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Apartment',
    name: apartment.title,
    description: apartment.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: apartment.address,
      addressLocality: 'Budapest',
      addressRegion: 'Budapest',
      postalCode: apartment.district?.toString(),
      addressCountry: 'HU',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: apartment.latitude,
      longitude: apartment.longitude,
    },
    numberOfRooms: apartment.bedrooms,
    floorSize: {
      '@type': 'QuantitativeValue',
      value: apartment.size_sqm,
      unitText: 'SquareMeter',
    },
    amenityFeature: apartment.amenities?.map((amenity: string) => ({
      '@type': 'LocationFeatureSpecification',
      name: amenity,
    })),
    offers: {
      '@type': 'Offer',
      price: apartment.price_huf,
      priceCurrency: 'HUF',
      availability: 'https://schema.org/InStock',
      validFrom: apartment.created_at,
    },
    image: apartment.image_urls,
    provider: {
      '@type': 'Organization',
      name: 'Student Apartments Budapest',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData),
      }}
    />
  );
}