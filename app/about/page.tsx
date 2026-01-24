'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function About() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [mounted, setMounted] = useState(false);
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
              style={{ color: '#6DCAC3', fontWeight: '600', textDecoration: 'none', fontSize: '16px', display: isMobile ? 'none' : 'block' }}
            >
              About
            </a>
            <a 
              href="/subscribers" 
              style={{ color: '#374151', fontWeight: '500', textDecoration: 'none', transition: 'color 0.2s', fontSize: '16px', display: isMobile ? 'none' : 'block' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#6DCAC3'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#374151'}
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
            <a href="/about" style={{ color: '#6DCAC3', fontWeight: '600', textDecoration: 'none', fontSize: '16px', padding: '8px 0' }}>
              About
            </a>
            <a href="/subscribers" style={{ color: '#374151', fontWeight: '500', textDecoration: 'none', fontSize: '16px', padding: '8px 0' }}>
              Subscribers
            </a>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: isMobile ? '48px 24px' : '80px 32px' }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h1 style={{ 
            fontSize: isMobile ? '36px' : '48px', 
            fontWeight: '800', 
            color: '#111827', 
            marginBottom: '16px',
            letterSpacing: '-0.02em',
            lineHeight: '1.2'
          }}>
            About <span style={{ color: '#6DCAC3' }}>ScanED</span>
          </h1>
          <p style={{ 
            fontSize: '18px', 
            color: '#6B7280', 
            maxWidth: '800px', 
            margin: '0 auto', 
            lineHeight: '1.7',
            fontWeight: '400'
          }}>
            A smart, reliable, and easy-to-use Automated Student Attendance Monitoring System designed to help schools improve accuracy, communication, and accountability through modern technology.
          </p>
        </div>

        {/* Key Benefits */}
        <div style={{ marginBottom: '80px' }}>
          <h2 style={{ 
            fontSize: isMobile ? '28px' : '36px', 
            fontWeight: '700', 
            color: '#111827', 
            marginBottom: '48px',
            textAlign: 'center',
            letterSpacing: '-0.02em'
          }}>
            Key Benefits
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
            gap: '28px' 
          }}>
            {[
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
                title: 'Accurate Attendance Monitoring',
                desc: 'Track student attendance across classrooms and entry points with minimal errors.'
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
                title: 'Real-Time Communication',
                desc: 'Instantly notify parents and school administrators via SMS and Telegram.'
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
                title: 'Student Accountability & Punctuality',
                desc: 'Promote discipline through structured, transparent, and monitored attendance.'
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
                title: 'Reduced Administrative Workload',
                desc: 'Eliminate manual attendance recording and paperwork for teachers and staff.'
              },
              {
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
                title: 'Secure & Technology-Enabled Environment',
                desc: 'Support a safe, modern, and digitally connected school system.'
              }
            ].map((benefit, idx) => (
              <div 
                key={idx}
                style={{ 
                  padding: '32px',
                  backgroundColor: '#FAFAFA',
                  borderRadius: '16px',
                  border: '1px solid #E5E7EB',
                  transition: 'all 0.3s ease',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px -8px rgba(0, 0, 0, 0.12)';
                  e.currentTarget.style.borderColor = '#6DCAC3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }}
              >
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                  <div style={{ 
                    flexShrink: 0,
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(109, 202, 195, 0.1)',
                    borderRadius: '12px'
                  }}>
                    <svg style={{ width: '28px', height: '28px', color: '#6DCAC3' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {benefit.icon}
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: '600', 
                      color: '#111827', 
                      marginBottom: '8px',
                      letterSpacing: '-0.01em'
                    }}>
                      {benefit.title}
                    </h3>
                    <p style={{ 
                      fontSize: '15px', 
                      color: '#6B7280', 
                      lineHeight: '1.6',
                      margin: 0,
                      fontWeight: '400'
                    }}>
                      {benefit.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Features */}
        <div>
          <h2 style={{ 
            fontSize: isMobile ? '28px' : '36px', 
            fontWeight: '700', 
            color: '#111827', 
            marginBottom: '48px',
            textAlign: 'center',
            letterSpacing: '-0.02em'
          }}>
            Key Features
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', 
            gap: '20px' 
          }}>
            {[
              'Fast and reliable QR Code-based attendance scanning',
              'Instant SMS and Telegram notifications for parents',
              'Flexible Time-In / Time-Out options (Classroom-based or Gate-based monitoring)',
              'Detailed attendance reports for both classroom and gate tracking',
              'Exportable reports compatible with Microsoft Excel',
              'Real-time dashboard showing present, late, and absent students',
              'Mobile access to reports anytime, anywhere via Android devices',
              'Bulk announcements and alerts to parents via SMS and Telegram',
              'Seamless integration with existing school ID cards',
              'Online and Offline capability – works even without internet connection',
              'Local-based or Cloud-based deployment options',
              'Simple "Install and Play" mobile application powered by Google Firebase',
              'Fully compatible with SF2 (School Form 2) reporting requirements',
              'Operates offline and supports any SIM card network provider',
              'Low-maintenance, user-friendly, and school-ready system'
            ].map((feature, idx) => (
              <div 
                key={idx}
                style={{ 
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                  padding: '16px 20px',
                  backgroundColor: '#FAFAFA',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.borderColor = '#6DCAC3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FAFAFA';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }}
              >
                <svg style={{ width: '20px', height: '20px', color: '#6DCAC3', flexShrink: 0, marginTop: '2px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span style={{ 
                  fontSize: '15px', 
                  color: '#374151', 
                  lineHeight: '1.6',
                  fontWeight: '400'
                }}>
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
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