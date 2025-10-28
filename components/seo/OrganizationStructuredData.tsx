export function OrganizationStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Student Apartments Budapest',
    url: 'https://student-apartments-budapest.com',
    logo: 'https://student-apartments-budapest.com/logo.png',
    description: 'Find your perfect student apartment in Budapest with AI-powered matching. Search thousands of verified listings with intelligent recommendations.',
    foundingDate: '2024',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+36-1-234-5678',
      contactType: 'customer service',
      availableLanguage: 'English',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Budapest',
      addressCountry: 'HU',
    },
    sameAs: [
      'https://facebook.com/studentapartmentsbudapest',
      'https://twitter.com/studentapartments',
      'https://instagram.com/studentapartmentsbudapest',
    ],
    serviceType: 'Student Housing',
    areaServed: {
      '@type': 'City',
      name: 'Budapest',
      addressCountry: 'HU',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Student Apartments',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'AI-Powered Apartment Search',
            description: 'Find apartments using artificial intelligence and personalized recommendations',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Verified Listings',
            description: 'All apartments are verified and regularly updated',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Virtual Tours',
            description: 'Explore apartments with 360-degree virtual tours',
          },
        },
      ],
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