// app/school-dashboard/components/SectionsView.tsx
'use client';

import { useState } from 'react';
import { COLORS, TRANSITIONS, SHADOWS } from '../utils/constants';
import { Section } from '../utils/types';

interface SectionsViewProps {
  sections: Section[];
  studentCounts: Record<string, number>;
  schoolId: string;
  isMobile: boolean;
  onOpenStudentList: (section: Section) => void;
  onOpenAttendance: (section: Section) => void;
  onOpenTopAttendees: (section: Section) => void;
  onOpenSF2: (section: Section) => void;
  unlockedSections: Set<string>;
  onSectionClick: (section: Section) => void;
}

export default function SectionsView({
  sections,
  studentCounts,
  schoolId,
  isMobile,
  onOpenStudentList,
  onOpenAttendance,
  onOpenTopAttendees,
  onOpenSF2,
  unlockedSections,
  onSectionClick,
}: SectionsViewProps) {
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());

  const extractGradeFromSectionId = (sectionId: string) => {
    const match = sectionId?.match(/G?(\d+)/i);
    return match ? match[1] : 'Unassigned';
  };

  const sectionsByGrade = sections.reduce((acc: any, section) => {
    const grade = extractGradeFromSectionId(section.sectionId);
    if (!acc[grade]) {
      acc[grade] = [];
    }
    acc[grade].push(section);
    return acc;
  }, {});

  Object.keys(sectionsByGrade).forEach(grade => {
    sectionsByGrade[grade].sort((a: any, b: any) => 
      (a.sectionName || '').localeCompare(b.sectionName || '')
    );
  });

  const grades = Object.keys(sectionsByGrade).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return parseInt(a) - parseInt(b);
  });

  const toggleGrade = (grade: string) => {
    const newExpanded = new Set(expandedGrades);
    if (newExpanded.has(grade)) {
      newExpanded.delete(grade);
    } else {
      newExpanded.add(grade);
    }
    setExpandedGrades(newExpanded);
  };

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '24px',
      height: isMobile ? 'auto' : 'calc(100vh - 80px)',
      overflow: isMobile ? 'visible' : 'auto',
      minHeight: isMobile ? '100vh' : 'auto'
    }}>
      {/* Header - Same style as Analytics | Dashboard */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        marginBottom: '24px',
        gap: '8px'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#FFFFFF', margin: 0 }}>Sections</h1>
        <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 4px' }}>|</span>
        <span style={{ fontSize: '20px', fontWeight: '400', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Manage Sections</span>
      </div>

      {/* Sections List */}
      {grades.map((grade) => (
        <div key={grade} style={{ marginBottom: '12px' }}>
          {/* Grade Header - Compact Style */}
          <div 
            onClick={() => toggleGrade(grade)}
            style={{ 
              backgroundColor: '#242936',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.1)',
              transition: `all ${TRANSITIONS.normal}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00D4AA';
              e.currentTarget.style.backgroundColor = 'rgba(0, 212, 170, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.backgroundColor = '#242936';
            }}
          >
            {/* Arrow Icon */}
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#00D4AA" 
              strokeWidth="2.5"
              style={{ 
                transform: expandedGrades.has(grade) ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: `transform ${TRANSITIONS.normal}`
              }}
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            
            <h2 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#FFFFFF', 
              margin: 0,
              flex: 1
            }}>
              Grade {grade}
            </h2>
            
            {/* Count Badge */}
            <span style={{ 
              fontSize: '14px', 
              color: '#FFFFFF',
              fontWeight: '700',
              backgroundColor: '#00D4AA',
              padding: '4px 12px',
              borderRadius: '20px',
              minWidth: '32px',
              textAlign: 'center'
            }}>
              {sectionsByGrade[grade].length}
            </span>
          </div>

          {/* Expanded Sections */}
          {expandedGrades.has(grade) && (
            <div style={{ 
              backgroundColor: '#242936',
              borderRadius: '12px',
              marginTop: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {!isMobile && (
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: '2fr 2fr 1fr 3fr',
                  gap: '16px',
                  padding: '12px 20px',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SECTION</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ADVISER</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>STUDENTS</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIONS</div>
                </div>
              )}

              {sectionsByGrade[grade].map((section: any) => {
                const isUnlocked = unlockedSections.has(section.sectionId);
                
                return isMobile ? (
                  // MOBILE CARD VIEW
                  <div
                    key={section.id}
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}
                  >
                    <div style={{ marginBottom: '14px' }}>
                      <div 
                        onClick={() => !isUnlocked && onSectionClick(section)}
                        style={{ 
                          fontSize: '15px', 
                          color: '#FFFFFF', 
                          fontWeight: '600',
                          cursor: isUnlocked ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px'
                        }}
                      >
                        {section.sectionName}
                        {!isUnlocked && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5">
                            <rect x="5" y="11" width="14" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                        <strong>Adviser:</strong> {section.adviser || 'No adviser'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                        <strong>Students:</strong> <span style={{ color: '#00D4AA', fontWeight: '600' }}>{studentCounts[section.sectionId] || 0}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button
                        onClick={() => onOpenStudentList(section)}
                        disabled={!isUnlocked}
                        style={{
                          width: '100%',
                          padding: '9px',
                          backgroundColor: isUnlocked ? '#00D4AA' : 'rgba(255,255,255,0.05)',
                          color: isUnlocked ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: isUnlocked ? 'pointer' : 'not-allowed',
                          fontSize: '12px',
                          fontWeight: '600',
                          opacity: isUnlocked ? 1 : 0.5
                        }}
                      >
                        Student List
                      </button>
                      <button
                        onClick={() => onOpenAttendance(section)}
                        disabled={!isUnlocked}
                        style={{
                          width: '100%',
                          padding: '9px',
                          backgroundColor: isUnlocked ? '#00D4AA' : 'rgba(255,255,255,0.05)',
                          color: isUnlocked ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: isUnlocked ? 'pointer' : 'not-allowed',
                          fontSize: '12px',
                          fontWeight: '600',
                          opacity: isUnlocked ? 1 : 0.5
                        }}
                      >
                        Attendance
                      </button>
                      <button
                        onClick={() => onOpenTopAttendees(section)}
                        disabled={!isUnlocked}
                        style={{
                          width: '100%',
                          padding: '9px',
                          backgroundColor: isUnlocked ? '#00D4AA' : 'rgba(255,255,255,0.05)',
                          color: isUnlocked ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: isUnlocked ? 'pointer' : 'not-allowed',
                          fontSize: '12px',
                          fontWeight: '600',
                          opacity: isUnlocked ? 1 : 0.5
                        }}
                      >
                        Top Attendees
                      </button>
                      <button
                        onClick={() => onOpenSF2(section)}
                        disabled={!isUnlocked}
                        style={{
                          width: '100%',
                          padding: '9px',
                          backgroundColor: isUnlocked ? '#00D4AA' : 'rgba(255,255,255,0.05)',
                          color: isUnlocked ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: isUnlocked ? 'pointer' : 'not-allowed',
                          fontSize: '12px',
                          fontWeight: '600',
                          opacity: isUnlocked ? 1 : 0.5
                        }}
                      >
                        SF2
                      </button>
                    </div>
                  </div>
                ) : (
                  // DESKTOP GRID VIEW
                  <div
                    key={section.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 2fr 1fr 3fr',
                      gap: '16px',
                      padding: '14px 20px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      transition: `background-color ${TRANSITIONS.fast}`
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Section Name */}
                    <div 
                      onClick={() => !isUnlocked && onSectionClick(section)}
                      style={{ 
                        fontSize: '14px', 
                        color: '#FFFFFF', 
                        fontWeight: '500',
                        cursor: isUnlocked ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {section.sectionName}
                      {!isUnlocked && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5">
                          <rect x="5" y="11" width="14" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    
                    {/* Adviser */}
                    <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center' }}>
                      {section.adviser || 'No adviser'}
                    </div>
                    
                    {/* Student Count */}
                    <div style={{ fontSize: '16px', color: '#00D4AA', fontWeight: '700', display: 'flex', alignItems: 'center' }}>
                      {studentCounts[section.sectionId] || 0}
                    </div>
                    
                    {/* ACTIONS - COMPACT BUTTONS */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                      <ActionButton
                        onClick={() => onOpenStudentList(section)}
                        disabled={!isUnlocked}
                        label="Student List"
                      />
                      <ActionButton
                        onClick={() => onOpenAttendance(section)}
                        disabled={!isUnlocked}
                        label="Attendance"
                      />
                      <ActionButton
                        onClick={() => onOpenTopAttendees(section)}
                        disabled={!isUnlocked}
                        label="Top Attendees"
                      />
                      <ActionButton
                        onClick={() => onOpenSF2(section)}
                        disabled={!isUnlocked}
                        label="SF2"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Action Button Component - COMPACT VERSION
interface ActionButtonProps {
  onClick: () => void;
  disabled: boolean;
  label: string;
}

function ActionButton({ onClick, disabled, label }: ActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '6px 12px',
        backgroundColor: disabled ? 'rgba(255,255,255,0.05)' : (isHovered ? '#00D4AA' : '#1E2433'),
        border: `1px solid ${disabled ? 'rgba(255,255,255,0.05)' : (isHovered ? '#00D4AA' : 'rgba(255,255,255,0.1)')}`,
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '11px',
        color: disabled ? 'rgba(255,255,255,0.3)' : (isHovered ? '#FFFFFF' : 'rgba(255,255,255,0.7)'),
        fontWeight: '600',
        transition: `all ${TRANSITIONS.normal}`,
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap'
      }}
    >
      {label}
    </button>
  );
}