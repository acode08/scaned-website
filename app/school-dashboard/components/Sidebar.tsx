// app/school-dashboard/components/Sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, TRANSITIONS, SHADOWS } from '../utils/constants';

interface SidebarProps {
  schoolData: any;
  schoolId: string;
  schoolLogo: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
  isMobile: boolean;
}

export default function Sidebar({
  schoolData,
  schoolId,
  schoolLogo,
  collapsed,
  onToggleCollapse,
  activeView,
  onViewChange,
  isMobile,
}: SidebarProps) {
  const router = useRouter();

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/');
  };

  return (
    <div style={{
      width: collapsed ? '70px' : '280px',
      backgroundColor: COLORS.bgSidebar,
      height: '100vh',
      position: 'fixed',
      left: isMobile && collapsed ? '-70px' : '0',
      top: 0,
      transition: `all ${TRANSITIONS.slow}`,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      borderRight: `1px solid ${COLORS.border}`,
      boxShadow: isMobile && !collapsed ? SHADOWS.xl : SHADOWS.sm,
      overflow: 'hidden'
    }}>
      
      {/* School Logo & Name Header */}
      <div style={{
        padding: '24px 20px',
        borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: '12px',
        minHeight: '80px',
        cursor: 'pointer'
      }}
      onClick={onToggleCollapse}
      >
        {/* School Logo */}
        <div style={{
          width: collapsed ? '40px' : '48px',
          height: collapsed ? '40px' : '48px',
          borderRadius: '12px',
          backgroundColor: COLORS.bgDark,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          border: `2px solid ${COLORS.border}`,
          flexShrink: 0
        }}>
          <img 
            src={schoolLogo} 
            alt="School Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo.png';
            }}
          />
        </div>
        
        {/* School Name & ID (only when expanded) */}
        {!collapsed && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <h2 style={{ 
              fontSize: '16px', 
              fontWeight: '700', 
              color: COLORS.textPrimary, 
              margin: 0,
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {schoolData?.schoolName || 'School Name'}
            </h2>
            <p style={{ fontSize: '11px', color: COLORS.textMuted, margin: '4px 0 0 0', fontWeight: '500' }}>
              ID: {schoolId}
            </p>
          </div>
        )}
        
        {/* Toggle Button (only when expanded) */}
        {!collapsed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: COLORS.textSecondary,
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              transition: `all ${TRANSITIONS.normal}`,
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.bgCardHover;
              e.currentTarget.style.color = COLORS.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = COLORS.textSecondary;
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {/* Hamburger when collapsed */}
        {collapsed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '-45px',
              width: '36px',
              height: '36px',
              background: COLORS.bgCard,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '8px',
              color: COLORS.textSecondary,
              cursor: 'pointer',
              padding: '6px',
              transition: `all ${TRANSITIONS.normal}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: SHADOWS.md
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.primary;
              e.currentTarget.style.color = COLORS.textPrimary;
              e.currentTarget.style.borderColor = COLORS.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.bgCard;
              e.currentTarget.style.color = COLORS.textSecondary;
              e.currentTarget.style.borderColor = COLORS.border;
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation - ONLY OVERVIEW AND SECTIONS */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 0' }}>
        
        {/* Overview (Analytics) */}
        <button
          onClick={() => onViewChange('analytics')}
          style={{
            width: '100%',
            padding: collapsed ? '14px 20px' : '12px 20px',
            margin: '0 0 4px 0',
            background: activeView === 'analytics' ? COLORS.primary : 'transparent',
            border: 'none',
            color: activeView === 'analytics' ? COLORS.textPrimary : COLORS.textSecondary,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeView === 'analytics' ? '600' : '500',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: `all ${TRANSITIONS.normal}`,
            textAlign: 'left',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: collapsed ? '0' : '0 8px 8px 0',
            marginRight: collapsed ? '0' : '8px',
            marginLeft: collapsed ? '0' : '8px'
          }}
          onMouseEnter={(e) => {
            if (activeView !== 'analytics') {
              e.currentTarget.style.backgroundColor = COLORS.bgCardHover;
              e.currentTarget.style.color = COLORS.primary;
            }
          }}
          onMouseLeave={(e) => {
            if (activeView !== 'analytics') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = COLORS.textSecondary;
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="14" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="14" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="3" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {!collapsed && <span>Overview</span>}
        </button>

        {/* Sections */}
        <button
          onClick={() => onViewChange('sections')}
          style={{
            width: '100%',
            padding: collapsed ? '14px 20px' : '12px 20px',
            margin: '0 0 4px 0',
            background: activeView === 'sections' ? COLORS.primary : 'transparent',
            border: 'none',
            color: activeView === 'sections' ? COLORS.textPrimary : COLORS.textSecondary,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeView === 'sections' ? '600' : '500',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: `all ${TRANSITIONS.normal}`,
            textAlign: 'left',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: collapsed ? '0' : '0 8px 8px 0',
            marginRight: collapsed ? '0' : '8px',
            marginLeft: collapsed ? '0' : '8px'
          }}
          onMouseEnter={(e) => {
            if (activeView !== 'sections') {
              e.currentTarget.style.backgroundColor = COLORS.bgCardHover;
              e.currentTarget.style.color = COLORS.primary;
            }
          }}
          onMouseLeave={(e) => {
            if (activeView !== 'sections') {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = COLORS.textSecondary;
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          {!collapsed && <span>Sections</span>}
        </button>
      </div>

      {/* LOGOUT BUTTON AT BOTTOM */}
      <div style={{ 
        borderTop: `1px solid ${COLORS.border}`, 
        padding: '12px'
      }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: collapsed ? '12px' : '12px 16px',
            backgroundColor: COLORS.errorBg,
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            color: COLORS.error,
            fontWeight: '600',
            transition: `all ${TRANSITIONS.normal}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '10px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.error;
            e.currentTarget.style.color = COLORS.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.errorBg;
            e.currentTarget.style.color = COLORS.error;
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}