import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const documentType = (formData as any).get('documentType') as string;
    const file = (formData as any).get('file') as File;

    if (!file || !documentType) {
      return NextResponse.json({ error: 'Missing file or document type' }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.' }, { status: 400 });
    }

    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    // Upload file to Supabase Storage
    const fileName = `verification/${user.id}/${documentType}_${Date.now()}.${file.name.split('.').pop()}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Save verification record
    const { error: insertError } = await supabase
      .from('user_verifications')
      .insert({
        user_id: user.id,
        document_type: documentType,
        document_url: publicUrl,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('documents').remove([fileName]);
      return NextResponse.json({ error: 'Failed to save verification record' }, { status: 500 });
    }

    // Update user profile verification status
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        identity_verified: documentType === 'id_card' || documentType === 'passport' ? true : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully. Verification will be reviewed within 24-48 hours.',
      documentUrl: publicUrl
    });

  } catch (error) {
    console.error('Verification upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's verification status
    const { data: verifications, error } = await supabase
      .from('user_verifications')
      .select('*')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json({ error: 'Failed to fetch verification status' }, { status: 500 });
    }

    // Get user profile verification status
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('identity_verified, background_check_completed, user_type')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      verifications: verifications || [],
      profile: profile || {},
      requirements: getVerificationRequirements(profile?.user_type)
    });

  } catch (error) {
    console.error('Verification status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getVerificationRequirements(userType?: string) {
  const baseRequirements = [
    {
      type: 'id_card',
      name: 'Government ID',
      description: 'National ID card, passport, or driver\'s license',
      required: true
    },
    {
      type: 'address_proof',
      name: 'Address Proof',
      description: 'Utility bill or bank statement showing your address',
      required: true
    }
  ];

  if (userType === 'student') {
    baseRequirements.push({
      type: 'student_id',
      name: 'Student ID',
      description: 'University student ID card',
      required: true
    });
  } else if (userType === 'owner') {
    baseRequirements.push({
      type: 'property_deed',
      name: 'Property Ownership',
      description: 'Property deed or rental agreement',
      required: true
    });
  }

  return baseRequirements;
}