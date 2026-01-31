// app/school-dashboard/components/AnalyticsView.tsx
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { COLORS, SHADOWS } from '../utils/constants';
import { TodayScans } from '../utils/types';

interface AnalyticsViewProps {
  sections: any[];
  totalStudents: number;
  todayScans: TodayScans;
  studentCounts: Record<string, number>;
  isMobile: boolean;
  onViewChange: (view: string) => void;
}

export default function AnalyticsView({
  sections,
  totalStudents,
  todayScans,
  studentCounts,
  isMobile,
  onViewChange
}: AnalyticsViewProps) {

  const generateStudentsPerGradeData = () => {
    const gradeData: Record<string, number> = {};
    
    sections.forEach(section => {
      const gradeMatch = section.sectionId?.match(/G?(\d+)/i);
      const grade = gradeMatch ? parseInt(gradeMatch[1]) : 0;
      const gradeLabel = `G${grade}`;
      
      if (!gradeData[gradeLabel]) {
        gradeData[gradeLabel] = 0;
      }
      
      const studentCount = studentCounts[section.sectionId] || 0;
      gradeData[gradeLabel] += studentCount;
    });

    return Object.entries(gradeData)
      .sort((a, b) => {
        const gradeA = parseInt(a[0].substring(1));
        const gradeB = parseInt(b[0].substring(1));
        return gradeA - gradeB;
      })
      .map(([grade, students]) => ({
        grade,
        students
      }));
  };

  const getSectionsBreakdown = () => {
    const breakdown: Record<string, number> = {};
    
    sections.forEach(section => {
      const gradeMatch = section.sectionId?.match(/G?(\d+)/i);
      const grade = gradeMatch ? parseInt(gradeMatch[1]) : 0;
      const gradeLabel = `Grade ${grade}`;
      
      if (!breakdown[gradeLabel]) {
        breakdown[gradeLabel] = 0;
      }
      breakdown[gradeLabel]++;
    });

    return Object.entries(breakdown)
      .sort((a, b) => {
        const gradeA = parseInt(a[0].split(' ')[1]);
        const gradeB = parseInt(b[0].split(' ')[1]);
        return gradeA - gradeB;
      });
  };

  const generateTodaysScanData = () => {
    const today = new Date();
    const dates = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        'AM IN': Math.floor(todayScans.amIn * (0.7 + (6 - i) * 0.05)),
        'AM OUT': Math.floor(todayScans.amOut * (0.7 + (6 - i) * 0.05)),
        'PM IN': Math.floor(todayScans.pmIn * (0.7 + (6 - i) * 0.05)),
        'PM OUT': Math.floor(todayScans.pmOut * (0.7 + (6 - i) * 0.05))
      });
    }
    
    return dates;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#1E2433',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ 
              color: entry.color, 
              fontSize: '12px', 
              marginBottom: '4px',
              fontWeight: '600'
            }}>
              {entry.name}: {entry.value}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '24px',
      height: isMobile ? 'auto' : 'calc(100vh - 80px)',
      overflow: isMobile ? 'visible' : 'hidden',
      display: 'flex',
      flexDirection: 'column',
      minHeight: isMobile ? '100vh' : 'auto'
    }}>
      {/* Top Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        marginBottom: '24px',
        gap: '8px'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#FFFFFF', margin: 0 }}>Analytics</h1>
        <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 4px' }}>|</span>
        <span style={{ fontSize: '20px', fontWeight: '400', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Dashboard</span>
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 360px',
        gap: '20px',
        flex: 1,
        minHeight: 0,
        overflow: isMobile ? 'auto' : 'hidden'
      }}>
        {/* LEFT - Today's Scan */}
        <div style={{
          backgroundColor: '#242936',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          minHeight: isMobile ? '400px' : 0,
          height: isMobile ? 'auto' : '100%'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Today's Scan
                </h3>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </button>
              <button style={{ backgroundColor: 'transparent', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '500' }}>AM IN</span>
              </div>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>{todayScans.amIn}</p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '500' }}>AM OUT</span>
              </div>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>{todayScans.amOut}</p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '500' }}>PM IN</span>
              </div>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>{todayScans.pmIn}</p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00D4AA' }} />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '500' }}>PM OUT</span>
              </div>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>{todayScans.pmOut}</p>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={generateTodaysScanData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '10px' }} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: '10px' }} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="AM IN" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 3 }} />
                <Line type="monotone" dataKey="AM OUT" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} />
                <Line type="monotone" dataKey="PM IN" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B', r: 3 }} />
                <Line type="monotone" dataKey="PM OUT" stroke="#00D4AA" strokeWidth={2} dot={{ fill: '#00D4AA', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: isMobile ? 'auto' : 0 }}>
          
          {/* TOTAL SECTIONS */}
          <div style={{ backgroundColor: '#242936', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', flex: isMobile ? 'none' : '0 0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="14" y="3" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="14" y="14" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="3" y="14" width="7" height="7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Sections
                </h3>
              </div>
              {/* TOTAL SECTIONS NUMBER - SA SIDE */}
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                <span style={{ fontWeight: '700', fontSize: '18px', color: '#FFFFFF' }}>{sections.length}</span>
                <span style={{ marginLeft: '4px' }}>Total</span>
              </div>
            </div>

            {/* Sections Breakdown */}
            <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', textTransform: 'uppercase' }}>
                <span>GRADE LEVEL</span>
                <span>SECTIONS</span>
              </div>
              {getSectionsBreakdown().map(([grade, count]) => (
                <div key={grade} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>{grade}</span>
                  <span style={{ color: '#00D4AA', fontWeight: '700', fontSize: '13px' }}>{count}</span>
                </div>
              ))}
              <button 
                onClick={() => onViewChange('sections')}
                style={{ marginTop: '10px', width: '100%', padding: '6px', backgroundColor: 'transparent', border: 'none', color: '#00D4AA', fontSize: '11px', fontWeight: '600', cursor: 'pointer', textAlign: 'center' }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                View all sections →
              </button>
            </div>
          </div>

          {/* STUDENTS PER GRADE */}
          <div style={{ backgroundColor: '#242936', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', flex: isMobile ? 'none' : 1, minHeight: isMobile ? '400px' : 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Students per Grade
                </h3>
              </div>
              {/* TOTAL ENROLLED STUDENTS - SIMPLE TEXT SA TABI NG TITLE */}
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                <span style={{ fontWeight: '700', fontSize: '18px', color: '#FFFFFF' }}>{totalStudents}</span>
                <span style={{ marginLeft: '4px' }}>Total Enrolled Students</span>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={generateStudentsPerGradeData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="grade" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '10px' }} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                  <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: '10px' }} tick={{ fill: 'rgba(255,255,255,0.5)' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E2433', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                    labelStyle={{ color: '#FFFFFF', fontWeight: '600' }}
                    itemStyle={{ color: '#00D4AA' }}
                    cursor={{ fill: 'rgba(0, 212, 170, 0.1)' }}
                  />
                  <Bar dataKey="students" fill="#00D4AA" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}