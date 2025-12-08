export default function TermsPage() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
            <div className="prose prose-blue max-w-none">
                <p className="text-lg text-gray-600 mb-6">
                    Effective Date: December 7, 2025
                </p>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                    <p className="text-gray-600">
                        By accessing or using our services, you agree to be bound by these Terms. If you do not agree to these Terms, you may not access or use usage of our services.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. User Accounts</h2>
                    <p className="text-gray-600">
                        You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Content</h2>
                    <p className="text-gray-600">
                        Our service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material. You are responsible for the content that you post.
                    </p>
                </section>
            </div>
        </div>
    );
}
