import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.__dbPool) {
    // For development, use a mock connection if database is not available
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString || connectionString.includes('[password]') || connectionString.includes('localhost')) {
      console.warn('⚠️ Database not properly configured. Using mock mode.');
      // Return a mock pool that will fail gracefully
      global.__dbPool = new Pool({
        connectionString: 'postgresql://mock:mock@localhost:5432/mock',
        max: 1,
        idleTimeoutMillis: 1000,
      });
    } else {
      global.__dbPool = new Pool({
        connectionString: connectionString,
        max: 10,
        idleTimeoutMillis: 30_000,
      });
    }
  }
  return global.__dbPool;
}

export async function runQuery<T = any>(text: string, params: any[] = []) {
  const pool = getPool();
  try {
    return await pool.query(text, params) as unknown as { rows: T[]; rowCount: number };
  } catch (error) {
    console.error('Database query failed:', error);
    // Return mock data for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Returning mock data due to database connection failure');
      return { rows: [], rowCount: 0 };
    }
    throw error;
  }
}
