import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { cacheGet, cacheSet } from '@/lib/redis';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const cacheKey = `apartments:list:${limit}:${offset}`;

    try {
        // Try to get from cache
        const cachedData = await cacheGet(cacheKey);
        if (cachedData) {
            return NextResponse.json(cachedData, {
                headers: { 'X-Cache': 'HIT' }
            });
        }

        const supabase = createClient();
        const { data, error } = await supabase
            .from('apartments')
            .select('*')
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Cache the result for 5 minutes
        await cacheSet(cacheKey, data, 300);

        return NextResponse.json(data, {
            headers: { 'X-Cache': 'MISS' }
        });

    } catch (error: any) {
        logger.error({ error }, 'Error fetching apartments');
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/apartments:
 *   post:
 *     summary: Create a new apartment listing
 *     description: Creates a new apartment listing for the authenticated owner
 *     tags: [Apartments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, address, price_huf]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Modern 2BR in District 7"
 *               address:
 *                 type: string
 *                 example: "Kazinczy utca 10"
 *               price_huf:
 *                 type: number
 *                 example: 150000
 *               description:
 *                 type: string
 *                 example: "Beautiful apartment near the city center"
 *     responses:
 *       200:
 *         description: Apartment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Apartment'
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
export async function POST(request: Request) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { title, address, price_huf, description } = body;

        if (!title || !address || !price_huf) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('apartments')
            .insert({
                owner_id: session.user.id,
                title,
                address,
                price_huf,
                monthly_rent_huf: price_huf,
                description,
                // Default values
                room_count: 1,
                bedrooms: 1,
                bathrooms: 1,
                kitchen: 1,
                district: '1',
                latitude: 47.4979,
                longitude: 19.0402,
                is_available: true,
                status: 'published',
                published_at: new Date().toISOString(),
                image_urls: [],
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        logger.error({ error }, 'Error creating apartment');
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
