'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image'

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
  
  // Trial form state
  const [trialForm, setTrialForm] = useState({
    schoolId: '',
    schoolName: '',
    schoolAddress: '',
    principalName: '',
    mobileNumber: '',
    email: ''
  });
  const [formErrors, setFormErrors] = useState<{
    schoolId?: string;
    schoolName?: string;
    schoolAddress?: string;
    principalName?: string;
    mobileNumber?: string;
    email?: string;
    submit?: string;
  }>({});
  
  const phrases = [
    "Real-Time Monitoring",
    "Progress Tracking",
    "Mobile Accessibility"
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
    const errors: {
      schoolId?: string;
      schoolName?: string;
      schoolAddress?: string;
      principalName?: string;
      mobileNumber?: string;
      email?: string;
    } = {};
    
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
      // Check if school ID already exists
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
      
      // Save submitted data for display in success modal
      setSubmittedData({
        mobileNumber: trialForm.mobileNumber,
        email: trialForm.email
      });
      
      // Save to Firebase
      await addDoc(collection(db, 'trial_requests'), {
        ...trialForm,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      
      // Close trial modal and show success modal
      setShowTrialModal(false);
      setShowSuccessModal(true);
      
      // Reset form
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
      
      // Check if it's a Firebase connection error
      if (error?.code === 'unavailable' || 
          error?.message?.includes('Failed to get document') ||
          error?.message?.includes('Could not reach') ||
          error?.message?.includes('offline') ||
          !navigator.onLine) {
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
      // Only accept school account PINs (sectionId must be null or empty)
      const pinQuery = query(
        collection(db, 'pincodes'),
        where('code', '==', enteredPin),
        where('isActive', '==', true)
      );
      
      const pinSnapshot = await getDocs(pinQuery);
      
      if (!pinSnapshot.empty) {
        const pinDoc = pinSnapshot.docs[0];
        const pinData = pinDoc.data();
        
        // Check if this is a section account PIN (reject it)
        if (pinData.sectionId && pinData.sectionId !== null && pinData.sectionId !== '') {
          setErrorMessage('Section account access is not available. Please use school account PIN.');
          setIsVerifying(false);
          return;
        }
        
        // Only allow school account PINs
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
      <div style={{ minHeight: '100vh', overflow: 'auto', background: '#FFFFFF' }}>
        <header style={{ backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
              onClick={() => router.push('/')}
            >
             <Image 
  src="/logo.png" 
  alt="ScanED Logo" 
  width={48} 
  height={48}
  priority
  unoptimized
/>
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
              <a 
                href="/" 
                style={{ color: '#374151', fontWeight: '500', textDecoration: 'none', fontSize: '16px', padding: '8px 0' }}
                onClick={() => setShowMobileMenu(false)}
              >
                Home
              </a>
              <a 
                href="/about" 
                style={{ color: '#374151', fontWeight: '500', textDecoration: 'none', fontSize: '16px', padding: '8px 0' }}
                onClick={() => setShowMobileMenu(false)}
              >
                About
              </a>
              <a 
                href="/subscribers" 
                style={{ color: '#374151', fontWeight: '500', textDecoration: 'none', fontSize: '16px', padding: '8px 0' }}
                onClick={() => setShowMobileMenu(false)}
              >
                Subscribers
              </a>
            </div>
          )}
        </header>

        <main style={{ padding: '20px 24px', minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: '1280px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: isMobile ? '32px' : '80px', justifyContent: 'center' }}>
              
              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
               <Image 
  src="/hero.png" 
  alt="ScanED Education Tracker"
  width={400}
  height={400}
  priority
  unoptimized
  style={{
    width: '100%',
    maxWidth: isMobile ? '280px' : '400px',
    height: 'auto',
    filter: 'drop-shadow(0 25px 60px rgba(0,0,0,0.15))'
  }}
/>
              </div>

              <div style={{ flex: '1', minWidth: isMobile ? '100%' : '300px', maxWidth: '600px', textAlign: isMobile ? 'center' : 'left' }}>
                <h1 style={{ 
                  fontSize: isMobile ? '48px' : 'clamp(60px, 8vw, 90px)', 
                  fontWeight: '900', 
                  lineHeight: '0.9', 
                  letterSpacing: '-0.025em', 
                  color: '#111827',
                  marginBottom: '20px'
                }}>
                  ScanED Attendance
                </h1>
                
                <div style={{ minHeight: isMobile ? '60px' : 'clamp(80px, 12vw, 120px)', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: isMobile ? '32px' : 'clamp(48px, 6vw, 65px)', fontWeight: '900', lineHeight: '0.9', letterSpacing: '-0.025em' }}>
                    <span style={{ color: '#6DCAC3' }}>{currentText}</span>
                    <span style={{ color: '#F5A76C', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>|</span>
                  </h2>
                </div>

                <p style={{ 
                  fontSize: isMobile ? '16px' : 'clamp(18px, 2vw, 20px)', 
                  color: '#4B5563', 
                  lineHeight: '1.75', 
                  maxWidth: '640px',
                  marginTop: '12px',
                  marginBottom: '32px',
                  marginLeft: isMobile ? 'auto' : '0',
                  marginRight: isMobile ? 'auto' : '0'
                }}>
                  Empower educators with tools to improve student outcomes.
                </p>

                {/* FREE TRIAL Button */}
                <button
                  onClick={() => setShowTrialModal(true)}
                  style={{
                    padding: '16px 48px',
                    backgroundColor: '#F5A76C',
                    color: 'white',
                    borderRadius: '12px',
                    fontWeight: '700',
                    fontSize: '18px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 10px 25px rgba(245, 167, 108, 0.4)',
                    transition: 'all 0.3s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    margin: isMobile ? '0 auto' : '0'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E89659';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 15px 35px rgba(245, 167, 108, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5A76C';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(245, 167, 108, 0.4)';
                  }}
                >
                  <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Start FREE Trial
                </button>
                
                <p style={{ 
                  fontSize: '14px', 
                  color: '#9CA3AF', 
                  marginTop: '12px',
                  textAlign: isMobile ? 'center' : 'left'
                }}>
                  7 days free trial • No credit card required
                </p>
              </div>

            </div>
          </div>
        </main>

        {/* Floating Contact Button */}
        <button
          onClick={() => setShowContactModal(true)}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#6DCAC3',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            zIndex: 1000
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
          }}
        >
          <svg style={{ width: '28px', height: '28px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

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

      {/* FREE TRIAL Registration Modal - Compact Size */}
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
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            overflowY: 'auto',
            padding: '20px'
          }}
          onClick={handleTrialModalClose}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: isMobile ? '24px 20px' : '32px 28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxWidth: '480px',
              width: '100%',
              position: 'relative',
              margin: '20px auto',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleTrialModalClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                color: '#9CA3AF',
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
              <div style={{ 
                width: '60px', 
                height: '60px', 
                backgroundColor: '#FEF3C7', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <svg style={{ width: '30px', height: '30px', color: '#F5A76C' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '6px' }}>
                Start Your Free Trial
              </h2>
              <p style={{ color: '#6B7280', fontSize: '14px' }}>
                Get 7 days of full access to ScanED
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleTrialSubmit(); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* School ID */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '13px' }}>
                  School ID <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={trialForm.schoolId}
                  onChange={(e) => setTrialForm({ ...trialForm, schoolId: e.target.value })}
                  placeholder="e.g., SCH001"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `2px solid ${formErrors.schoolId ? '#DC2626' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: 'white'
                  }}
                  onFocus={(e) => !formErrors.schoolId && (e.target.style.borderColor = '#6DCAC3')}
                  onBlur={(e) => !formErrors.schoolId && (e.target.style.borderColor = '#E5E7EB')}
                />
                {formErrors.schoolId && (
                  <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}>{formErrors.schoolId}</p>
                )}
              </div>

              {/* School Name */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '13px' }}>
                  School Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={trialForm.schoolName}
                  onChange={(e) => setTrialForm({ ...trialForm, schoolName: e.target.value })}
                  placeholder="e.g., San Pedro High School"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `2px solid ${formErrors.schoolName ? '#DC2626' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: 'white'
                  }}
                  onFocus={(e) => !formErrors.schoolName && (e.target.style.borderColor = '#6DCAC3')}
                  onBlur={(e) => !formErrors.schoolName && (e.target.style.borderColor = '#E5E7EB')}
                />
                {formErrors.schoolName && (
                  <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}>{formErrors.schoolName}</p>
                )}
              </div>

              {/* School Address */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '13px' }}>
                  School Address <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  value={trialForm.schoolAddress}
                  onChange={(e) => setTrialForm({ ...trialForm, schoolAddress: e.target.value })}
                  placeholder="Complete school address"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `2px solid ${formErrors.schoolAddress ? '#DC2626' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    backgroundColor: 'white'
                  }}
                  onFocus={(e) => !formErrors.schoolAddress && (e.target.style.borderColor = '#6DCAC3')}
                  onBlur={(e) => !formErrors.schoolAddress && (e.target.style.borderColor = '#E5E7EB')}
                />
                {formErrors.schoolAddress && (
                  <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}>{formErrors.schoolAddress}</p>
                )}
              </div>

              {/* Principal Name */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '13px' }}>
                  Principal Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={trialForm.principalName}
                  onChange={(e) => setTrialForm({ ...trialForm, principalName: e.target.value })}
                  placeholder="e.g., Dr. Maria Santos"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `2px solid ${formErrors.principalName ? '#DC2626' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: 'white'
                  }}
                  onFocus={(e) => !formErrors.principalName && (e.target.style.borderColor = '#6DCAC3')}
                  onBlur={(e) => !formErrors.principalName && (e.target.style.borderColor = '#E5E7EB')}
                />
                {formErrors.principalName && (
                  <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}>{formErrors.principalName}</p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '13px' }}>
                  Mobile Number <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={trialForm.mobileNumber}
                  onChange={(e) => setTrialForm({ ...trialForm, mobileNumber: e.target.value })}
                  placeholder="e.g., 09123456789"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `2px solid ${formErrors.mobileNumber ? '#DC2626' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: 'white'
                  }}
                  onFocus={(e) => !formErrors.mobileNumber && (e.target.style.borderColor = '#6DCAC3')}
                  onBlur={(e) => !formErrors.mobileNumber && (e.target.style.borderColor = '#E5E7EB')}
                />
                {formErrors.mobileNumber && (
                  <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}>{formErrors.mobileNumber}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '13px' }}>
                  Email Address <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="email"
                  value={trialForm.email}
                  onChange={(e) => setTrialForm({ ...trialForm, email: e.target.value })}
                  placeholder="e.g., principal@school.edu.ph"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `2px solid ${formErrors.email ? '#DC2626' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    backgroundColor: 'white'
                  }}
                  onFocus={(e) => !formErrors.email && (e.target.style.borderColor = '#6DCAC3')}
                  onBlur={(e) => !formErrors.email && (e.target.style.borderColor = '#E5E7EB')}
                />
                {formErrors.email && (
                  <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px' }}>{formErrors.email}</p>
                )}
              </div>

              {formErrors.submit && (
                <div style={{ 
                  padding: '12px 16px', 
                  backgroundColor: '#FEE2E2', 
                  border: '2px solid #FCA5A5',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <p style={{ color: '#DC2626', fontSize: '13px', fontWeight: '600', margin: 0 }}>
                    {formErrors.submit}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#F5A76C',
                  opacity: isSubmitting ? 0.6 : 1,
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '14px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  marginTop: '4px'
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor = '#E89659';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F5A76C';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {isSubmitting ? 'SUBMITTING...' : 'REQUEST FREE TRIAL'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Success Modal - Contact Administrator */}
      {typeof window !== 'undefined' && mounted && showSuccessModal && createPortal(
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
          onClick={() => setShowSuccessModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: isMobile ? '40px 24px' : '48px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxWidth: '500px',
              width: '100%',
              margin: '16px',
              position: 'relative',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success Icon */}
            <div style={{ 
              width: '100px', 
              height: '100px', 
              backgroundColor: '#D1FAE5', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <svg style={{ width: '50px', height: '50px', color: '#10B981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>
              Request Submitted! 🎉
            </h2>

            <p style={{ color: '#6B7280', fontSize: '18px', lineHeight: '1.6', marginBottom: '32px' }}>
              Thank you for your interest in ScanED! Our administrator will contact you shortly to set up your free trial.
            </p>

            <div style={{ 
              marginBottom: '32px', 
              padding: '20px', 
              backgroundColor: '#FEF3C7', 
              borderRadius: '12px',
              border: '2px solid #FDE68A'
            }}>
              <p style={{ fontSize: '15px', color: '#92400E', lineHeight: '1.6', marginBottom: '12px' }}>
                <strong>📞 We'll reach out to you via:</strong>
              </p>
              <p style={{ fontSize: '14px', color: '#92400E', lineHeight: '1.5' }}>
                • Mobile: {submittedData.mobileNumber}<br/>
                • Email: {submittedData.email}
              </p>
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#6DCAC3',
                color: 'white',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '16px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#5AB9B3';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6DCAC3';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              GOT IT!
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Contact Modal */}
      {typeof window !== 'undefined' && mounted && showContactModal && createPortal(
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
          onClick={() => setShowContactModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxWidth: '400px',
              width: '100%',
              margin: '16px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowContactModal(false)}
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

            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: '24px' }}>
              Contact Us
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <a
                href="https://m.me/YOUR_PAGE_ID"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  color: '#111827',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  backgroundColor: '#0084FF', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg style={{ width: '24px', height: '24px', color: 'white' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.912 1.448 5.51 3.717 7.224V22l3.371-1.85c.9.25 1.853.387 2.839.387 5.523 0 10-4.145 10-9.243S17.523 2 12 2zm.993 12.464l-2.549-2.72-4.977 2.72 5.475-5.808 2.611 2.72 4.915-2.72-5.475 5.808z"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Messenger</div>
                  <div style={{ fontSize: '14px', color: '#6B7280' }}>Chat with us</div>
                </div>
              </a>

              <a
                href="tel:+639267995647"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  color: '#111827',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  backgroundColor: '#10B981', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg style={{ width: '24px', height: '24px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Mobile</div>
                  <div style={{ fontSize: '14px', color: '#6B7280' }}>+63 926 799 5647</div>
                </div>
              </a>

              <a
                href="mailto:dmcgsolutions0314@gmail.com"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  color: '#111827',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  backgroundColor: '#6DCAC3', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg style={{ width: '24px', height: '24px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Email</div>
                  <div style={{ fontSize: '14px', color: '#6B7280' }}>dmcgsolutions0314@gmail.com</div>
                </div>
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}