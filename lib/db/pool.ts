// Database pool with lazy loading to prevent build-time bundling of pg
// pg is a native module that doesn't work in Vercel's serverless build

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: any | undefined;
}

let Pool: any = null;

async function getPoolConstructor() {
  if (!Pool) {
    const pg = await import('pg');
    Pool = pg.Pool;
  }
  return Pool;
}

export async function getPool(): Promise<any> {
  if (!global.__dbPool) {
    const PoolClass = await getPoolConstructor();

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString || connectionString.includes('[password]') || connectionString.includes('localhost')) {
      console.warn('⚠️ Database not properly configured. Using mock mode.');
      global.__dbPool = new PoolClass({
        connectionString: 'postgresql://mock:mock@localhost:5432/mock',
        max: 1,
        idleTimeoutMillis: 1000,
      });
    } else {
      global.__dbPool = new PoolClass({
        connectionString: connectionString,
        max: 10,
        idleTimeoutMillis: 30_000,
      });
    }
  }
  return global.__dbPool;
}

export async function runQuery<T = any>(text: string, params: any[] = []) {
  const pool = await getPool();
  try {
    return await pool.query(text, params) as unknown as { rows: T[]; rowCount: number };
  } catch (error) {
    console.error('Database query failed:', error);
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Returning mock data due to database connection failure');
      return { rows: [], rowCount: 0 };
    }
    throw error;
  }
}
