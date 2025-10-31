// Payments Service for Student Apartments
// Handles Stripe Connect integration for apartment bookings and payments
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
  metadata: Record<string, any>;
}

export interface BookingRequest {
  apartmentId: string;
  tenantId: string;
  checkInDate: Date;
  checkOutDate: Date;
  guestCount: number;
  specialRequests?: string;
}

export interface Booking {
  id: string;
  apartmentId: string;
  tenantId: string;
  ownerId: string;
  checkInDate: Date;
  checkOutDate: Date;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentIntentId?: string;
  stripeAccountId?: string;
}

export class PaymentsService {
  private stripe: Stripe | null = null;
  private supabase: any = null;

  private getStripe(): Stripe {
    if (!this.stripe) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-09-30.clover',
      });
    }
    return this.stripe;
  }

  private getSupabase(): any {
    if (!this.supabase) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return this.supabase;
  }

  constructor() {
    // Lazy initialize - don't access process.env here
  }

  /**
   * Create a payment intent for booking
   */
  async createPaymentIntent(
    amount: number,
    currency: string = 'huf',
    metadata: Record<string, any> = {}
  ): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.getStripe().paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to smallest currency unit
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata,
      });

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret!,
        metadata: paymentIntent.metadata,
      };

    } catch (error) {
      console.error('Payment intent creation error:', error);
      throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a booking with payment processing
   */
  async createBooking(bookingRequest: BookingRequest): Promise<Booking> {
    try {
      const { apartmentId, tenantId, checkInDate, checkOutDate, guestCount } = bookingRequest;

      // Get apartment details
      const { data: apartment, error: aptError } = await this.getSupabase()
        .from('apartments')
        .select('*, profiles!owner_id(*)')
        .eq('id', apartmentId)
        .single();

      if (aptError || !apartment) {
        throw new Error('Apartment not found');
      }

      // Check availability
      const isAvailable = await this.checkAvailability(apartmentId, checkInDate, checkOutDate);
      if (!isAvailable) {
        throw new Error('Apartment not available for selected dates');
      }

      // Calculate total amount
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalAmount = apartment.monthly_rent_huf * (nights / 30); // Prorate monthly rent

      // Get owner's Stripe account
      const ownerStripeAccount = await this.getOrCreateStripeAccount(apartment.owner_id);

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(
        totalAmount,
        'huf',
        {
          apartmentId,
          tenantId,
          checkInDate: checkInDate.toISOString(),
          checkOutDate: checkOutDate.toISOString(),
          guestCount: guestCount.toString(),
        }
      );

      // Create booking record
      const { data: booking, error: bookingError } = await this.getSupabase()
        .from('bookings')
        .insert({
          apartment_id: apartmentId,
          tenant_id: tenantId,
          owner_id: apartment.owner_id,
          check_in_date: checkInDate.toISOString(),
          check_out_date: checkOutDate.toISOString(),
          guest_count: guestCount,
          total_amount: totalAmount,
          currency: 'huf',
          status: 'pending',
          payment_intent_id: paymentIntent.id,
          stripe_account_id: ownerStripeAccount.id,
          special_requests: bookingRequest.specialRequests,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      return {
        id: booking.id,
        apartmentId: booking.apartment_id,
        tenantId: booking.tenant_id,
        ownerId: booking.owner_id,
        checkInDate: new Date(booking.check_in_date),
        checkOutDate: new Date(booking.check_out_date),
        totalAmount: booking.total_amount,
        currency: booking.currency,
        status: booking.status,
        paymentIntentId: booking.payment_intent_id,
        stripeAccountId: booking.stripe_account_id,
      };

    } catch (error) {
      console.error('Booking creation error:', error);
      throw new Error(`Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check apartment availability for dates
   */
  private async checkAvailability(
    apartmentId: string,
    checkInDate: Date,
    checkOutDate: Date
  ): Promise<boolean> {
    try {
      const { data: conflictingBookings, error } = await this.getSupabase()
        .from('bookings')
        .select('id')
        .eq('apartment_id', apartmentId)
        .in('status', ['confirmed', 'pending'])
        .or(`and(check_in_date.lte.${checkOutDate.toISOString()},check_out_date.gte.${checkInDate.toISOString()})`);

      if (error) throw error;

      return !conflictingBookings || conflictingBookings.length === 0;

    } catch (error) {
      console.error('Availability check error:', error);
      return false;
    }
  }

  /**
   * Get or create Stripe Connect account for user
   */
  async getOrCreateStripeAccount(userId: string): Promise<any> {
    try {
      // Check if user already has a Stripe account
      const { data: existingAccount, error: accountError } = await this.getSupabase()
        .from('stripe_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!accountError && existingAccount) {
        return existingAccount;
      }

      // Create new Stripe Connect account
      const account = await this.getStripe().accounts.create({
        type: 'express',
        country: 'HU',
        email: await this.getUserEmail(userId),
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
      });

      // Store account in database
      const { data: savedAccount, error: saveError } = await this.getSupabase()
        .from('stripe_accounts')
        .insert({
          user_id: userId,
          stripe_account_id: account.id,
          status: 'pending',
        })
        .select()
        .single();

      if (saveError) throw saveError;

      return savedAccount;

    } catch (error) {
      console.error('Stripe account creation error:', error);
      throw new Error(`Failed to create Stripe account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user email for Stripe account
   */
  private async getUserEmail(userId: string): Promise<string> {
    const { data: profile, error } = await this.getSupabase()
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (error || !profile?.email) {
      throw new Error('User email not found');
    }

    return profile.email;
  }

  /**
   * Create account link for onboarding
   */
  async createAccountLink(accountId: string): Promise<string> {
    try {
      const accountLink = await this.getStripe().accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments/onboarding?failed=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments/onboarding?success=true`,
        type: 'account_onboarding',
      });

      return accountLink.url;

    } catch (error) {
      console.error('Account link creation error:', error);
      throw new Error(`Failed to create account link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Confirm payment and update booking status
   */
  async confirmPayment(paymentIntentId: string): Promise<void> {
    try {
      // Get payment intent from Stripe
      const paymentIntent = await this.getStripe().paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        // Update booking status
        const { error } = await this.getSupabase()
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('payment_intent_id', paymentIntentId);

        if (error) throw error;

        // Create transfer to host
        await this.createTransfer(paymentIntent);

      } else if (paymentIntent.status === 'canceled') {
        // Update booking status to cancelled
        const { error } = await this.getSupabase()
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('payment_intent_id', paymentIntentId);

        if (error) throw error;
      }

    } catch (error) {
      console.error('Payment confirmation error:', error);
      throw new Error(`Failed to confirm payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create transfer to host account
   */
  private async createTransfer(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      // Get booking details
      const { data: booking, error: bookingError } = await this.getSupabase()
        .from('bookings')
        .select('stripe_account_id, total_amount')
        .eq('payment_intent_id', paymentIntent.id)
        .single();

      if (bookingError || !booking) {
        throw new Error('Booking not found');
      }

      // Calculate platform fee (e.g., 3%)
      const platformFee = Math.round(booking.total_amount * 0.03 * 100); // Convert to cents
      const hostAmount = Math.round(booking.total_amount * 100) - platformFee;

      // Create transfer
      await this.getStripe().transfers.create({
        amount: hostAmount,
        currency: 'huf',
        destination: booking.stripe_account_id,
        // Note: In newer Stripe API versions, you might need to handle this differently
        // This assumes the payment intent has an associated charge
        transfer_group: paymentIntent.id,
      });

    } catch (error) {
      console.error('Transfer creation error:', error);
      // Don't throw here as the booking is already confirmed
    }
  }

  /**
   * Process refund
   */
  async processRefund(bookingId: string, amount?: number): Promise<void> {
    try {
      // Get booking details
      const { data: booking, error: bookingError } = await this.getSupabase()
        .from('bookings')
        .select('payment_intent_id, total_amount, status')
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        throw new Error('Booking not found');
      }

      if (booking.status !== 'confirmed') {
        throw new Error('Can only refund confirmed bookings');
      }

      // Create refund
      const refundAmount = amount ? Math.round(amount * 100) : undefined;

      await this.getStripe().refunds.create({
        payment_intent: booking.payment_intent_id,
        amount: refundAmount,
      });

      // Update booking status
      const { error: updateError } = await this.getSupabase()
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (updateError) throw updateError;

    } catch (error) {
      console.error('Refund processing error:', error);
      throw new Error(`Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get booking details
   */
  async getBooking(bookingId: string): Promise<Booking | null> {
    try {
      const { data: booking, error } = await this.getSupabase()
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error || !booking) return null;

      return {
        id: booking.id,
        apartmentId: booking.apartment_id,
        tenantId: booking.tenant_id,
        ownerId: booking.owner_id,
        checkInDate: new Date(booking.check_in_date),
        checkOutDate: new Date(booking.check_out_date),
        totalAmount: booking.total_amount,
        currency: booking.currency,
        status: booking.status,
        paymentIntentId: booking.payment_intent_id,
        stripeAccountId: booking.stripe_account_id,
      };

    } catch (error) {
      console.error('Get booking error:', error);
      return null;
    }
  }

  /**
   * Webhook handler for Stripe events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await this.confirmPayment(paymentIntent.id);
          break;

        case 'account.updated':
          const account = event.data.object as Stripe.Account;
          await this.updateAccountStatus(account);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

    } catch (error) {
      console.error('Webhook handling error:', error);
      throw error;
    }
  }

  /**
   * Update Stripe account status
   */
  private async updateAccountStatus(account: Stripe.Account): Promise<void> {
    try {
      const { error } = await this.getSupabase()
        .from('stripe_accounts')
        .update({
          status: account.charges_enabled ? 'active' : 'pending',
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
        })
        .eq('stripe_account_id', account.id);

      if (error) throw error;

    } catch (error) {
      console.error('Account status update error:', error);
    }
  }
}

// Export singleton instance
export const paymentsService = new PaymentsService();
