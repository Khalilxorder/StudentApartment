import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Student Apartments API',
            version: '1.0.0',
            description: 'Comprehensive API documentation for Student Apartments platform',
            contact: {
                name: 'API Support',
                email: 'support@studentapartments.com',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
            {
                url: 'https://your-production-url.vercel.app',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                Apartment: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        price_huf: { type: 'number' },
                        monthly_rent_huf: { type: 'number' },
                        bedrooms: { type: 'integer' },
                        bathrooms: { type: 'integer' },
                        size_sqm: { type: 'number' },
                        district: { type: 'integer', minimum: 1, maximum: 23 },
                        address: { type: 'string' },
                        location: { type: 'string' },
                        available_from: { type: 'string', format: 'date' },
                        amenities: { type: 'array', items: { type: 'string' } },
                        photos: { type: 'array', items: { type: 'string' } },
                        owner_id: { type: 'string', format: 'uuid' },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                SearchQuery: {
                    type: 'object',
                    properties: {
                        query: { type: 'string' },
                        district: { type: 'integer', minimum: 1, maximum: 23 },
                        minPrice: { type: 'number' },
                        maxPrice: { type: 'number' },
                        bedrooms: { type: 'integer' },
                        amenities: { type: 'array', items: { type: 'string' } },
                        page: { type: 'integer', default: 1 },
                        limit: { type: 'integer', default: 20, maximum: 100 },
                    },
                },
                Booking: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        apartment_id: { type: 'string', format: 'uuid' },
                        student_id: { type: 'string', format: 'uuid' },
                        check_in: { type: 'string', format: 'date' },
                        check_out: { type: 'string', format: 'date' },
                        status: {
                            type: 'string',
                            enum: ['pending', 'confirmed', 'cancelled', 'completed']
                        },
                        total_price: { type: 'number' },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                Message: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        conversation_id: { type: 'string', format: 'uuid' },
                        sender_id: { type: 'string', format: 'uuid' },
                        receiver_id: { type: 'string', format: 'uuid' },
                        content: { type: 'string' },
                        read_at: { type: 'string', format: 'date-time', nullable: true },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        details: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./app/api/**/*.ts'], // Path to API docs
};

export const swaggerSpec = swaggerJsdoc(options);
