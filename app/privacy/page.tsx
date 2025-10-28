import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Center | Student Apartments',
  description: 'Manage your privacy settings, export your data, and control your account.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Center</h1>

          <div className="space-y-8">
            {/* Data Export Section */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Export Your Data</h2>
              <p className="text-gray-600 mb-4">
                Download a copy of all your personal data stored on our platform.
              </p>
              <form action="/api/privacy/data-export" method="POST" className="inline-block">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
                >
                  Request Data Export
                </button>
              </form>
            </div>

            {/* Account Deletion Section */}
            <div className="border border-red-200 rounded-lg p-6 bg-red-50">
              <h2 className="text-xl font-semibold text-red-900 mb-4">Delete Your Account</h2>
              <p className="text-red-700 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="confirm-delete"
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <label htmlFor="confirm-delete" className="text-sm text-red-700">
                    I understand that this action will permanently delete my account and all associated data,
                    including listings, messages, and saved searches.
                  </label>
                </div>
                <button
                  type="button"
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
                  disabled
                  id="delete-button"
                >
                  Delete Account
                </button>
              </div>
            </div>

            {/* Privacy Settings Section */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Privacy Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Analytics Tracking</h3>
                    <p className="text-sm text-gray-600">Allow us to collect anonymous usage data to improve our service.</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">Marketing Communications</h3>
                    <p className="text-sm text-gray-600">Receive emails about new features and promotions.</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>

            {/* Cookie Settings Section */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Cookie Settings</h2>
              <p className="text-gray-600 mb-4">
                Manage your cookie preferences for this website.
              </p>
              <Link
                href="/cookie-policy"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                View Cookie Policy
              </Link>
            </div>

            {/* Contact Section */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-600 mb-4">
                If you have any questions about your privacy or need assistance, please contact us.
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Email: privacy@studentapartments.com</p>
                <p>Response time: Within 24 hours</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('confirm-delete').addEventListener('change', function() {
              document.getElementById('delete-button').disabled = !this.checked;
            });

            document.getElementById('delete-button').addEventListener('click', async function() {
              if (confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
                try {
                  const response = await fetch('/api/privacy/data-delete', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ confirmDeletion: true }),
                  });

                  if (response.ok) {
                    alert('Your account has been deleted. You will be redirected to the homepage.');
                    window.location.href = '/';
                  } else {
                    const error = await response.json();
                    alert('Failed to delete account: ' + error.error);
                  }
                } catch (error) {
                  alert('An error occurred while deleting your account. Please try again.');
                }
              }
            });
          `,
        }}
      />
    </div>
  );
}