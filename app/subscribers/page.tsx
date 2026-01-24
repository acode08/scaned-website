'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface School {
  id: string;
  schoolName: string;
  logo?: string;
  address: string;
  schoolId: string;
  createdAt: string;
  expiryDate?: string;
}

export default function Subscribers() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [subscribers, setSubscribers] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (showLoginModal) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [showLoginModal]);

  const fetchSchools = async () => {
    try {
      const schoolsSnapshot = await getDocs(collection(db, 'schools'));
      const schoolsData: School[] = [];

      schoolsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Handle different logo URL formats
        let logoPath = '/logo.png'; // default
        
        if (data.logo) {
          if (data.logo.startsWith('http')) {
            // Already a full URL
            logoPath = data.logo;
          } else if (data.logo.startsWith('gs://')) {
            // Convert gs:// to https:// URL
            const gsPath = data.logo.replace('gs://', '');
            const [bucket, ...pathParts] = gsPath.split('/');
            const filePath = pathParts.join('/');
            logoPath = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
          } else {
            // Assume it's a filename, use local path
            logoPath = `/school-logos/${data.logo}`;
          }
        }
        
        schoolsData.push({
          id: doc.id,
          schoolName: data.schoolName || 'Unknown School',
          logo: logoPath,
          address: data.address || 'Address not provided',
          schoolId: data.schoolId || doc.id,
          createdAt: data.createdAt ? formatDate(data.createdAt) : 'N/A',
          expiryDate: data.expiryDate ? formatDate(data.expiryDate) : 'N/A'
        });
      });

      // Sort by school name A-Z
      schoolsData.sort((a, b) => a.schoolName.localeCompare(b.schoolName));

      setSubscribers(schoolsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching schools:', error);
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
      // Firestore Timestamp
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      return 'N/A';
    }

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handlePinChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newPin = [...pin];
      newPin[index] = value;
      setPin(newPin);
      if (value && index < 5) {
        document.getElementById(`pin-${index + 1}`)?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus();
    }
  };

  const handleModalClose = () => {
    setShowLoginModal(false);
    setPin(['', '', '', '', '', '']);
    setErrorMessage('');
  };

  const verifyPin = async () => {
    const enteredPin = pin.join('');
    
    if (enteredPin.length !== 6) {
      setErrorMessage('Please enter a 6-digit PIN');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const pinQuery = query(
        collection(db, 'pincodes'),
        where('code', '==', enteredPin),
        where('isActive', '==', true)
      );
      
      const pinSnapshot = await getDocs(pinQuery);
      
      if (!pinSnapshot.empty) {
        const pinDoc = pinSnapshot.docs[0];
        const pinData = pinDoc.data();
        
        if (pinData.sectionId && pinData.sectionId !== null && pinData.sectionId !== '') {
          setErrorMessage('Section account access is not available. Please use school account PIN.');
          setIsVerifying(false);
          return;
        }
        
        sessionStorage.setItem('schoolId', pinData.schoolId);
        sessionStorage.setItem('pinType', 'school');
        sessionStorage.setItem('pinCode', enteredPin);
        
        router.push('/school-dashboard');
        return;
      }

      setErrorMessage('Invalid PIN. Please try again.');
      
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setErrorMessage('An error occurred. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      {/* Header */}
      <header style={{ backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
            onClick={() => router.push('/')}
          >
            <img src="/logo.png" alt="ScanED Logo" style={{ width: '48px', height: '48px' }} />
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>ScanED</span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a 
              href="/" 
              style={{ color: '#374151', fontWeight: '500', textDecoration: 'none', transition: 'color 0.2s', fontSize: '16px', display: isMobile ? 'none' : 'block' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#6DCAC3'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#374151'}
            >
              Home
            </a>
            <a 
              href="/about" 
              style={{ color: '#374151', fontWeight: '500', textDecoration: 'none', transition: 'color 0.2s', fontSize: '16px', display: isMobile ? 'none' : 'block' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#6DCAC3'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#374151'}
            >
              About
            </a>
            <a 
              href="/subscribers" 
              style={{ color: '#6DCAC3', fontWeight: '600', textDecoration: 'none', fontSize: '16px', display: isMobile ? 'none' : 'block' }}
            >
              Subscribers
            </a>
              
            <button
              onClick={() => setShowLoginModal(true)}
              style={{ 
                padding: '10px 24px', 
                backgroundColor: '#6DCAC3', 
                color: 'white', 
                borderRadius: '8px', 
                fontWeight: '500', 
                border: 'none', 
                cursor: 'pointer', 
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
                transition: 'all 0.2s', 
                fontSize: '16px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#5AB9B3';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px -2px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6DCAC3';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }}
            >
              Login
            </button>

            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              style={{ 
                display: isMobile ? 'block' : 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px'
              }}
            >
              <svg style={{ width: '28px', height: '28px', color: '#374151' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </nav>
        </div>

        {showMobileMenu && (
          <div style={{ 
            backgroundColor: 'white', 
            borderTop: '1px solid #E5E7EB',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <a href="/" style={{ color: '#374151', fontWeight: '500', textDecoration: 'none', fontSize: '16px', padding: '8px 0' }}>
              Home
            </a>
            <a href="/about" style={{ color: '#374151', fontWeight: '500', textDecoration: 'none', fontSize: '16px', padding: '8px 0' }}>
              About
            </a>
            <a href="/subscribers" style={{ color: '#6DCAC3', fontWeight: '600', textDecoration: 'none', fontSize: '16px', padding: '8px 0' }}>
              Subscribers
            </a>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: isMobile ? '36px' : '48px', fontWeight: '800', color: '#111827', marginBottom: '12px' }}>
            Our <span style={{ color: '#6DCAC3' }}>Subscribers Nationwide</span>
          </h1>
          <p style={{ fontSize: '18px', color: '#6B7280', maxWidth: '600px', margin: '0 auto' }}>
            Trusted by leading educational institutions
          </p>
        </div>

        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              border: '4px solid #E5E7EB',
              borderTop: '4px solid #6DCAC3',
              borderRadius: '50%',
              margin: '0 auto 20px',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ fontSize: '16px', color: '#6B7280' }}>Loading subscribers...</p>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}}/>
          </div>
        ) : subscribers.length > 0 ? (
          /* Subscribers Grid */
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
            gap: '24px' 
          }}>
            {subscribers.map((school) => (
              <div
                key={school.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '24px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = '#6DCAC3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }}
              >
                {/* Header with Logo and School Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '12px',
                    backgroundColor: '#F9FAFB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '2px solid #E5E7EB'
                  }}>
                    <img 
                      src={school.logo || '/logo.png'} 
                      alt={`${school.schoolName} Logo`}
                      style={{ width: '48px', height: '48px', objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: '700', 
                      color: '#111827', 
                      margin: 0,
                      lineHeight: '1.3'
                    }}>
                      {school.schoolName}
                    </h3>
                  </div>
                </div>

                {/* School Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Address */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      backgroundColor: '#F0FDFA', 
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg style={{ width: '16px', height: '16px', color: '#6DCAC3' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                        Address
                      </div>
                      <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                        {school.address}
                      </div>
                    </div>
                  </div>

                  {/* School ID */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      backgroundColor: '#FEF3C7', 
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg style={{ width: '16px', height: '16px', color: '#F59E0B' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                        School ID
                      </div>
                      <div style={{ fontSize: '14px', color: '#374151', fontFamily: 'monospace', fontWeight: '500' }}>
                        {school.schoolId}
                      </div>
                    </div>
                  </div>

                  {/* Subscription Start */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      backgroundColor: '#DBEAFE', 
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg style={{ width: '16px', height: '16px', color: '#3B82F6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                        Subscription Start
                      </div>
                      <div style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                        {school.createdAt}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              backgroundColor: '#F3F4F6', 
              borderRadius: '50%',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '40px', height: '40px', color: '#9CA3AF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              No Subscribers Yet
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280' }}>
              Check back soon for our growing list of partner schools
            </p>
          </div>
        )}
      </main>

      {/* Login Modal */}
      {typeof window !== 'undefined' && mounted && showLoginModal && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onClick={handleModalClose}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '48px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxWidth: '448px',
              width: '100%',
              margin: '16px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleModalClose}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                color: '#9CA3AF',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: '8px' }}>
              School Login
            </h2>

            <p style={{ color: '#6B7280', textAlign: 'center', marginBottom: '40px' }}>
              Enter your school account 6-digit PIN
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
              {pin.map((digit, index) => (
                <input
                  key={index}
                  id={`pin-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  autoFocus={index === 0}
                  disabled={isVerifying}
                  style={{
                    width: '56px',
                    height: '64px',
                    textAlign: 'center',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    border: '2px solid #E5E7EB',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(249, 250, 251, 0.5)',
                    outline: 'none',
                    opacity: isVerifying ? 0.6 : 1
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6DCAC3';
                    e.target.style.boxShadow = '0 0 0 4px rgba(109, 202, 195, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              ))}
            </div>

            {errorMessage && (
              <p style={{ color: '#DC2626', textAlign: 'center', fontSize: '14px', marginBottom: '16px' }}>
                {errorMessage}
              </p>
            )}

            <button
              onClick={verifyPin}
              disabled={pin.some(d => !d) || isVerifying}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#6DCAC3',
                opacity: (pin.some(d => !d) || isVerifying) ? 0.4 : 1,
                color: 'white',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                border: 'none',
                cursor: (pin.some(d => !d) || isVerifying) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!pin.some(d => !d) && !isVerifying) {
                  e.currentTarget.style.backgroundColor = '#5AB9B3';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6DCAC3';
              }}
            >
              {isVerifying ? 'VERIFYING...' : 'LOGIN'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}