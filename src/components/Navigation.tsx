'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Upload, FileAudio, User, LogOut, Menu, X, Code } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import Logo from './Logo';

const navigationItems = [
  {
    name: 'Home',
    href: '/',
    icon: BarChart3,
    public: true // Show for unauthenticated users
  },
  {
    name: 'Upload & Analyze',
    href: '/upload',
    icon: Upload,
    public: false
  },
  {
    name: 'Call History',
    href: '/call-history',
    icon: FileAudio,
    public: false
  },
  {
    name: 'Call Analysis',
    href: '/call-analysis',
    icon: FileAudio,
    public: false
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    public: false
  },
  {
    name: 'Integrations',
    href: '/integrations',
    icon: Code,
    public: true // Show for unauthenticated users
  }
];

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Don't show navigation on auth pages
  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(pathname);
  
  if (isAuthPage) {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Logo size="md" />
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigationItems.map((item) => {
                // Show public items for everyone, private items only for authenticated users
                if (!item.public && !user) {
                  return null;
                }
                
                const isActive = pathname === item.href || 
                  (item.href === '/' && pathname === '/') ||
                  (item.href !== '/' && pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={`${item.name}-${item.href}`}
                    href={item.href}
                    className={`${
                      isActive
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                  >
                    <item.icon className="w-4 h-4 mr-1" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop user menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {!loading && (
              <>
                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="bg-white flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <span className="sr-only">Open user menu</span>
                      <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50">
                        <User className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user.email
                          }
                        </span>
                      </div>
                    </button>

                    {isUserMenuOpen && (
                      <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          {!user.isEmailVerified && (
                            <div className="px-4 py-2 text-xs text-yellow-600 bg-yellow-50 border-b border-yellow-200">
                              Please verify your email
                            </div>
                          )}
                          <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-200">
                            {user.email}
                          </div>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <Link
                      href="/login"
                      className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden flex items-center">
            {!loading && !user && (
              <Link
                href="/login"
                className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium mr-2"
              >
                Sign in
              </Link>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1 border-b border-gray-200">
            {navigationItems.map((item) => {
              // Show public items for everyone, private items only for authenticated users
              if (!item.public && !user) {
                return null;
              }
              
              const isActive = pathname === item.href || 
                (item.href === '/' && pathname === '/') ||
                (item.href !== '/' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={`mobile-${item.name}-${item.href}`}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`${
                    isActive
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors`}
                >
                  <div className="flex items-center">
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>
          
          {/* Mobile user section */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            {user ? (
              <>
                <div className="flex items-center px-4">
                  <User className="h-8 w-8 text-gray-400" />
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : 'User'
                      }
                    </div>
                    <div className="text-sm font-medium text-gray-500">{user.email}</div>
                    {!user.isEmailVerified && (
                      <div className="text-xs text-yellow-600 mt-1">Please verify your email</div>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  >
                    <div className="flex items-center">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <Link
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
