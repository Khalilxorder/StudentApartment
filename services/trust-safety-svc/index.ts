// Trust & Safety Service - Fraud detection and user safety
// Monitors suspicious activities and ensures platform security

import { createClient, createServiceClient } from '@/utils/supabaseClient';

export interface SafetyAlert {
  id: string;
  type: 'fraud' | 'harassment' | 'scam' | 'fake_listing' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  apartmentId?: string;
  description: string;
  evidence: string[];
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: Date;
  resolvedAt?: Date;
  assignedTo?: string;
}

export interface UserRiskScore {
  userId: string;
  overallScore: number; // 0-100, higher = riskier
  factors: {
    accountAge: number;
    verificationStatus: number;
    activityPattern: number;
    socialProof: number;
    historicalIncidents: number;
  };
  lastUpdated: Date;
}

export interface FraudPattern {
  pattern: string;
  description: string;
  indicators: string[];
  riskLevel: number;
  actions: string[];
}

export class TrustSafetyService {
  private fraudPatterns: FraudPattern[] = [
    {
      pattern: 'duplicate_listing',
      description: 'Same apartment listed multiple times',
      indicators: ['identical_photos', 'same_address', 'similar_description'],
      riskLevel: 7,
      actions: ['flag_for_review', 'notify_owner', 'reduce_visibility'],
    },
    {
      pattern: 'fake_student',
      description: 'Non-student posing as university student',
      indicators: ['invalid_student_id', 'suspicious_email', 'no_university_activity'],
      riskLevel: 8,
      actions: ['block_account', 'require_verification', 'flag_messages'],
    },
    {
      pattern: 'price_manipulation',
      description: 'Artificially inflating/deflating prices',
      indicators: ['price_changes', 'unusual_discounts', 'market_inconsistencies'],
      riskLevel: 6,
      actions: ['review_pricing', 'notify_user', 'limit_changes'],
    },
    {
      pattern: 'harassment',
      description: 'Inappropriate or harassing messages',
      indicators: ['offensive_language', 'repeated_contacts', 'boundary_violations'],
      riskLevel: 9,
      actions: ['block_messages', 'warn_user', 'report_to_authorities'],
    },
  ];

  async assessUserRisk(userId: string): Promise<UserRiskScore> {
    const factors = await this.calculateRiskFactors(userId);

    const overallScore = this.calculateOverallRisk(factors);

    const riskScore: UserRiskScore = {
      userId,
      overallScore,
      factors,
      lastUpdated: new Date(),
    };

    await this.storeRiskScore(riskScore);
    return riskScore;
  }

  async detectFraudulentActivity(
    userId: string,
    activity: {
      type: string;
      data: Record<string, any>;
      timestamp: Date;
    }
  ): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];

    for (const pattern of this.fraudPatterns) {
      const matches = await this.checkPattern(pattern, userId, activity);

      if (matches.length > 0) {
        const alert: SafetyAlert = {
          id: this.generateAlertId(),
          type: pattern.pattern as any,
          severity: this.getSeverityFromRisk(pattern.riskLevel),
          userId,
          description: `${pattern.description} detected`,
          evidence: matches,
          status: 'open',
          createdAt: new Date(),
        };

        alerts.push(alert);
        await this.storeAlert(alert);
      }
    }

    return alerts;
  }

  async reportUser(
    reporterId: string,
    reportedUserId: string,
    reason: string,
    evidence?: string[]
  ): Promise<SafetyAlert> {
    const alert: SafetyAlert = {
      id: this.generateAlertId(),
      type: 'harassment',
      severity: 'high',
      userId: reportedUserId,
      description: `User reported by ${reporterId}: ${reason}`,
      evidence: evidence || [],
      status: 'open',
      createdAt: new Date(),
    };

    await this.storeAlert(alert);

    // Immediately restrict reported user if high-risk
    if (alert.severity === 'high' || alert.severity === 'critical') {
      await this.restrictUser(reportedUserId, 'Under investigation for user report');
    }

    return alert;
  }

  async reviewContent(
    content: string,
    contentType: 'message' | 'listing' | 'review'
  ): Promise<{ safe: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check for offensive language
    const offensiveWords = await this.getOffensiveWords();
    const foundOffensive = offensiveWords.filter(word =>
      content.toLowerCase().includes(word.toLowerCase())
    );

    if (foundOffensive.length > 0) {
      issues.push(`Contains offensive language: ${foundOffensive.join(', ')}`);
    }

    // Check for spam patterns
    if (this.isSpam(content)) {
      issues.push('Detected as potential spam');
    }

    // Check for contact information sharing (against policy)
    if (this.containsContactInfo(content)) {
      issues.push('Contains contact information sharing');
    }

    return {
      safe: issues.length === 0,
      issues,
    };
  }

  async moderateListing(apartmentId: string): Promise<{
    approved: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    // Retrieve listing details
    const listing = await this.getListingDetails(apartmentId);

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check photo quality
    if (listing.photoCount < 3) {
      issues.push('Insufficient photos');
      suggestions.push('Add at least 3 high-quality photos');
    }

    // Check description quality
    if (listing.description.length < 50) {
      issues.push('Description too short');
      suggestions.push('Provide detailed description including amenities and location');
    }

    // Check pricing
    if (listing.price < 30000 || listing.price > 500000) {
      issues.push('Suspicious pricing');
      suggestions.push('Verify pricing is within market range');
    }

    // Check for duplicate listings
    const duplicates = await this.findDuplicateListings(apartmentId);
    if (duplicates.length > 0) {
      issues.push('Potential duplicate listing');
      suggestions.push('Ensure this is not a duplicate of existing listings');
    }

    return {
      approved: issues.length === 0,
      issues,
      suggestions,
    };
  }

  private async calculateRiskFactors(userId: string): Promise<UserRiskScore['factors']> {
    // Calculate various risk factors
    const accountAge = await this.getAccountAge(userId);
    const verificationStatus = await this.getVerificationStatus(userId);
    const activityPattern = await this.analyzeActivityPattern(userId);
    const socialProof = await this.getSocialProof(userId);
    const historicalIncidents = await this.getHistoricalIncidents(userId);

    return {
      accountAge,
      verificationStatus,
      activityPattern,
      socialProof,
      historicalIncidents,
    };
  }

  private calculateOverallRisk(factors: UserRiskScore['factors']): number {
    // Weighted average of risk factors
    const weights = {
      accountAge: 0.1,
      verificationStatus: 0.3,
      activityPattern: 0.2,
      socialProof: 0.2,
      historicalIncidents: 0.2,
    };

    return (
      factors.accountAge * weights.accountAge +
      factors.verificationStatus * weights.verificationStatus +
      factors.activityPattern * weights.activityPattern +
      factors.socialProof * weights.socialProof +
      factors.historicalIncidents * weights.historicalIncidents
    );
  }

  private async checkPattern(
    pattern: FraudPattern,
    userId: string,
    activity: any
  ): Promise<string[]> {
    const matches: string[] = [];

    for (const indicator of pattern.indicators) {
      const match = await this.checkIndicator(indicator, userId, activity);
      if (match) {
        matches.push(`${indicator}: ${match}`);
      }
    }

    return matches;
  }

  private async checkIndicator(indicator: string, userId: string, activity: any): Promise<string | null> {
    // Implement specific indicator checks
    switch (indicator) {
      case 'invalid_student_id':
        return await this.validateStudentId(userId);
      case 'suspicious_email':
        return await this.checkEmailSuspicious(userId);
      case 'price_changes':
        return await this.checkPriceManipulation(userId, activity);
      default:
        return null;
    }
  }

  private getSeverityFromRisk(riskLevel: number): SafetyAlert['severity'] {
    if (riskLevel >= 9) return 'critical';
    if (riskLevel >= 7) return 'high';
    if (riskLevel >= 5) return 'medium';
    return 'low';
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isSpam(content: string): boolean {
    // Simple spam detection
    const spamIndicators = ['buy now', 'limited time', 'urgent', 'free money'];
    return spamIndicators.some(indicator => content.toLowerCase().includes(indicator));
  }

  private containsContactInfo(content: string): boolean {
    // Check for phone numbers, emails, etc.
    const phoneRegex = /\+\d{1,3}[\s-]?\d{1,4}[\s-]?\d{1,4}[\s-]?\d{1,4}/;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;

    return phoneRegex.test(content) || emailRegex.test(content);
  }

  // Database persistence methods - Now with real Supabase integration
  private async storeRiskScore(score: UserRiskScore): Promise<void> {
    const supabase = createServiceClient();
    const { error } = await supabase.from('audit_logs').insert({
      actor_id: score.userId,
      event: 'risk_score_calculated',
      resource_type: 'user',
      resource_id: score.userId,
      metadata: {
        overallScore: score.overallScore,
        factors: score.factors,
        timestamp: new Date().toISOString(),
      },
    });
    
    if (error) {
      console.error('Failed to store risk score:', error);
    }
  }

  private async storeAlert(alert: SafetyAlert): Promise<void> {
    const supabase = createServiceClient();
    const { error } = await supabase.from('audit_logs').insert({
      event: 'safety_alert_created',
      resource_type: alert.type,
      resource_id: alert.userId || alert.apartmentId || alert.id,
      metadata: {
        alertId: alert.id,
        severity: alert.severity,
        description: alert.description,
        evidence: alert.evidence,
        status: alert.status,
      },
    });
    
    if (error) {
      console.error('Failed to store alert:', error);
    }
  }

  private async restrictUser(userId: string, reason: string): Promise<void> {
    const supabase = createServiceClient();
    
    const { error } = await supabase
      .from('auth.users')
      .update({
        user_metadata: { restricted: true, restrictionReason: reason },
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Failed to restrict user:', error);
    }
  }

  // Helper methods with actual data fetching
  private async getAccountAge(userId: string): Promise<number> {
    const supabase = createClient();
    const { data } = await supabase
      .from('audit_logs')
      .select('created_at')
      .eq('actor_id', userId)
      .order('created_at', { ascending: true })
      .limit(1);
    
    if (!data || data.length === 0) {
      return 1.0; // New account - highest risk
    }
    
    const createdDate = new Date(data[0].created_at);
    const ageMonths = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return Math.min(ageMonths / 12, 1.0); // Normalize to 0-1 scale
  }

  private async getVerificationStatus(userId: string): Promise<number> {
    const supabase = createClient();
    const { data } = await supabase
      .from('verification')
      .select('status')
      .eq('user_id', userId);
    
    if (!data || data.length === 0) {
      return 0.9; // Not verified - high risk
    }
    
    const verified = data.some((v: any) => v.status === 'verified');
    return verified ? 0.1 : 0.7; // Low risk if verified
  }

  private async analyzeActivityPattern(userId: string): Promise<number> {
    const supabase = createClient();
    const { data } = await supabase
      .from('audit_logs')
      .select('created_at')
      .eq('actor_id', userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    const recentActivity = data?.length || 0;
    // Moderate activity (5-50 events/month) is normal
    if (recentActivity >= 5 && recentActivity <= 50) {
      return 0.2; // Low risk
    }
    if (recentActivity > 100) {
      return 0.7; // Suspicious - too much activity
    }
    if (recentActivity === 0) {
      return 0.5; // Medium risk - inactive
    }
    return 0.3;
  }

  private async getSocialProof(userId: string): Promise<number> {
    const supabase = createClient();
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('user_id', userId);
    
    if (!reviews || reviews.length === 0) {
      return 0.7; // No reviews - higher risk
    }
    
    const avgRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
    return 1 - (avgRating / 5) * 0.5; // Better ratings reduce risk
  }

  private async getHistoricalIncidents(userId: string): Promise<number> {
    const supabase = createClient();
    const { data } = await supabase
      .from('audit_logs')
      .select('metadata')
      .eq('actor_id', userId)
      .eq('event', 'safety_alert_created');
    
    const incidents = data?.length || 0;
    return Math.min(incidents / 5, 1.0); // Normalize incident count
  }

  private async validateStudentId(userId: string): Promise<string | null> {
    const supabase = createClient();
    const { data } = await supabase
      .from('verification')
      .select('details')
      .eq('user_id', userId)
      .eq('verification_type', 'student')
      .single();
    
    if (!data) {
      return 'No student ID found';
    }
    
    return null; // Valid
  }

  private async checkEmailSuspicious(userId: string): Promise<string | null> {
    const supabase = createServiceClient(); // Use service client for admin API
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error || !user?.email) {
      console.error('Failed to get user email:', error);
      return 'No email found';
    }
    
    // Check for disposable email domains
    const disposableDomains = ['tempmail', '10minutemail', 'guerrillamail'];
    const domain = user.email.split('@')[1];
    
    if (disposableDomains.some(d => domain.includes(d))) {
      return 'Suspicious email domain';
    }
    
    return null;
  }

  private async checkPriceManipulation(userId: string, activity: any): Promise<string | null> {
    // Would require historical price data
    return null;
  }

  private async getOffensiveWords(): Promise<string[]> {
    // Standard offensive word list for content moderation
    return [
      'offensive1', 'offensive2', 'spam', 'scam', 'fraud'
      // In production, this would come from a database
    ];
  }

  private async getListingDetails(apartmentId: string): Promise<any> {
    const supabase = createClient();
    const { data } = await supabase
      .from('apartments')
      .select('*')
      .eq('id', apartmentId)
      .single();
    
    return data || {};
  }

  private async findDuplicateListings(apartmentId: string): Promise<any[]> {
    // Import the enhanced duplicate detection service
    const { enhancedDuplicateDetectionService } = await import('@/services/duplicate-detection-svc');
    
    try {
      // Use incremental method for faster detection
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment(
        apartmentId,
        'incremental'
      );
      
      // Return high-confidence matches
      return result.matches
        .filter(match => match.confidence === 'high' || (match.confidence === 'medium' && match.totalScore >= 0.65))
        .map(match => ({
          id: match.candidateId,
          score: match.totalScore,
          confidence: match.confidence,
          evidence: match.evidenceItems,
        }));
    } catch (error) {
      console.error('Error in enhanced duplicate detection:', error);
      
      // Fallback to simple exact match detection
      const supabase = createClient();
      const { data: current } = await supabase
        .from('apartments')
        .select('title, address, price')
        .eq('id', apartmentId)
        .single();
      
      if (!current) return [];
      
      // Find similar listings using exact match
      const { data: duplicates } = await supabase
        .from('apartments')
        .select('id')
        .neq('id', apartmentId)
        .eq('title', current.title)
        .eq('address', current.address);
      
      return duplicates || [];
    }
  }

  async detectAdvancedFraud(
    userId: string,
    activityData: {
      type: 'login' | 'listing' | 'message' | 'payment' | 'verification';
      ipAddress: string;
      userAgent: string;
      timestamp: Date;
      metadata?: Record<string, any>;
    }
  ): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];

    // Behavioral analysis
    const behavioralAlerts = await this.analyzeUserBehavior(userId, activityData);
    alerts.push(...behavioralAlerts);

    // Anomaly detection
    const anomalyAlerts = await this.detectAnomalies(userId, activityData);
    alerts.push(...anomalyAlerts);

    // Cross-user pattern analysis
    const patternAlerts = await this.analyzeCrossUserPatterns(activityData);
    alerts.push(...patternAlerts);

    // IP-based analysis
    const ipAlerts = await this.analyzeIPAddress(activityData.ipAddress, userId);
    alerts.push(...ipAlerts);

    return alerts;
  }

  private async analyzeUserBehavior(
    userId: string,
    activity: any
  ): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];

    // Get user's activity history
    const history = await this.getUserActivityHistory(userId, 30); // Last 30 days

    // Check for unusual activity patterns
    const unusualPatterns = this.detectUnusualPatterns(history, activity);

    for (const pattern of unusualPatterns) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'suspicious_activity',
        severity: pattern.severity,
        userId,
        description: pattern.description,
        evidence: pattern.evidence,
        status: 'open',
        createdAt: new Date(),
      });
    }

    return alerts;
  }

  private async detectAnomalies(userId: string, activity: any): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];

    // Statistical anomaly detection
    const stats = await this.calculateUserStats(userId);

    // Check for outliers in various metrics
    if (stats.messageFrequency > stats.averageMessageFrequency * 3) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'suspicious_activity',
        severity: 'medium',
        userId,
        description: 'Unusually high messaging frequency detected',
        evidence: [`Messages: ${stats.messageFrequency}/hour vs average ${stats.averageMessageFrequency}/hour`],
        status: 'open',
        createdAt: new Date(),
      });
    }

    // Check for rapid account creation and immediate activity
    if (stats.accountAge < 24 && stats.activityCount > 10) { // Less than 24 hours old
      alerts.push({
        id: this.generateAlertId(),
        type: 'fraud',
        severity: 'high',
        userId,
        description: 'New account with suspicious activity level',
        evidence: [`Account age: ${stats.accountAge} hours`, `Activity count: ${stats.activityCount}`],
        status: 'open',
        createdAt: new Date(),
      });
    }

    return alerts;
  }

  private async analyzeCrossUserPatterns(activity: any): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];

    // Check for coordinated behavior across multiple accounts
    const similarActivities = await this.findSimilarActivities(activity);

    if (similarActivities.length > 3) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'fraud',
        severity: 'high',
        description: 'Coordinated suspicious activity detected',
        evidence: [`${similarActivities.length} similar activities in short timeframe`],
        status: 'open',
        createdAt: new Date(),
      });
    }

    return alerts;
  }

  private async analyzeIPAddress(ipAddress: string, userId: string): Promise<SafetyAlert[]> {
    const alerts: SafetyAlert[] = [];

    // Check IP reputation
    const ipReputation = await this.checkIPReputation(ipAddress);

    if (ipReputation.risk > 0.7) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'fraud',
        severity: 'high',
        userId,
        description: 'High-risk IP address detected',
        evidence: [`IP: ${ipAddress}`, `Risk score: ${ipReputation.risk}`],
        status: 'open',
        createdAt: new Date(),
      });
    }

    // Check for IP sharing across multiple accounts
    const accountsOnIP = await this.getAccountsOnIP(ipAddress);
    if (accountsOnIP.length > 5) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'fraud',
        severity: 'medium',
        description: 'IP address shared across multiple accounts',
        evidence: [`IP: ${ipAddress}`, `Accounts: ${accountsOnIP.length}`],
        status: 'open',
        createdAt: new Date(),
      });
    }

    return alerts;
  }

  private detectUnusualPatterns(history: any[], currentActivity: any): Array<{
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    evidence: string[];
  }> {
    const patterns: Array<{
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      evidence: string[];
    }> = [];

    // Time-based patterns
    const recentActivities = history.filter(h =>
      (currentActivity.timestamp.getTime() - h.timestamp.getTime()) < 3600000 // Last hour
    );

    if (recentActivities.length > 20) {
      patterns.push({
        description: 'Unusually high activity in short timeframe',
        severity: 'medium',
        evidence: [`${recentActivities.length} activities in last hour`],
      });
    }

    // Location-based patterns (if IP geolocation available)
    const uniqueIPs = new Set(history.map(h => h.ipAddress));
    if (uniqueIPs.size > 10) {
      patterns.push({
        description: 'Activity from many different IP addresses',
        severity: 'low',
        evidence: [`${uniqueIPs.size} unique IPs in history`],
      });
    }

    return patterns;
  }

  private async calculateUserStats(userId: string): Promise<{
    accountAge: number;
    activityCount: number;
    messageFrequency: number;
    averageMessageFrequency: number;
  }> {
    // This would query the database for user statistics
    // Placeholder implementation
    return {
      accountAge: 48, // hours
      activityCount: 15,
      messageFrequency: 5,
      averageMessageFrequency: 2,
    };
  }

  private async getUserActivityHistory(userId: string, days: number): Promise<any[]> {
    // Query user activity history from database
    return [];
  }

  private async findSimilarActivities(activity: any): Promise<any[]> {
    // Find similar activities in database
    return [];
  }

  private async checkIPReputation(ipAddress: string): Promise<{ risk: number }> {
    // Check IP against reputation databases
    // This would integrate with services like AbuseIPDB, etc.
    return { risk: 0.1 };
  }

  private async getAccountsOnIP(ipAddress: string): Promise<string[]> {
    // Find all accounts using this IP
    return [];
  }

  async calculateAdvancedTrustScore(userId: string): Promise<{
    score: number;
    factors: Record<string, number>;
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    // Gather all risk factors
    const factors = await this.gatherRiskFactors(userId);

    // Apply machine learning-style scoring
    const score = this.applyMLScoring(factors);

    // Calculate confidence in the score
    const confidence = this.calculateScoreConfidence(factors);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(score);

    return {
      score,
      factors,
      confidence,
      riskLevel,
    };
  }

  private async gatherRiskFactors(userId: string): Promise<Record<string, number>> {
    const factors: Record<string, number> = {};

    // Account age (0-1, higher = safer)
    factors.accountAge = await this.getAccountAge(userId);

    // Verification status (0-1, higher = safer)
    factors.verificationStatus = await this.getVerificationStatus(userId);

    // Activity pattern score (0-1, higher = safer)
    factors.activityPattern = await this.getActivityPatternScore(userId);

    // Social proof score (0-1, higher = safer)
    factors.socialProof = await this.getSocialProofScore(userId);

    // Historical incidents (0-1, higher = safer)
    factors.historicalIncidents = await this.getHistoricalIncidentsScore(userId);

    // Behavioral consistency (0-1, higher = safer)
    factors.behavioralConsistency = await this.getBehavioralConsistencyScore(userId);

    // Network analysis (0-1, higher = safer)
    factors.networkAnalysis = await this.getNetworkAnalysisScore(userId);

    return factors;
  }

  private applyMLScoring(factors: Record<string, number>): number {
    // Weighted scoring algorithm inspired by credit scoring models
    const weights = {
      accountAge: 0.15,
      verificationStatus: 0.25,
      activityPattern: 0.15,
      socialProof: 0.15,
      historicalIncidents: 0.15,
      behavioralConsistency: 0.10,
      networkAnalysis: 0.05,
    };

    let score = 0;
    for (const [factor, value] of Object.entries(factors)) {
      score += value * weights[factor as keyof typeof weights];
    }

    // Apply sigmoid transformation for better distribution
    return 1 / (1 + Math.exp(-5 * (score - 0.5)));
  }

  private calculateScoreConfidence(factors: Record<string, number>): number {
    // Confidence based on data completeness and consistency
    const factorCount = Object.keys(factors).length;
    const definedFactors = Object.values(factors).filter(v => v >= 0).length;

    let confidence = definedFactors / factorCount;

    // Reduce confidence if factors are inconsistent
    const factorValues = Object.values(factors);
    const variance = this.calculateVariance(factorValues);
    confidence *= (1 - variance); // Lower confidence for high variance

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'low';
    if (score >= 0.6) return 'medium';
    if (score >= 0.4) return 'high';
    return 'critical';
  }

  private async getActivityPatternScore(userId: string): Promise<number> {
    // Analyze user's activity patterns for consistency
    const activities = await this.getUserActivities(userId, 30); // Last 30 days

    if (activities.length < 5) return 0.5; // Not enough data

    // Check for regular patterns vs random/spammy behavior
    const hourlyDistribution = this.analyzeHourlyDistribution(activities);
    const consistency = this.calculateDistributionConsistency(hourlyDistribution);

    return consistency;
  }

  private async getSocialProofScore(userId: string): Promise<number> {
    // Calculate social proof based on connections, reviews, etc.
    const supabase = createClient();

    // Count positive interactions
    const { count: positiveReviews } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('target_user_id', userId)
      .eq('rating', 'positive');

    const { count: connections } = await supabase
      .from('user_connections')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${userId},connected_user_id.eq.${userId}`);

    // Normalize to 0-1 scale
    const reviewScore = Math.min(positiveReviews || 0, 10) / 10;
    const connectionScore = Math.min(connections || 0, 20) / 20;

    return (reviewScore + connectionScore) / 2;
  }

  private async getHistoricalIncidentsScore(userId: string): Promise<number> {
    // Calculate score based on historical incidents
    const supabase = createClient();

    const { count: incidents } = await supabase
      .from('user_reports')
      .select('*', { count: 'exact', head: true })
      .eq('target_user_id', userId)
      .gte('reported_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()); // Last year

    // Exponential decay - more incidents = much lower score
    return Math.exp(-0.5 * (incidents || 0));
  }

  private async getBehavioralConsistencyScore(userId: string): Promise<number> {
    // Analyze behavioral consistency over time
    const activities = await this.getUserActivities(userId, 90); // Last 90 days

    if (activities.length < 10) return 0.5;

    // Check for consistent patterns in timing, frequency, etc.
    const consistencyMetrics = this.calculateBehavioralConsistency(activities);

    return consistencyMetrics.overall;
  }

  private async getNetworkAnalysisScore(userId: string): Promise<number> {
    // Analyze user's network for suspicious connections
    const supabase = createClient();

    // Get user's connections
    const { data: connections } = await supabase
      .from('user_connections')
      .select('connected_user_id')
      .eq('user_id', userId);

    if (!connections || connections.length === 0) return 0.5;

    // Check risk scores of connections
    let totalRisk = 0;
    let connectionCount = 0;

    for (const connection of connections.slice(0, 10)) { // Limit to first 10
      const riskScore = await this.calculateAdvancedTrustScore(connection.connected_user_id);
      totalRisk += riskScore.score;
      connectionCount++;
    }

    if (connectionCount === 0) return 0.5;

    // Higher score if connected to trustworthy users
    return totalRisk / connectionCount;
  }

  // Helper methods for advanced scoring
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance); // Standard deviation
  }

  private async getUserActivities(userId: string, days: number): Promise<any[]> {
    const supabase = createClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('actor_id', userId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    return data || [];
  }

  private analyzeHourlyDistribution(activities: any[]): number[] {
    const distribution = new Array(24).fill(0);

    activities.forEach(activity => {
      const hour = new Date(activity.created_at).getHours();
      distribution[hour]++;
    });

    return distribution;
  }

  private calculateDistributionConsistency(distribution: number[]): number {
    const total = distribution.reduce((a, b) => a + b, 0);
    if (total === 0) return 0.5;

    const mean = total / 24;
    const variance = distribution.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 24;
    const consistency = 1 / (1 + variance / mean); // Lower variance = higher consistency

    return consistency;
  }

  private calculateBehavioralConsistency(activities: any[]): {
    overall: number;
    timing: number;
    frequency: number;
    type: number;
  } {
    // Calculate consistency across different dimensions
    const timingConsistency = this.calculateTimingConsistency(activities);
    const frequencyConsistency = this.calculateFrequencyConsistency(activities);
    const typeConsistency = this.calculateTypeConsistency(activities);

    const overall = (timingConsistency + frequencyConsistency + typeConsistency) / 3;

    return {
      overall,
      timing: timingConsistency,
      frequency: frequencyConsistency,
      type: typeConsistency,
    };
  }

  private calculateTimingConsistency(activities: any[]): number {
    if (activities.length < 5) return 0.5;

    const intervals: number[] = [];
    for (let i = 1; i < activities.length; i++) {
      const interval = new Date(activities[i-1].created_at).getTime() -
                      new Date(activities[i].created_at).getTime();
      intervals.push(interval);
    }

    const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - meanInterval, 2), 0) / intervals.length;

    return 1 / (1 + variance / meanInterval);
  }

  private calculateFrequencyConsistency(activities: any[]): number {
    // Analyze activity frequency patterns
    const dailyCounts = this.groupActivitiesByDay(activities);
    const frequencies = Object.values(dailyCounts);

    if (frequencies.length < 7) return 0.5; // Need at least a week

    const mean = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
    const variance = frequencies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / frequencies.length;

    return 1 / (1 + variance / mean);
  }

  private calculateTypeConsistency(activities: any[]): number {
    // Analyze consistency in activity types
    const typeCounts: Record<string, number> = {};

    activities.forEach(activity => {
      const type = activity.action || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const types = Object.keys(typeCounts);
    if (types.length < 2) return 0.5; // Not enough variety to measure consistency

    // Calculate entropy (lower entropy = more consistent)
    const total = activities.length;
    const entropy = types.reduce((e, type) => {
      const p = typeCounts[type] / total;
      return e - p * Math.log2(p);
    }, 0);

    const maxEntropy = Math.log2(types.length);
    return 1 - (entropy / maxEntropy); // Normalize to 0-1
  }

  private groupActivitiesByDay(activities: any[]): Record<string, number> {
    const dailyCounts: Record<string, number> = {};

    activities.forEach(activity => {
      const date = new Date(activity.created_at).toDateString();
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    return dailyCounts;
  }
}


export const trustSafetyService = new TrustSafetyService();