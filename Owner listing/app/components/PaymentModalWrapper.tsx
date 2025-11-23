import dynamic from 'next/dynamic';
import { Apartment } from '@/types/apartment';
import { Suspense } from 'react';

// Dynamically import PaymentModal to prevent chunk loading issues
const PaymentModal = dynamic(() => import('./PaymentModal').catch(err => {
  console.error('Failed to load PaymentModal:', err);
  // Return a fallback error component
  return {
    default: ({ onClose }: any) => (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Loading Error</h3>
          <p className="text-gray-600 mb-6 text-center">Failed to load payment system. Please refresh the page and try again.</p>
          <button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    )
  };
}), {
  loading: () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-500 mx-auto mb-4"></div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Payment...</h3>
        <p className="text-gray-600">Please wait</p>
      </div>
    </div>
  ),
  ssr: false, // Disable server-side rendering for Stripe components
});

interface PaymentModalWrapperProps {
  apartment: Apartment;
  onClose: () => void;
  userEmail?: string;
}

export default function PaymentModalWrapper({ apartment, onClose, userEmail }: PaymentModalWrapperProps) {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-500 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Payment...</h3>
          <p className="text-gray-600">Initializing secure payment system...</p>
        </div>
      </div>
    }>
      <PaymentModal apartment={apartment} onClose={onClose} userEmail={userEmail} />
    </Suspense>
  );
}