import 'dotenv/config';
import { Pool } from 'pg';
const MIN_TRIAL_INCREMENT = 0.05;

const BANDIT_COMPONENTS = [
  'constraintFit',
  'personalFit',
  'accessibility',
  'trustQuality',
  'marketValue',
  'engagement',
] as const;

type BanditComponent = (typeof BANDIT_COMPONENTS)[number];
type BanditWeightMap = Record<BanditComponent, number>;

const DEFAULT_BANDIT_WEIGHTS: BanditWeightMap = {
  constraintFit: 0.3,
  personalFit: 0.2,
  accessibility: 0.1,
  trustQuality: 0.2,
  marketValue: 0.1,
  engagement: 0.1,
};

const COMPONENT_COLUMN_MAP: Record<BanditComponent, string> = {
  constraintFit: 'constraint_weight',
  personalFit: 'personal_weight',
  accessibility: 'accessibility_weight',
  trustQuality: 'trust_weight',
  marketValue: 'market_weight',
  engagement: 'engagement_weight',
};

const resolveDatabaseUrl = (): string => {
  const url =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_POSTGRES_URL;

  if (!url) {
    throw new Error(
      'RECOMPUTE RANKING WEIGHTS: DATABASE_URL (or SUPABASE_DB_URL / SUPABASE_POSTGRES_URL) must be defined.',
    );
  }

  return url;
};

const connectionString = resolveDatabaseUrl();

const pool = new Pool({
  connectionString,
  ssl: /supabase\.co|supabase\.net/.test(connectionString)
    ? { rejectUnauthorized: false }
    : undefined,
});

interface FeedbackRow {
  feedback_score: number;
  constraint_weight: number | null;
  personal_weight: number | null;
  accessibility_weight: number | null;
  trust_weight: number | null;
  market_weight: number | null;
  engagement_weight: number | null;
}

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const normaliseWeights = (weights: Record<BanditComponent, number>): BanditWeightMap => {
  let total = 0;
  const provisional: Partial<BanditWeightMap> = {};

  for (const key of BANDIT_COMPONENTS) {
    const value = Math.max(weights[key] ?? 0, 0);
    provisional[key] = value;
    total += value;
  }

  if (total <= 0) {
    return { ...DEFAULT_BANDIT_WEIGHTS };
  }

  const normalised: BanditWeightMap = { ...DEFAULT_BANDIT_WEIGHTS };
  for (const key of BANDIT_COMPONENTS) {
    normalised[key] = Number(((provisional[key] ?? 0) / total).toFixed(4));
  }
  return normalised;
};

const recomputeRankingWeights = async (lookbackDays: number) => {
  console.log(`[ranking] recomputing weights from last ${lookbackDays} days of feedback`);

  const { rows } = await pool.query<FeedbackRow>(
    `
      SELECT
        feedback_score,
        constraint_weight,
        personal_weight,
        accessibility_weight,
        trust_weight,
        market_weight,
        engagement_weight
      FROM public.ranking_feedback
      WHERE created_at >= NOW() - $1::interval;
    `,
    [`${Math.max(lookbackDays, 1)} days`],
  );

  if (!rows.length) {
    console.log('[ranking] no feedback rows found for lookback window; keeping defaults');
    return;
  }

  const trials: Record<BanditComponent, number> = BANDIT_COMPONENTS.reduce(
    (acc, key) => ({ ...acc, [key]: 0 }),
    {} as Record<BanditComponent, number>,
  );

  const successes: Record<BanditComponent, number> = BANDIT_COMPONENTS.reduce(
    (acc, key) => ({ ...acc, [key]: 0 }),
    {} as Record<BanditComponent, number>,
  );

  for (const row of rows) {
    const feedbackScore = clamp01((toNumber(row.feedback_score, 0) + 1) / 2); // map -1..1 -> 0..1

    for (const component of BANDIT_COMPONENTS) {
      const column = COMPONENT_COLUMN_MAP[component];
      const rawContribution = Math.abs(toNumber((row as any)[column], 0));
      const trialIncrement = Math.max(rawContribution, MIN_TRIAL_INCREMENT);

      const successIncrement =
        feedbackScore > 0.66
          ? trialIncrement
          : feedbackScore > 0.33
            ? trialIncrement * 0.5
            : trialIncrement * 0.1;

      trials[component] += trialIncrement;
      successes[component] += Math.min(successIncrement, trialIncrement);
    }
  }

  const expectedValues: Record<BanditComponent, number> = { ...DEFAULT_BANDIT_WEIGHTS };
  for (const key of BANDIT_COMPONENTS) {
    const alpha = successes[key] + 1;
    const beta = Math.max(trials[key] - successes[key], 0) + 1;
    expectedValues[key] = alpha / (alpha + beta);
  }

  const newWeights = normaliseWeights(expectedValues);

  await pool.query(
    `
      INSERT INTO rank_bandit_state (id, weights, trials, successes, last_updated)
      VALUES (
        1,
        $1::jsonb,
        $2::jsonb,
        $3::jsonb,
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
        SET weights = EXCLUDED.weights,
            trials = EXCLUDED.trials,
            successes = EXCLUDED.successes,
            last_updated = EXCLUDED.last_updated;
    `,
    [
      JSON.stringify(newWeights),
      JSON.stringify(trials),
      JSON.stringify(successes),
    ],
  );

  console.table(
    BANDIT_COMPONENTS.map((component) => ({
      component,
      trials: Number(trials[component].toFixed(2)),
      successes: Number(successes[component].toFixed(2)),
      weight: newWeights[component],
    })),
  );

  console.log('[ranking] weights updated successfully');
};

const main = async () => {
  const lookbackArg = process.argv[2];
  const lookbackDays = Number.isFinite(Number(lookbackArg)) ? Number(lookbackArg) : 30;

  try {
    await recomputeRankingWeights(lookbackDays);
  } catch (error) {
    console.error('[ranking] recompute failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

main();
