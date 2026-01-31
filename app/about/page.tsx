// app/about/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Image from 'next/image';

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

export default function About() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'system' | 'teachers' | 'parents'>('system');

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
    if (showLoginModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showLoginModal]);

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

  const systemFeatures = [
    'QR Code-based scanning',
    'Real-time notifications',
    'Offline & online mode',
    'Gate & classroom tracking',
    'Excel-ready reports',
    'Bulk SMS & Telegram alerts',
    'SF2 compatible',
    'Manual attendance entry',
    'Deactivate student QR codes',
    'Block student access',
    'School announcements',
    'Cloud or local deployment'
  ];

  const teachersFeatures = [
    'Monitor real-time attendance',
    'View attendance history',
    'Send bulk announcements',
    'AM/PM session tracking',
    'Offline sync capability'
  ];

  const parentsFeatures = [
    'Receive child real-time attendance',
    'View attendance history',
    'Absence tracking',
    'Monthly attendance summaries',
    'Receive school announcements',
    'Emergency contact updates'
  ];

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bgDark, display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <header style={{ backgroundColor: COLORS.bgCard, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3)', borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </a>

            <a 
              href="/subscribers" 
              title="Subscribers"
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
            <a href="/about" style={{ color: COLORS.primary, fontWeight: '600', textDecoration: 'none', padding: '8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              About
            </a>
            <a href="/subscribers" style={{ color: COLORS.textSecondary, fontWeight: '500', textDecoration: 'none', padding: '8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Subscribers
            </a>
          </div>
        )}
      </header>

      {/* MAIN CONTENT - NO SCROLL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '1200px', width: '100%', margin: '0 auto', padding: isMobile ? '24px' : '40px 32px' }}>
        
        {/* HERO SECTION */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '32px' : '48px' }}>
          <h1 style={{ 
            fontSize: isMobile ? '32px' : '42px', 
            fontWeight: '800', 
            color: COLORS.textPrimary, 
            marginBottom: '12px',
            letterSpacing: '-0.02em',
            lineHeight: '1.1'
          }}>
            About <span style={{ color: COLORS.primary }}>ScanED</span>
          </h1>
          <p style={{ 
            fontSize: isMobile ? '14px' : '16px', 
            color: COLORS.textSecondary, 
            maxWidth: '700px', 
            margin: '0 auto', 
            lineHeight: '1.5'
          }}>
            Smart attendance monitoring system for schools
          </p>
        </div>

       {/* TAB NAVIGATION */}
<div style={{ 
  display: 'flex', 
  justifyContent: 'center', 
  gap: '12px',
  marginBottom: '32px',
  flexWrap: 'wrap'
}}>
  {[
    { key: 'system', label: 'System' },
    { key: 'teachers', label: 'Teachers App' },
    { key: 'parents', label: 'Parents App' }
  ].map((tab) => (
    <button
      key={tab.key}
      onClick={() => setActiveTab(tab.key as any)}
      style={{
        padding: '12px 28px',
        backgroundColor: activeTab === tab.key ? COLORS.primary : COLORS.bgCard,
        color: activeTab === tab.key ? COLORS.textPrimary : COLORS.textSecondary,
        border: `1px solid ${activeTab === tab.key ? COLORS.primary : COLORS.border}`,
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '14px',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px' // puwede mo rin gawing 0 kung ayaw mo ng extra spacing
      }}
      onMouseEnter={(e) => {
        if (activeTab !== tab.key) {
          e.currentTarget.style.backgroundColor = COLORS.bgCardHover;
          e.currentTarget.style.borderColor = COLORS.primary;
        }
      }}
      onMouseLeave={(e) => {
        if (activeTab !== tab.key) {
          e.currentTarget.style.backgroundColor = COLORS.bgCard;
          e.currentTarget.style.borderColor = COLORS.border;
        }
      }}
    >
      {tab.label}
    </button>
  ))}
</div>


        {/* FEATURES GRID - NO SCROLL */}
        <div style={{ 
          flex: 1,
          display: 'grid', 
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
          gap: isMobile ? '12px' : '16px',
          alignContent: 'start'
        }}>
          {(activeTab === 'system' ? systemFeatures : activeTab === 'teachers' ? teachersFeatures : parentsFeatures).map((feature, idx) => (
            <div 
              key={idx}
              style={{ 
                padding: isMobile ? '16px 12px' : '20px 16px',
                backgroundColor: COLORS.bgCard,
                borderRadius: '12px',
                border: `1px solid ${COLORS.border}`,
                transition: 'all 0.2s ease',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = COLORS.primary;
                e.currentTarget.style.backgroundColor = COLORS.bgCardHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = COLORS.border;
                e.currentTarget.style.backgroundColor = COLORS.bgCard;
              }}
            >
              <svg style={{ width: isMobile ? '20px' : '24px', height: isMobile ? '20px' : '24px', color: COLORS.primary, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span style={{ 
                fontSize: isMobile ? '12px' : '14px', 
                color: COLORS.textSecondary, 
                lineHeight: '1.4',
                fontWeight: '500'
              }}>
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>

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