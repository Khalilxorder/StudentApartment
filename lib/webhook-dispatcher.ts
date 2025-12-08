/**
 * Webhook Dispatcher System
 * 
 * Sends events to registered webhook endpoints with:
 * - Signature verification
 * - Automatic retries with exponential backoff
 * - Delivery tracking
 */

import { createClient } from '@/utils/supabaseClient';
import crypto from 'crypto';

export interface WebhookEvent {
    event: string;
    data: any;
    timestamp: string;
    id?: string;
}

export interface WebhookEndpoint {
    id: string;
    tenant_id: string;
    url: string;
    events: string[];
    secret: string;
    enabled: boolean;
    headers?: Record<string, string>;
    retry_config?: {
        max_attempts: number;
        backoff: 'linear' | 'exponential';
    };
}

export class WebhookDispatcher {
    /**
     * Dispatch event to all registered webhooks
     */
    async dispatch(tenantId: string, event: WebhookEvent): Promise<void> {
        const supabase = createClient();

        // Get all webhook endpoints subscribed to this event
        const { data: webhooks } = await supabase
            .from('webhook_endpoints')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('enabled', true)
            .contains('events', [event.event]);

        if (!webhooks || webhooks.length === 0) {
            return;
        }

        // Dispatch to all endpoints in parallel
        await Promise.allSettled(
            webhooks.map((webhook: any) => this.sendWebhook(webhook, event))
        );
    }

    /**
     * Send webhook to a single endpoint with retry logic
     */
    private async sendWebhook(
        webhook: WebhookEndpoint,
        event: WebhookEvent,
        attempt: number = 1
    ): Promise<void> {
        const supabase = createClient();
        const maxAttempts = webhook.retry_config?.max_attempts || 3;

        // Generate signature for verification
        const signature = this.generateSignature(event, webhook.secret);

        // Create delivery record
        const { data: delivery } = await supabase
            .from('webhook_deliveries')
            .insert({
                webhook_id: webhook.id,
                event: event.event,
                payload: event.data,
                attempt,
                status: 'pending',
            })
            .select()
            .single();

        try {
            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature,
                    'X-Webhook-Event': event.event,
                    'X-Webhook-ID': delivery!.id,
                    'X-Webhook-Attempt': attempt.toString(),
                    ...webhook.headers,
                },
                body: JSON.stringify(event),
                signal: AbortSignal.timeout(10000), // 10 second timeout
            });

            const responseBody = await response.text();

            // Update delivery record
            await supabase
                .from('webhook_deliveries')
                .update({
                    status: response.ok ? 'success' : 'failed',
                    response_code: response.status,
                    response_body: responseBody.slice(0, 1000), // Limit size
                    delivered_at: new Date().toISOString(),
                })
                .eq('id', delivery!.id);

            // Retry if failed and haven't exceeded max attempts
            if (!response.ok && attempt < maxAttempts) {
                const delay = this.getRetryDelay(attempt, webhook.retry_config?.backoff || 'exponential');
                setTimeout(() => {
                    this.sendWebhook(webhook, event, attempt + 1);
                }, delay);
            }
        } catch (error) {
            // Update delivery record with error
            await supabase
                .from('webhook_deliveries')
                .update({
                    status: 'failed',
                    error_message: error instanceof Error ? error.message : 'Unknown error',
                    delivered_at: new Date().toISOString(),
                })
                .eq('id', delivery!.id);

            // Retry on network errors
            if (attempt < maxAttempts) {
                const delay = this.getRetryDelay(attempt, webhook.retry_config?.backoff || 'exponential');
                setTimeout(() => {
                    this.sendWebhook(webhook, event, attempt + 1);
                }, delay);
            }
        }
    }

    /**
     * Generate HMAC signature for webhook verification
     */
    private generateSignature(event: WebhookEvent, secret: string): string {
        const payload = JSON.stringify(event);
        return crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
    }

    /**
     * Calculate retry delay with backoff
     */
    private getRetryDelay(attempt: number, strategy: 'linear' | 'exponential'): number {
        if (strategy === 'exponential') {
            return Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30 seconds
        } else {
            return 1000 * attempt; // Linear: 1s, 2s, 3s...
        }
    }

    /**
     * Verify webhook signature (for incoming webhooks from external services)
     */
    verifySignature(payload: string, signature: string, secret: string): boolean {
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        // Constant-time comparison to prevent timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }
}

// Export singleton
export const webhookDispatcher = new WebhookDispatcher();

// Helper function for easy event dispatching
export async function sendWebhookEvent(
    tenantId: string,
    eventName: string,
    data: any
): Promise<void> {
    const event: WebhookEvent = {
        event: eventName,
        data,
        timestamp: new Date().toISOString(),
        id: crypto.randomUUID(),
    };

    await webhookDispatcher.dispatch(tenantId, event);
}
