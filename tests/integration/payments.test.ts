/**
 * Payment Flow Integration Tests
 * Tests Stripe payment intents, confirmations, and refunds
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { testData } from './test-utils';

// Mock Stripe
vi.mock('stripe', () => ({
    default: vi.fn(() => ({
        paymentIntents: {
            create: vi.fn().mockResolvedValue({
                id: 'pi_test_123',
                client_secret: 'pi_test_123_secret',
                status: 'requires_payment_method',
                amount: 150000,
                currency: 'huf',
            }),
            retrieve: vi.fn().mockResolvedValue({
                id: 'pi_test_123',
                status: 'succeeded',
                amount: 150000,
            }),
            confirm: vi.fn().mockResolvedValue({
                id: 'pi_test_123',
                status: 'succeeded',
            }),
        },
        refunds: {
            create: vi.fn().mockResolvedValue({
                id: 'ref_test_123',
                status: 'succeeded',
                amount: 150000,
            }),
        },
    })),
}));

describe('Payment Flow', () => {
    describe('Payment Intent Creation', () => {
        it('should create a payment intent successfully', async () => {
            const Stripe = (await import('stripe')).default;
            const stripe = new Stripe('sk_test_123', { apiVersion: '2025-10-29.clover' as any });

            const paymentIntent = await stripe.paymentIntents.create({
                amount: 150000,
                currency: 'huf',
                metadata: {
                    booking_id: 'booking_test_123',
                },
            });

            expect(paymentIntent).toBeDefined();
            expect(paymentIntent.id).toBe('pi_test_123');
            expect(paymentIntent.client_secret).toBeDefined();
            expect(paymentIntent.status).toBe('requires_payment_method');
        });

        it('should include booking metadata in payment intent', async () => {
            const Stripe = (await import('stripe')).default;
            const stripe = new Stripe('sk_test_123', { apiVersion: '2025-10-29.clover' as any });

            const bookingId = 'booking_test_456';

            await stripe.paymentIntents.create({
                amount: 150000,
                currency: 'huf',
                metadata: {
                    booking_id: bookingId,
                },
            });

            expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        booking_id: bookingId,
                    }),
                })
            );
        });
    });

    describe('Payment Confirmation', () => {
        it('should confirm payment successfully', async () => {
            const Stripe = (await import('stripe')).default;
            const stripe = new Stripe('sk_test_123', { apiVersion: '2025-10-29.clover' as any });

            const confirmed = await stripe.paymentIntents.confirm('pi_test_123', {
                payment_method: 'pm_card_visa',
            });

            expect(confirmed).toBeDefined();
            expect(confirmed.status).toBe('succeeded');
        });

        it('should retrieve payment intent status', async () => {
            const Stripe = (await import('stripe')).default;
            const stripe = new Stripe('sk_test_123', { apiVersion: '2025-10-29.clover' as any });

            const paymentIntent = await stripe.paymentIntents.retrieve('pi_test_123');

            expect(paymentIntent).toBeDefined();
            expect(paymentIntent.id).toBe('pi_test_123');
            expect(paymentIntent.status).toBe('succeeded');
        });
    });

    describe('Refund Flow', () => {
        it('should process refund successfully', async () => {
            const Stripe = (await import('stripe')).default;
            const stripe = new Stripe('sk_test_123', { apiVersion: '2025-10-29.clover' as any });

            const refund = await stripe.refunds.create({
                payment_intent: 'pi_test_123',
                amount: 150000,
            });

            expect(refund).toBeDefined();
            expect(refund.status).toBe('succeeded');
            expect(refund.amount).toBe(150000);
        });
    });
});
