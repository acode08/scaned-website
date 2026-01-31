// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
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
  errorBg: '#FEE2E2',
  success: '#10B981',
  successBg: '#D1FAE5',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
};

export default function Home() {
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState({ mobileNumber: '', email: '' });
  
  const [trialForm, setTrialForm] = useState({
    schoolId: '',
    schoolName: '',
    schoolAddress: '',
    principalName: '',
    mobileNumber: '',
    email: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const phrases = [
    "Student Security",
    "Parents Peace of Mind",
    "Reduce Teachers Workload"
  ];
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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
    const currentPhrase = phrases[currentPhraseIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (currentText.length < currentPhrase.length) {
          setCurrentText(currentPhrase.slice(0, currentText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
        }
      }
    }, isDeleting ? 50 : 100);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentPhraseIndex, phrases]);

  useEffect(() => {
    if (showLoginModal || showContactModal || showTrialModal || showSuccessModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showLoginModal, showContactModal, showTrialModal, showSuccessModal]);

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

  const handleTrialModalClose = () => {
    setShowTrialModal(false);
    setTrialForm({
      schoolId: '',
      schoolName: '',
      schoolAddress: '',
      principalName: '',
      mobileNumber: '',
      email: ''
    });
    setFormErrors({});
  };

  const validateTrialForm = () => {
    const errors: Record<string, string> = {};
    
    if (!trialForm.schoolId.trim()) errors.schoolId = 'School ID is required';
    if (!trialForm.schoolName.trim()) errors.schoolName = 'School Name is required';
    if (!trialForm.schoolAddress.trim()) errors.schoolAddress = 'School Address is required';
    if (!trialForm.principalName.trim()) errors.principalName = 'Principal Name is required';
    
    if (!trialForm.mobileNumber.trim()) {
      errors.mobileNumber = 'Mobile Number is required';
    } else if (!/^(09|\+639)\d{9}$/.test(trialForm.mobileNumber.replace(/\s/g, ''))) {
      errors.mobileNumber = 'Invalid Philippine mobile number';
    }
    
    if (!trialForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trialForm.email)) {
      errors.email = 'Invalid email address';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTrialSubmit = async () => {
    if (!validateTrialForm()) return;
    
    setIsSubmitting(true);
    setFormErrors({});
    
    try {
      const schoolQuery = query(
        collection(db, 'trial_requests'),
        where('schoolId', '==', trialForm.schoolId)
      );
      const schoolSnapshot = await getDocs(schoolQuery);
      
      if (!schoolSnapshot.empty) {
        setFormErrors({ schoolId: 'This School ID is already registered' });
        setIsSubmitting(false);
        return;
      }
      
      setSubmittedData({
        mobileNumber: trialForm.mobileNumber,
        email: trialForm.email
      });
      
      await addDoc(collection(db, 'trial_requests'), {
        ...trialForm,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      
      setShowTrialModal(false);
      setShowSuccessModal(true);
      
      setTrialForm({
        schoolId: '',
        schoolName: '',
        schoolAddress: '',
        principalName: '',
        mobileNumber: '',
        email: ''
      });
      
    } catch (error: any) {
      console.error('Error submitting trial form:', error);
      
      if (error?.code === 'unavailable' || !navigator.onLine) {
        setFormErrors({ 
          submit: '⚠️ No internet connection. Please check your connection and try again.' 
        });
      } else {
        setFormErrors({ 
          submit: 'An error occurred. Please try again later.' 
        });
      }
    } finally {
      setIsSubmitting(false);
    }
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
    <>
      <div style={{ minHeight: '100vh', background: COLORS.bgDark }}>
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
              <a 
                href="/" 
                style={{ 
                  color: COLORS.textSecondary, 
                  fontWeight: '500', 
                  textDecoration: 'none', 
                  padding: '8px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onClick={() => setShowMobileMenu(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </a>
              <a 
                href="/about" 
                style={{ 
                  color: COLORS.textSecondary, 
                  fontWeight: '500', 
                  textDecoration: 'none', 
                  padding: '8px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onClick={() => setShowMobileMenu(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                About
              </a>
              <a 
                href="/subscribers" 
                style={{ 
                  color: COLORS.textSecondary, 
                  fontWeight: '500', 
                  textDecoration: 'none', 
                  padding: '8px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onClick={() => setShowMobileMenu(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Subscribers
              </a>
            </div>
          )}
        </header>

        <main style={{ padding: '40px 24px', minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: '1280px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: isMobile ? '40px' : '80px', justifyContent: 'center' }}>
              
              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                <Image 
                  src="https://firebasestorage.googleapis.com/v0/b/scaned-1f910.firebasestorage.app/o/hero.png?alt=media"
                  alt="ScanED Education Tracker"
                  width={400}
                  height={400}
                  priority
                  unoptimized
                  style={{
                    width: '100%',
                    maxWidth: isMobile ? '280px' : '400px',
                    height: 'auto',
                    filter: 'drop-shadow(0 25px 60px rgba(36, 158, 148, 0.3))'
                  }}
                />
              </div>

              <div style={{ flex: '1', minWidth: isMobile ? '100%' : '300px', maxWidth: '600px', textAlign: isMobile ? 'center' : 'left' }}>
                <h1 style={{ 
                  fontSize: isMobile ? '48px' : 'clamp(60px, 8vw, 90px)', 
                  fontWeight: '900', 
                  lineHeight: '0.9', 
                  letterSpacing: '-0.025em', 
                  color: COLORS.textPrimary,
                  marginBottom: '20px'
                }}>
                  ScanED Attendance
                </h1>
                
                <div style={{ minHeight: isMobile ? '60px' : 'clamp(80px, 12vw, 120px)', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: isMobile ? '32px' : 'clamp(48px, 6vw, 65px)', fontWeight: '900', lineHeight: '0.9', letterSpacing: '-0.025em' }}>
                    <span style={{ color: COLORS.primary }}>{currentText}</span>
                    <span style={{ color: '#F5A76C', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>|</span>
                  </h2>
                </div>

                <p style={{ 
                  fontSize: isMobile ? '16px' : 'clamp(18px, 2vw, 20px)', 
                  color: COLORS.textSecondary, 
                  lineHeight: '1.75', 
                  maxWidth: '640px',
                  marginTop: '12px',
                  marginBottom: '32px',
                  marginLeft: isMobile ? 'auto' : '0',
                  marginRight: isMobile ? 'auto' : '0'
                }}>
                  Empowering teachers. Inspiring students. Improving outcomes.
                </p>

               <button
  onClick={() => setShowTrialModal(true)}
  style={{
    padding: '16px 48px',
    backgroundColor: '#22C55E', // Emerald Green
    color: '#FFFFFF',
    borderRadius: '14px',
    fontWeight: '700',
    fontSize: '18px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 12px 30px rgba(34, 197, 94, 0.45)',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    margin: isMobile ? '0 auto' : '0',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = '#16A34A'; // darker emerald
    e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
    e.currentTarget.style.boxShadow =
      '0 18px 40px rgba(34, 197, 94, 0.6)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = '#22C55E';
    e.currentTarget.style.transform = 'translateY(0) scale(1)';
    e.currentTarget.style.boxShadow =
      '0 12px 30px rgba(34, 197, 94, 0.45)';
  }}
>
   Start FREE Trial
</button>

                
                <p style={{ 
                  fontSize: '14px', 
                  color: COLORS.textMuted, 
                  marginTop: '12px',
                  textAlign: isMobile ? 'center' : 'left'
                }}>
                  7 days free trial • No credit card required
                </p>
              </div>

            </div>
          </div>
        </main>

        <button
          onClick={() => setShowContactModal(true)}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: COLORS.primary,
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            zIndex: 1000
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.3)';
          }}
        >
          <svg style={{ width: '28px', height: '28px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>
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
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
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

      {/* TRIAL MODAL */}
      {typeof window !== 'undefined' && mounted && showTrialModal && createPortal(
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
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            overflowY: 'auto',
            padding: '20px'
          }}
          onClick={handleTrialModalClose}
        >
          <div 
            style={{
              backgroundColor: COLORS.bgCard,
              borderRadius: '16px',
              padding: isMobile ? '24px 20px' : '32px 28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxWidth: '500px',
              width: '100%',
              position: 'relative',
              margin: '20px auto',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: `1px solid ${COLORS.border}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleTrialModalClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                color: COLORS.textMuted,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                zIndex: 10
              }}
            >
              <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
             
              <h2 style={{ fontSize: '26px', fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: '6px' }}>
                Start Your Free Trial
              </h2>
              <p style={{ color: COLORS.textSecondary, fontSize: '14px' }}>
                Get 7 days of full access to ScanED
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleTrialSubmit(); }} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: COLORS.textPrimary, marginBottom: '8px', fontSize: '14px' }}>
                  School ID <span style={{ color: COLORS.error }}>*</span>
                </label>
                <input
                  type="text"
                  value={trialForm.schoolId}
                  onChange={(e) => setTrialForm({ ...trialForm, schoolId: e.target.value })}
                  placeholder="e.g., SCH001"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: `2px solid ${formErrors.schoolId ? COLORS.error : COLORS.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: COLORS.bgDark,
                    color: COLORS.textPrimary
                  }}
                  onFocus={(e) => !formErrors.schoolId && (e.target.style.borderColor = COLORS.primary)}
                  onBlur={(e) => !formErrors.schoolId && (e.target.style.borderColor = COLORS.border)}
                />
                {formErrors.schoolId && (
                  <p style={{ color: COLORS.error, fontSize: '12px', marginTop: '6px' }}>{formErrors.schoolId}</p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: COLORS.textPrimary, marginBottom: '8px', fontSize: '14px' }}>
                  School Name <span style={{ color: COLORS.error }}>*</span>
                </label>
                <input
                  type="text"
                  value={trialForm.schoolName}
                  onChange={(e) => setTrialForm({ ...trialForm, schoolName: e.target.value })}
                  placeholder="e.g., San Pedro High School"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: `2px solid ${formErrors.schoolName ? COLORS.error : COLORS.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: COLORS.bgDark,
                    color: COLORS.textPrimary
                  }}
                  onFocus={(e) => !formErrors.schoolName && (e.target.style.borderColor = COLORS.primary)}
                  onBlur={(e) => !formErrors.schoolName && (e.target.style.borderColor = COLORS.border)}
                />
                {formErrors.schoolName && (
                  <p style={{ color: COLORS.error, fontSize: '12px', marginTop: '6px' }}>{formErrors.schoolName}</p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: COLORS.textPrimary, marginBottom: '8px', fontSize: '14px' }}>
                  School Address <span style={{ color: COLORS.error }}>*</span>
                </label>
                <textarea
                  value={trialForm.schoolAddress}
                  onChange={(e) => setTrialForm({ ...trialForm, schoolAddress: e.target.value })}
                  placeholder="Complete school address"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: `2px solid ${formErrors.schoolAddress ? COLORS.error : COLORS.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    backgroundColor: COLORS.bgDark,
                    color: COLORS.textPrimary
                  }}
                  onFocus={(e) => !formErrors.schoolAddress && (e.target.style.borderColor = COLORS.primary)}
                  onBlur={(e) => !formErrors.schoolAddress && (e.target.style.borderColor = COLORS.border)}
                />
                {formErrors.schoolAddress && (
                  <p style={{ color: COLORS.error, fontSize: '12px', marginTop: '6px' }}>{formErrors.schoolAddress}</p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: COLORS.textPrimary, marginBottom: '8px', fontSize: '14px' }}>
                  Principal Name <span style={{ color: COLORS.error }}>*</span>
                </label>
                <input
                  type="text"
                  value={trialForm.principalName}
                  onChange={(e) => setTrialForm({ ...trialForm, principalName: e.target.value })}
                  placeholder="e.g., Dr. Maria Santos"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: `2px solid ${formErrors.principalName ? COLORS.error : COLORS.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: COLORS.bgDark,
                    color: COLORS.textPrimary
                  }}
                  onFocus={(e) => !formErrors.principalName && (e.target.style.borderColor = COLORS.primary)}
                  onBlur={(e) => !formErrors.principalName && (e.target.style.borderColor = COLORS.border)}
                />
                {formErrors.principalName && (
                  <p style={{ color: COLORS.error, fontSize: '12px', marginTop: '6px' }}>{formErrors.principalName}</p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: COLORS.textPrimary, marginBottom: '8px', fontSize: '14px' }}>
                  Mobile Number <span style={{ color: COLORS.error }}>*</span>
                </label>
                <input
                  type="tel"
                  value={trialForm.mobileNumber}
                  onChange={(e) => setTrialForm({ ...trialForm, mobileNumber: e.target.value })}
                  placeholder="e.g., 09123456789"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: `2px solid ${formErrors.mobileNumber ? COLORS.error : COLORS.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: COLORS.bgDark,
                    color: COLORS.textPrimary
                  }}
                  onFocus={(e) => !formErrors.mobileNumber && (e.target.style.borderColor = COLORS.primary)}
                  onBlur={(e) => !formErrors.mobileNumber && (e.target.style.borderColor = COLORS.border)}
                />
                {formErrors.mobileNumber && (
                  <p style={{ color: COLORS.error, fontSize: '12px', marginTop: '6px' }}>{formErrors.mobileNumber}</p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: COLORS.textPrimary, marginBottom: '8px', fontSize: '14px' }}>
                  Email Address <span style={{ color: COLORS.error }}>*</span>
                </label>
                <input
                  type="email"
                  value={trialForm.email}
                  onChange={(e) => setTrialForm({ ...trialForm, email: e.target.value })}
                  placeholder="e.g., principal@school.edu.ph"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: `2px solid ${formErrors.email ? COLORS.error : COLORS.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: COLORS.bgDark,
                    color: COLORS.textPrimary
                  }}
                  onFocus={(e) => !formErrors.email && (e.target.style.borderColor = COLORS.primary)}
                  onBlur={(e) => !formErrors.email && (e.target.style.borderColor = COLORS.border)}
                />
                {formErrors.email && (
                  <p style={{ color: COLORS.error, fontSize: '12px', marginTop: '6px' }}>{formErrors.email}</p>
                )}
              </div>

              {formErrors.submit && (
                <div style={{ 
                  padding: '14px 16px', 
                  backgroundColor: COLORS.errorBg, 
                  border: `2px solid ${COLORS.error}`,
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <p style={{ color: COLORS.error, fontSize: '13px', fontWeight: '600', margin: 0 }}>
                    {formErrors.submit}
                  </p>
                </div>
              )}

              <button
  type="submit"
  disabled={isSubmitting}
  style={{
    width: '100%',
    padding: '14px',
    backgroundColor: '#22C55E', // Emerald Green
    opacity: isSubmitting ? 0.6 : 1,
    color: '#FFFFFF',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '15px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    border: 'none',
    cursor: isSubmitting ? 'not-allowed' : 'pointer',
    transition: 'all 0.25s ease',
    marginTop: '8px',
    boxShadow: '0 6px 18px rgba(34, 197, 94, 0.35)',
  }}
  onMouseEnter={(e) => {
    if (!isSubmitting) {
      e.currentTarget.style.backgroundColor = '#16A34A'; // darker emerald
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow =
        '0 10px 26px rgba(34, 197, 94, 0.5)';
    }
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = '#22C55E';
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow =
      '0 6px 18px rgba(34, 197, 94, 0.35)';
  }}
>
  {isSubmitting ? 'SUBMITTING...' : 'REQUEST FREE TRIAL'}
</button>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* SUCCESS MODAL */}
{typeof window !== 'undefined' && mounted && showSuccessModal && createPortal(
  <div
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent' // ✅ WALANG BACKGROUND
    }}
    onClick={() => setShowSuccessModal(false)}
  >
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        padding: isMobile ? '36px 24px' : '48px',
        maxWidth: '520px',
        width: '100%',
        margin: '16px',
        textAlign: 'center',
        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.15)', // floating lang
        border: '1px solid rgba(0, 0, 0, 0.08)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ICON */}
      <div
        style={{
          width: '90px',
          height: '90px',
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px'
        }}
      >
        <svg
          style={{ width: '44px', height: '44px', color: '#22C55E' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="3"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      {/* TITLE */}
      <h2
        style={{
          fontSize: '28px',
          fontWeight: '800',
          color: '#0F172A',
          marginBottom: '10px'
        }}
      >
        Request Submitted
      </h2>

      {/* DESCRIPTION */}
      <p
        style={{
          fontSize: '16px',
          color: '#475569',
          lineHeight: '1.65',
          marginBottom: '28px'
        }}
      >
        Thank you for your interest in ScanED. Our administrator will contact
        you shortly to help you activate your free trial.
      </p>

      {/* CONTACT INFO */}
      <div
        style={{
          marginBottom: '28px',
          padding: '18px',
          backgroundColor: '#F0FDF4',
          borderRadius: '14px',
          border: '1px solid rgba(34, 197, 94, 0.3)'
        }}
      >
        <p
          style={{
            fontSize: '14px',
            color: '#166534',
            marginBottom: '8px',
            fontWeight: '600'
          }}
        >
          We will contact you using:
        </p>

        <p
          style={{
            fontSize: '14px',
            color: '#166534',
            lineHeight: '1.8'
          }}
        >
          Mobile: <strong>{submittedData.mobileNumber}</strong><br />
          Email: <strong>{submittedData.email}</strong>
        </p>
      </div>

      {/* CTA BUTTON — SAME AS FREE TRIAL */}
      <button
        onClick={() => setShowSuccessModal(false)}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: '#22C55E',
          color: '#FFFFFF',
          borderRadius: '14px',
          fontWeight: '700',
          fontSize: '16px',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          boxShadow: '0 12px 30px rgba(34, 197, 94, 0.45)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#16A34A'
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow =
            '0 16px 36px rgba(34, 197, 94, 0.6)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#22C55E'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow =
            '0 12px 30px rgba(34, 197, 94, 0.45)'
        }}
      >
        Got it
      </button>
    </div>
  </div>,
  document.body
)}
{/* SUCCESS MODAL */}
{typeof window !== 'undefined' && mounted && showSuccessModal && createPortal(
  <div
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.85)', // ✅ DARK BLUE SMOKE
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)'
    }}
    onClick={() => setShowSuccessModal(false)}
  >
    <div
      style={{
        backgroundColor: '#0F172A', // ✅ DARK BLUE CARD (NOT WHITE)
        borderRadius: '24px',
        padding: isMobile ? '36px 24px' : '48px',
        maxWidth: '520px',
        width: '100%',
        margin: '16px',
        textAlign: 'center',
        boxShadow: '0 40px 80px rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(34, 197, 94, 0.25)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ICON */}
      <div
        style={{
          width: '90px',
          height: '90px',
          backgroundColor: 'rgba(34, 197, 94, 0.18)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 0 0 10px rgba(34, 197, 94, 0.05)'
        }}
      >
        <svg
          style={{ width: '44px', height: '44px', color: '#22C55E' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="3"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      {/* TITLE */}
      <h2
        style={{
          fontSize: '28px',
          fontWeight: '800',
          color: '#E5E7EB',
          marginBottom: '10px'
        }}
      >
        Request Submitted
      </h2>

      {/* DESCRIPTION */}
      <p
        style={{
          fontSize: '16px',
          color: '#CBD5E1',
          lineHeight: '1.65',
          marginBottom: '28px'
        }}
      >
        Thank you for your interest in ScanED. Our administrator will contact
        you shortly to assist you in activating your free trial.
      </p>

      {/* CONTACT INFO */}
      <div
        style={{
          marginBottom: '28px',
          padding: '18px',
          backgroundColor: 'rgba(34, 197, 94, 0.08)',
          borderRadius: '14px',
          border: '1px solid rgba(34, 197, 94, 0.35)'
        }}
      >
        <p
          style={{
            fontSize: '14px',
            color: '#86EFAC',
            marginBottom: '8px',
            fontWeight: '600'
          }}
        >
          We will contact you using:
        </p>

        <p
          style={{
            fontSize: '14px',
            color: '#D1FAE5',
            lineHeight: '1.8'
          }}
        >
          Mobile: <strong>{submittedData.mobileNumber}</strong><br />
          Email: <strong>{submittedData.email}</strong>
        </p>
      </div>

      {/* CTA BUTTON — SAME AS START FREE TRIAL */}
      <button
        onClick={() => setShowSuccessModal(false)}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: '#22C55E',
          color: '#FFFFFF',
          borderRadius: '14px',
          fontWeight: '700',
          fontSize: '16px',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          boxShadow: '0 14px 36px rgba(34, 197, 94, 0.55)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#16A34A'
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow =
            '0 18px 44px rgba(34, 197, 94, 0.7)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#22C55E'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow =
            '0 14px 36px rgba(34, 197, 94, 0.55)'
        }}
      >
        Got it
      </button>
    </div>
  </div>,
  document.body
)}

{/* CONTACT MODAL - WITH SVG ICONS */}
{typeof window !== 'undefined' && mounted && showContactModal && createPortal(
  <div 
    onClick={() => setShowContactModal(false)} 
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
      backgroundColor: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)'
    }}
  >
    <div 
      onClick={(e) => e.stopPropagation()} 
      style={{ 
        backgroundColor: COLORS.bgCard, 
        borderRadius: '24px', 
        padding: '40px', 
        maxWidth: '420px', 
        width: '100%', 
        margin: '16px', 
        position: 'relative', 
        border: `1px solid ${COLORS.border}` 
      }}
    >
      <button
        onClick={() => setShowContactModal(false)}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          color: COLORS.textMuted,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          fontSize: '24px'
        }}
      >
        ×
      </button>

      <h2 style={{ 
        fontSize: '28px', 
        fontWeight: 'bold', 
        color: COLORS.textPrimary, 
        textAlign: 'center', 
        marginBottom: '32px' 
      }}>
        Contact Us
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* PHONE */}
        <a 
          href="tel:+639267995647" 
          style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '20px', 
            backgroundColor: COLORS.bgDark, 
            borderRadius: '12px', 
            textDecoration: 'none', 
            color: COLORS.textPrimary, 
            border: `1px solid ${COLORS.border}`,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.bgCardHover;
            e.currentTarget.style.borderColor = COLORS.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.bgDark;
            e.currentTarget.style.borderColor = COLORS.border;
          }}
        >
          {/* PHONE SVG */}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M11 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
            <path d="M8 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/>
          </svg>
          <div>
            <div style={{ fontWeight: '600', fontSize: '16px' }}>Mobile</div>
            <div style={{ fontSize: '14px', color: COLORS.textSecondary }}>+63 926 799 5647</div>
          </div>
        </a>

        {/* EMAIL */}
        <a 
          href="mailto:dmcgsolutions0314@gmail.com" 
          style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '20px', 
            backgroundColor: COLORS.bgDark, 
            borderRadius: '12px', 
            textDecoration: 'none', 
            color: COLORS.textPrimary, 
            border: `1px solid ${COLORS.border}`,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.bgCardHover;
            e.currentTarget.style.borderColor = COLORS.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.bgDark;
            e.currentTarget.style.borderColor = COLORS.border;
          }}
        >
          {/* EMAIL SVG */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="24" height="24" color="#3B82F6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M3 8v10a2 2 0 002 2h14a2 2 0 0 0 2-2V8M3 8h18"/>
          </svg>
          <div>
            <div style={{ fontWeight: '600', fontSize: '16px' }}>Email</div>
            <div style={{ fontSize: '14px', color: COLORS.textSecondary }}>dmcgsolutions0314@gmail.com</div>
          </div>
        </a>

        {/* MESSENGER */}
        <a 
          href="https://m.me/scanedph" 
          target="_blank"
          rel="noopener noreferrer"
          style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '20px', 
            backgroundColor: COLORS.bgDark, 
            borderRadius: '12px', 
            textDecoration: 'none', 
            color: COLORS.textPrimary, 
            border: `1px solid ${COLORS.border}`,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.bgCardHover;
            e.currentTarget.style.borderColor = '#1877F2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.bgDark;
            e.currentTarget.style.borderColor = COLORS.border;
          }}
        >
          {/* MESSENGER SVG */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#1877F2">
            <path d="M12 2C6.477 2 2 6.011 2 11.084c0 2.762 1.175 5.258 3.071 7.045V22l3.193-1.751A10.055 10.055 0 0012 21c5.523 0 10-4.011 10-8.916S17.523 2 12 2zm1.624 12.058l-2.527-2.704-5.48 2.704 6.174-6.974 2.527 2.704 5.48-2.704-6.174 6.974z"/>
          </svg>
          <div>
            <div style={{ fontWeight: '600', fontSize: '16px' }}>Messenger</div>
            <div style={{ fontSize: '14px', color: COLORS.textSecondary }}>Chat with us on Facebook</div>
          </div>
        </a>

      </div>
    </div>
  </div>,
  document.body
)}

     
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </>
  );
}