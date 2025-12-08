export default function PrivacyPage() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
            <div className="prose prose-blue max-w-none">
                <p className="text-lg text-gray-600 mb-6">
                    Effective Date: December 7, 2025
                </p>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
                    <p className="text-gray-600">
                        We collect information that you provide directly to us, such as when you create an account, update your profile, or list an apartment.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
                    <p className="text-gray-600">
                        We use the information we collect to provide, maintain, and improve our services, including to facilitate communication between students and landlords.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Data Security</h2>
                    <p className="text-gray-600">
                        We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
                    </p>
                </section>
            </div>
        </div>
    );
}
