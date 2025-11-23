import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken, storeCSRFToken } from '@/lib/security-middleware';

// Generate and store a CSRF token
export async function GET(req: NextRequest) {
  try {
    // Generate a CSRF token
    const csrfToken = generateCSRFToken();
    
    // Store it so the security middleware can validate it later
    await storeCSRFToken(csrfToken);
    
    return NextResponse.json({ 
      csrfToken,
      success: true 
    });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token', success: false },
      { status: 500 }
    );
  }
}
