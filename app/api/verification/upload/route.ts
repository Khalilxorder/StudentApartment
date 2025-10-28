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

    // Perform AI-powered document analysis
    const aiAnalysis = await performAIDocumentAnalysis(publicUrl, documentType, user.id);

    // Update verification record with AI analysis results
    const { error: analysisUpdateError } = await supabase
      .from('user_verifications')
      .update({
        ai_analysis: aiAnalysis,
        status: aiAnalysis.isValid ? 'approved' : 'pending',
        reviewed_at: aiAnalysis.isValid ? new Date().toISOString() : undefined,
        review_notes: aiAnalysis.isValid ? 'Auto-approved by AI analysis' : aiAnalysis.issues.join('; '),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('document_url', publicUrl);

    if (analysisUpdateError) {
      console.error('AI analysis update error:', analysisUpdateError);
    }

    // Update user profile based on AI analysis
    if (aiAnalysis.isValid) {
      const { error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update({
          identity_verified: documentType === 'id_card' || documentType === 'passport',
          background_check_completed: documentType === 'background_check',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (profileUpdateError) {
        console.error('Profile update error:', profileUpdateError);
      }
    }

    const response = {
      success: true,
      message: aiAnalysis.isValid
        ? 'Document verified successfully using AI analysis.'
        : 'Document uploaded. Manual review may be required.',
      documentUrl: publicUrl,
      aiAnalysis: {
        isValid: aiAnalysis.isValid,
        confidence: aiAnalysis.confidence,
        issues: aiAnalysis.issues,
        recommendations: aiAnalysis.recommendations,
      }
    };

    return NextResponse.json(response);

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

// AI-powered document analysis function
async function performAIDocumentAnalysis(
  documentUrl: string,
  documentType: string,
  userId: string
) {
  // Dynamically import the AI service to avoid static build-time type/import issues
  const verificationModule = await import('@/services/verification-svc');
  const AIDocumentVerificationService = (verificationModule as any).AIDocumentVerificationService || (verificationModule as any).default;
  const aiService = new AIDocumentVerificationService();

  // Get user context for cross-validation
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('user_id', userId)
    .single();

  const userContext = profile ? {
    expectedName: `${profile.first_name} ${profile.last_name}`,
    userId,
  } : { userId };

  return await aiService.analyzeDocument(documentUrl, documentType, userContext);
}