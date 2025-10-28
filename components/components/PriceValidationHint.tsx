'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface PriceValidationHintProps {
  price: number | '';
  district: number | '';
}

interface PriceRange {
  min: number;
  max: number;
  median: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Inline price validation component
 * Shows hints like "rent looks high for District 6" using pricing intelligence
 * Integrates with existing pricing-svc
 */
export function PriceValidationHint({ price, district }: PriceValidationHintProps) {
  const [priceRange, setPriceRange] = useState<PriceRange | null>(null);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<{ type: 'warning' | 'info' | 'success'; message: string } | null>(null);

  useEffect(() => {
    if (price === '' || (typeof price === 'number' && !Number.isFinite(price)) ||
        district === '' || (typeof district === 'number' && !Number.isFinite(district))) {
      setHint(null);
      setPriceRange(null);
      return;
    }

    const fetchPriceRange = async () => {
      try {
        setLoading(true);

        // Fetch market pricing data for this district
        const response = await fetch(
          `/api/pricing/district?district=${district}&bedrooms=2`
        );

        if (!response.ok) {
          // Silently fail if API is not available
          setLoading(false);
          return;
        }

        const data = await response.json();
        const { min, max, median, trend } = data;

        setPriceRange({ min, max, median, trend: trend || 'stable' });

        // Generate hint based on comparison
        if (price > max * 1.2) {
          setHint({
            type: 'warning',
            message: `This rent is ${Math.round(((price - max) / max) * 100)}% above the market average for District ${district}. Consider lowering the price to attract more inquiries.`,
          });
        } else if (price > max) {
          setHint({
            type: 'warning',
            message: `This rent is above the typical range (${Math.round(max / 1000)}k-${Math.round(max / 1000)}k HUF) for District ${district}.`,
          });
        } else if (price < min * 0.8) {
          setHint({
            type: 'success',
            message: `Great price! This is ${Math.round(((min - price) / min) * 100)}% below market average for District ${district}.`,
          });
        } else if (price >= median * 0.95 && price <= median * 1.05) {
          setHint({
            type: 'info',
            message: `This price is right at the market median for District ${district} (${Math.round(median / 1000)}k HUF).`,
          });
        } else {
          setHint(null);
        }
      } catch (error) {
        console.error('Error fetching price data:', error);
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchPriceRange();
  }, [price, district]);

  if (!hint) {
    return null;
  }

  const Icon = hint.type === 'warning' ? AlertCircle : hint.type === 'info' ? TrendingUp : TrendingDown;
  const bgColor =
    hint.type === 'warning'
      ? 'bg-amber-50 border-amber-200'
      : hint.type === 'info'
        ? 'bg-blue-50 border-blue-200'
        : 'bg-green-50 border-green-200';
  const textColor =
    hint.type === 'warning'
      ? 'text-amber-700'
      : hint.type === 'info'
        ? 'text-blue-700'
        : 'text-green-700';
  const iconColor =
    hint.type === 'warning'
      ? 'text-amber-600'
      : hint.type === 'info'
        ? 'text-blue-600'
        : 'text-green-600';

  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border ${bgColor}`}>
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
      <div className="flex-1">
        <p className={`text-sm ${textColor}`}>{hint.message}</p>
        {priceRange && (
          <p className={`text-xs mt-1 ${textColor.replace('700', '600')}`}>
            Market range: {Math.round(priceRange.min / 1000)}k - {Math.round(priceRange.max / 1000)}k HUF
          </p>
        )}
      </div>
    </div>
  );
}
