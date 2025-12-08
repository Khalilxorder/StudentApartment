'use client';

import { useState } from 'react';
import Link from 'next/link';
import LogoutButton from './logout-button'; // Import the logout button

// A simple user icon SVG
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);


export default function UserProfile({ userEmail }: { userEmail: string | undefined }) {
    const [isOpen, setIsOpen] = useState(false); // State to control dropdown visibility

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="flex flex-col items-center space-y-1">
                <div className="p-2 bg-white rounded-full shadow">
                   <UserIcon />
                </div>
                {/* Display part of the email before @ symbol */}
                <span className="text-xs font-semibold text-gray-800">{userEmail?.split('@')[0]}</span>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                    <div className="px-4 py-2 text-sm text-gray-700">{userEmail}</div> {/* Full email */}
                    <div className="border-t border-gray-100"></div>
                    <div className="p-1">
                        <Link
                            href="/owner/profile"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                            onClick={() => setIsOpen(false)}
                        >
                            Owner Profile
                        </Link>
                        <LogoutButton /> {/* Logout functionality */}
                    </div>
                </div>
            )}
        </div>
    )
}