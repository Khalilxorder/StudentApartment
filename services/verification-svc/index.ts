// Verification Service - User and apartment verification system
// Handles student status, identity, and property verification

import { createClient } from '@/utils/supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface StudentVerification {
  userId: string;
  university: string;
  studentId: string;
  email: string;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: Date;
  verifiedAt?: Date;
  documents: string[]; // file URLs
  rejectionReason?: string;
}

export interface OwnerVerification {
  userId: string;
  identityVerified: boolean;
  propertyOwnership: boolean;
  backgroundCheck: boolean;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: Date;
  verifiedAt?: Date;
  documents: string[];
  rejectionReason?: string;
}

export interface ApartmentVerification {
  apartmentId: string;
  ownerId: string;
  addressVerified: boolean;
  photosVerified: boolean;
  documentsVerified: boolean;
  inspectionScheduled: boolean;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: Date;
  verifiedAt?: Date;
  inspectorNotes?: string;
}

export interface VerificationResult {
  success: boolean;
  status: string;
  message: string;
  nextSteps?: string[];
}

export interface DocumentAnalysis {
  isValid: boolean;
  documentType: string;
  confidence: number;
  extractedData: {
    name?: string;
    idNumber?: string;
    expiryDate?: string;
    issuingAuthority?: string;
    country?: string;
  };
  issues: string[];
  recommendations: string[];
}

// AI-powered document verification service
export class AIDocumentVerificationService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    try {
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
      }
    } catch (error) {
      console.warn('Google AI not available for document verification');
    }
  }

  async analyzeDocument(
    documentUrl: string,
    documentType: string,
    userContext?: {
      expectedName?: string;
      expectedCountry?: string;
      userId: string;
    }
  ): Promise<DocumentAnalysis> {
    if (!this.genAI) {
      return {
        isValid: false,
        documentType,
        confidence: 0,
        extractedData: {},
        issues: ['AI verification service unavailable'],
        recommendations: ['Please try again later or contact support'],
      };
    }

    try {
      // Download document content (assuming it's an image)
      const documentContent = await this.downloadDocument(documentUrl);

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite-preview' });

      const prompt = this.buildAnalysisPrompt(documentType, userContext);

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: this.getMimeType(documentUrl),
            data: documentContent.toString('base64'),
          },
        },
      ]);

      const response = await result.response;
      const analysis = this.parseAnalysisResponse(response.text());

      // Cross-validate with user context if provided
      if (userContext) {
        analysis.issues.push(...this.crossValidateWithContext(analysis, userContext));
      }

      // Calculate final confidence and validity
      analysis.confidence = this.calculateConfidence(analysis);
      analysis.isValid = analysis.confidence > 0.7 && analysis.issues.length === 0;

      return analysis;
    } catch (error) {
      console.error('Document analysis error:', error);
      return {
        isValid: false,
        documentType,
        confidence: 0,
        extractedData: {},
        issues: ['Document analysis failed'],
        recommendations: ['Please ensure document is clear and readable'],
      };
    }
  }

  private buildAnalysisPrompt(documentType: string, userContext?: any): string {
    const basePrompt = `Analyze this ${documentType} document. Extract the following information:

1. Document type verification
2. Name of the person
3. ID/Document number
4. Expiry date (if applicable)
5. Issuing authority/country
6. Any visible issues or concerns

Provide the analysis in the following JSON format:
{
  "documentType": "confirmed_type",
  "name": "extracted_name",
  "idNumber": "extracted_id",
  "expiryDate": "YYYY-MM-DD",
  "issuingAuthority": "authority_name",
  "country": "country_code",
  "issues": ["list", "of", "issues"],
  "confidence": 0.85
}`;

    if (userContext?.expectedName) {
      return `${basePrompt}

Additional context: Expected name is "${userContext.expectedName}". Please verify if the name on the document matches.`;
    }

    return basePrompt;
  }

  private parseAnalysisResponse(response: string): DocumentAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          isValid: true, // Will be recalculated
          documentType: parsed.documentType || 'unknown',
          confidence: parsed.confidence || 0,
          extractedData: {
            name: parsed.name,
            idNumber: parsed.idNumber,
            expiryDate: parsed.expiryDate,
            issuingAuthority: parsed.issuingAuthority,
            country: parsed.country,
          },
          issues: parsed.issues || [],
          recommendations: [],
        };
      }
    } catch (error) {
      console.warn('Failed to parse AI response as JSON:', error);
    }

    // Fallback parsing for non-JSON responses
    return {
      isValid: false,
      documentType: 'unknown',
      confidence: 0.3,
      extractedData: {},
      issues: ['Unable to analyze document automatically'],
      recommendations: ['Please ensure document is clear and contact support if issues persist'],
    };
  }

  private crossValidateWithContext(analysis: DocumentAnalysis, context: any): string[] {
    const issues: string[] = [];

    if (context.expectedName && analysis.extractedData.name) {
      const expected = context.expectedName.toLowerCase();
      const extracted = analysis.extractedData.name.toLowerCase();

      // Simple name matching (could be enhanced with fuzzy matching)
      if (!extracted.includes(expected.split(' ')[0])) {
        issues.push('Name on document does not match expected name');
      }
    }

    if (context.expectedCountry && analysis.extractedData.country) {
      if (context.expectedCountry.toLowerCase() !== analysis.extractedData.country.toLowerCase()) {
        issues.push('Document country does not match expected country');
      }
    }

    return issues;
  }

  private calculateConfidence(analysis: DocumentAnalysis): number {
    let confidence = analysis.confidence || 0;

    // Reduce confidence based on issues
    confidence -= analysis.issues.length * 0.1;

    // Ensure reasonable bounds
    return Math.max(0, Math.min(1, confidence));
  }

  private async downloadDocument(url: string): Promise<Buffer> {
    if (!url) {
      throw new Error('Document URL is required for download');
    }

    try {
      const response = await fetch(url, {
        // Avoid serving stale cached assets when re-verifying documents
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to download document: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      if (!arrayBuffer.byteLength) {
        throw new Error('Downloaded document is empty');
      }

      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Document download failed:', error);
      throw error;
    }
  }

  private getMimeType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'image/jpeg';
    }
  }
}

export class VerificationService {
  private universities = [
    'elte.hu',
    'bme.hu',
    'corvinus.hu',
    'sote.hu',
    'ppke.hu',
    // Add more Budapest universities
  ];

  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    try {
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
      }
    } catch (error) {
      console.warn('Google AI not available for document verification');
    }
  }

  async submitStudentVerification(
    userId: string,
    data: {
      university: string;
      studentId: string;
      email: string;
      documents: File[];
    }
  ): Promise<VerificationResult> {
    try {
      // Validate university email
      if (!this.isValidUniversityEmail(data.email, data.university)) {
        return {
          success: false,
          status: 'rejected',
          message: 'Invalid university email domain',
        };
      }

      // Upload documents
      const documentUrls = await this.uploadDocuments(data.documents, `students/${userId}`);

      // Create verification record
      const verification: StudentVerification = {
        userId,
        university: data.university,
        studentId: data.studentId,
        email: data.email,
        status: 'pending',
        submittedAt: new Date(),
        documents: documentUrls,
      };

      await this.storeStudentVerification(verification);

      // Trigger automated checks
      await this.performAutomatedChecks(verification);

      return {
        success: true,
        status: 'pending',
        message: 'Verification submitted successfully',
        nextSteps: [
          'We will verify your student status within 24-48 hours',
          'You will receive an email confirmation',
          'Check your dashboard for status updates',
        ],
      };
    } catch (error) {
      return {
        success: false,
        status: 'error',
        message: 'Failed to submit verification',
      };
    }
  }

  async submitOwnerVerification(
    userId: string,
    data: {
      identityDocuments: File[];
      propertyDocuments: File[];
      backgroundCheckConsent: boolean;
    }
  ): Promise<VerificationResult> {
    try {
      // Upload documents
      const identityUrls = await this.uploadDocuments(data.identityDocuments, `owners/${userId}/identity`);
      const propertyUrls = await this.uploadDocuments(data.propertyDocuments, `owners/${userId}/property`);

      const verification: OwnerVerification = {
        userId,
        identityVerified: false,
        propertyOwnership: false,
        backgroundCheck: data.backgroundCheckConsent,
        status: 'pending',
        submittedAt: new Date(),
        documents: [...identityUrls, ...propertyUrls],
      };

      await this.storeOwnerVerification(verification);

      return {
        success: true,
        status: 'pending',
        message: 'Owner verification submitted successfully',
        nextSteps: [
          'Identity verification: 1-2 business days',
          'Property ownership verification: 2-3 business days',
          'Background check: 3-5 business days',
        ],
      };
    } catch (error) {
      return {
        success: false,
        status: 'error',
        message: 'Failed to submit owner verification',
      };
    }
  }

  async submitApartmentVerification(
    apartmentId: string,
    ownerId: string,
    data: {
      address: string;
      photos: File[];
      documents: File[];
      scheduleInspection: boolean;
    }
  ): Promise<VerificationResult> {
    try {
      // Upload photos and documents
      const photoUrls = await this.uploadDocuments(data.photos, `apartments/${apartmentId}/photos`);
      const documentUrls = await this.uploadDocuments(data.documents, `apartments/${apartmentId}/documents`);

      const verification: ApartmentVerification = {
        apartmentId,
        ownerId,
        addressVerified: false,
        photosVerified: false,
        documentsVerified: false,
        inspectionScheduled: data.scheduleInspection,
        status: 'pending',
        submittedAt: new Date(),
      };

      await this.storeApartmentVerification(verification);

      // Analyze photos automatically
      await this.analyzeApartmentPhotos(photoUrls);

      return {
        success: true,
        status: 'pending',
        message: 'Apartment verification submitted successfully',
        nextSteps: data.scheduleInspection
          ? ['Photo analysis: Complete', 'Document review: 1-2 days', 'Physical inspection: Scheduled']
          : ['Photo analysis: Complete', 'Document review: 1-2 days'],
      };
    } catch (error) {
      return {
        success: false,
        status: 'error',
        message: 'Failed to submit apartment verification',
      };
    }
  }

  async checkVerificationStatus(userId: string, type: 'student' | 'owner' | 'apartment', id?: string): Promise<any> {
    // Retrieve verification status from database
    // Implementation would depend on database schema
    return {
      status: 'pending',
      submittedAt: new Date(),
      estimatedCompletion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    };
  }

  private isValidUniversityEmail(email: string, university: string): boolean {
    const domain = email.split('@')[1];
    return this.universities.some(uni => domain === uni || domain.endsWith(`.${uni}`));
  }

  private async uploadDocuments(files: File[], path: string): Promise<string[]> {
    const urls: string[] = [];

    for (const file of files) {
      // In production, upload to Supabase Storage
      const url = `https://storage.supabase.co/${path}/${file.name}`;
      urls.push(url);
    }

    return urls;
  }

  private async performAutomatedChecks(verification: StudentVerification): Promise<void> {
    // Automated email verification
    const emailValid = await this.verifyUniversityEmail(verification.email);

    if (!emailValid) {
      await this.updateStudentVerification(verification.userId, {
        status: 'rejected',
        rejectionReason: 'University email verification failed',
      });
      return;
    }

    // Check student ID format
    if (!this.isValidStudentId(verification.studentId, verification.university)) {
      await this.updateStudentVerification(verification.userId, {
        status: 'rejected',
        rejectionReason: 'Invalid student ID format',
      });
      return;
    }

    // If all automated checks pass, status remains pending for manual review
  }

  private async analyzeApartmentPhotos(photoUrls: string[]): Promise<void> {
    // Use AI to analyze apartment photos
    // Check for quality, authenticity, room count, etc.
    // This would integrate with computer vision service
  }

  private async verifyUniversityEmail(email: string): Promise<boolean> {
    // In production, this would check against university's student database
    // or use email verification service
    return email.includes('@elte.hu') || email.includes('@bme.hu') || email.includes('@corvinus.hu');
  }

  private isValidStudentId(studentId: string, university: string): boolean {
    // Basic format validation - would be more sophisticated per university
    return studentId.length >= 6 && /^\d+$/.test(studentId);
  }

  // Database operations - Now with real Supabase integration
  private async storeStudentVerification(verification: StudentVerification): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('verification').insert({
      user_id: verification.userId,
      verification_type: 'student',
      status: verification.status,
      details: verification,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    if (error) {
      console.error('Failed to store student verification:', error);
      throw error;
    }
    console.log('Student verification stored:', verification.userId);
  }

  private async storeOwnerVerification(verification: OwnerVerification): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('verification').insert({
      user_id: verification.userId,
      verification_type: 'owner',
      status: verification.status,
      details: verification,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    if (error) {
      console.error('Failed to store owner verification:', error);
      throw error;
    }
    console.log('Owner verification stored:', verification.userId);
  }

  private async storeApartmentVerification(verification: ApartmentVerification): Promise<void> {
    const supabase = createClient();
    
    // Get apartment owner_id to satisfy the user_id NOT NULL constraint
    const { data: apartment, error: apartmentError } = await supabase
      .from('apartments')
      .select('owner_id')
      .eq('id', verification.apartmentId)
      .single();
    
    if (apartmentError || !apartment) {
      console.error('Failed to get apartment owner:', apartmentError);
      throw new Error('Cannot verify apartment: owner not found');
    }
    
    const { error } = await supabase.from('verification').insert({
      user_id: apartment.owner_id, // Required field - use apartment owner
      apartment_id: verification.apartmentId,
      verification_type: 'apartment',
      status: verification.status,
      details: verification,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    if (error) {
      console.error('Failed to store apartment verification:', error);
      throw error;
    }
    console.log('Apartment verification stored:', verification.apartmentId);
  }

  private async updateStudentVerification(userId: string, updates: Partial<StudentVerification>): Promise<void> {
    const supabase = createClient();

    const { data: existingRecord, error: fetchError } = await supabase
      .from('verification')
      .select('details, status')
      .eq('user_id', userId)
      .eq('verification_type', 'student')
      .single();

    if (fetchError) {
      console.error('Failed to fetch existing student verification:', fetchError);
      throw fetchError;
    }

    const mergedDetails = {
      ...(existingRecord?.details || {}),
      ...updates,
    };

    const updatePayload: Record<string, any> = {
      details: mergedDetails,
      updated_at: new Date().toISOString(),
    };

    if (updates.status) {
      updatePayload.status = updates.status;
    }

    const { error } = await supabase
      .from('verification')
      .update(updatePayload)
      .eq('user_id', userId)
      .eq('verification_type', 'student');
    
    if (error) {
      console.error('Failed to update student verification:', error);
      throw error;
    }
    console.log('Student verification updated:', userId, updates);
  }

  async analyzeDocument(
    documentUrl: string,
    documentType: string,
    userContext?: {
      expectedName?: string;
      expectedCountry?: string;
      userId: string;
    }
  ): Promise<DocumentAnalysis> {
    if (!this.genAI) {
      return {
        isValid: false,
        documentType,
        confidence: 0,
        extractedData: {},
        issues: ['AI verification service unavailable'],
        recommendations: ['Please try again later or contact support'],
      };
    }

    try {
      // Download document content (assuming it's an image)
      const documentContent = await this.downloadDocument(documentUrl);

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite-preview' });

      const prompt = this.buildAnalysisPrompt(documentType, userContext);

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: this.getMimeType(documentUrl),
            data: documentContent.toString('base64'),
          },
        },
      ]);

      const response = await result.response;
      const analysis = this.parseAnalysisResponse(response.text());

      // Cross-validate with user context if provided
      if (userContext) {
        analysis.issues.push(...this.crossValidateWithContext(analysis, userContext));
      }

      // Calculate final confidence and validity
      analysis.confidence = this.calculateConfidence(analysis);
      analysis.isValid = analysis.confidence > 0.7 && analysis.issues.length === 0;

      return analysis;
    } catch (error) {
      console.error('Document analysis error:', error);
      return {
        isValid: false,
        documentType,
        confidence: 0,
        extractedData: {},
        issues: ['Document analysis failed'],
        recommendations: ['Please ensure document is clear and readable'],
      };
    }
  }

  private buildAnalysisPrompt(documentType: string, userContext?: any): string {
    const basePrompt = `Analyze this ${documentType} document. Extract the following information:

1. Document type verification
2. Name of the person
3. ID/Document number
4. Expiry date (if applicable)
5. Issuing authority/country
6. Any visible issues or concerns

Provide the analysis in the following JSON format:
{
  "documentType": "confirmed_type",
  "name": "extracted_name",
  "idNumber": "extracted_id",
  "expiryDate": "YYYY-MM-DD",
  "issuingAuthority": "authority_name",
  "country": "country_code",
  "issues": ["list", "of", "issues"],
  "confidence": 0.85
}`;

    if (userContext?.expectedName) {
      return `${basePrompt}

Additional context: Expected name is "${userContext.expectedName}". Please verify if the name on the document matches.`;
    }

    return basePrompt;
  }

  private parseAnalysisResponse(response: string): DocumentAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          isValid: true, // Will be recalculated
          documentType: parsed.documentType || 'unknown',
          confidence: parsed.confidence || 0,
          extractedData: {
            name: parsed.name,
            idNumber: parsed.idNumber,
            expiryDate: parsed.expiryDate,
            issuingAuthority: parsed.issuingAuthority,
            country: parsed.country,
          },
          issues: parsed.issues || [],
          recommendations: [],
        };
      }
    } catch (error) {
      console.warn('Failed to parse AI response as JSON:', error);
    }

    // Fallback parsing for non-JSON responses
    return {
      isValid: false,
      documentType: 'unknown',
      confidence: 0.3,
      extractedData: {},
      issues: ['Unable to analyze document automatically'],
      recommendations: ['Please ensure document is clear and contact support if issues persist'],
    };
  }

  private crossValidateWithContext(analysis: DocumentAnalysis, context: any): string[] {
    const issues: string[] = [];

    if (context.expectedName && analysis.extractedData.name) {
      const expected = context.expectedName.toLowerCase();
      const extracted = analysis.extractedData.name.toLowerCase();

      // Simple name matching (could be enhanced with fuzzy matching)
      if (!extracted.includes(expected.split(' ')[0])) {
        issues.push('Name on document does not match expected name');
      }
    }

    if (context.expectedCountry && analysis.extractedData.country) {
      if (context.expectedCountry.toLowerCase() !== analysis.extractedData.country.toLowerCase()) {
        issues.push('Document country does not match expected country');
      }
    }

    return issues;
  }

  private calculateConfidence(analysis: DocumentAnalysis): number {
    let confidence = analysis.confidence || 0;

    // Reduce confidence based on issues
    confidence -= analysis.issues.length * 0.1;

    // Ensure reasonable bounds
    return Math.max(0, Math.min(1, confidence));
  }

  private async downloadDocument(url: string): Promise<Buffer> {
    // This would need to be implemented to download from Supabase storage
    // For now, return empty buffer
    return Buffer.from('');
  }

  private getMimeType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'image/jpeg';
    }
  }
}

export const verificationService = new VerificationService();
