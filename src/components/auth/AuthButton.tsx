'use client';

import React, { useState } from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/providers/AuthProvider';
import AuthModal from './AuthModal';

export default function AuthButton() {
  const { user, loading, signOut } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowMenu(false);
  };

  if (loading) {
    return (
      <div className="absolute top-4 right-4 z-[100]">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-lg px-4 py-2 shadow-lg">
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="absolute top-4 right-4 z-[100]">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-lg px-4 py-2 shadow-lg hover:bg-slate-800/90 transition-colors flex items-center gap-2 text-sm text-slate-200"
          >
            <User className="w-4 h-4" />
            <span className="max-w-[150px] truncate">{user.email}</span>
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl overflow-hidden">
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-800/80 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>

        {showMenu && (
          <div
            className="fixed inset-0 z-[99]"
            onClick={() => setShowMenu(false)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="absolute top-4 right-4 z-[100]">
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600/90 backdrop-blur-md border border-blue-500 rounded-lg px-4 py-2 shadow-lg hover:bg-blue-500/90 transition-colors flex items-center gap-2 text-sm text-white font-medium"
        >
          <User className="w-4 h-4" />
          Sign In
        </button>
      </div>

      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  );
}
