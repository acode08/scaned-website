// app/school-dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Sidebar from './components/Sidebar';
import AnalyticsView from './components/AnalyticsView';
import SectionsView from './components/SectionsView';
import { COLORS, SHADOWS, TRANSITIONS } from './utils/constants';
import { School, Section, Student, TodayScans } from './utils/types';

// ⬇️ ADD THESE HELPER FUNCTIONS HERE ⬇️
function extractSectionFromStudentId(studentId: string): string | null {
  if (!studentId) return null;
  const parts = studentId.split('_');
  if (parts.length < 2) return null;
  let sectionPart = parts[1].replace(/\s*-\s*/g, ' ').trim();
  return sectionPart;
}

function getSectionIdentifier(section: Section): string {
  const gradeMatch = section.sectionId?.match(/G?(\d+)/i);
  const grade = gradeMatch ? gradeMatch[1] : '';
  const name = (section.sectionName || '').trim().toUpperCase();
  return `${grade} ${name}`;
}

function parseScanDateTime(scanDateTime: any): Date | null {
  try {
    if (scanDateTime && typeof scanDateTime === 'object' && scanDateTime.toDate) {
      return scanDateTime.toDate();
    } else if (scanDateTime) {
      return new Date(scanDateTime);
    }
    return null;
  } catch (err) {
    return null;
  }
}

function isAMSession(session: string): boolean {
  return session === 'AM' || session === 'WD AM' || session === 'WD';
}

function isPMSession(session: string): boolean {
  return session === 'PM' || session === 'WD PM' || session === 'WD';
}
// ⬆️ END OF HELPER FUNCTIONS ⬆️

export default function SchoolDashboard() {
  const router = useRouter();
  
  // Basic States
  const [schoolId, setSchoolId] = useState('');
  const [schoolData, setSchoolData] = useState<School | null>(null);
  const [schoolLogo, setSchoolLogo] = useState<string>('/logo.png');
  const [sections, setSections] = useState<Section[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState('analytics');
  
  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(false);
  
  // Analytics States
  const [todayScans, setTodayScans] = useState<TodayScans>({ amIn: 0, amOut: 0, pmIn: 0, pmOut: 0 });
  
  // PIN VALIDATION STATES
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [unlockedSections, setUnlockedSections] = useState<Set<string>>(new Set());
  const [pendingSection, setPendingSection] = useState<Section | null>(null);
  const [pendingAction, setPendingAction] = useState<string>('');

  // Modal States
  const [showStudentListModal, setShowStudentListModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [sectionStudents, setSectionStudents] = useState<Student[]>([]);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showTopAttendeesModal, setShowTopAttendeesModal] = useState(false);
  const [showSF2Modal, setShowSF2Modal] = useState(false);
  const [sf2Month, setSF2Month] = useState(new Date().getMonth() + 1);
  const [sf2Year, setSF2Year] = useState(new Date().getFullYear());

  // Attendance States
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStudent, setSelectedStudent] = useState('all');
  
  // Top Attendees States
  const [topCount, setTopCount] = useState(10);
  const [topAttendees, setTopAttendees] = useState<any[]>([]);
  
  // PDF/Print States
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [generatingSF2, setGeneratingSF2] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch today's scans for analytics
  const fetchTodayScans = async (schoolIdParam: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendanceQuery = query(collection(db, 'attendance'));
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      let amInCount = 0;
      let amOutCount = 0;
      let pmInCount = 0;
      let pmOutCount = 0;
      
      attendanceSnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        if (!data.schoolId || data.schoolId !== schoolIdParam) return;
        
        try {
          let scanDateTime: Date;
          
          if (data.scanDateTime && typeof data.scanDateTime === 'object' && data.scanDateTime.toDate) {
            scanDateTime = data.scanDateTime.toDate();
          } else if (data.scanDateTime) {
            scanDateTime = new Date(data.scanDateTime);
          } else {
            return;
          }
          
          if (isNaN(scanDateTime.getTime())) return;
          
          const scanDate = scanDateTime.toISOString().split('T')[0];
          
          if (scanDate === today) {
            const action = (data.action || '').toUpperCase();
            const session = data.session || 'WD';
            
            if ((session === 'AM' || session === 'WD AM' || session === 'WD') && action === 'IN') {
              amInCount++;
            } else if ((session === 'AM' || session === 'WD AM' || session === 'WD') && action === 'OUT') {
              amOutCount++;
            } else if ((session === 'PM' || session === 'WD PM' || session === 'WD') && action === 'IN') {
              pmInCount++;
            } else if ((session === 'PM' || session === 'WD PM' || session === 'WD') && action === 'OUT') {
              pmOutCount++;
            }
          }
        } catch (err) {
          console.error('Error processing scan:', err);
        }
      });
      
      setTodayScans({ amIn: amInCount, amOut: amOutCount, pmIn: pmInCount, pmOut: pmOutCount });
    } catch (error) {
      console.error('Error fetching today scans:', error);
    }
  };

  // useEffect for fetching school data
  useEffect(() => {
    const fetchSchoolData = async () => {
      const storedSchoolId = sessionStorage.getItem('schoolId');
      const pinType = sessionStorage.getItem('pinType');

      if (!storedSchoolId || pinType !== 'school') {
        router.push('/');
        return;
      }

      setSchoolId(storedSchoolId);

      try {
        const schoolQuery = query(
          collection(db, 'schools'),
          where('schoolId', '==', storedSchoolId)
        );
        const schoolSnapshot = await getDocs(schoolQuery);
        if (!schoolSnapshot.empty) {
          const schoolDataFromDB = schoolSnapshot.docs[0].data() as School;
          setSchoolData(schoolDataFromDB);
          
          if (schoolDataFromDB.logo) {
            let logoUrl = '/logo.png';
            
            if (schoolDataFromDB.logo.startsWith('http')) {
              logoUrl = schoolDataFromDB.logo;
            } else if (schoolDataFromDB.logo.startsWith('gs://')) {
              const gsPath = schoolDataFromDB.logo.replace('gs://', '');
              const [bucket, ...pathParts] = gsPath.split('/');
              const filePath = pathParts.join('/');
              logoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
            } else {
              logoUrl = `/school-logos/${schoolDataFromDB.logo}`;
            }
            
            setSchoolLogo(logoUrl);
          }
        }

        const sectionsQuery = query(
          collection(db, 'sections'),
          where('schoolId', '==', storedSchoolId)
        );
        const sectionsSnapshot = await getDocs(sectionsQuery);
        const sectionsData = sectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Section[];
        setSections(sectionsData);

       const studentsQuery = query(collection(db, 'students'));
const studentsSnapshot = await getDocs(studentsQuery);
const counts: Record<string, number> = {};

// Initialize counts
sectionsData.forEach(section => {
  counts[section.sectionId] = 0;
});

// Count using FIXED logic
studentsSnapshot.docs.forEach(doc => {
  const studentData = doc.data();
  const studentId = studentData.studentId;
  
  if (studentId?.startsWith(storedSchoolId + '_')) {
    const studentSection = extractSectionFromStudentId(studentId);
    
    sectionsData.forEach(section => {
      const sectionIdentifier = getSectionIdentifier(section);
      
      if (studentSection === sectionIdentifier) {
        counts[section.sectionId]++;
      }
    });
  }
});

console.log('✅ Student counts:', counts);
console.log('✅ Total:', Object.values(counts).reduce((s, c) => s + c, 0));

setStudentCounts(counts);
        
        await fetchTodayScans(storedSchoolId);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolData();
  }, [router]);

  // PIN VALIDATION - Handle section name click
  const handleSectionClick = (section: Section) => {
    if (unlockedSections.has(section.sectionId)) {
      return;
    } else {
      setPendingSection(section);
      setPendingAction('unlock');
      setShowPinModal(true);
      setPinInput('');
      setPinError('');
    }
  };

  // PIN VALIDATION - Submit PIN
  const handlePinSubmit = async () => {
    if (!pendingSection) return;

    try {
      const pincodeQuery = query(
        collection(db, 'pincodes'),
        where('code', '==', pinInput)
      );
      const pincodeSnapshot = await getDocs(pincodeQuery);
      
      if (!pincodeSnapshot.empty) {
        const pincodeData = pincodeSnapshot.docs[0].data();
        
        if (pincodeData.sectionId === pendingSection.sectionId && 
            pincodeData.schoolId === schoolId && 
            pincodeData.isActive === true) {
          const newUnlocked = new Set(unlockedSections);
          newUnlocked.add(pendingSection.sectionId);
          setUnlockedSections(newUnlocked);
          
          setShowPinModal(false);
          setPinInput('');
          setPinError('');
          
          if (pendingAction && pendingAction !== 'unlock') {
            executeAction(pendingSection, pendingAction);
          }
        } else {
          setPinError('Incorrect access code for this section');
        }
      } else {
        setPinError('Invalid access code');
      }
    } catch (error) {
      console.error('Error validating PIN:', error);
      setPinError('Error validating access code');
    }
  };

  // EXECUTE ACTION - After PIN validation
  const executeAction = (section: Section, action: string) => {
    switch (action) {
      case 'studentList':
        handleOpenStudentList(section);
        break;
      case 'attendance':
        handleOpenAttendance(section);
        break;
      case 'topAttendees':
        handleOpenTopAttendees(section);
        break;
      case 'sf2':
        handleOpenSF2(section);
        break;
    }
  };

  const handleOpenStudentList = async (section: Section) => {
  setSelectedSection(section);
  setShowStudentListModal(true);

  try {
    const studentsQuery = query(collection(db, 'students'));
    const studentsSnapshot = await getDocs(studentsQuery);
    const students: Student[] = [];
    
    // Get normalized section identifier
    const sectionIdentifier = getSectionIdentifier(section);

    studentsSnapshot.docs.forEach(doc => {
      const studentData = doc.data();
      const studentId = studentData.studentId;

      if (studentId?.startsWith(schoolId + '_')) {
        // Extract section from student ID using helper
        const studentSection = extractSectionFromStudentId(studentId);
        
        // Compare normalized identifiers
        if (studentSection === sectionIdentifier) {
          students.push({
            id: doc.id,
            ...studentData
          } as Student);
        }
      }
    });

    // Sort: Males first, then alphabetically
    students.sort((a, b) => {
      if (a.gender === b.gender) {
        return (a.name || '').localeCompare(b.name || '');
      }
      return a.gender === 'MALE' ? -1 : 1;
    });

    console.log(`✅ Found ${students.length} students for ${sectionIdentifier}`);
    setSectionStudents(students);
  } catch (error) {
    console.error('Error fetching students:', error);
  }
};

 const handleOpenAttendance = async (section: Section) => {
  setSelectedSection(section);
  setShowAttendanceModal(true);
  
  // ✅ FIX: Set today as default date
  const today = new Date().toISOString().split('T')[0];
  setDateFrom(today);
  setDateTo(today);
  setSelectedStudent('all');

  // ✅ FIX: Use helper function for section identifier
  const sectionIdentifier = getSectionIdentifier(section);

  try {
    const studentsQuery = query(collection(db, 'students'));
    const studentsSnapshot = await getDocs(studentsQuery);
    const students: any[] = [];

    studentsSnapshot.docs.forEach(doc => {
      const studentData = doc.data();
      const studentId = studentData.studentId;

      if (studentId?.startsWith(schoolId + '_')) {
        // ✅ FIX: Use helper function
        const studentSection = extractSectionFromStudentId(studentId);
        
        if (studentSection === sectionIdentifier) {
          students.push({
            id: doc.id,
            ...studentData
          });
        }
      }
    });

    students.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    setSectionStudents(students);
    
    // ✅ FIX: Auto-fetch attendance for TODAY
    await fetchAttendanceRecords(sectionIdentifier, today, today, 'all');
  } catch (error) {
    console.error('Error fetching students:', error);
  }
};


 const fetchAttendanceRecords = async (sectionIdentifier: string, from: string, to: string, studentFilter: string) => {
  try {
    const attendanceQuery = query(collection(db, 'attendance'));
    const attendanceSnapshot = await getDocs(attendanceQuery);
    
    const allScans: any[] = [];
    
    attendanceSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // ✅ FIX: Match using sectionIdentifier parameter (already normalized)
      if (data.section !== sectionIdentifier) return;
      
      // ✅ FIX: Use helper function for date parsing
      const scanDateTime = parseScanDateTime(data.scanDateTime);
      if (!scanDateTime || isNaN(scanDateTime.getTime())) return;
      
      const scanDate = scanDateTime.toISOString().split('T')[0];
      
      if (scanDate < from || scanDate > to) return;
      
      if (studentFilter !== 'all' && data.studentId !== studentFilter) {
        return;
      }
      
      const scanTime = scanDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      allScans.push({
        studentId: data.studentId,
        studentName: data.studentName,
        date: scanDate,
        time: scanTime,
        scanDateTime: scanDateTime,
        action: (data.action || '').toUpperCase(),
        session: data.session || 'WD'
      });
    });

    allScans.sort((a, b) => a.scanDateTime.getTime() - b.scanDateTime.getTime());

    if (studentFilter !== 'all') {
      const records: any[] = [];
      
      allScans.forEach(scan => {
        const { studentId, studentName, date, time, action, session } = scan;
        
        records.push({
          studentId,
          studentName,
          date,
          session,
          amIn: isAMSession(session) && action === 'IN' ? time : null,
          amOut: isAMSession(session) && action === 'OUT' ? time : null,
          pmIn: isPMSession(session) && action === 'IN' ? time : null,
          pmOut: isPMSession(session) && action === 'OUT' ? time : null
        });
      });

      records.sort((a, b) => b.date.localeCompare(a.date));
      setAttendanceRecords(records);
      
    } else {
      const attendanceMap: Record<string, Record<string, any>> = {};
      
      allScans.forEach(scan => {
        const { studentId, studentName, date, time, action, session } = scan;
        
        if (!attendanceMap[studentId]) {
          attendanceMap[studentId] = {};
        }
        
        if (!attendanceMap[studentId][date]) {
          attendanceMap[studentId][date] = {
            studentId,
            studentName,
            date,
            session,
            amIn: null,
            amOut: null,
            pmIn: null,
            pmOut: null
          };
        }
        
        const record = attendanceMap[studentId][date];
        
        if (session === 'WD' || session === 'WD AM') {
          if (action === 'IN') {
            if (!record.amIn) record.amIn = time;
          } else if (action === 'OUT') {
            record.amOut = time;
          }
        }
        
        if (session === 'WD' || session === 'WD PM') {
          if (action === 'IN') {
            if (!record.pmIn) record.pmIn = time;
          } else if (action === 'OUT') {
            record.pmOut = time;
          }
        }
        
        if (session === 'AM') {
          if (action === 'IN') {
            if (!record.amIn) record.amIn = time;
          } else if (action === 'OUT') {
            record.amOut = time;
          }
        }
        
        if (session === 'PM') {
          if (action === 'IN') {
            if (!record.pmIn) record.pmIn = time;
          } else if (action === 'OUT') {
            record.pmOut = time;
          }
        }
      });

      const records: any[] = [];
      Object.values(attendanceMap).forEach(studentDates => {
        Object.values(studentDates).forEach(record => {
          records.push(record);
        });
      });

      records.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return a.studentName.localeCompare(b.studentName);
      });

      setAttendanceRecords(records);
    }
    
    console.log(`✅ Attendance: ${allScans.length} scans found for ${sectionIdentifier}`);
  } catch (error) {
    console.error('Error fetching attendance:', error);
  }
};
const handleOpenTopAttendees = async (section: Section) => {
  setSelectedSection(section);
  setShowTopAttendeesModal(true);
  setTopCount(10);
  
  // ✅ FIX: Use helper function
  const sectionIdentifier = getSectionIdentifier(section);

  try {
    const studentsQuery = query(collection(db, 'students'));
    const studentsSnapshot = await getDocs(studentsQuery);
    const students: any[] = [];

    studentsSnapshot.docs.forEach(doc => {
      const studentData = doc.data();
      const studentId = studentData.studentId;

      if (studentId?.startsWith(schoolId + '_')) {
        // ✅ FIX: Use helper function
        const studentSection = extractSectionFromStudentId(studentId);

        if (studentSection === sectionIdentifier) {
          students.push({
            id: doc.id,
            ...studentData,
            attendanceCount: 0
          });
        }
      }
    });

    const attendanceQuery = query(collection(db, 'attendance'));
    const attendanceSnapshot = await getDocs(attendanceQuery);
    
    const studentDateMap: Record<string, Record<string, { amIn: boolean, amOut: boolean, pmIn: boolean, pmOut: boolean, session: string }>> = {};
    
    attendanceSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // ✅ FIX: Use sectionIdentifier for matching
      if (data.section !== sectionIdentifier) return;
      
      // ✅ FIX: Use helper function for parsing
      const scanDateTime = parseScanDateTime(data.scanDateTime);
      if (!scanDateTime || isNaN(scanDateTime.getTime())) return;
      
      const scanDate = scanDateTime.toISOString().split('T')[0];
      const action = (data.action || '').toUpperCase();
      const session = data.session || 'WD';
      
      if (!studentDateMap[data.studentId]) {
        studentDateMap[data.studentId] = {};
      }
      
      if (!studentDateMap[data.studentId][scanDate]) {
        studentDateMap[data.studentId][scanDate] = {
          amIn: false,
          amOut: false,
          pmIn: false,
          pmOut: false,
          session: session
        };
      }
      
      const record = studentDateMap[data.studentId][scanDate];
      
      if (session === 'WD' || session === 'WD AM') {
        if (action === 'IN') record.amIn = true;
        if (action === 'OUT') record.amOut = true;
      }
      
      if (session === 'WD' || session === 'WD PM') {
        if (action === 'IN') record.pmIn = true;
        if (action === 'OUT') record.pmOut = true;
      }
      
      if (session === 'AM') {
        if (action === 'IN') record.amIn = true;
        if (action === 'OUT') record.amOut = true;
      }
      
      if (session === 'PM') {
        if (action === 'IN') record.pmIn = true;
        if (action === 'OUT') record.pmOut = true;
      }
      
      record.session = session;
    });

    students.forEach(student => {
      let totalCount = 0;
      const studentDates = studentDateMap[student.studentId] || {};
      
      Object.values(studentDates).forEach((record) => {
        const { amIn, amOut, pmIn, pmOut, session } = record;
        
        if (session === 'WD' || session === 'WD AM' || session === 'WD PM') {
          if (amIn && pmOut) {
            totalCount += 1.0;
          } else if (amIn) {
            totalCount += 0.5;
          }
        } else if (session === 'AM') {
          if (amIn && amOut) {
            totalCount += 1.0;
          }
        } else if (session === 'PM') {
          if (pmIn && pmOut) {
            totalCount += 1.0;
          }
        }
      });
      
      student.attendanceCount = totalCount;
    });

    students.sort((a, b) => b.attendanceCount - a.attendanceCount);
    
    console.log(`✅ Top Attendees: ${students.length} students ranked for ${sectionIdentifier}`);
    setTopAttendees(students);
  } catch (error) {
    console.error('Error fetching top attendees:', error);
  }
};

  const handleOpenSF2 = (section: Section) => {
    setSelectedSection(section);
    setShowSF2Modal(true);
    setSF2Month(new Date().getMonth() + 1);
    setSF2Year(new Date().getFullYear());
  };

// UPDATED handleGenerateSF2 function - TYPESCRIPT FIXED
// Replace in page.tsx

const handleGenerateSF2 = async () => {
  if (!selectedSection) return;
  setGeneratingSF2(true);

  try {
    const sectionIdentifier = getSectionIdentifier(selectedSection);
    console.log('📋 SF2 Generation for:', sectionIdentifier);
    console.log('📋 Section from Firebase:', selectedSection.sectionId);

    // ✅ STEP 1: GET ALL STUDENTS
    const studentsQuery = query(collection(db, 'students'));
    const studentsSnapshot = await getDocs(studentsQuery);
    const students: any[] = [];
    const studentIds = new Set<string>();

    studentsSnapshot.docs.forEach(doc => {
      const studentData = doc.data();
      const studentId = studentData.studentId;

      if (studentIds.has(studentId)) {
        console.log('⚠️ Duplicate skipped:', studentData.name);
        return;
      }

      if (studentId?.startsWith(schoolId + '_')) {
        const studentSection = extractSectionFromStudentId(studentId);

        if (studentSection === sectionIdentifier) {
          studentIds.add(studentId);
          students.push({ 
            id: doc.id,
            studentId: studentId,
            name: studentData.name,
            gender: studentData.gender
          });
        }
      }
    });

    students.sort((a, b) => {
      if (a.gender === b.gender) {
        return (a.name || '').localeCompare(b.name || '');
      }
      return a.gender === 'MALE' ? -1 : 1;
    });

    console.log(`✅ SF2: Found ${students.length} UNIQUE students`);
    console.log(`   👨 Males: ${students.filter(s => s.gender === 'MALE').length}`);
    console.log(`   👩 Females: ${students.filter(s => s.gender === 'FEMALE').length}`);

    // ✅ STEP 2: CALCULATE DAYS IN MONTH
    const daysInMonth = new Date(sf2Year, sf2Month, 0).getDate();
    console.log(`📅 Days in ${sf2Month}/${sf2Year}:`, daysInMonth);
    
    // ✅ STEP 3: FETCH ALL ATTENDANCE RECORDS
    const attendanceQuery = query(collection(db, 'attendance'));
    const attendanceSnapshot = await getDocs(attendanceQuery);
    
    // ✅ FIXED: Use Set<string> instead of Set<number>
    const attendanceMap: Record<string, Set<string>> = {};
    let totalScans = 0;
    let matchedScans = 0;
    
    console.log('🔍 Scanning attendance records...');
    
    attendanceSnapshot.docs.forEach(doc => {
      const data = doc.data();
      totalScans++;
      
      // ✅ CHECK 1: School ID match
      if (data.schoolId !== schoolId) return;
      
      // ✅ CHECK 2: Section match (try different formats)
      const dataSection = data.section || '';
      const normalizedDataSection = dataSection.replace(/\s*-\s*/g, ' ').trim();
      
      if (normalizedDataSection !== sectionIdentifier) return;
      
      // ✅ CHECK 3: Must be "IN" action
      if (data.action !== 'IN') return;
      
      // ✅ CHECK 4: Parse date
      const scanDateTime = parseScanDateTime(data.scanDateTime);
      if (!scanDateTime || isNaN(scanDateTime.getTime())) return;
      
      const scanYear = scanDateTime.getFullYear();
      const scanMonth = scanDateTime.getMonth() + 1;
      const scanDay = scanDateTime.getDate();
      
      // ✅ CHECK 5: Match month and year
      if (scanYear !== sf2Year || scanMonth !== sf2Month) return;
      
      matchedScans++;
      
      // Add to attendance map
      if (!attendanceMap[data.studentId]) {
        attendanceMap[data.studentId] = new Set<string>();
      }
      
      // ✅ FIXED: Store day as STRING, not number
      attendanceMap[data.studentId].add(scanDay.toString());
      
      console.log(`✓ ${data.studentName}: Day ${scanDay} (${scanDateTime.toLocaleDateString()})`);
    });

    console.log(`✅ Scanned ${totalScans} total attendance records`);
    console.log(`✅ Matched ${matchedScans} records for ${sectionIdentifier}`);
    console.log(`📊 ${Object.keys(attendanceMap).length} students with attendance`);

    // ✅ STEP 4: BUILD SF2 DATA WITH ATTENDANCE
    const gradeMatch = selectedSection.sectionId?.match(/G?(\d+)/i);
    const grade = gradeMatch ? gradeMatch[1] : '';

    const sf2Data = {
      schoolId,
      schoolName: schoolData?.schoolName || '',
      schoolYear: `${sf2Year - 1}-${sf2Year}`,
      month: new Date(sf2Year, sf2Month - 1).toLocaleString('default', { month: 'long' }),
      gradeLevel: grade,
      section: selectedSection.sectionName,
      students: students.map(student => {
        // Create attendance array: true/false for each day (1-31)
        const attendance = Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          // ✅ FIXED: Compare strings
          const isPresent = attendanceMap[student.studentId]?.has(day.toString()) || false;
          return isPresent;
        });
        
        const presentDays = attendance.filter(a => a).length;
        
        console.log(`   ${student.name}: ${presentDays}/${daysInMonth} days present`);
        
        return {
          name: student.name,
          gender: student.gender,
          attendance: attendance  // Array of booleans [true, false, true, ...]
        };
      }),
      daysInMonth,
      adviser: selectedSection.adviser
    };

    console.log('📤 Sending to API...');
    console.log('📦 Sample data:', {
      totalStudents: sf2Data.students.length,
      firstStudent: sf2Data.students[0]?.name,
      firstStudentAttendance: sf2Data.students[0]?.attendance.slice(0, 10)
    });

    const response = await fetch('/api/generate-sf2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sf2Data),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SF2_${sectionIdentifier.replace(/ /g, '_')}_${sf2Month}-${sf2Year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowSF2Modal(false);
      console.log('✅ SF2 downloaded successfully!');
    } else {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      alert('Failed to generate SF2 form');
    }
  } catch (error) {
    console.error('❌ Error generating SF2:', error);
    alert('Error generating SF2 form');
  } finally {
    setGeneratingSF2(false);
  }
};

  // PRINT FUNCTIONS
  const handlePrintStudentList = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    
    const maleStudents = sectionStudents.filter(s => s.gender === 'MALE');
    const femaleStudents = sectionStudents.filter(s => s.gender === 'FEMALE');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student List</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
          h1 { text-align: center; font-size: 18px; margin: 0; }
          .header { text-align: center; margin-bottom: 20px; }
          .header p { margin: 2px 0; font-size: 11px; color: #666; }
          .section-title { font-size: 13px; font-weight: bold; margin: 15px 0 8px 0; padding-bottom: 4px; border-bottom: 2px solid #249E94; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
          th { background-color: #f5f5f5; padding: 6px; text-align: left; font-weight: 600; border: 1px solid #ddd; }
          td { padding: 6px; border: 1px solid #ddd; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 10px; }
          @media print { 
            @page { size: A4 portrait; margin: 15mm; }
            body { margin: 0; padding: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${schoolData?.schoolName || ''}</h1>
          <p>School ID: ${schoolId}</p>
          <p>${schoolData?.address || ''}</p>
          <div style="margin-top: 12px; padding: 6px; background: #f5f5f5; display: inline-block; border-radius: 4px;">
            <strong style="font-size: 12px;">STUDENT LIST</strong>
          </div>
          <p style="margin-top: 8px;"><strong>${selectedSection?.sectionName}</strong> • ${selectedSection?.adviser}</p>
        </div>
        
        ${maleStudents.length > 0 ? `
          <div class="section-title">MALE (${maleStudents.length})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">NO.</th>
                <th>NAME</th>
                <th>MOBILE</th>
                <th style="width: 80px; text-align: center;">STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${maleStudents.map((student, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${student.name}</td>
                  <td>${student.mobileNumber}</td>
                  <td style="text-align: center;">${student.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
        
        ${femaleStudents.length > 0 ? `
          <div class="section-title">FEMALE (${femaleStudents.length})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">NO.</th>
                <th>NAME</th>
                <th>MOBILE</th>
                <th style="width: 80px; text-align: center;">STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${femaleStudents.map((student, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${student.name}</td>
                  <td>${student.mobileNumber}</td>
                  <td style="text-align: center;">${student.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
        
        <div class="footer">
          <div>
            <p style="margin: 0; color: #666; font-size: 9px;">Prepared by</p>
            <p style="margin: 4px 0 0 0; font-weight: 600; font-size: 12px;">${selectedSection?.adviser}</p>
            <p style="margin: 15px 0 0 0;">____________________</p>
            <p style="margin: 4px 0 0 0; font-size: 8px; color: #666;">Signature</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 9px; color: #666;">Printed as of</p>
            <p style="margin: 4px 0 0 0; font-size: 11px;">${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handlePrintAttendance = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    
    const isAllStudents = selectedStudent === 'all';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
          h1 { text-align: center; font-size: 18px; margin: 0; }
          .header { text-align: center; margin-bottom: 20px; }
          .header p { margin: 2px 0; font-size: 11px; color: #666; }
          .filters { text-align: center; margin-bottom: 15px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
          th { background-color: #f5f5f5; padding: 6px; text-align: left; font-weight: 600; border: 1px solid #ddd; }
          td { padding: 6px; border: 1px solid #ddd; }
          .center { text-align: center; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 10px; }
          @media print { 
            @page { size: A4 portrait; margin: 15mm; }
            body { margin: 0; padding: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${schoolData?.schoolName || ''}</h1>
          <p>School ID: ${schoolId}</p>
          <p>${schoolData?.address || ''}</p>
          <div style="margin-top: 12px; padding: 6px; background: #f5f5f5; display: inline-block; border-radius: 4px;">
            <strong style="font-size: 12px;">ATTENDANCE REPORT</strong>
          </div>
          <p style="margin-top: 8px;"><strong>${selectedSection?.sectionName}</strong> • ${selectedSection?.adviser}</p>
        </div>
        
        <div class="filters">
          <strong>Date Range:</strong> ${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}
          ${!isAllStudents ? ` • <strong>Student:</strong> ${sectionStudents.find(s => s.studentId === selectedStudent)?.name || 'N/A'}` : ' • <strong>All Students</strong>'}
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 30px;" class="center">NO.</th>
              ${isAllStudents ? '<th>STUDENT NAME</th>' : ''}
              <th style="width: 80px;">DATE</th>
              <th class="center" style="width: 60px;">AM IN</th>
              <th class="center" style="width: 60px;">AM OUT</th>
              <th class="center" style="width: 60px;">PM IN</th>
              <th class="center" style="width: 60px;">PM OUT</th>
            </tr>
          </thead>
          <tbody>
            ${attendanceRecords.length > 0 ? attendanceRecords.map((record, index) => `
              <tr>
                <td class="center">${index + 1}</td>
                ${isAllStudents ? `<td>${record.studentName}</td>` : ''}
                <td>${new Date(record.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric'
                })}</td>
                <td class="center" style="color: #249E94; font-weight: 600;">${record.amIn || '-'}</td>
                <td class="center">${record.amOut || '-'}</td>
                <td class="center" style="color: #249E94; font-weight: 600;">${record.pmIn || '-'}</td>
                <td class="center">${record.pmOut || '-'}</td>
              </tr>
            `).join('') : `<tr><td colspan="${isAllStudents ? '7' : '6'}" style="text-align: center; color: #666;">No records found</td></tr>`}
          </tbody>
        </table>
        
        <div class="footer">
          <div>
            <p style="margin: 0; color: #666; font-size: 9px;">Prepared by</p>
            <p style="margin: 4px 0 0 0; font-weight: 600; font-size: 12px;">${selectedSection?.adviser}</p>
            <p style="margin: 15px 0 0 0;">____________________</p>
            <p style="margin: 4px 0 0 0; font-size: 8px; color: #666;">Signature</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 9px; color: #666;">Printed as of</p>
            <p style="margin: 4px 0 0 0; font-size: 11px;">${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handlePrintTopAttendees = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    
    const topStudents = topAttendees.slice(0, topCount);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Top Attendees Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
          h1 { text-align: center; font-size: 18px; margin: 0; }
          .header { text-align: center; margin-bottom: 20px; }
          .header p { margin: 2px 0; font-size: 11px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
          th { background-color: #f5f5f5; padding: 8px; text-align: left; font-weight: 600; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; }
          .center { text-align: center; }
          .rank { font-weight: 700; font-size: 13px; color: #249E94; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 10px; }
          @media print { 
            @page { size: A4 portrait; margin: 15mm; }
            body { margin: 0; padding: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${schoolData?.schoolName || ''}</h1>
          <p>School ID: ${schoolId}</p>
          <p>${schoolData?.address || ''}</p>
          <div style="margin-top: 12px; padding: 6px; background: #f5f5f5; display: inline-block; border-radius: 4px;">
            <strong style="font-size: 12px;">TOP ${topCount} ATTENDEES</strong>
          </div>
          <p style="margin-top: 8px;"><strong>${selectedSection?.sectionName}</strong> • ${selectedSection?.adviser}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th class="center" style="width: 60px;">RANK</th>
              <th>STUDENT NAME</th>
              <th class="center" style="width: 120px;">ATTENDANCE COUNT</th>
              <th class="center" style="width: 80px;">STATUS</th>
            </tr>
          </thead>
          <tbody>
            ${topStudents.map((student, index) => `
              <tr>
                <td class="center rank">${index + 1}</td>
                <td>${student.name}</td>
                <td class="center" style="color: #249E94; font-weight: 600; font-size: 13px;">${student.attendanceCount}</td>
                <td class="center">${student.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <div>
            <p style="margin: 0; color: #666; font-size: 9px;">Prepared by</p>
            <p style="margin: 4px 0 0 0; font-weight: 600; font-size: 12px;">${selectedSection?.adviser}</p>
            <p style="margin: 15px 0 0 0;">____________________</p>
            <p style="margin: 4px 0 0 0; font-size: 8px; color: #666;">Signature</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 9px; color: #666;">Printed as of</p>
            <p style="margin: 4px 0 0 0; font-size: 11px;">${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // PDF DOWNLOAD FUNCTIONS
  const handleDownloadStudentListPDF = async () => {
    setDownloadingPDF(true);
    try {
      const maleStudents = sectionStudents.filter(s => s.gender === 'MALE');
      const femaleStudents = sectionStudents.filter(s => s.gender === 'FEMALE');

      const pdfData = {
        type: 'studentList',
        schoolName: schoolData?.schoolName || '',
        schoolId: schoolId,
        address: schoolData?.address || '',
        sectionName: selectedSection?.sectionName,
        adviser: selectedSection?.adviser,
        maleStudents: maleStudents.map((s, i) => ({
          no: i + 1,
          name: s.name,
          mobile: s.mobileNumber,
          status: s.status
        })),
        femaleStudents: femaleStudents.map((s, i) => ({
          no: i + 1,
          name: s.name,
          mobile: s.mobileNumber,
          status: s.status
        })),
        preparedBy: selectedSection?.adviser,
        printedDate: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `StudentList_${selectedSection?.sectionName}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadAttendancePDF = async () => {
    setDownloadingPDF(true);
    try {
      const isAllStudents = selectedStudent === 'all';

      const pdfData = {
        type: 'attendance',
        schoolName: schoolData?.schoolName || '',
        schoolId: schoolId,
        address: schoolData?.address || '',
        sectionName: selectedSection?.sectionName,
        adviser: selectedSection?.adviser,
        dateFrom: new Date(dateFrom).toLocaleDateString(),
        dateTo: new Date(dateTo).toLocaleDateString(),
        isAllStudents,
        studentName: !isAllStudents ? sectionStudents.find(s => s.studentId === selectedStudent)?.name : null,
        records: attendanceRecords.map((record, index) => ({
          no: index + 1,
          studentName: record.studentName,
          date: new Date(record.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric'
          }),
          amIn: record.amIn || '-',
          amOut: record.amOut || '-',
          pmIn: record.pmIn || '-',
          pmOut: record.pmOut || '-'
        })),
        preparedBy: selectedSection?.adviser,
        printedDate: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Attendance_${selectedSection?.sectionName}_${dateFrom}_to_${dateTo}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadTopAttendeesPDF = async () => {
    setDownloadingPDF(true);
    try {
      const topStudents = topAttendees.slice(0, topCount);

      const pdfData = {
        type: 'topAttendees',
        schoolName: schoolData?.schoolName || '',
        schoolId: schoolId,
        address: schoolData?.address || '',
        sectionName: selectedSection?.sectionName,
        adviser: selectedSection?.adviser,
        topCount: topCount,
        students: topStudents.map((student, index) => ({
          rank: index + 1,
          name: student.name,
          attendanceCount: student.attendanceCount,
          status: student.status
        })),
        preparedBy: selectedSection?.adviser,
        printedDate: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TopAttendees_${selectedSection?.sectionName}_Top${topCount}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const totalStudents = Object.values(studentCounts).reduce((sum, count) => sum + count, 0);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        backgroundColor: COLORS.bgDark
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: `3px solid ${COLORS.border}`, 
            borderTopColor: COLORS.primary, 
            borderRadius: '50%', 
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: COLORS.textSecondary, fontSize: '14px', fontWeight: '500' }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: COLORS.bgDark }}>
      {/* MOBILE HAMBURGER BUTTON */}
      {isMobile && sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 1001,
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: COLORS.bgCard,
            border: `1px solid ${COLORS.border}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.textPrimary} strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* MOBILE OVERLAY */}
      {isMobile && !sidebarCollapsed && (
        <div
          onClick={() => setSidebarCollapsed(true)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
        />
      )}

      {/* SIDEBAR */}
      <Sidebar
        schoolData={schoolData}
        schoolId={schoolId}
        schoolLogo={schoolLogo}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeView={activeView}
        onViewChange={setActiveView}
        isMobile={isMobile}
      />

      {/* MAIN CONTENT */}
      <div style={{ 
        marginLeft: isMobile ? '0' : (sidebarCollapsed ? '70px' : '280px'),
        flex: 1,
        transition: 'margin-left 0.3s ease',
        minHeight: '100vh',
        position: 'relative',
        padding: isMobile ? '16px' : '32px',
        paddingTop: isMobile ? '70px' : '32px'
      }}>
        {activeView === 'analytics' && (
          <AnalyticsView
            sections={sections}
            totalStudents={totalStudents}
            todayScans={todayScans}
            studentCounts={studentCounts}
            isMobile={isMobile}
            onViewChange={setActiveView}
          />
        )}

        {activeView === 'sections' && (
          <SectionsView
            sections={sections}
            studentCounts={studentCounts}
            schoolId={schoolId}
            isMobile={isMobile}
            onOpenStudentList={handleOpenStudentList}
            onOpenAttendance={handleOpenAttendance}
            onOpenTopAttendees={handleOpenTopAttendees}
            onOpenSF2={handleOpenSF2}
            unlockedSections={unlockedSections}
            onSectionClick={handleSectionClick}
          />
        )}
      </div>

      {/* PIN MODAL */}
      {showPinModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => {
            setShowPinModal(false);
            setPinInput('');
            setPinError('');
          }}
        >
          <div
            style={{
              backgroundColor: COLORS.bgCard,
              borderRadius: '16px',
              maxWidth: '450px',
              width: '100%',
              boxShadow: SHADOWS.xl,
              padding: '40px 32px',
              textAlign: 'center',
              position: 'relative',
              border: `1px solid ${COLORS.border}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowPinModal(false);
                setPinInput('');
                setPinError('');
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                color: COLORS.textMuted,
                cursor: 'pointer',
                padding: '4px',
                lineHeight: 1
              }}
            >
              ×
            </button>

            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="11" width="14" height="10" rx="2" stroke={COLORS.primary} strokeWidth="2"/>
                <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke={COLORS.primary} strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1.5" fill={COLORS.primary}/>
              </svg>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: '600', color: COLORS.textPrimary, margin: 0, marginBottom: '8px' }}>
              Enter Access PIN
            </h2>
            <p style={{ fontSize: '14px', color: COLORS.textSecondary, margin: 0, marginBottom: '32px' }}>
              Enter 6-digit PIN to access {pendingSection?.sectionName}
            </p>

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'center',
              marginBottom: '32px'
            }}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  value={pinInput[index] || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.match(/^[0-9]$/)) {
                      const newPin = pinInput.split('');
                      newPin[index] = value;
                      setPinInput(newPin.join(''));
                      setPinError('');
                      
                      if (index < 5) {
                        const nextInput = e.target.nextElementSibling as HTMLInputElement;
                        if (nextInput) nextInput.focus();
                      }
                    } else if (value === '') {
                      const newPin = pinInput.split('');
                      newPin[index] = '';
                      setPinInput(newPin.join(''));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !pinInput[index] && index > 0) {
                      const prevInput = e.currentTarget.previousElementSibling as HTMLInputElement;
                      if (prevInput) prevInput.focus();
                    }
                    if (e.key === 'Enter' && pinInput.length === 6) {
                      handlePinSubmit();
                    }
                  }}
                  autoFocus={index === 0}
                  style={{
                    width: isMobile ? '44px' : '56px',
                    height: isMobile ? '44px' : '56px',
                    border: `2px solid ${pinInput[index] ? COLORS.primary : COLORS.border}`,
                    borderRadius: '12px',
                    fontSize: '24px',
                    fontWeight: '600',
                    textAlign: 'center',
                    color: COLORS.textPrimary,
                    backgroundColor: COLORS.bgDark,
                    outline: 'none',
                    transition: `all ${TRANSITIONS.normal}`
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = COLORS.primary;
                    e.target.style.backgroundColor = COLORS.bgCard;
                  }}
                  onBlur={(e) => {
                    if (!pinInput[index]) {
                      e.target.style.borderColor = COLORS.border;
                      e.target.style.backgroundColor = COLORS.bgDark;
                    }
                  }}
                />
              ))}
            </div>

            {pinError && (
              <p style={{ fontSize: '13px', color: COLORS.error, margin: '0 0 20px 0', fontWeight: '500' }}>
                {pinError}
              </p>
            )}

            <button
              onClick={handlePinSubmit}
              disabled={pinInput.length !== 6}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: pinInput.length === 6 ? COLORS.primary : COLORS.border,
                border: 'none',
                borderRadius: '12px',
                cursor: pinInput.length === 6 ? 'pointer' : 'not-allowed',
                fontSize: '15px',
                fontWeight: '600',
                color: COLORS.textPrimary,
                transition: `all ${TRANSITIONS.normal}`,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px'
              }}
              onMouseEnter={(e) => {
                if (pinInput.length === 6) {
                  e.currentTarget.style.backgroundColor = COLORS.primaryHover;
                }
              }}
              onMouseLeave={(e) => {
                if (pinInput.length === 6) {
                  e.currentTarget.style.backgroundColor = COLORS.primary;
                }
              }}
            >
              Unlock
            </button>

            <button
              onClick={() => {
                setShowPinModal(false);
                setPinInput('');
                setPinError('');
              }}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                color: COLORS.textSecondary,
                transition: `all ${TRANSITIONS.normal}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.bgDark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

   

      {/* STUDENT LIST MODAL */}
      {showStudentListModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowStudentListModal(false)}
        >
          <div 
            style={{
              backgroundColor: COLORS.bgCard,
              borderRadius: '12px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              border: `1px solid ${COLORS.border}`,
              boxShadow: SHADOWS.xl,
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: `1px solid ${COLORS.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: COLORS.textPrimary, margin: 0, marginBottom: '4px' }}>
                  {selectedSection?.sectionName} - Student List
                </h2>
                <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: 0 }}>
                  {selectedSection?.adviser} • {sectionStudents.length} students
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleDownloadStudentListPDF}
                  disabled={downloadingPDF}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: downloadingPDF ? COLORS.border : COLORS.success,
                    color: COLORS.textPrimary,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: downloadingPDF ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {downloadingPDF ? 'Downloading...' : 'PDF'}
                </button>
                <button
                  onClick={handlePrintStudentList}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: COLORS.primary,
                    color: COLORS.textPrimary,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  Print
                </button>
                <button
                  onClick={() => setShowStudentListModal(false)}
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '20px',
                    color: COLORS.textMuted,
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {sectionStudents.filter(s => s.gender === 'MALE').length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: COLORS.textPrimary, 
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: `2px solid ${COLORS.primary}`
                  }}>
                    MALE ({sectionStudents.filter(s => s.gender === 'MALE').length})
                  </h3>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {sectionStudents.filter(s => s.gender === 'MALE').map((student, index) => (
                      <div key={student.id} style={{
                        padding: '12px 16px',
                        backgroundColor: COLORS.bgDark,
                        borderRadius: '8px',
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr auto',
                        gap: '12px',
                        alignItems: 'center'
                      }}>
                        <span style={{ color: COLORS.textMuted, fontSize: '12px', fontWeight: '600' }}>
                          {index + 1}
                        </span>
                        <div>
                          <p style={{ color: COLORS.textPrimary, fontSize: '14px', fontWeight: '500', margin: 0 }}>
                            {student.name}
                          </p>
                          <p style={{ color: COLORS.textSecondary, fontSize: '12px', margin: '2px 0 0 0' }}>
                            {student.mobileNumber}
                          </p>
                        </div>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: student.status === 'ACTIVE' ? COLORS.successBg : COLORS.errorBg,
                          color: student.status === 'ACTIVE' ? COLORS.success : COLORS.error
                        }}>
                          {student.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sectionStudents.filter(s => s.gender === 'FEMALE').length > 0 && (
                <div>
                  <h3 style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: COLORS.textPrimary, 
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: `2px solid ${COLORS.primary}`
                  }}>
                    FEMALE ({sectionStudents.filter(s => s.gender === 'FEMALE').length})
                  </h3>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {sectionStudents.filter(s => s.gender === 'FEMALE').map((student, index) => (
                      <div key={student.id} style={{
                        padding: '12px 16px',
                        backgroundColor: COLORS.bgDark,
                        borderRadius: '8px',
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr auto',
                        gap: '12px',
                        alignItems: 'center'
                      }}>
                        <span style={{ color: COLORS.textMuted, fontSize: '12px', fontWeight: '600' }}>
                          {index + 1}
                        </span>
                        <div>
                          <p style={{ color: COLORS.textPrimary, fontSize: '14px', fontWeight: '500', margin: 0 }}>
                            {student.name}
                          </p>
                          <p style={{ color: COLORS.textSecondary, fontSize: '12px', margin: '2px 0 0 0' }}>
                            {student.mobileNumber}
                          </p>
                        </div>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: student.status === 'ACTIVE' ? COLORS.successBg : COLORS.errorBg,
                          color: student.status === 'ACTIVE' ? COLORS.success : COLORS.error
                        }}>
                          {student.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ATTENDANCE MODAL */}
      {showAttendanceModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowAttendanceModal(false)}
        >
          <div
            style={{
              backgroundColor: COLORS.bgCard,
              borderRadius: '12px',
              maxWidth: '1000px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              border: `1px solid ${COLORS.border}`,
              boxShadow: SHADOWS.xl,
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: `1px solid ${COLORS.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: COLORS.textPrimary, margin: 0, marginBottom: '4px' }}>
                  Attendance Records
                </h2>
                <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: 0 }}>
                  {selectedSection?.sectionName} • {selectedSection?.adviser}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleDownloadAttendancePDF}
                  disabled={downloadingPDF}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: downloadingPDF ? COLORS.border : COLORS.success,
                    color: COLORS.textPrimary,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: downloadingPDF ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {downloadingPDF ? 'Downloading...' : 'PDF'}
                </button>
                <button
                  onClick={handlePrintAttendance}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: COLORS.primary,
                    color: COLORS.textPrimary,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  Print
                </button>
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '20px',
                    color: COLORS.textMuted,
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bgDark }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 2fr', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '500' }}>
                    Date From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                   onChange={(e) => {
  setDateFrom(e.target.value);
  if (selectedSection) {
    const sectionIdentifier = getSectionIdentifier(selectedSection);
    fetchAttendanceRecords(sectionIdentifier, e.target.value, dateTo, selectedStudent);
  }
}}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: COLORS.textPrimary,
                      backgroundColor: COLORS.bgCard
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '500' }}>
                    Date To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
  setDateTo(e.target.value);
  if (selectedSection) {
    const sectionIdentifier = getSectionIdentifier(selectedSection);
    fetchAttendanceRecords(sectionIdentifier, dateFrom, e.target.value, selectedStudent);
  }
}}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: COLORS.textPrimary,
                      backgroundColor: COLORS.bgCard
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: COLORS.textSecondary, marginBottom: '6px', fontWeight: '500' }}>
                    Student
                  </label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => {
  setSelectedStudent(e.target.value);
  if (selectedSection) {
    const sectionIdentifier = getSectionIdentifier(selectedSection);
    fetchAttendanceRecords(sectionIdentifier, dateFrom, dateTo, e.target.value);
  }
}}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: COLORS.textPrimary,
                      backgroundColor: COLORS.bgCard
                    }}
                  >
                    <option value="all">All Students</option>
                    {sectionStudents.map(student => (
                      <option key={student.id} value={student.studentId}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: COLORS.bgDark }}>
                      <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: COLORS.textSecondary, fontSize: '11px', borderBottom: `1px solid ${COLORS.border}`, width: '40px' }}>NO.</th>
                      {selectedStudent === 'all' && (
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: COLORS.textSecondary, fontSize: '11px', borderBottom: `1px solid ${COLORS.border}` }}>STUDENT NAME</th>
                      )}
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: COLORS.textSecondary, fontSize: '11px', borderBottom: `1px solid ${COLORS.border}`, width: '100px' }}>DATE</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: COLORS.textSecondary, fontSize: '11px', borderBottom: `1px solid ${COLORS.border}`, width: '80px' }}>AM IN</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: COLORS.textSecondary, fontSize: '11px', borderBottom: `1px solid ${COLORS.border}`, width: '80px' }}>AM OUT</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: COLORS.textSecondary, fontSize: '11px', borderBottom: `1px solid ${COLORS.border}`, width: '80px' }}>PM IN</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: COLORS.textSecondary, fontSize: '11px', borderBottom: `1px solid ${COLORS.border}`, width: '80px' }}>PM OUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.length > 0 ? (
                      attendanceRecords.map((record, index) => (
                        <tr key={`${record.studentId}-${record.date}-${index}`}>
                          <td style={{ padding: '10px', textAlign: 'center', color: COLORS.textMuted, borderBottom: `1px solid ${COLORS.bgDark}` }}>{index + 1}</td>
                          {selectedStudent === 'all' && (
                            <td style={{ padding: '10px', fontWeight: '500', color: COLORS.textPrimary, borderBottom: `1px solid ${COLORS.bgDark}` }}>
                              {record.studentName}
                            </td>
                          )}
                          <td style={{ padding: '10px', color: COLORS.textPrimary, borderBottom: `1px solid ${COLORS.bgDark}`, fontWeight: '500' }}>
                            {new Date(record.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric'
                            })}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center', color: COLORS.primary, borderBottom: `1px solid ${COLORS.bgDark}`, fontWeight: '500' }}>
                            {record.amIn || '-'}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center', color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.bgDark}` }}>
                            {record.amOut || '-'}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center', color: COLORS.primary, borderBottom: `1px solid ${COLORS.bgDark}`, fontWeight: '500' }}>
                            {record.pmIn || '-'}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center', color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.bgDark}` }}>
                            {record.pmOut || '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={selectedStudent === 'all' ? 7 : 6} style={{ padding: '28px', textAlign: 'center', color: COLORS.textMuted, fontSize: '13px' }}>
                          No attendance records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP ATTENDEES MODAL */}
      {showTopAttendeesModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowTopAttendeesModal(false)}
        >
          <div
            style={{
              backgroundColor: COLORS.bgCard,
              borderRadius: '12px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              border: `1px solid ${COLORS.border}`,
              boxShadow: SHADOWS.xl,
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: `1px solid ${COLORS.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: COLORS.textPrimary, margin: 0, marginBottom: '4px' }}>
                  Top Attendees
                </h2>
                <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: 0 }}>
                  {selectedSection?.sectionName} • {selectedSection?.adviser}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: COLORS.textSecondary, fontWeight: '500' }}>Top</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={topCount}
                    onChange={(e) => setTopCount(parseInt(e.target.value) || 10)}
                    style={{
                      width: '60px',
                      padding: '6px 8px',
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '6px',
                      fontSize: '13px',
                      textAlign: 'center',
                      backgroundColor: COLORS.bgCard,
                      color: COLORS.textPrimary
                    }}
                  />
                </div>
                <button
                  onClick={handleDownloadTopAttendeesPDF}
                  disabled={downloadingPDF}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: downloadingPDF ? COLORS.border : COLORS.success,
                    color: COLORS.textPrimary,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: downloadingPDF ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {downloadingPDF ? 'Downloading...' : 'PDF'}
                </button>
                <button
                  onClick={handlePrintTopAttendees}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: COLORS.primary,
                    color: COLORS.textPrimary,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  Print
                </button>
                <button
                  onClick={() => setShowTopAttendeesModal(false)}
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '20px',
                    color: COLORS.textMuted,
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: COLORS.bgDark }}>
                    <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: COLORS.textSecondary, fontSize: '11px', borderBottom: `1px solid ${COLORS.border}`, width: '70px' }}>RANK</th>
                    <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: COLORS.textSecondary, fontSize: '11px', borderBottom: `1px solid ${COLORS.border}` }}>STUDENT NAME</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: COLORS.textSecondary, fontSize: '11px', borderBottom: `1px solid ${COLORS.border}`, width: '140px' }}>ATTENDANCE COUNT</th>
                    <th style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: COLORS.textSecondary, fontSize: '11px', borderBottom: `1px solid ${COLORS.border}`, width: '100px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {topAttendees.slice(0, topCount).map((student, index) => (
                    <tr key={student.id}>
                      <td style={{ padding: '10px', textAlign: 'center', color: COLORS.primary, borderBottom: `1px solid ${COLORS.bgDark}`, fontWeight: '700', fontSize: '15px' }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '10px', fontWeight: '500', color: COLORS.textPrimary, borderBottom: `1px solid ${COLORS.bgDark}` }}>
                        {student.name}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', color: COLORS.primary, borderBottom: `1px solid ${COLORS.bgDark}`, fontWeight: '600', fontSize: '15px' }}>
                        {student.attendanceCount}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center', borderBottom: `1px solid ${COLORS.bgDark}` }}>
                        <span style={{ 
                          backgroundColor: student.status === 'ACTIVE' ? COLORS.successBg : COLORS.errorBg,
                          color: student.status === 'ACTIVE' ? COLORS.success : COLORS.error,
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SF2 MODAL */}
      {showSF2Modal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowSF2Modal(false)}
        >
          <div
            style={{
              backgroundColor: COLORS.bgCard,
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              border: `1px solid ${COLORS.border}`,
              boxShadow: SHADOWS.xl,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: `1px solid ${COLORS.border}`
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: COLORS.textPrimary, margin: 0, marginBottom: '4px' }}>
                Generate SF2 Form
              </h2>
              <p style={{ fontSize: '13px', color: COLORS.textSecondary, margin: 0 }}>
                {selectedSection?.sectionName} • {selectedSection?.adviser}
              </p>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: COLORS.textSecondary, marginBottom: '8px', fontWeight: '500' }}>
                  Month
                </label>
                <select
                  value={sf2Month}
                  onChange={(e) => setSF2Month(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: COLORS.textPrimary,
                    backgroundColor: COLORS.bgCard
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: COLORS.textSecondary, marginBottom: '8px', fontWeight: '500' }}>
                  School Year
                </label>
                <select
                  value={sf2Year}
                  onChange={(e) => setSF2Year(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: COLORS.textPrimary,
                    backgroundColor: COLORS.bgCard
                  }}
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>{year - 1}-{year}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowSF2Modal(false)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    backgroundColor: COLORS.bgDark,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: COLORS.textSecondary
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateSF2}
                  disabled={generatingSF2}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    backgroundColor: generatingSF2 ? COLORS.border : COLORS.primary,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: generatingSF2 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: COLORS.textPrimary
                  }}
                >
                  {generatingSF2 ? 'Generating...' : 'Generate SF2'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}