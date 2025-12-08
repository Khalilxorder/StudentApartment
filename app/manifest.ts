import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Student Apartments Budapest',
        short_name: 'StudentApartments',
        description: 'Find your perfect student apartment in Budapest',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#F97316',
        icons: [
            {
                src: '/favicon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
            },
        ],
    }
}
