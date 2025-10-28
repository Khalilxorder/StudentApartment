'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

interface ReviewSubmissionFormProps {
  apartmentId: string;
  bookingId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ReviewData {
  overallRating: number;
  locationRating: number;
  amenitiesRating: number;
  landlordRating: number;
  valueRating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  moveInDate?: string;
  moveOutDate?: string;
  leaseDurationMonths?: number;
  rentAmount?: number;
  isAnonymous: boolean;
}

interface PhotoUpload {
  file: File;
  preview: string;
  caption?: string;
}

export default function ReviewSubmissionForm({
  apartmentId,
  bookingId,
  onSuccess,
  onCancel
}: ReviewSubmissionFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [reviewData, setReviewData] = useState<ReviewData>({
    overallRating: 0,
    locationRating: 0,
    amenitiesRating: 0,
    landlordRating: 0,
    valueRating: 0,
    title: '',
    content: '',
    pros: [],
    cons: [],
    isAnonymous: false
  });

  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [currentPro, setCurrentPro] = useState('');
  const [currentCon, setCurrentCon] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const ratingCategories = [
    { key: 'overallRating', label: 'Overall Rating', required: true },
    { key: 'locationRating', label: 'Location', required: false },
    { key: 'amenitiesRating', label: 'Amenities', required: false },
    { key: 'landlordRating', label: 'Landlord/Management', required: false },
    { key: 'valueRating', label: 'Value for Money', required: false }
  ];

  const handleRatingChange = (category: keyof ReviewData, rating: number) => {
    setReviewData(prev => ({ ...prev, [category]: rating }));
  };

  const handlePhotoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const maxPhotos = 10;
    const remainingSlots = maxPhotos - photos.length;

    if (files.length > remainingSlots) {
      toast({
        title: 'Too many photos',
        description: `You can only upload up to ${maxPhotos} photos. Please select ${remainingSlots} or fewer.`,
        variant: 'destructive'
      });
      return;
    }

    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: 'File too large',
          description: `${file.name} is too large. Maximum file size is 10MB.`,
          variant: 'destructive'
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not an image file.`,
          variant: 'destructive'
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        setPhotos(prev => [...prev, { file, preview }]);
      };
      reader.readAsDataURL(file);
    });
  }, [photos.length, toast]);

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const addPro = () => {
    if (currentPro.trim() && !reviewData.pros.includes(currentPro.trim())) {
      setReviewData(prev => ({
        ...prev,
        pros: [...prev.pros, currentPro.trim()]
      }));
      setCurrentPro('');
    }
  };

  const addCon = () => {
    if (currentCon.trim() && !reviewData.cons.includes(currentCon.trim())) {
      setReviewData(prev => ({
        ...prev,
        cons: [...prev.cons, currentCon.trim()]
      }));
      setCurrentCon('');
    }
  };

  const removePro = (index: number) => {
    setReviewData(prev => ({
      ...prev,
      pros: prev.pros.filter((_, i) => i !== index)
    }));
  };

  const removeCon = (index: number) => {
    setReviewData(prev => ({
      ...prev,
      cons: prev.cons.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (reviewData.overallRating === 0) {
      errors.push('Overall rating is required');
    }

    if (reviewData.title.length < 5) {
      errors.push('Title must be at least 5 characters');
    }

    if (reviewData.content.length < 10) {
      errors.push('Review content must be at least 10 characters');
    }

    if (reviewData.moveInDate && reviewData.moveOutDate) {
      if (new Date(reviewData.moveInDate) >= new Date(reviewData.moveOutDate)) {
        errors.push('Move-out date must be after move-in date');
      }
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        title: 'Validation Error',
        description: errors.join(', '),
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Upload photos first
      const uploadedPhotoUrls: string[] = [];
      if (photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          const formData = new FormData();
          formData.append('file', photos[i].file);
          formData.append('caption', photos[i].caption || '');

          const response = await fetch('/api/reviews/upload-photo', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error(`Failed to upload photo ${i + 1}`);
          }

          const { url } = await response.json();
          uploadedPhotoUrls.push(url);
          setUploadProgress(((i + 1) / photos.length) * 50); // 50% for photo uploads
        }
      }

      // Submit review
      const reviewPayload = {
        ...reviewData,
        apartmentId,
        bookingId,
        photos: uploadedPhotoUrls
      };

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewPayload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit review');
      }

      setUploadProgress(100);

      toast({
        title: 'Review Submitted!',
        description: 'Your review has been submitted and will be published after moderation.',
      });

      onSuccess?.();
      router.refresh();

    } catch (error) {
      console.error('Review submission error:', error);
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const StarRating = ({
    value,
    onChange,
    max = 5
  }: {
    value: number;
    onChange: (rating: number) => void;
    max?: number;
  }) => (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className="focus:outline-none"
        >
          <Star
            className={`w-6 h-6 ${
              i < value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 hover:text-yellow-400'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5" />
          Write a Review
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ratings Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Ratings</h3>
            {ratingCategories.map(({ key, label, required }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {label} {required && <span className="text-red-500">*</span>}
                </Label>
                <StarRating
                  value={reviewData[key as keyof ReviewData] as number}
                  onChange={(rating) => handleRatingChange(key as keyof ReviewData, rating)}
                />
              </div>
            ))}
          </div>

          {/* Review Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Review Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={reviewData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReviewData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Summarize your experience in a few words"
              maxLength={100}
              required
            />
            <div className="text-xs text-gray-500 text-right">
              {reviewData.title.length}/100 characters
            </div>
          </div>

          {/* Review Content */}
          <div className="space-y-2">
            <Label htmlFor="content">
              Your Review <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="content"
              value={reviewData.content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReviewData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Share your detailed experience living here..."
              rows={6}
              maxLength={2000}
              required
            />
            <div className="text-xs text-gray-500 text-right">
              {reviewData.content.length}/2000 characters
            </div>
          </div>

          {/* Pros and Cons */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Pros</Label>
              <div className="flex gap-2">
                <Input
                  value={currentPro}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPro(e.target.value)}
                  placeholder="What did you like?"
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.preventDefault(), addPro())}
                />
                <Button type="button" onClick={addPro} variant="outline" size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {reviewData.pros.map((pro, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {pro}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-red-500"
                      onClick={() => removePro(index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Cons</Label>
              <div className="flex gap-2">
                <Input
                  value={currentCon}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentCon(e.target.value)}
                  placeholder="What could be improved?"
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.preventDefault(), addCon())}
                />
                <Button type="button" onClick={addCon} variant="outline" size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {reviewData.cons.map((con, index) => (
                  <Badge key={index} variant="destructive" className="flex items-center gap-1">
                    {con}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-red-500"
                      onClick={() => removeCon(index)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Lease Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Lease Information (Optional)</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="moveInDate">Move-in Date</Label>
                <Input
                  id="moveInDate"
                  type="date"
                  value={reviewData.moveInDate || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReviewData(prev => ({ ...prev, moveInDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moveOutDate">Move-out Date</Label>
                <Input
                  id="moveOutDate"
                  type="date"
                  value={reviewData.moveOutDate || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReviewData(prev => ({ ...prev, moveOutDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leaseDuration">Lease Duration (months)</Label>
                <Input
                  id="leaseDuration"
                  type="number"
                  min="1"
                  max="120"
                  value={reviewData.leaseDurationMonths || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReviewData(prev => ({
                    ...prev,
                    leaseDurationMonths: parseInt(e.target.value) || undefined
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rentAmount">Monthly Rent ($)</Label>
                <Input
                  id="rentAmount"
                  type="number"
                  min="0"
                  value={reviewData.rentAmount || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReviewData(prev => ({
                    ...prev,
                    rentAmount: parseInt(e.target.value) || undefined
                  }))}
                />
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Photos (Optional)</h3>
              <span className="text-sm text-gray-500">{photos.length}/10 photos</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo.preview}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {photos.length < 10 && (
                <label className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                  <div className="text-center">
                    <Upload className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                    <span className="text-sm text-gray-500">Add Photo</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="anonymous"
              checked={reviewData.isAnonymous}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReviewData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
              className="rounded"
            />
            <Label htmlFor="anonymous" className="text-sm">
              Post this review anonymously
            </Label>
          </div>

          {/* Progress and Submit */}
          {isSubmitting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Submitting review...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your review will be moderated before being published. This helps maintain quality and authenticity.
            </AlertDescription>
          </Alert>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || reviewData.overallRating === 0}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}