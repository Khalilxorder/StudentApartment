'use client';

import { useState } from 'react';
import { User, Mail, Calendar, MapPin } from 'lucide-react';

interface ProfilePopupProps {
  user: {
    name?: string;
    email: string;
    avatar?: string;
    joinDate?: string;
    location?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

export default function ProfilePopup({ user, isOpen, onClose, position }: ProfilePopupProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Popup */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-64"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || user.email}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-gray-500" />
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {user.name || 'User'}
            </h3>
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span className="truncate">{user.email}</span>
              </div>
              {user.joinDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(user.joinDate).toLocaleDateString()}</span>
                </div>
              )}
              {user.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{user.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </>
  );
}