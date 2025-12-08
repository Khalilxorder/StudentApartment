/**
 * GDPR Automation Toolkit
 * 
 * Comprehensive GDPR compliance automation for:
 * - Data export (Article 20 - Right to data portability)
 * - Data deletion (Article 17 - Right to erasure)
 * - Data anonymization (GDPR-compliant alternative to deletion)
 * - Consent management (Article 6 - Lawfulness of processing)
 */

import { createClient } from '@/utils/supabaseClient';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';

export interface GDPRExportOptions {
    format?: 'json' | 'csv' | 'both';
    includeMetadata?: boolean;
}

export interface GDPRDeleteOptions {
    anonymize?: boolean; // If true, anonymizes instead of hard delete
    keepAuditTrail?: boolean;
}

export class GDPRAutomation {
    /**
     * Export all user data (GDPR Article 20 - Right to data portability)
     */
    async exportUserData(
        userId: string,
        options: GDPRExportOptions = {}
    ): Promise<string> {
        const { format = 'json', includeMetadata = true } = options;
        const supabase = createClient();

        // Create GDPR request record
        const { data: gdprRequest } = await supabase
            .from('gdpr_requests')
            .insert({
                user_id: userId,
                request_type: 'export',
                status: 'processing',
            })
            .select()
            .single();

        try {
            // Gather all user data from various tables
            const [profile, apartments, messages, favorites, reviews, consents, auditLogs] =
                await Promise.all([
                    supabase.from('profiles').select('*').eq('id', userId).single(),
                    supabase.from('apartments').select('*').eq('owner_id', userId),
                    supabase.from('messages').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
                    supabase.from('favorites').select('*').eq('user_id', userId),
                    supabase.from('reviews').select('*').eq('user_id', userId),
                    supabase.from('user_consents').select('*').eq('user_id', userId),
                    supabase.from('audit_logs').select('*').eq('user_id', userId).limit(1000),
                ]);

            const exportData = {
                export_metadata: includeMetadata ? {
                    user_id: userId,
                    export_date: new Date().toISOString(),
                    format,
                    version: '1.0',
                    regulation: 'GDPR Article 20',
                } : undefined,
                personal_data: {
                    profile: profile.data,
                    apartments: apartments.data,
                    messages: messages.data,
                    favorites: favorites.data,
                    reviews: reviews.data,
                    consents: consents.data,
                },
                activity_logs: auditLogs.data,
            };

            // Create export directory
            const exportDir = path.join(process.cwd(), 'tmp', 'gdpr-exports');
            await mkdir(exportDir, { recursive: true });

            const timestamp = Date.now();
            const filePath = path.join(exportDir, `gdpr-export-${userId}-${timestamp}.zip`);

            // Create ZIP archive
            const output = createWriteStream(filePath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            archive.pipe(output);

            // Add JSON export
            archive.append(JSON.stringify(exportData, null, 2), {
                name: 'user-data.json'
            });

            // Add CSV exports if requested
            if (format === 'csv' || format === 'both') {
                archive.append(this.jsonToCSV(apartments.data || []), {
                    name: 'apartments.csv'
                });
                archive.append(this.jsonToCSV(messages.data || []), {
                    name: 'messages.csv'
                });
            }

            // Add README
            archive.append(this.generateReadme(userId), { name: 'README.txt' });

            await archive.finalize();

            // Update GDPR request with file path
            await supabase
                .from('gdpr_requests')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    file_path: filePath,
                    download_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                })
                .eq('id', gdprRequest!.id);

            return filePath;
        } catch (error) {
            // Mark request as failed
            await supabase
                .from('gdpr_requests')
                .update({
                    status: 'failed',
                    error_message: error instanceof Error ? error.message : 'Unknown error',
                })
                .eq('id', gdprRequest!.id);

            throw error;
        }
    }

    /**
     * Delete or anonymize user data (GDPR Article 17 - Right to erasure)
     */
    async deleteUserData(
        userId: string,
        options: GDPRDeleteOptions = {}
    ): Promise<void> {
        const { anonymize = true, keepAuditTrail = true } = options;
        const supabase = createClient();

        // Create GDPR request
        const { data: gdprRequest } = await supabase
            .from('gdpr_requests')
            .insert({
                user_id: userId,
                request_type: anonymize ? 'anonymize' : 'delete',
                status: 'processing',
            })
            .select()
            .single();

        try {
            if (anonymize) {
                // Call database function for anonymization
                await supabase.rpc('anonymize_user', { p_user_id: userId });
            } else {
                // Hard delete (cascades configured in DB)
                await supabase.from('profiles').delete().eq('id', userId);
            }

            // Mark request as completed
            await supabase
                .from('gdpr_requests')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                })
                .eq('id', gdprRequest!.id);
        } catch (error) {
            await supabase
                .from('gdpr_requests')
                .update({
                    status: 'failed',
                    error_message: error instanceof Error ? error.message : 'Unknown error',
                })
                .eq('id', gdprRequest!.id);

            throw error;
        }
    }

    /**
     * Record user consent (GDPR Article 6)
     */
    async recordConsent(
        userId: string,
        purposes: string[],
        metadata?: {
            ip_address?: string;
            user_agent?: string;
            version?: string;
        }
    ): Promise<void> {
        const supabase = createClient();

        await supabase.from('user_consents').insert({
            user_id: userId,
            purposes,
            consent_given_at: new Date().toISOString(),
            ip_address: metadata?.ip_address,
            user_agent: metadata?.user_agent,
            version: metadata?.version || '1.0',
        });
    }

    /**
     * Withdraw user consent
     */
    async withdrawConsent(userId: string, purposes: string[]): Promise<void> {
        const supabase = createClient();

        // Mark existing consents as withdrawn
        await supabase
            .from('user_consents')
            .update({
                consent_withdrawn_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .contains('purposes', purposes)
            .is('consent_withdrawn_at', null);
    }

    /**
     * Check if user has given consent for specific purposes
     */
    async hasConsent(userId: string, purposes: string[]): Promise<boolean> {
        const supabase = createClient();

        const { data } = await supabase
            .from('user_consents')
            .select('*')
            .eq('user_id', userId)
            .contains('purposes', purposes)
            .is('consent_withdrawn_at', null);

        return (data?.length || 0) > 0;
    }

    /**
     * Get all GDPR requests for a user
     */
    async getGDPRRequests(userId: string) {
        const supabase = createClient();

        const { data } = await supabase
            .from('gdpr_requests')
            .select('*')
            .eq('user_id', userId)
            .order('requested_at', { ascending: false });

        return data || [];
    }

    // Helper methods

    private jsonToCSV(data: any[]): string {
        if (!data || data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const rows = data.map(row =>
            headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',')
                    ? `"${value}"`
                    : value;
            }).join(',')
        );

        return [headers.join(','), ...rows].join('\n');
    }

    private generateReadme(userId: string): string {
        return `
GDPR Data Export
================

User ID: ${userId}
Export Date: ${new Date().toISOString()}
Regulation: GDPR Article 20 (Right to data portability)

This archive contains all personal data we hold about you, including:

- Profile information
- Apartments you've listed or favorited
- Messages you've sent and received
- Reviews you've written
- Consent records
- Activity logs (last 1000 entries)

File Formats:
-------------
- user-data.json: Complete data export in JSON format
- *.csv: Individual data categories in CSV format (if requested)

Data Retention:
--------------
This export file will be available for download for 30 days from the export date.
After that, it will be automatically deleted from our servers.

Questions?
----------
If you have questions about this data export or your privacy rights, 
please contact privacy@studentapartments.com

Generated by GDPR Automation Toolkit v1.0
    `.trim();
    }
}

// Export singleton instance
export const gdprAutomation = new GDPRAutomation();
