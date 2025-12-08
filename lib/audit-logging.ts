/**
 * Comprehensive Audit Logging System
 * 
 * Provides complete audit trail for compliance (GDPR, SOC 2, etc.)
 * Tracks all data mutations with change tracking, user context, and metadata
 */

import { createClient } from '@/utils/supabaseClient';

export interface AuditLog {
    id?: string;
    timestamp?: Date;
    user_id: string;
    tenant_id?: string;
    action: string;
    resource_type: string;
    resource_id: string;
    changes?: Record<string, { old: any; new: any }>;
    ip_address?: string;
    user_agent?: string;
    status: 'success' | 'failure';
    error_message?: string;
    metadata?: Record<string, any>;
}

export type AuditAction =
    | 'apartment.create'
    | 'apartment.update'
    | 'apartment.delete'
    | 'user.create'
    | 'user.update'
    | 'user.delete'
    | 'user.login'
    | 'user.logout'
    | 'message.send'
    | 'payment.create'
    | 'payment.refund'
    | 'booking.create'
    | 'booking.cancel'
    | 'settings.update';

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
        const supabase = createClient();

        const { error } = await supabase
            .from('audit_logs')
            .insert({
                ...event,
                timestamp: new Date().toISOString(),
            });

        if (error) {
            console.error('Failed to log audit event:', error);
            // Send to backup logging system (Sentry)
            if (process.env.SENTRY_DSN) {
                const Sentry = await import('@sentry/nextjs');
                Sentry.captureException(error, {
                    tags: { type: 'audit_log_failure' },
                    extra: { event },
                });
            }
        }
    } catch (err) {
        console.error('Audit logging error:', err);
    }
}

/**
 * Compute changes between old and new data objects
 * Returns only the fields that changed with old and new values
 */
export function computeChanges<T extends Record<string, any>>(
    oldData: T | null,
    newData: T | null
): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    if (!oldData && !newData) return changes;

    // Handle creation (no old data)
    if (!oldData) {
        return { __created__: { old: null, new: newData } };
    }

    // Handle deletion (no new data)
    if (!newData) {
        return { __deleted__: { old: oldData, new: null } };
    }

    // Compute field-level changes
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
        // Skip internal fields
        if (key.startsWith('_') || key === 'created_at' || key === 'updated_at') {
            continue;
        }

        const oldValue = oldData[key];
        const newValue = newData[key];

        // Deep comparison for objects/arrays
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes[key] = { old: oldValue, new: newValue };
        }
    }

    return changes;
}

/**
 * Helper to track request metadata
 */
export function getRequestMetadata(request: Request): {
    ip_address: string;
    user_agent: string;
} {
    return {
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
    };
}

/**
 * Higher-order function to wrap API routes with automatic audit logging
 */
export function withAuditLog(
    action: AuditAction,
    resourceGetter: (req: Request, result: any) => { type: string; id: string }
) {
    return function <T extends (...args: any[]) => Promise<Response>>(
        handler: T
    ): T {
        return (async (...args: any[]) => {
            const request = args[0] as Request;
            const metadata = getRequestMetadata(request);

            try {
                const response = await handler(...args);

                // Extract result from response
                const clonedResponse = response.clone();
                const result = await clonedResponse.json();
                const resource = resourceGetter(request, result);

                // Get user context from session
                const session = await getSession(request);

                await logAuditEvent({
                    user_id: session?.user?.id || 'anonymous',
                    action,
                    resource_type: resource.type,
                    resource_id: resource.id,
                    status: response.ok ? 'success' : 'failure',
                    ...metadata,
                });

                return response;
            } catch (error) {
                // Log failure
                await logAuditEvent({
                    user_id: 'anonymous',
                    action,
                    resource_type: 'unknown',
                    resource_id: 'unknown',
                    status: 'failure',
                    error_message: error instanceof Error ? error.message : 'Unknown error',
                    ...metadata,
                });

                throw error;
            }
        }) as T;
    };
}

/**
 * Get session from request (helper)
 */
async function getSession(request: Request) {
    try {
        const { createServerClient } = await import('@supabase/ssr');
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        const cookies = request.headers.get('cookie');
                        if (!cookies) return undefined;
                        const match = cookies.match(new RegExp(`(^| )${name}=([^;]+)`));
                        return match?.[2];
                    },
                    set() { },
                    remove() { },
                },
            }
        );

        const { data: { session } } = await supabase.auth.getSession();
        return session;
    } catch {
        return null;
    }
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(filters: {
    userId?: string;
    tenantId?: string;
    resourceType?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}) {
    const supabase = createClient();

    let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false });

    if (filters.userId) {
        query = query.eq('user_id', filters.userId);
    }

    if (filters.tenantId) {
        query = query.eq('tenant_id', filters.tenantId);
    }

    if (filters.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
    }

    if (filters.action) {
        query = query.eq('action', filters.action);
    }

    if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
    }

    if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
    }

    if (filters.limit) {
        query = query.limit(filters.limit);
    }

    if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    return await query;
}
