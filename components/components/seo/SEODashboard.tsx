'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Search,
  Clock,
  Zap,
  Globe
} from 'lucide-react';

interface SEOMetric {
  name: string;
  value: number | string;
  status: 'good' | 'warning' | 'error';
  description: string;
  recommendation?: string;
}

interface SEOReport {
  overallScore: number;
  metrics: SEOMetric[];
  lastUpdated: string;
}

export default function SEODashboard() {
  const [report, setReport] = useState<SEOReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSEOReport();
  }, []);

  const fetchSEOReport = async () => {
    try {
      // In a real implementation, this would fetch from your SEO monitoring API
      const mockReport: SEOReport = {
        overallScore: 85,
        lastUpdated: new Date().toISOString(),
        metrics: [
          {
            name: 'Page Load Speed',
            value: '2.3s',
            status: 'good',
            description: 'Average page load time across all pages'
          },
          {
            name: 'Core Web Vitals',
            value: 'Good',
            status: 'good',
            description: 'LCP, FID, and CLS scores'
          },
          {
            name: 'SEO Score',
            value: 92,
            status: 'good',
            description: 'Overall SEO health score'
          },
          {
            name: 'Structured Data',
            value: 'Valid',
            status: 'good',
            description: 'JSON-LD structured data validation'
          },
          {
            name: 'Meta Descriptions',
            value: '95%',
            status: 'warning',
            description: 'Pages with optimized meta descriptions',
            recommendation: 'Add meta descriptions to 3 remaining pages'
          },
          {
            name: 'Image Alt Text',
            value: '88%',
            status: 'warning',
            description: 'Images with descriptive alt text',
            recommendation: 'Add alt text to apartment listing images'
          },
          {
            name: 'Mobile Optimization',
            value: 'Good',
            status: 'good',
            description: 'Mobile-friendly design and performance'
          },
          {
            name: 'Sitemap',
            value: 'Valid',
            status: 'good',
            description: 'XML sitemap generation and submission'
          }
        ]
      };

      setReport(mockReport);
    } catch (error) {
      console.error('Failed to fetch SEO report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Failed to load SEO report</p>
        <Button onClick={fetchSEOReport} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const goodMetrics = report.metrics.filter(m => m.status === 'good');
  const warningMetrics = report.metrics.filter(m => m.status === 'warning');
  const errorMetrics = report.metrics.filter(m => m.status === 'error');

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            SEO Performance Overview
          </CardTitle>
          <CardDescription>
            Last updated: {new Date(report.lastUpdated).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-blue-600">
              {report.overallScore}
            </div>
            <div className="flex-1">
              <Progress value={report.overallScore} className="h-3" />
              <p className="text-sm text-gray-600 mt-1">Overall SEO Score</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">{goodMetrics.length}</p>
                <p className="text-sm text-gray-600">Good</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">{warningMetrics.length}</p>
                <p className="text-sm text-gray-600">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{errorMetrics.length}</p>
                <p className="text-sm text-gray-600">Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Detailed Metrics</h3>
        {report.metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(metric.status)}
                  <div>
                    <h3 className="font-semibold">{metric.name}</h3>
                    <p className="text-sm text-gray-600">{metric.description}</p>
                    {metric.recommendation && (
                      <p className="text-sm text-blue-600 mt-1">
                        💡 {metric.recommendation}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={getStatusColor(metric.status)}>
                    {metric.value}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Run SEO checks and generate reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Run SEO Audit
            </Button>
            <Button variant="outline" size="sm">
              <Clock className="h-4 w-4 mr-2" />
              Performance Test
            </Button>
            <Button variant="outline" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              Lighthouse Report
            </Button>
            <Button variant="outline" size="sm">
              <Globe className="h-4 w-4 mr-2" />
              Check Sitemap
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}