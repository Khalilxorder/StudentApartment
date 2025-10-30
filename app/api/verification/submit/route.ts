/**
 * POST /api/verification/submit
 * Submit verification documents for review
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      documentType,
      documentNumber,
      expiryDate,
      issuingCountry,
      documents,
    } = body;

    // Validate required fields
    if (!userId || !documentType || !documentNumber || !expiryDate || !issuingCountry) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate document type
    const validTypes = ['passport', 'id_card', 'drivers_license', 'student_card'];
    if (!validTypes.includes(documentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document type' },
        { status: 400 }
      );
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user already has a pending verification
    const { data: existingVerification } = await supabase
      .from('verifications')
      .select('id, status')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (existingVerification) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending verification' },
        { status: 400 }
      );
    }

    // Insert verification record
    const { data: verification, error } = await supabase
      .from('verifications')
      .insert({
        user_id: userId,
        document_type: documentType,
        document_number: documentNumber,
        expiry_date: expiryDate,
        issuing_country: issuingCountry,
        documents: documents,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Verification submission error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to submit verification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      verification,
    });
  } catch (error) {
    console.error('Verification submit error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}