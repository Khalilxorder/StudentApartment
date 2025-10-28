'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Send, Calendar, BarChart3, Users, Eye, MousePointer, AlertCircle } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  templateId: string;
  segment: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  scheduledAt?: string;
  sentAt?: string;
  recipientCount: number;
  stats?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    openRate: number;
    clickRate: number;
  };
}

interface Template {
  id: string;
  name: string;
  subject: string;
  variables: string[];
}

export default function MarketingDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns');

  // Form state for new campaign
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    templateId: '',
    segment: 'all',
    scheduledAt: '',
  });

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/marketing/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    // In a real app, you'd have an API endpoint for templates
    // For now, we'll hardcode them based on our email-campaigns.ts
    setTemplates([
      { id: 'welcome', name: 'Welcome Email', subject: 'Welcome to Student Apartments!', variables: ['firstName', 'searchUrl', 'dashboardUrl'] },
      { id: 'property_alert', name: 'Property Alert', subject: 'New student apartments matching your criteria!', variables: ['firstName', 'propertyCount', 'propertyTitle', 'propertyLocation', 'propertyPrice', 'availabilityDate', 'propertyUrl', 'searchUrl', 'unsubscribeUrl'] },
      { id: 'newsletter', name: 'Monthly Newsletter', subject: 'Student Apartments Newsletter - {{month}} {{year}}', variables: ['firstName', 'month', 'year', 'featuredProperties', 'marketInsights', 'tipsAndAdvice', 'successStories', 'searchUrl', 'unsubscribeUrl'] },
      { id: 'promotion', name: 'Special Promotion', subject: '{{promotionTitle}} - Limited Time Offer!', variables: ['promotionTitle', 'promotionDescription', 'discountCode', 'firstName', 'personalMessage', 'promotionUrl', 'expirationDate', 'unsubscribeUrl'] },
    ]);
  };

  const createCampaign = async () => {
    try {
      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignForm),
      });

      if (response.ok) {
        setCampaignForm({ name: '', templateId: '', segment: 'all', scheduledAt: '' });
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const sendCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      scheduled: 'outline',
      sending: 'default',
      sent: 'default',
      cancelled: 'destructive',
    } as const;

    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading marketing dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Marketing Dashboard</h2>
        <Button onClick={() => setActiveTab('create')} className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="create">Create Campaign</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    {getStatusBadge(campaign.status)}
                  </div>
                  <CardDescription>
                    Template: {templates.find(t => t.id === campaign.templateId)?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      {campaign.recipientCount} recipients
                    </div>
                    {campaign.stats && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {campaign.stats.openRate}%
                        </div>
                        <div className="flex items-center gap-1">
                          <MousePointer className="h-3 w-3" />
                          {campaign.stats.clickRate}%
                        </div>
                      </div>
                    )}
                    {campaign.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => sendCampaign(campaign.id)}
                        className="w-full mt-2"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Campaign</CardTitle>
              <CardDescription>
                Set up an email campaign to reach your users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Welcome Campaign 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template">Email Template</Label>
                  <Select
                    value={campaignForm.templateId}
                    onValueChange={(value) => setCampaignForm(prev => ({ ...prev, templateId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="segment">Target Segment</Label>
                  <Select
                    value={campaignForm.segment}
                    onValueChange={(value) => setCampaignForm(prev => ({ ...prev, segment: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="active_users">Active Users</SelectItem>
                      <SelectItem value="inactive_users">Inactive Users</SelectItem>
                      <SelectItem value="new_users">New Users</SelectItem>
                      <SelectItem value="premium_users">Premium Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduledAt">Schedule (Optional)</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={campaignForm.scheduledAt}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                  />
                </div>
              </div>

              <Button onClick={createCampaign} disabled={!campaignForm.name || !campaignForm.templateId}>
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.subject}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">
                      <strong>Variables:</strong> {template.variables.join(', ')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sent Emails</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.length > 0
                    ? Math.round(campaigns.reduce((sum, c) => sum + (c.stats?.openRate || 0), 0) / campaigns.length)
                    : 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Click Rate</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.length > 0
                    ? Math.round(campaigns.reduce((sum, c) => sum + (c.stats?.clickRate || 0), 0) / campaigns.length)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}