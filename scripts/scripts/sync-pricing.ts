// Pricing sync script for dynamic pricing optimization
// Updates apartment prices based on market conditions and demand

import { pricingService } from '../services/pricing-svc';
import { Client } from 'pg';

export class PricingSyncService {
  private pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  async updateApartmentPricing() {
    console.log('💰 Updating apartment pricing...');

    try {
      await this.pgClient.connect();

      // Get apartments that need pricing updates
      const apartments = await this.pgClient.query(`
        SELECT
          a.id,
          a.price as current_price,
          a.rooms,
          a.amenities,
          a.district,
          a.location,
          a.created_at,
          COALESCE(ph.avg_price, 0) as market_avg,
          COALESCE(ph.price_count, 0) as competitors,
          COALESCE(sq.search_count, 0) as demand_score
        FROM apartments a
        LEFT JOIN (
          SELECT
            district,
            AVG(price) as avg_price,
            COUNT(*) as price_count
          FROM apartments
          WHERE status = 'active'
          GROUP BY district
        ) ph ON a.district = ph.district
        LEFT JOIN (
          SELECT
            district,
            COUNT(*) as search_count
          FROM search_queries sq
          JOIN apartments a2 ON sq.query_text LIKE '%' || a2.district || '%'
          WHERE sq.created_at > NOW() - INTERVAL '7 days'
          GROUP BY district
        ) sq ON a.district = sq.district
        WHERE a.status = 'active'
        AND (
          a.created_at < NOW() - INTERVAL '30 days'
          OR a.price_last_updated < NOW() - INTERVAL '7 days'
        )
        LIMIT 50
      `);

      if (apartments.rows.length === 0) {
        console.log('ℹ️ No apartments need pricing updates');
        return;
      }

      console.log(`📊 Analyzing pricing for ${apartments.rows.length} apartments...`);

      for (const apartment of apartments.rows) {
        try {
          // Prepare pricing factors
          const factors = {
            basePrice: apartment.current_price,
            location: apartment.district,
            rooms: apartment.rooms,
            amenities: apartment.amenities || [],
            condition: 'good' as const, // Would be determined from photos/analysis
            commuteTime: 20, // Would be calculated from commute service
            marketDemand: Math.min(apartment.demand_score / 10, 1), // Normalize demand
            seasonality: this.getSeasonalityFactor(),
            competition: Math.min(apartment.competitors / 20, 1), // Normalize competition
          };

          // Get pricing recommendation
          const recommendation = await pricingService.calculateOptimalPrice(factors);

          // Only update if confidence is high enough and price difference is significant
          const priceDiff = Math.abs(recommendation.suggestedPrice - apartment.current_price);
          const priceDiffPercent = priceDiff / apartment.current_price;

          if (recommendation.confidence > 0.7 && priceDiffPercent > 0.05) {
            // Store pricing history
            await this.pgClient.query(`
              INSERT INTO pricing_history (
                apartment_id, price, suggested_price, confidence, factors
              ) VALUES ($1, $2, $3, $4, $5)
            `, [
              apartment.id,
              apartment.current_price,
              recommendation.suggestedPrice,
              recommendation.confidence,
              JSON.stringify(recommendation.factors),
            ]);

            // Update apartment price
            await this.pgClient.query(`
              UPDATE apartments
              SET price = $1, updated_at = NOW(), price_last_updated = NOW()
              WHERE id = $2
            `, [recommendation.suggestedPrice, apartment.id]);

            console.log(`💸 Updated price for apartment ${apartment.id}: ${apartment.current_price} → ${recommendation.suggestedPrice}`);
          }
        } catch (error) {
          console.error(`❌ Failed to update pricing for apartment ${apartment.id}:`, error);
        }
      }

      console.log(`✅ Updated pricing for ${apartments.rows.length} apartments`);
    } catch (error) {
      console.error('❌ Failed to update apartment pricing:', error);
      throw error;
    } finally {
      await this.pgClient.end();
    }
  }

  async analyzeMarketTrends() {
    console.log('📈 Analyzing market trends...');

    try {
      await this.pgClient.connect();

      // Analyze price trends by district
      const trends = await this.pgClient.query(`
        SELECT
          district,
          AVG(price) as avg_price,
          COUNT(*) as listing_count,
          AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/86400) as avg_listing_age_days
        FROM apartments
        WHERE status = 'active'
        AND created_at > NOW() - INTERVAL '90 days'
        GROUP BY district
        ORDER BY avg_price DESC
      `);

      // Analyze demand patterns
      const demand = await this.pgClient.query(`
        SELECT
          DATE_TRUNC('week', created_at) as week,
          COUNT(*) as searches,
          AVG(result_count) as avg_results
        FROM search_queries
        WHERE created_at > NOW() - INTERVAL '90 days'
        GROUP BY week
        ORDER BY week
      `);

      // Store market analysis
      await this.pgClient.query(`
        INSERT INTO market_analysis (trends_data, demand_data, analyzed_at)
        VALUES ($1, $2, NOW())
      `, [JSON.stringify(trends.rows), JSON.stringify(demand.rows)]);

      console.log('✅ Market analysis completed');
      return {
        trends: trends.rows,
        demand: demand.rows,
      };
    } catch (error) {
      console.error('❌ Failed to analyze market trends:', error);
      throw error;
    } finally {
      await this.pgClient.end();
    }
  }

  async optimizeRevenue() {
    console.log('🎯 Optimizing revenue...');

    try {
      await this.pgClient.connect();

      // Get owners with multiple listings
      const owners = await this.pgClient.query(`
        SELECT
          owner_id,
          COUNT(*) as listing_count,
          AVG(price) as avg_price,
          SUM(price) as total_potential_revenue
        FROM apartments
        WHERE status = 'active'
        GROUP BY owner_id
        HAVING COUNT(*) > 1
        ORDER BY total_potential_revenue DESC
        LIMIT 20
      `);

      for (const owner of owners.rows) {
        try {
          // Get owner's apartments
          const apartments = await this.pgClient.query(`
            SELECT id, price, rooms, district
            FROM apartments
            WHERE owner_id = $1 AND status = 'active'
            ORDER BY price DESC
          `, [owner.owner_id]);

          // Calculate revenue optimization for each apartment
          for (const apartment of apartments.rows) {
            const optimization = await pricingService.optimizeRevenue(
              apartment.id,
              apartment.price
            );

            if (optimization.expectedImprovement > 0.1) { // 10% improvement threshold
              console.log(`🎯 Revenue optimization opportunity for apartment ${apartment.id}: +${(optimization.expectedImprovement * 100).toFixed(1)}%`);

              // Could send notification to owner here
            }
          }
        } catch (error) {
          console.error(`❌ Failed to optimize revenue for owner ${owner.owner_id}:`, error);
        }
      }

      console.log('✅ Revenue optimization completed');
    } catch (error) {
      console.error('❌ Failed to optimize revenue:', error);
      throw error;
    } finally {
      await this.pgClient.end();
    }
  }

  private getSeasonalityFactor(): number {
    const now = new Date();
    const month = now.getMonth();

    // Academic year seasonality (higher demand during school year)
    if (month >= 8 && month <= 11) return 0.9; // September-December (high)
    if (month >= 0 && month <= 1) return 0.8;  // January-February (high)
    if (month >= 5 && month <= 7) return 0.6;  // June-August (low)
    return 0.7; // March-May (medium)
  }
}

export const pricingSyncService = new PricingSyncService();

// CLI commands
export const syncPricing = async () => {
  const service = new PricingSyncService();

  try {
    console.log('🚀 Starting pricing sync...');

    await service.updateApartmentPricing();
    await service.analyzeMarketTrends();
    await service.optimizeRevenue();

    console.log('✅ Pricing sync completed!');
  } catch (error) {
    console.error('❌ Pricing sync failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'update':
      pricingSyncService.updateApartmentPricing().catch(console.error);
      break;
    case 'trends':
      pricingSyncService.analyzeMarketTrends().catch(console.error);
      break;
    case 'revenue':
      pricingSyncService.optimizeRevenue().catch(console.error);
      break;
    case 'all':
    default:
      syncPricing();
      break;
  }
}