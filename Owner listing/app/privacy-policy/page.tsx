import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Mail, Shield, Eye, Trash2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Student Apartments',
  description: 'Learn about how Student Apartments collects, uses, and protects your personal information.',
};

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-gray-600 text-lg">
          Last updated: {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      <div className="space-y-8">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              Student Apartments is committed to protecting your privacy and ensuring the security of your personal information.
              This privacy policy explains how we collect, use, and safeguard your data.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 border rounded-lg">
                <Eye className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <h3 className="font-semibold">Transparency</h3>
                <p className="text-sm text-gray-600">Clear information about data collection</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Shield className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <h3 className="font-semibold">Security</h3>
                <p className="text-sm text-gray-600">Industry-standard protection measures</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <Trash2 className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <h3 className="font-semibold">Your Rights</h3>
                <p className="text-sm text-gray-600">Control over your personal data</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Collection */}
        <Card>
          <CardHeader>
            <CardTitle>Information We Collect</CardTitle>
            <CardDescription>
              We collect information to provide and improve our services
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Personal Information</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Name, email address, and phone number</li>
                <li>Profile information and preferences</li>
                <li>Communication history and feedback</li>
                <li>Payment information (processed securely by third parties)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Usage Information</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>IP address and location data</li>
                <li>Browser type and device information</li>
                <li>Pages visited and time spent on site</li>
                <li>Search queries and interaction patterns</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Cookies and Tracking</h3>
              <p className="text-gray-700">
                We use cookies and similar technologies to enhance your experience.
                You can manage your cookie preferences through our cookie settings.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Usage */}
        <Card>
          <CardHeader>
            <CardTitle>How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Service Provision</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                  <li>Create and manage your account</li>
                  <li>Process apartment bookings</li>
                  <li>Provide customer support</li>
                  <li>Send service-related notifications</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Improvement & Analytics</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
                  <li>Analyze usage patterns</li>
                  <li>Improve website functionality</li>
                  <li>Develop new features</li>
                  <li>Monitor performance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Sharing */}
        <Card>
          <CardHeader>
            <CardTitle>Data Sharing and Third Parties</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              We do not sell your personal information to third parties. We may share data only in the following circumstances:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="secondary">Service Providers</Badge>
                <p className="text-sm text-gray-600">Payment processors, hosting providers, and analytics services under strict confidentiality agreements.</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary">Legal Requirements</Badge>
                <p className="text-sm text-gray-600">When required by law or to protect our rights and safety.</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary">Business Transfers</Badge>
                <p className="text-sm text-gray-600">In case of merger, acquisition, or sale of assets with proper notice.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card>
          <CardHeader>
            <CardTitle>Your Rights (GDPR)</CardTitle>
            <CardDescription>
              You have control over your personal data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Access & Portability</h3>
                <p className="text-sm text-gray-700">
                  Request a copy of your personal data in a portable format.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Rectification</h3>
                <p className="text-sm text-gray-700">
                  Correct inaccurate or incomplete personal information.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Erasure</h3>
                <p className="text-sm text-gray-700">
                  Request deletion of your personal data ("right to be forgotten").
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Restriction</h3>
                <p className="text-sm text-gray-700">
                  Limit how we process your personal information.
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">Exercise Your Rights</h3>
              <p className="text-sm text-gray-700 mb-3">
                To exercise any of these rights, please contact us using the information below.
              </p>
              <Button className="mr-2">
                <Download className="h-4 w-4 mr-2" />
                Request Data Export
              </Button>
              <Button variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Contact Privacy Officer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card>
          <CardHeader>
            <CardTitle>Data Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              We retain your personal information only as long as necessary for the purposes outlined in this policy:
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Account Data</span>
                <span className="text-sm text-gray-600">Duration of account + 3 years</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Payment Information</span>
                <span className="text-sm text-gray-600">7 years (legal requirement)</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-medium">Analytics Data</span>
                <span className="text-sm text-gray-600">2 years</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="font-medium">Marketing Data</span>
                <span className="text-sm text-gray-600">Until unsubscribed or account deletion</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              If you have any questions about this privacy policy or our data practices, please contact us:
            </p>
            <div className="space-y-2">
              <p><strong>Email:</strong> privacy@studentapartments.com</p>
              <p><strong>Phone:</strong> +1 (555) 123-4567</p>
              <p><strong>Address:</strong> 123 University Avenue, College Town, ST 12345</p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                <strong>Data Protection Officer:</strong> privacy@studentapartments.com
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}