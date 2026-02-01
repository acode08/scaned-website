// app/subscribers/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const COLORS = {
  primary: '#249E94',
  primaryHover: '#1E8A7F',
  bgDark: '#0F172A',
  bgCard: '#1E293B',
  bgCardHover: '#334155',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  error: '#EF4444',
};

interface School {
  id: string;
  schoolName: string;
  logo?: string;
  address: string;
  schoolId: string;
  createdAt: string;
  latitude: number;
  longitude: number;
  contactNumber?: string;
  principal?: string;
}

// Import MapComponent dynamically to avoid SSR issues
const MapComponent = dynamic(() => import('./MapComponent'), { 
  ssr: false,
  loading: () => (
    <div style={{ 
      width: '100%', 
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.bgDark
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '60px', 
          height: '60px', 
          border: `4px solid ${COLORS.border}`,
          borderTop: `4px solid ${COLORS.primary}`,
          borderRadius: '50%',
          margin: '0 auto 20px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ fontSize: '16px', color: COLORS.textSecondary }}>Loading map...</p>
      </div>
    </div>
  )
});

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
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

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
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showLoginModal]);

  const fetchSchools = async () => {
    try {
      const schoolsSnapshot = await getDocs(collection(db, 'schools'));
      const schoolsData: School[] = [];

      schoolsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        let logoPath = '/logo.png';
        
        if (data.logo) {
          if (data.logo.startsWith('http')) {
            logoPath = data.logo;
          } else if (data.logo.startsWith('gs://')) {
            const gsPath = data.logo.replace('gs://', '');
            const [bucket, ...pathParts] = gsPath.split('/');
            const filePath = pathParts.join('/');
            logoPath = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
          } else {
            logoPath = `/school-logos/${data.logo}`;
          }
        }
        
        // Only add schools that have coordinates
        if (data.latitude && data.longitude) {
          schoolsData.push({
            id: doc.id,
            schoolName: data.schoolName || 'Unknown School',
            logo: logoPath,
            address: data.address || 'Address not provided',
            schoolId: data.schoolId || doc.id,
            createdAt: data.createdAt ? formatDate(data.createdAt) : 'N/A',
            latitude: data.latitude,
            longitude: data.longitude,
            contactNumber: data.contactNumber || '',
            principal: data.principal || ''
          });
        }
      });

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
    <div style={{ minHeight: '100vh', background: '#0F172A' }}>
      {/* HEADER */}
      <header style={{ backgroundColor: COLORS.bgCard, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3)', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
            onClick={() => router.push('/')}
          >
            <Image 
              src="https://firebasestorage.googleapis.com/v0/b/scaned-1f910.firebasestorage.app/o/logo.png?alt=media"
              alt="ScanED Logo"
              width={40}
              height={40}
              priority
              unoptimized
            />
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: COLORS.textPrimary }}>ScanED</span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a 
              href="/" 
              title="Home"
              style={{ 
                color: COLORS.textSecondary, 
                padding: '10px', 
                borderRadius: '8px',
                transition: 'all 0.2s', 
                display: isMobile ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = COLORS.primary;
                e.currentTarget.style.backgroundColor = COLORS.bgCardHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = COLORS.textSecondary;
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </a>

            <a 
              href="/about" 
              title="About"
              style={{ 
                color: COLORS.textSecondary,
                padding: '10px', 
                borderRadius: '8px',
                transition: 'all 0.2s', 
                display: isMobile ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = COLORS.primary;
                e.currentTarget.style.backgroundColor = COLORS.bgCardHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = COLORS.textSecondary;
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </a>

            <a 
              href="/subscribers" 
              title="Subscribers"
              style={{ 
                color: COLORS.primary, 
                padding: '10px', 
                borderRadius: '8px',
                backgroundColor: COLORS.bgCardHover,
                transition: 'all 0.2s', 
                display: isMobile ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </a>
            
            <button
              onClick={() => setShowLoginModal(true)}
              style={{ 
                padding: '10px 24px', 
                backgroundColor: COLORS.primary, 
                color: COLORS.textPrimary, 
                borderRadius: '8px', 
                fontWeight: '600', 
                border: 'none', 
                cursor: 'pointer', 
                transition: 'all 0.2s', 
                fontSize: '14px',
                marginLeft: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.primaryHover;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.primary;
                e.currentTarget.style.transform = 'translateY(0)';
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
                padding: '8px',
                color: COLORS.textSecondary
              }}
            >
              <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </nav>
        </div>

        {showMobileMenu && (
          <div style={{ 
            backgroundColor: COLORS.bgCard, 
            borderTop: `1px solid ${COLORS.border}`,
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <a href="/" style={{ color: COLORS.textSecondary, fontWeight: '500', textDecoration: 'none', padding: '8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </a>
            <a href="/about" style={{ color: COLORS.textSecondary, fontWeight: '500', textDecoration: 'none', padding: '8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              About
            </a>
            <a href="/subscribers" style={{ color: COLORS.primary, fontWeight: '600', textDecoration: 'none', padding: '8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Subscribers
            </a>
          </div>
        )}
      </header>

      {/* MAIN CONTENT - FULL SCREEN MAP */}
      <main style={{ width: '100%', padding: 0 }}>
        <div style={{ textAlign: 'center', padding: isMobile ? '24px 16px' : '40px 24px', backgroundColor: COLORS.bgDark }}>
          <h1 style={{ fontSize: isMobile ? '28px' : '38px', fontWeight: '800', color: COLORS.textPrimary, marginBottom: '8px', letterSpacing: '-0.02em' }}>
            Our <span style={{ color: COLORS.primary }}>Subscribers</span> Nationwide
          </h1>
          <p style={{ fontSize: '15px', color: COLORS.textPrimary, fontWeight: '700' }}>
            {subscribers.length} educational institution{subscribers.length !== 1 ? 's' : ''} across the Philippines
          </p>
        </div>

        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            backgroundColor: COLORS.bgDark,
            minHeight: '600px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              border: `4px solid ${COLORS.border}`,
              borderTop: `4px solid ${COLORS.primary}`,
              borderRadius: '50%',
              margin: '0 auto 20px',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ fontSize: '16px', color: COLORS.textSecondary }}>Loading map...</p>
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}}/>
          </div>
        ) : subscribers.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '80px 20px',
            backgroundColor: COLORS.bgDark,
            minHeight: '600px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              backgroundColor: COLORS.bgCard, 
              borderRadius: '50%',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '40px', height: '40px', color: COLORS.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: COLORS.textPrimary, marginBottom: '8px' }}>
              No Subscribers with Coordinates Yet
            </h3>
            <p style={{ fontSize: '14px', color: COLORS.textSecondary, maxWidth: '400px' }}>
              Add latitude and longitude coordinates to your schools in Firebase to display them on the map.
            </p>
          </div>
        ) : (
          <div style={{
            height: isMobile ? '500px' : '700px',
            width: '100%',
            position: 'relative'
          }}>
            {mounted && <MapComponent 
              schools={subscribers} 
              selectedSchool={selectedSchool}
              onSelectSchool={setSelectedSchool}
              isMobile={isMobile}
            />}
          </div>
        )}
      </main>

      {/* LOGIN MODAL */}
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
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)'
          }}
          onClick={handleModalClose}
        >
          <div 
            style={{
              backgroundColor: COLORS.bgCard,
              borderRadius: '24px',
              padding: '48px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxWidth: '448px',
              width: '100%',
              margin: '16px',
              position: 'relative',
              border: `1px solid ${COLORS.border}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleModalClose}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                color: COLORS.textMuted,
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

            <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', marginBottom: '8px' }}>
              School Login
            </h2>

            <p style={{ color: COLORS.textSecondary, textAlign: 'center', marginBottom: '40px' }}>
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
                    border: `2px solid ${COLORS.border}`,
                    borderRadius: '12px',
                    backgroundColor: COLORS.bgDark,
                    color: COLORS.textPrimary,
                    outline: 'none',
                    opacity: isVerifying ? 0.6 : 1
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = COLORS.primary;
                    e.target.style.boxShadow = `0 0 0 4px rgba(36, 158, 148, 0.2)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = COLORS.border;
                    e.target.style.boxShadow = 'none';
                  }}
                />
              ))}
            </div>

            {errorMessage && (
              <p style={{ color: COLORS.error, textAlign: 'center', fontSize: '14px', marginBottom: '16px' }}>
                {errorMessage}
              </p>
            )}

            <button
              onClick={verifyPin}
              disabled={pin.some(d => !d) || isVerifying}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: COLORS.primary,
                opacity: (pin.some(d => !d) || isVerifying) ? 0.4 : 1,
                color: COLORS.textPrimary,
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
                  e.currentTarget.style.backgroundColor = COLORS.primaryHover;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.primary;
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