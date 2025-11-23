// A/B Testing Service for Student Apartments
// Enables experimentation and optimization of user experience
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ExperimentVariant[];
  targetAudience: {
    userType?: 'student' | 'owner' | 'all';
    countries?: string[];
    userIds?: string[];
  };
  startDate: Date;
  endDate?: Date;
  metrics: ExperimentMetric[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // Percentage of traffic (0-100)
  config: Record<string, any>;
}

export interface ExperimentMetric {
  name: string;
  type: 'conversion' | 'engagement' | 'revenue' | 'custom';
  eventName: string;
  targetValue?: number;
}

export interface ExperimentResult {
  experimentId: string;
  variantId: string;
  users: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
  isSignificant: boolean;
  metrics: Record<string, number>;
}

export interface UserExperiment {
  userId: string;
  experimentId: string;
  variantId: string;
  assignedAt: Date;
}

export class ABTestingService {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Create a new experiment
   */
  async createExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Validate experiment configuration
      this.validateExperiment(experiment);

      const { data: newExperiment, error } = await this.supabase
        .from('experiments')
        .insert({
          name: experiment.name,
          description: experiment.description,
          status: experiment.status,
          variants: experiment.variants,
          target_audience: experiment.targetAudience,
          start_date: experiment.startDate.toISOString(),
          end_date: experiment.endDate?.toISOString(),
          metrics: experiment.metrics,
          created_by: experiment.createdBy,
        })
        .select()
        .single();

      if (error) throw error;

      return newExperiment.id;

    } catch (error) {
      console.error('Create experiment error:', error);
      throw new Error(`Failed to create experiment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate experiment configuration
   */
  private validateExperiment(experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>): void {
    if (!experiment.name || experiment.name.trim().length === 0) {
      throw new Error('Experiment name is required');
    }

    if (!experiment.variants || experiment.variants.length < 2) {
      throw new Error('Experiment must have at least 2 variants');
    }

    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.1) {
      throw new Error('Variant weights must sum to 100%');
    }

    if (!experiment.metrics || experiment.metrics.length === 0) {
      throw new Error('Experiment must have at least one metric');
    }
  }

  /**
   * Assign user to experiment variant
   */
  async assignUserToExperiment(userId: string, experimentId: string): Promise<string> {
    try {
      // Check if user is already assigned
      const { data: existingAssignment } = await this.supabase
        .from('user_experiments')
        .select('variant_id')
        .eq('user_id', userId)
        .eq('experiment_id', experimentId)
        .single();

      if (existingAssignment) {
        return existingAssignment.variant_id;
      }

      // Get experiment
      const { data: experiment, error } = await this.supabase
        .from('experiments')
        .select('*')
        .eq('id', experimentId)
        .eq('status', 'running')
        .single();

      if (error || !experiment) {
        throw new Error('Experiment not found or not running');
      }

      // Check if user matches target audience
      if (!this.userMatchesAudience(userId, experiment.target_audience)) {
        throw new Error('User does not match experiment audience');
      }

      // Assign variant based on consistent hashing
      const variantId = this.assignVariant(userId, experiment.variants);

      // Store assignment
      await this.supabase
        .from('user_experiments')
        .insert({
          user_id: userId,
          experiment_id: experimentId,
          variant_id: variantId,
        });

      return variantId;

    } catch (error) {
      console.error('User assignment error:', error);
      throw new Error(`Failed to assign user to experiment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assign variant using consistent hashing
   */
  private assignVariant(userId: string, variants: ExperimentVariant[]): string {
    // Create hash from user ID for consistent assignment
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16) / 0xFFFFFFFF; // 0-1

    let cumulativeWeight = 0;
    for (const variant of variants) {
      cumulativeWeight += variant.weight / 100;
      if (hashValue <= cumulativeWeight) {
        return variant.id;
      }
    }

    // Fallback to first variant
    return variants[0].id;
  }

  /**
   * Check if user matches target audience
   */
  private async userMatchesAudience(userId: string, audience: any): Promise<boolean> {
    try {
      // Get user profile
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('user_type, country')
        .eq('id', userId)
        .single();

      if (error || !profile) return false;

      // Check user type
      if (audience.userType && audience.userType !== 'all' && profile.user_type !== audience.userType) {
        return false;
      }

      // Check country
      if (audience.countries && audience.countries.length > 0 && !audience.countries.includes(profile.country)) {
        return false;
      }

      // Check specific user IDs
      if (audience.userIds && audience.userIds.length > 0 && !audience.userIds.includes(userId)) {
        return false;
      }

      return true;

    } catch (error) {
      console.error('Audience check error:', error);
      return false;
    }
  }

  /**
   * Get user's experiment variant
   */
  async getUserVariant(userId: string, experimentId: string): Promise<string | null> {
    try {
      const { data: assignment, error } = await this.supabase
        .from('user_experiments')
        .select('variant_id')
        .eq('user_id', userId)
        .eq('experiment_id', experimentId)
        .single();

      if (error || !assignment) return null;

      return assignment.variant_id;

    } catch (error) {
      console.error('Get user variant error:', error);
      return null;
    }
  }

  /**
   * Track experiment event
   */
  async trackExperimentEvent(
    userId: string,
    experimentId: string,
    eventName: string,
    properties: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Get user's variant
      const variantId = await this.getUserVariant(userId, experimentId);
      if (!variantId) return; // User not in experiment

      // Store event
      await this.supabase
        .from('experiment_events')
        .insert({
          user_id: userId,
          experiment_id: experimentId,
          variant_id: variantId,
          event_name: eventName,
          properties,
        });

    } catch (error) {
      console.error('Track experiment event error:', error);
    }
  }

  /**
   * Get experiment results
   */
  async getExperimentResults(experimentId: string): Promise<ExperimentResult[]> {
    try {
      // Get experiment
      const { data: experiment, error } = await this.supabase
        .from('experiments')
        .select('*')
        .eq('id', experimentId)
        .single();

      if (error || !experiment) {
        throw new Error('Experiment not found');
      }

      const results: ExperimentResult[] = [];

      for (const variant of experiment.variants) {
        // Count users in variant
        const { data: userCount } = await this.supabase
          .from('user_experiments')
          .select('user_id', { count: 'exact' })
          .eq('experiment_id', experimentId)
          .eq('variant_id', variant.id);

        // Count conversions for each metric
        const variantResults: Record<string, number> = {};
        let totalConversions = 0;

        for (const metric of experiment.metrics) {
          const { data: eventCount } = await this.supabase
            .from('experiment_events')
            .select('id', { count: 'exact' })
            .eq('experiment_id', experimentId)
            .eq('variant_id', variant.id)
            .eq('event_name', metric.eventName);

          const count = eventCount?.length || 0;
          variantResults[metric.name] = count;

          if (metric.type === 'conversion') {
            totalConversions += count;
          }
        }

        const users = userCount?.length || 0;
        const conversionRate = users > 0 ? totalConversions / users : 0;

        results.push({
          experimentId,
          variantId: variant.id,
          users,
          conversions: totalConversions,
          conversionRate,
          confidence: this.calculateConfidence(users, conversionRate),
          isSignificant: false, // Would need statistical analysis
          metrics: variantResults,
        });
      }

      return results;

    } catch (error) {
      console.error('Get experiment results error:', error);
      throw new Error(`Failed to get experiment results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate statistical confidence (simplified)
   */
  private calculateConfidence(sampleSize: number, conversionRate: number): number {
    if (sampleSize < 30) return 0; // Too small sample

    // Simplified confidence calculation
    const standardError = Math.sqrt((conversionRate * (1 - conversionRate)) / sampleSize);
    const zScore = 1.96; // 95% confidence

    return Math.min(95, (1 - standardError * zScore) * 100);
  }

  /**
   * Start experiment
   */
  async startExperiment(experimentId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('experiments')
        .update({
          status: 'running',
          start_date: new Date().toISOString(),
        })
        .eq('id', experimentId);

      if (error) throw error;

    } catch (error) {
      console.error('Start experiment error:', error);
      throw new Error(`Failed to start experiment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop experiment
   */
  async stopExperiment(experimentId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('experiments')
        .update({
          status: 'completed',
          end_date: new Date().toISOString(),
        })
        .eq('id', experimentId);

      if (error) throw error;

    } catch (error) {
      console.error('Stop experiment error:', error);
      throw new Error(`Failed to stop experiment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get active experiments for user
   */
  async getActiveExperiments(userId: string): Promise<Experiment[]> {
    try {
      const { data: experiments, error } = await this.supabase
        .from('experiments')
        .select('*')
        .eq('status', 'running');

      if (error) return [];

      // Filter experiments where user matches audience
      const matchingExperiments: Experiment[] = [];
      for (const experiment of experiments || []) {
        if (await this.userMatchesAudience(userId, experiment.target_audience)) {
          matchingExperiments.push({
            id: experiment.id,
            name: experiment.name,
            description: experiment.description,
            status: experiment.status,
            variants: experiment.variants,
            targetAudience: experiment.target_audience,
            startDate: new Date(experiment.start_date),
            endDate: experiment.end_date ? new Date(experiment.end_date) : undefined,
            metrics: experiment.metrics,
            createdBy: experiment.created_by,
            createdAt: new Date(experiment.created_at),
            updatedAt: new Date(experiment.updated_at),
          });
        }
      }

      return matchingExperiments;

    } catch (error) {
      console.error('Get active experiments error:', error);
      return [];
    }
  }

  /**
   * Get experiment variant configuration for user
   */
  async getVariantConfig(userId: string, experimentId: string): Promise<Record<string, any> | null> {
    try {
      const variantId = await this.assignUserToExperiment(userId, experimentId);

      const { data: experiment, error } = await this.supabase
        .from('experiments')
        .select('variants')
        .eq('id', experimentId)
        .single();

      if (error || !experiment) return null;

      const variant = experiment.variants.find((v: any) => v.id === variantId);
      return variant ? variant.config : null;

    } catch (error) {
      console.error('Get variant config error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const abTestingService = new ABTestingService();