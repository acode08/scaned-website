'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'; // ADD THIS LINE

export default function SchoolDashboard() {
  const router = useRouter();
  
  // Basic States
  const [schoolId, setSchoolId] = useState('');
  const [schoolData, setSchoolData] = useState<any>(null);
  const [schoolLogo, setSchoolLogo] = useState<string>('/logo.png');
  const [sections, setSections] = useState<any[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  
  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(false);
  
  // Analytics States
  const [todayScans, setTodayScans] = useState({ amIn: 0, amOut: 0, pmIn: 0, pmOut: 0 });
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  
  // Modal States
  const [showStudentListModal, setShowStudentListModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [sectionStudents, setSectionStudents] = useState<any[]>([]);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [showTopAttendeesModal, setShowTopAttendeesModal] = useState(false);
  const [topCount, setTopCount] = useState(10);
  const [topAttendees, setTopAttendees] = useState<any[]>([]);
  
  // SF2 States
  const [showSF2Modal, setShowSF2Modal] = useState(false);
  const [sf2Month, setSF2Month] = useState(new Date().getMonth() + 1);
  const [sf2Year, setSF2Year] = useState(new Date().getFullYear());
  const [generatingSF2, setGeneratingSF2] = useState(false);
  
  // PIN VALIDATION STATES
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [unlockedSections, setUnlockedSections] = useState<Set<string>>(new Set());
  const [pendingSection, setPendingSection] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<string>('');

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
        
        // Check if belongs to this school
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
          const schoolDataFromDB = schoolSnapshot.docs[0].data();
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
        }));
        setSections(sectionsData);

        const studentsQuery = query(collection(db, 'students'));
        const studentsSnapshot = await getDocs(studentsQuery);
        const counts: Record<string, number> = {};
        
        studentsSnapshot.docs.forEach(doc => {
          const studentData = doc.data();
          const studentId = studentData.studentId;
          
          if (studentId?.startsWith(storedSchoolId + '_')) {
            const parts = studentId.split('_');
            const sectionPart = parts[1];
            
            sectionsData.forEach((section: any) => {
              const gradeMatch = section.sectionId?.match(/G?(\d+)/i);
              const grade = gradeMatch ? gradeMatch[1] : '';
              const name = (section.sectionName || '').trim().toUpperCase();
              const expected = `${grade} ${name}`;
              
              if (sectionPart?.toUpperCase() === expected) {
                counts[section.sectionId] = (counts[section.sectionId] || 0) + 1;
              }
            });
          }
        });
        
        setStudentCounts(counts);
        
        // Fetch today's scans
        await fetchTodayScans(storedSchoolId);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolData();
  }, [router]);

  // useEffect for settings dropdown click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showSettings) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSettings]);

  // PIN VALIDATION - Handle section name click
  const handleSectionClick = (section: any) => {
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
  const executeAction = (section: any, action: string) => {
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

  // BUTTON CLICK HANDLER
  const handleActionClick = (section: any, action: string) => {
    if (!unlockedSections.has(section.sectionId)) {
      setPendingSection(section);
      setPendingAction(action);
      setShowPinModal(true);
      setPinInput('');
      setPinError('');
      return;
    }

    executeAction(section, action);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/');
  };

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

  const totalStudents = Object.values(studentCounts).reduce((sum, count) => sum + count, 0);
  const totalScansToday = todayScans.amIn + todayScans.amOut + todayScans.pmIn + todayScans.pmOut;

  const handleOpenStudentList = async (section: any) => {
    setSelectedSection(section);
    setShowStudentListModal(true);

    try {
      const studentsQuery = query(collection(db, 'students'));
      const studentsSnapshot = await getDocs(studentsQuery);
      const students: any[] = [];

      studentsSnapshot.docs.forEach(doc => {
        const studentData = doc.data();
        const studentId = studentData.studentId;

        if (studentId?.startsWith(schoolId + '_')) {
          const parts = studentId.split('_');
          const sectionPart = parts[1];

          const gradeMatch = section.sectionId?.match(/G?(\d+)/i);
          const grade = gradeMatch ? gradeMatch[1] : '';
          const name = (section.sectionName || '').trim().toUpperCase();
          const expected = `${grade} ${name}`;

          if (sectionPart?.toUpperCase() === expected) {
            students.push({
              id: doc.id,
              ...studentData
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

      setSectionStudents(students);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleOpenAttendance = async (section: any) => {
    setSelectedSection(section);
    setShowAttendanceModal(true);
    setDateFrom(new Date().toISOString().split('T')[0]);
    setDateTo(new Date().toISOString().split('T')[0]);
    setSelectedStudent('all');

    const gradeMatch = section.sectionId?.match(/G?(\d+)/i);
    const grade = gradeMatch ? gradeMatch[1] : '';
    const sectionName = (section.sectionName || '').trim().toUpperCase();
    const fullSectionName = `${grade} ${sectionName}`;

    try {
      const studentsQuery = query(collection(db, 'students'));
      const studentsSnapshot = await getDocs(studentsQuery);
      const students: any[] = [];

      studentsSnapshot.docs.forEach(doc => {
        const studentData = doc.data();
        const studentId = studentData.studentId;

        if (studentId?.startsWith(schoolId + '_')) {
          const parts = studentId.split('_');
          const sectionPart = parts[1];

          if (sectionPart?.toUpperCase() === fullSectionName) {
            students.push({
              id: doc.id,
              ...studentData
            });
          }
        }
      });

      students.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setSectionStudents(students);
    } catch (error) {
      console.error('Error fetching students:', error);
    }

    await fetchAttendanceRecords(fullSectionName, new Date().toISOString().split('T')[0], new Date().toISOString().split('T')[0], 'all');
  };

  const fetchAttendanceRecords = async (sectionName: string, from: string, to: string, studentFilter: string) => {
    try {
      const attendanceQuery = query(collection(db, 'attendance'));
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      const allScans: any[] = [];
      
      attendanceSnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        if (data.section !== sectionName) return;
        
        let scanDateTime: Date;
        let scanDate: string;
        let scanTime: string;
        
        try {
          if (data.scanDateTime && typeof data.scanDateTime === 'object' && data.scanDateTime.toDate) {
            scanDateTime = data.scanDateTime.toDate();
          } else if (data.scanDateTime) {
            scanDateTime = new Date(data.scanDateTime);
          } else {
            return;
          }
          
          if (isNaN(scanDateTime.getTime())) {
            return;
          }
          
          scanDate = scanDateTime.toISOString().split('T')[0];
          scanTime = scanDateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch (err) {
          return;
        }
        
        if (scanDate < from || scanDate > to) return;
        
        if (studentFilter !== 'all' && data.studentId !== studentFilter) {
          return;
        }
        
        allScans.push({
          studentId: data.studentId,
          studentName: data.studentName,
          date: scanDate,
          time: scanTime,
          scanDateTime: scanDateTime,
          action: (data.action || '').toUpperCase(),
          session: data.session
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
            amIn: (session === 'AM' || session === 'WD AM' || session === 'WD') && action === 'IN' ? time : null,
            amOut: (session === 'AM' || session === 'WD AM' || session === 'WD') && action === 'OUT' ? time : null,
            pmIn: (session === 'PM' || session === 'WD PM' || session === 'WD') && action === 'IN' ? time : null,
            pmOut: (session === 'PM' || session === 'WD PM' || session === 'WD') && action === 'OUT' ? time : null
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
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const handleOpenTopAttendees = async (section: any) => {
    setSelectedSection(section);
    setShowTopAttendeesModal(true);
    setTopCount(10);
    
    const gradeMatch = section.sectionId?.match(/G?(\d+)/i);
    const grade = gradeMatch ? gradeMatch[1] : '';
    const sectionName = (section.sectionName || '').trim().toUpperCase();
    const fullSectionName = `${grade} ${sectionName}`;

    try {
      const studentsQuery = query(collection(db, 'students'));
      const studentsSnapshot = await getDocs(studentsQuery);
      const students: any[] = [];

      studentsSnapshot.docs.forEach(doc => {
        const studentData = doc.data();
        const studentId = studentData.studentId;

        if (studentId?.startsWith(schoolId + '_')) {
          const parts = studentId.split('_');
          const sectionPart = parts[1];

          if (sectionPart?.toUpperCase() === fullSectionName) {
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
        if (data.section !== fullSectionName) return;
        
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
        } catch (err) {
          console.error('Error processing attendance:', err);
        }
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
      
      setTopAttendees(students);
    } catch (error) {
      console.error('Error fetching top attendees:', error);
    }
  };

  const handleOpenSF2 = (section: any) => {
    setSelectedSection(section);
    setShowSF2Modal(true);
    setSF2Month(new Date().getMonth() + 1);
    setSF2Year(new Date().getFullYear());
  };

  const handleGenerateSF2 = async () => {
    if (!selectedSection) return;

    setGeneratingSF2(true);

    try {
      const gradeMatch = selectedSection.sectionId?.match(/G?(\d+)/i);
      const grade = gradeMatch ? gradeMatch[1] : '';
      const sectionName = (selectedSection.sectionName || '').trim().toUpperCase();
      const fullSectionName = `${grade} ${sectionName}`;

      const studentsQuery = query(collection(db, 'students'));
      const studentsSnapshot = await getDocs(studentsQuery);
      const students: any[] = [];

      studentsSnapshot.docs.forEach(doc => {
        const studentData = doc.data();
        const studentId = studentData.studentId;

        if (studentId?.startsWith(schoolId + '_')) {
          const parts = studentId.split('_');
          const sectionPart = parts[1];

          if (sectionPart?.toUpperCase() === fullSectionName) {
            students.push({ id: doc.id, ...studentData });
          }
        }
      });

      students.sort((a, b) => {
        if (a.gender === b.gender) {
          return (a.name || '').localeCompare(b.name || '');
        }
        return a.gender === 'MALE' ? -1 : 1;
      });

      const daysInMonth = new Date(sf2Year, sf2Month, 0).getDate();
      
      const attendanceQuery = query(collection(db, 'attendance'));
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      const attendanceMap: Record<string, Set<string>> = {};
      
      attendanceSnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        if (data.section !== fullSectionName) return;
        if (data.action !== 'IN') return;
        
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
          const scanYear = scanDateTime.getFullYear();
          const scanMonth = scanDateTime.getMonth() + 1;
          
          if (scanYear === sf2Year && scanMonth === sf2Month) {
            if (!attendanceMap[data.studentId]) {
              attendanceMap[data.studentId] = new Set();
            }
            attendanceMap[data.studentId].add(scanDate);
          }
        } catch (err) {
          console.error('Error processing attendance:', err);
        }
      });

      const sf2Data = {
        schoolId,
        schoolName: schoolData?.schoolName || '',
        schoolYear: `${sf2Year - 1}-${sf2Year}`,
        month: new Date(sf2Year, sf2Month - 1).toLocaleString('default', { month: 'long' }),
        gradeLevel: grade,
        section: selectedSection.sectionName,
        students: students.map(student => ({
          name: student.name,
          gender: student.gender,
          attendance: Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${sf2Year}-${String(sf2Month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return attendanceMap[student.studentId]?.has(dateStr) || false;
          })
        })),
        daysInMonth,
        adviser: selectedSection.adviser
      };

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
        a.download = `SF2_${fullSectionName}_${sf2Month}-${sf2Year}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setShowSF2Modal(false);
      } else {
        alert('Failed to generate SF2 form');
      }
    } catch (error) {
      console.error('Error generating SF2:', error);
      alert('Error generating SF2 form');
    } finally {
      setGeneratingSF2(false);
    }
  };

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

  // Calendar navigation functions
  const goToPreviousMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Previous month days
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, isCurrentMonth: false });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true });
    }
    
    return days;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
           selectedDate.getMonth() === today.getMonth() &&
           selectedDate.getFullYear() === today.getFullYear();
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        backgroundColor: '#F8F9FA'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '3px solid #E9ECEF', 
            borderTopColor: '#249E94', 
            borderRadius: '50%', 
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#6C757D', fontSize: '14px', fontWeight: '500' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const maleStudents = sectionStudents.filter(s => s.gender === 'MALE');
  const femaleStudents = sectionStudents.filter(s => s.gender === 'FEMALE');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8F9FA' }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          
          * {
            visibility: hidden;
          }
          
          .modal-content, .modal-content * {
            visibility: visible;
          }
          
          .modal-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          .no-print {
            display: none !important;
          }
        }
      `}</style>

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
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="2">
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

      {/* WHITE SIDEBAR */}
      <div style={{
        width: sidebarCollapsed ? '70px' : '280px',
        backgroundColor: '#FFFFFF',
        height: '100vh',
        position: 'fixed',
        left: isMobile && sidebarCollapsed ? '-70px' : '0',
        top: 0,
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        borderRight: '1px solid #E5E7EB',
        boxShadow: isMobile && !sidebarCollapsed ? '4px 0 16px rgba(0,0,0,0.15)' : '2px 0 8px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>
        
        {/* School Name & ID Header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid #F3F4F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          minHeight: '80px'
        }}>
          {!sidebarCollapsed ? (
            <>
              <div>
                <h2 style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: '#1F2937', 
                  margin: 0,
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '200px'
                }}>
                  {schoolData?.schoolName || 'School Name'}
                </h2>
                <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '4px 0 0 0', fontWeight: '500' }}>
                  ID: {schoolId}
                </p>
              </div>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6B7280',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                  e.currentTarget.style.color = '#249E94';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#6B7280';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6B7280',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.color = '#249E94';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6B7280';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 0' }}>
          
          {/* Dashboard */}
          <button
            onClick={() => setActiveView('dashboard')}
            style={{
              width: '100%',
              padding: sidebarCollapsed ? '14px 20px' : '12px 20px',
              margin: '0 0 4px 0',
              background: activeView === 'dashboard' ? 'linear-gradient(135deg, #249E94 0%, #1E8A7F 100%)' : 'transparent',
              border: 'none',
              color: activeView === 'dashboard' ? '#FFFFFF' : '#6B7280',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeView === 'dashboard' ? '600' : '500',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s',
              textAlign: 'left',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              borderRadius: sidebarCollapsed ? '0' : '0 8px 8px 0',
              marginRight: sidebarCollapsed ? '0' : '8px',
              marginLeft: sidebarCollapsed ? '0' : '8px'
            }}
            onMouseEnter={(e) => {
              if (activeView !== 'dashboard') {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.color = '#249E94';
              }
            }}
            onMouseLeave={(e) => {
              if (activeView !== 'dashboard') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6B7280';
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="14" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="14" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="3" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>

          {/* Sections */}
          <button
            onClick={() => setActiveView('sections')}
            style={{
              width: '100%',
              padding: sidebarCollapsed ? '14px 20px' : '12px 20px',
              margin: '0 0 4px 0',
              background: activeView === 'sections' ? 'linear-gradient(135deg, #249E94 0%, #1E8A7F 100%)' : 'transparent',
              border: 'none',
              color: activeView === 'sections' ? '#FFFFFF' : '#6B7280',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeView === 'sections' ? '600' : '500',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s',
              textAlign: 'left',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              borderRadius: sidebarCollapsed ? '0' : '0 8px 8px 0',
              marginRight: sidebarCollapsed ? '0' : '8px',
              marginLeft: sidebarCollapsed ? '0' : '8px'
            }}
            onMouseEnter={(e) => {
              if (activeView !== 'sections') {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.color = '#249E94';
              }
            }}
            onMouseLeave={(e) => {
              if (activeView !== 'sections') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6B7280';
              }
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            {!sidebarCollapsed && <span>Sections</span>}
          </button>

          {/* CALENDAR */}
          {!sidebarCollapsed && (
            <div style={{ 
              margin: '20px 12px', 
              padding: '16px', 
              backgroundColor: '#F9FAFB', 
              borderRadius: '12px',
              border: '1px solid #E5E7EB'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <button
                  onClick={goToPreviousMonth}
                  style={{
                    background: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#6B7280'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>
                    {selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                  <button
                    onClick={goToToday}
                    style={{
                      fontSize: '10px',
                      color: '#249E94',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 8px',
                      marginTop: '2px',
                      fontWeight: '500'
                    }}
                  >
                    Today
                  </button>
                </div>
                
                <button
                  onClick={goToNextMonth}
                  style={{
                    background: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#6B7280'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)', 
                gap: '4px',
                marginBottom: '8px'
              }}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} style={{ 
                    fontSize: '10px', 
                    fontWeight: '600', 
                    color: '#9CA3AF', 
                    textAlign: 'center',
                    padding: '4px 0'
                  }}>
                    {day}
                  </div>
                ))}
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)', 
                gap: '4px'
              }}>
                {generateCalendarDays().map((dayObj, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '6px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: dayObj.day && isToday(dayObj.day) ? '700' : '500',
                      color: dayObj.isCurrentMonth ? (dayObj.day && isToday(dayObj.day) ? '#FFFFFF' : '#1F2937') : '#D1D5DB',
                      backgroundColor: dayObj.day && isToday(dayObj.day) ? '#249E94' : 'transparent',
                      borderRadius: '6px',
                      cursor: dayObj.day ? 'pointer' : 'default',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (dayObj.day && !isToday(dayObj.day)) {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (dayObj.day && !isToday(dayObj.day)) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {dayObj.day || ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PROFILE BUTTON AT BOTTOM */}
        <div style={{ 
          borderTop: '1px solid #E5E7EB', 
          padding: '12px',
          position: 'relative',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSettings(!showSettings);
            }}
            style={{
              width: sidebarCollapsed ? '46px' : '100%',
              height: '46px',
              padding: sidebarCollapsed ? '0' : '0 16px',
              background: '#FFFFFF',
              border: '2px solid #E5E7EB',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s',
              justifyContent: sidebarCollapsed ? 'center' : 'space-between'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#249E94';
              e.currentTarget.style.backgroundColor = '#F9FAFB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#F9FAFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '2px solid #E5E7EB',
              flexShrink: 0
            }}>
              <img 
                src={schoolLogo} 
                alt="School Logo"
                style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>
            {!sidebarCollapsed && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>

          {/* DROPDOWN SETTINGS MENU */}
          {showSettings && (
            <div style={{
              position: 'fixed',
              bottom: isMobile ? '16px' : '20px',
              left: isMobile ? '50%' : (sidebarCollapsed ? '90px' : '300px'),
              transform: isMobile ? 'translateX(-50%)' : 'none',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              width: isMobile ? '320px' : '300px',
              maxHeight: isMobile ? '70vh' : '500px',
              overflowY: 'auto',
              zIndex: 2000,
              animation: 'slideUp 0.2s ease'
            }}>
              <style>{`
                @keyframes slideUp {
                  from {
                    opacity: 0;
                    transform: translateY(10px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>

              {/* School Header */}
              <div style={{
                padding: '24px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#F9FAFB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '2px solid #E5E7EB',
                  flexShrink: 0
                }}>
                  <img 
                    src={schoolLogo} 
                    alt="School Logo"
                    style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo.png';
                    }}
                  />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <h3 style={{ 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    margin: 0,
                    color: '#1F2937',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {schoolData?.schoolName || 'School'}
                  </h3>
                  <p style={{ fontSize: '12px', margin: '4px 0 0 0', color: '#6B7280', fontWeight: '500' }}>
                    ID: {schoolId}
                  </p>
                </div>
              </div>

              {/* School Info */}
              <div style={{ padding: '20px' }}>
                <h4 style={{ 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  color: '#9CA3AF', 
                  marginBottom: '16px', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px' 
                }}>
                  School Information
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#F9FAFB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0, fontWeight: '500' }}>Principal</p>
                      <p style={{ fontSize: '13px', color: '#1F2937', fontWeight: '600', margin: '2px 0 0 0' }}>
                        {schoolData?.principal || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#F9FAFB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0, fontWeight: '500' }}>Contact</p>
                      <p style={{ fontSize: '13px', color: '#1F2937', fontWeight: '600', margin: '2px 0 0 0' }}>
                        {schoolData?.contactNumber || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#F9FAFB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0, fontWeight: '500' }}>Address</p>
                      <p style={{ fontSize: '13px', color: '#1F2937', fontWeight: '600', margin: '2px 0 0 0', lineHeight: '1.4' }}>
                        {schoolData?.address || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  backgroundColor: '#FEF2F2',
                  border: 'none',
                  borderTop: '1px solid #FEE2E2',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#DC2626',
                  fontWeight: '600',
                  transition: 'background-color 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

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
        
        {activeView === 'dashboard' && (
  <div>
    <h1 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: '700', color: '#212529', margin: '0 0 8px 0' }}>
      Dashboard
    </h1>
    <p style={{ fontSize: '14px', color: '#6C757D', margin: '0 0 32px 0' }}>
      Overview of your school statistics
    </p>

    {/* SECTIONS OVER TIME CHART */}
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid #E9ECEF',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#6C757D', margin: 0, marginBottom: '4px' }}>
            Total Sections
          </h3>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#249E94', margin: 0, lineHeight: 1 }}>
            {sections.length}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#249E94' }}></div>
            <span style={{ color: '#6C757D' }}>Sections</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={Array.from({ length: 7 }, (_, i) => ({
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
          sections: sections.length
        }))}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
          <XAxis dataKey="day" stroke="#6C757D" style={{ fontSize: '11px' }} />
          <YAxis stroke="#6C757D" style={{ fontSize: '11px' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #E9ECEF', 
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="sections" 
            stroke="#249E94" 
            strokeWidth={2}
            dot={{ fill: '#249E94', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>

    {/* TOTAL STUDENTS CHART */}
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid #E9ECEF',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#6C757D', margin: 0, marginBottom: '4px' }}>
            Total Students
          </h3>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#3498DB', margin: 0, lineHeight: 1 }}>
            {totalStudents}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#3498DB' }}></div>
            <span style={{ color: '#6C757D' }}>Students</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={Array.from({ length: 7 }, (_, i) => ({
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
          students: totalStudents
        }))}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
          <XAxis dataKey="day" stroke="#6C757D" style={{ fontSize: '11px' }} />
          <YAxis stroke="#6C757D" style={{ fontSize: '11px' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #E9ECEF', 
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="students" 
            stroke="#3498DB" 
            strokeWidth={2}
            dot={{ fill: '#3498DB', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>

    {/* TODAY'S SCANS CHART */}
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid #E9ECEF',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#6C757D', margin: 0, marginBottom: '4px' }}>
            Today's Attendance Scans
          </h3>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#9B59B6', margin: 0, lineHeight: 1 }}>
            {totalScansToday}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#2ECC71' }}></div>
            <span style={{ color: '#6C757D' }}>AM IN ({todayScans.amIn})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#E74C3C' }}></div>
            <span style={{ color: '#6C757D' }}>AM OUT ({todayScans.amOut})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#F39C12' }}></div>
            <span style={{ color: '#6C757D' }}>PM IN ({todayScans.pmIn})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#E67E22' }}></div>
            <span style={{ color: '#6C757D' }}>PM OUT ({todayScans.pmOut})</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={[
          { time: '6 AM', amIn: todayScans.amIn, amOut: 0, pmIn: 0, pmOut: 0 },
          { time: '8 AM', amIn: todayScans.amIn, amOut: 0, pmIn: 0, pmOut: 0 },
          { time: '10 AM', amIn: todayScans.amIn, amOut: todayScans.amOut, pmIn: 0, pmOut: 0 },
          { time: '12 PM', amIn: todayScans.amIn, amOut: todayScans.amOut, pmIn: 0, pmOut: 0 },
          { time: '2 PM', amIn: todayScans.amIn, amOut: todayScans.amOut, pmIn: todayScans.pmIn, pmOut: 0 },
          { time: '4 PM', amIn: todayScans.amIn, amOut: todayScans.amOut, pmIn: todayScans.pmIn, pmOut: todayScans.pmOut },
          { time: '6 PM', amIn: todayScans.amIn, amOut: todayScans.amOut, pmIn: todayScans.pmIn, pmOut: todayScans.pmOut }
        ]}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
          <XAxis dataKey="time" stroke="#6C757D" style={{ fontSize: '11px' }} />
          <YAxis stroke="#6C757D" style={{ fontSize: '11px' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #E9ECEF', 
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Line type="monotone" dataKey="amIn" stroke="#2ECC71" strokeWidth={2} name="AM IN" />
          <Line type="monotone" dataKey="amOut" stroke="#E74C3C" strokeWidth={2} name="AM OUT" />
          <Line type="monotone" dataKey="pmIn" stroke="#F39C12" strokeWidth={2} name="PM IN" />
          <Line type="monotone" dataKey="pmOut" stroke="#E67E22" strokeWidth={2} name="PM OUT" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)}

        {activeView === 'sections' && (
          <div>
            <h1 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: '700', color: '#212529', margin: '0 0 8px 0' }}>
              Sections
            </h1>
            <p style={{ fontSize: '14px', color: '#6C757D', margin: '0 0 24px 0' }}>
              Manage and view all sections
            </p>

            {/* Sections List */}
            {grades.map((grade) => (
              <div key={grade} style={{ marginBottom: '16px' }}>
                <div 
                  onClick={() => toggleGrade(grade)}
                  style={{ 
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    cursor: 'pointer',
                    border: '1px solid #E9ECEF',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#249E94';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(36, 158, 148, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E9ECEF';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  }}
                >
                  <span 
                    style={{ 
                      fontSize: '12px',
                      color: '#249E94',
                      transform: expandedGrades.has(grade) ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}
                  >
                    ▶
                  </span>
                  <h2 style={{ 
                    fontSize: '17px', 
                    fontWeight: '600', 
                    color: '#212529', 
                    margin: 0,
                    flex: 1
                  }}>
                    Grade {grade}
                  </h2>
                  <span style={{ 
                    fontSize: '13px', 
                    color: 'white',
                    fontWeight: '600',
                    backgroundColor: '#249E94',
                    padding: '6px 14px',
                    borderRadius: '20px'
                  }}>
                    {sectionsByGrade[grade].length}
                  </span>
                </div>

                {expandedGrades.has(grade) && (
                  <div style={{ 
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    marginTop: '12px',
                    overflow: 'hidden',
                    border: '1px solid #E9ECEF',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}>
                    {!isMobile && (
                      <div style={{ 
                        display: 'grid',
                        gridTemplateColumns: '2fr 2fr 1fr 3fr',
                        gap: '16px',
                        padding: '14px 24px',
                        backgroundColor: '#F8F9FA',
                        borderBottom: '1px solid #E9ECEF'
                      }}>
                        <div style={{ fontSize: '12px', color: '#6C757D', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section</div>
                        <div style={{ fontSize: '12px', color: '#6C757D', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Adviser</div>
                        <div style={{ fontSize: '12px', color: '#6C757D', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Students</div>
                        <div style={{ fontSize: '12px', color: '#6C757D', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</div>
                      </div>
                    )}

                    {sectionsByGrade[grade].map((section: any) => {
                      const isUnlocked = unlockedSections.has(section.sectionId);
                      
                      return isMobile ? (
                        // MOBILE CARD VIEW
                        <div
                          key={section.id}
                          style={{
                            padding: '16px',
                            borderBottom: '1px solid #F8F9FA'
                          }}
                        >
                          <div style={{ marginBottom: '14px' }}>
                            <div 
                              onClick={() => !isUnlocked && handleSectionClick(section)}
                              style={{ 
                                fontSize: '15px', 
                                color: '#212529', 
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
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5">
                                  <rect x="5" y="11" width="14" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6C757D', marginBottom: '4px' }}>
                              <strong>Adviser:</strong> {section.adviser || 'No adviser'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6C757D' }}>
                              <strong>Students:</strong> <span style={{ color: '#249E94', fontWeight: '600' }}>{studentCounts[section.sectionId] || 0}</span>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <button
                              onClick={() => handleActionClick(section, 'studentList')}
                              disabled={!isUnlocked}
                              style={{
                                width: '100%',
                                padding: '9px',
                                backgroundColor: isUnlocked ? '#249E94' : '#E9ECEF',
                                color: isUnlocked ? 'white' : '#ADB5BD',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: isUnlocked ? 'pointer' : 'not-allowed',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                            >
                              Student List
                            </button>
                            <button
                              onClick={() => handleActionClick(section, 'attendance')}
                              disabled={!isUnlocked}
                              style={{
                                width: '100%',
                                padding: '9px',
                                backgroundColor: isUnlocked ? '#249E94' : '#E9ECEF',
                                color: isUnlocked ? 'white' : '#ADB5BD',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: isUnlocked ? 'pointer' : 'not-allowed',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                            >
                              Attendance
                            </button>
                            <button
                              onClick={() => handleActionClick(section, 'topAttendees')}
                              disabled={!isUnlocked}
                              style={{
                                width: '100%',
                                padding: '9px',
                                backgroundColor: isUnlocked ? '#249E94' : '#E9ECEF',
                                color: isUnlocked ? 'white' : '#ADB5BD',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: isUnlocked ? 'pointer' : 'not-allowed',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                            >
                              Top Attendees
                            </button>
                            <button
                              onClick={() => handleOpenSF2(section)}
                              disabled={!isUnlocked}
                              style={{
                                width: '100%',
                                padding: '9px',
                                backgroundColor: isUnlocked ? '#249E94' : '#E9ECEF',
                                color: isUnlocked ? 'white' : '#ADB5BD',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: isUnlocked ? 'pointer' : 'not-allowed',
                                fontSize: '12px',
                                fontWeight: '600'
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
                            padding: '14px 24px',
                            borderBottom: '1px solid #F8F9FA',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAFBFC'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          {/* Section Name */}
                          <div 
                            onClick={() => !isUnlocked && handleSectionClick(section)}
                            style={{ 
                              fontSize: '15px', 
                              color: '#212529', 
                              fontWeight: '500',
                              cursor: isUnlocked ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px'
                            }}
                          >
                            {section.sectionName}
                            {!isUnlocked && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5">
                                <rect x="5" y="11" width="14" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          
                          {/* Adviser */}
                          <div style={{ fontSize: '14px', color: '#6C757D', display: 'flex', alignItems: 'center' }}>
                            {section.adviser || 'No adviser'}
                          </div>
                          
                          {/* Student Count */}
                          <div style={{ fontSize: '18px', color: '#249E94', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                            {studentCounts[section.sectionId] || 0}
                          </div>
                          
                          {/* ACTIONS */}
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => handleActionClick(section, 'studentList')}
                              disabled={!isUnlocked}
                              style={{
                                padding: '7px 12px',
                                backgroundColor: isUnlocked ? 'white' : '#F8F9FA',
                                border: '1px solid #DEE2E6',
                                borderRadius: '8px',
                                cursor: isUnlocked ? 'pointer' : 'not-allowed',
                                fontSize: '12px',
                                color: isUnlocked ? '#495057' : '#ADB5BD',
                                fontWeight: '500',
                                transition: 'all 0.2s ease',
                                opacity: isUnlocked ? 1 : 0.6,
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => {
                                if (isUnlocked) {
                                  e.currentTarget.style.backgroundColor = '#249E94';
                                  e.currentTarget.style.color = 'white';
                                  e.currentTarget.style.borderColor = '#249E94';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(36, 158, 148, 0.2)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isUnlocked) {
                                  e.currentTarget.style.backgroundColor = 'white';
                                  e.currentTarget.style.color = '#495057';
                                  e.currentTarget.style.borderColor = '#DEE2E6';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }
                              }}
                            >
                              Student List
                            </button>
                            
                            <button
                              onClick={() => handleActionClick(section, 'attendance')}
                              disabled={!isUnlocked}
                              style={{
                                padding: '7px 12px',
                                backgroundColor: isUnlocked ? 'white' : '#F8F9FA',
                                border: '1px solid #DEE2E6',
                                borderRadius: '8px',
                                cursor: isUnlocked ? 'pointer' : 'not-allowed',
                                fontSize: '12px',
                                color: isUnlocked ? '#495057' : '#ADB5BD',
                                fontWeight: '500',
                                transition: 'all 0.2s ease',
                                opacity: isUnlocked ? 1 : 0.6,
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => {
                                if (isUnlocked) {
                                  e.currentTarget.style.backgroundColor = '#249E94';
                                  e.currentTarget.style.color = 'white';
                                  e.currentTarget.style.borderColor = '#249E94';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(36, 158, 148, 0.2)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isUnlocked) {
                                  e.currentTarget.style.backgroundColor = 'white';
                                  e.currentTarget.style.color = '#495057';
                                  e.currentTarget.style.borderColor = '#DEE2E6';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }
                              }}
                            >
                              Attendance
                            </button>
                            
                            <button
                              onClick={() => handleActionClick(section, 'topAttendees')}
                              disabled={!isUnlocked}
                              style={{
                                padding: '7px 12px',
                                backgroundColor: isUnlocked ? 'white' : '#F8F9FA',
                                border: '1px solid #DEE2E6',
                                borderRadius: '8px',
                                cursor: isUnlocked ? 'pointer' : 'not-allowed',
                                fontSize: '12px',
                                color: isUnlocked ? '#495057' : '#ADB5BD',
                                fontWeight: '500',
                                transition: 'all 0.2s ease',
                                opacity: isUnlocked ? 1 : 0.6,
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => {
                                if (isUnlocked) {
                                  e.currentTarget.style.backgroundColor = '#249E94';
                                  e.currentTarget.style.color = 'white';
                                  e.currentTarget.style.borderColor = '#249E94';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(36, 158, 148, 0.2)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isUnlocked) {
                                  e.currentTarget.style.backgroundColor = 'white';
                                  e.currentTarget.style.color = '#495057';
                                  e.currentTarget.style.borderColor = '#DEE2E6';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }
                              }}
                            >
                              Top Attendees
                            </button>
                            
                            <button
                              onClick={() => handleOpenSF2(section)}
                              disabled={!isUnlocked}
                              style={{
                                padding: '7px 12px',
                                backgroundColor: isUnlocked ? 'white' : '#F8F9FA',
                                border: '1px solid #DEE2E6',
                                borderRadius: '8px',
                                cursor: isUnlocked ? 'pointer' : 'not-allowed',
                                fontSize: '12px',
                                color: isUnlocked ? '#495057' : '#ADB5BD',
                                fontWeight: '500',
                                transition: 'all 0.2s ease',
                                opacity: isUnlocked ? 1 : 0.6,
                                whiteSpace: 'nowrap'
                              }}
                              onMouseEnter={(e) => {
                                if (isUnlocked) {
                                  e.currentTarget.style.backgroundColor = '#249E94';
                                  e.currentTarget.style.color = 'white';
                                  e.currentTarget.style.borderColor = '#249E94';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(36, 158, 148, 0.2)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (isUnlocked) {
                                  e.currentTarget.style.backgroundColor = 'white';
                                  e.currentTarget.style.color = '#495057';
                                  e.currentTarget.style.borderColor = '#DEE2E6';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }
                              }}
                            >
                              SF2
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
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
            backgroundColor: 'rgba(0,0,0,0.5)',
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
              backgroundColor: 'white',
              borderRadius: '16px',
              maxWidth: '450px',
              width: '100%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
              padding: '40px 32px',
              textAlign: 'center',
              position: 'relative'
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
                color: '#ADB5BD',
                cursor: 'pointer',
                padding: '4px',
                lineHeight: 1
              }}
            >
              ×
            </button>

            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="11" width="14" height="10" rx="2" stroke="#249E94" strokeWidth="2"/>
                <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="#249E94" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1.5" fill="#249E94"/>
              </svg>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#212529', margin: 0, marginBottom: '8px' }}>
              Enter Access PIN
            </h2>
            <p style={{ fontSize: '14px', color: '#6C757D', margin: 0, marginBottom: '32px' }}>
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
                    border: `2px solid ${pinInput[index] ? '#249E94' : '#E9ECEF'}`,
                    borderRadius: '12px',
                    fontSize: '24px',
                    fontWeight: '600',
                    textAlign: 'center',
                    color: '#212529',
                    backgroundColor: 'white',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#249E94';
                    e.target.style.backgroundColor = '#F0F9F8';
                  }}
                  onBlur={(e) => {
                    if (!pinInput[index]) {
                      e.target.style.borderColor = '#E9ECEF';
                      e.target.style.backgroundColor = 'white';
                    }
                  }}
                />
              ))}
            </div>

            {pinError && (
              <p style={{ fontSize: '13px', color: '#DC3545', margin: '0 0 20px 0', fontWeight: '500' }}>
                {pinError}
              </p>
            )}

            <button
              onClick={handlePinSubmit}
              disabled={pinInput.length !== 6}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: pinInput.length === 6 ? '#249E94' : '#C2E5E1',
                border: 'none',
                borderRadius: '12px',
                cursor: pinInput.length === 6 ? 'pointer' : 'not-allowed',
                fontSize: '15px',
                fontWeight: '600',
                color: 'white',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px'
              }}
              onMouseEnter={(e) => {
                if (pinInput.length === 6) {
                  e.currentTarget.style.backgroundColor = '#1E8A7F';
                }
              }}
              onMouseLeave={(e) => {
                if (pinInput.length === 6) {
                  e.currentTarget.style.backgroundColor = '#249E94';
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
                color: '#6C757D',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F8F9FA';
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

      {/* SF2 MODAL */}
      {showSF2Modal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
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
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid #DEE2E6',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: '1px solid #E9ECEF'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#212529', margin: 0, marginBottom: '4px' }}>
                Generate SF2 Form
              </h2>
              <p style={{ fontSize: '13px', color: '#6C757D', margin: 0 }}>
                {selectedSection?.sectionName} • {selectedSection?.adviser}
              </p>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#6C757D', marginBottom: '8px', fontWeight: '500' }}>
                  Month
                </label>
                <select
                  value={sf2Month}
                  onChange={(e) => setSF2Month(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #DEE2E6',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#212529',
                    backgroundColor: 'white'
                  }}
                >
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#6C757D', marginBottom: '8px', fontWeight: '500' }}>
                  School Year
                </label>
                <select
                  value={sf2Year}
                  onChange={(e) => setSF2Year(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #DEE2E6',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#212529',
                    backgroundColor: 'white'
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
                  disabled={generatingSF2}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    backgroundColor: '#F8F9FA',
                    border: '1px solid #DEE2E6',
                    borderRadius: '6px',
                    cursor: generatingSF2 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6C757D',
                    opacity: generatingSF2 ? 0.6 : 1
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
                    backgroundColor: generatingSF2 ? '#9BC5BF' : '#249E94',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: generatingSF2 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'white'
                  }}
                >
                  {generatingSF2 ? 'Generating...' : 'Generate SF2'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT LIST MODAL - Will continue in next part */}
      {/* STUDENT LIST MODAL */}
      {showStudentListModal && (
        <div>
          <div 
            className="no-print"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
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
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              border: '1px solid #DEE2E6',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              padding: '14px 20px', 
              borderBottom: '1px solid #E9ECEF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }} className="no-print">
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#212529', margin: 0, marginBottom: '2px' }}>
                  {selectedSection?.sectionName}
                </h2>
                <p style={{ fontSize: '11px', color: '#6C757D', margin: 0 }}>
                  {selectedSection?.adviser}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleDownloadStudentListPDF}
                  disabled={downloadingPDF}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: downloadingPDF ? '#9BC5BF' : '#17A2B8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: downloadingPDF ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {downloadingPDF ? 'Downloading...' : 'PDF'}
                </button>
                <button
                  onClick={handlePrintStudentList}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#249E94',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  Print
                </button>
                <button
                  onClick={() => setShowStudentListModal(false)}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: '#F8F9FA',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: '#6C757D',
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="modal-content" style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#212529', margin: 0, marginBottom: '2px' }}>
                  {schoolData?.schoolName}
                </h1>
                <p style={{ fontSize: '11px', color: '#6C757D', margin: 0 }}>School ID: {schoolId}</p>
                <p style={{ fontSize: '11px', color: '#6C757D', margin: '2px 0 10px 0' }}>{schoolData?.address}</p>
                
                <div style={{ 
                  display: 'inline-block',
                  backgroundColor: '#F8F9FA',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  marginTop: '4px'
                }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#212529', margin: 0 }}>STUDENT LIST</p>
                </div>
              </div>

              {maleStudents.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: '#212529', 
                    marginBottom: '10px',
                    paddingBottom: '6px',
                    borderBottom: '2px solid #249E94'
                  }}>
                    MALE ({maleStudents.length})
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8F9FA' }}>
                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6', width: '40px' }}>NO.</th>
                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6' }}>NAME</th>
                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6' }}>MOBILE</th>
                        <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6', width: '80px' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {maleStudents.map((student, index) => (
                        <tr key={student.id}>
                          <td style={{ padding: '8px', color: '#6C757D', borderBottom: '1px solid #F8F9FA' }}>{index + 1}</td>
                          <td style={{ padding: '8px', fontWeight: '500', color: '#212529', borderBottom: '1px solid #F8F9FA' }}>{student.name}</td>
                          <td style={{ padding: '8px', color: '#6C757D', borderBottom: '1px solid #F8F9FA' }}>{student.mobileNumber}</td>
                          <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #F8F9FA' }}>
                            <span style={{ 
                              backgroundColor: student.status === 'ACTIVE' ? '#D4EDDA' : '#F8D7DA',
                              color: student.status === 'ACTIVE' ? '#155724' : '#721C24',
                              padding: '3px 10px',
                              borderRadius: '10px',
                              fontSize: '10px',
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
              )}

              {femaleStudents.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: '#212529', 
                    marginBottom: '10px',
                    paddingBottom: '6px',
                    borderBottom: '2px solid #249E94'
                  }}>
                    FEMALE ({femaleStudents.length})
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8F9FA' }}>
                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6', width: '40px' }}>NO.</th>
                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6' }}>NAME</th>
                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6' }}>MOBILE</th>
                        <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6', width: '80px' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {femaleStudents.map((student, index) => (
                        <tr key={student.id}>
                          <td style={{ padding: '8px', color: '#6C757D', borderBottom: '1px solid #F8F9FA' }}>{index + 1}</td>
                          <td style={{ padding: '8px', fontWeight: '500', color: '#212529', borderBottom: '1px solid #F8F9FA' }}>{student.name}</td>
                          <td style={{ padding: '8px', color: '#6C757D', borderBottom: '1px solid #F8F9FA' }}>{student.mobileNumber}</td>
                          <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #F8F9FA' }}>
                            <span style={{ 
                              backgroundColor: student.status === 'ACTIVE' ? '#D4EDDA' : '#F8D7DA',
                              color: student.status === 'ACTIVE' ? '#155724' : '#721C24',
                              padding: '3px 10px',
                              borderRadius: '10px',
                              fontSize: '10px',
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
              )}

              <div style={{ 
                marginTop: '30px', 
                paddingTop: '20px',
                borderTop: '1px solid #DEE2E6',
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '11px'
              }}>
                <div>
                  <p style={{ margin: 0, color: '#ADB5BD', fontSize: '10px' }}>Prepared by</p>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '600', color: '#212529', fontSize: '13px' }}>{selectedSection?.adviser}</p>
                  <p style={{ margin: '15px 0 0 0', color: '#DEE2E6' }}>____________________</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '9px', color: '#ADB5BD' }}>Signature</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '10px', color: '#ADB5BD' }}>Printed as of</p>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '500', color: '#212529', fontSize: '11px' }}>
                    {new Date().toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ATTENDANCE MODAL */}
      {showAttendanceModal && (
        <div>
          <div 
            className="no-print"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
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
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '1000px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              border: '1px solid #DEE2E6',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              padding: '14px 20px', 
              borderBottom: '1px solid #E9ECEF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }} className="no-print">
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#212529', margin: 0, marginBottom: '2px' }}>
                  Attendance - {selectedSection?.sectionName}
                </h2>
                <p style={{ fontSize: '11px', color: '#6C757D', margin: 0 }}>
                  {selectedSection?.adviser}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleDownloadAttendancePDF}
                  disabled={downloadingPDF}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: downloadingPDF ? '#9BC5BF' : '#17A2B8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: downloadingPDF ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {downloadingPDF ? 'Downloading...' : 'PDF'}
                </button>
                <button
                  onClick={handlePrintAttendance}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#249E94',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  Print
                </button>
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: '#F8F9FA',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: '#6C757D',
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Filters */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E9ECEF', backgroundColor: '#F8F9FA' }} className="no-print">
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 2fr', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6C757D', marginBottom: '6px', fontWeight: '500' }}>
                    Date From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      if (selectedSection) {
                        const gradeMatch = selectedSection.sectionId?.match(/G?(\d+)/i);
                        const grade = gradeMatch ? gradeMatch[1] : '';
                        const sectionName = (selectedSection.sectionName || '').trim().toUpperCase();
                        const fullSectionName = `${grade} ${sectionName}`;
                        fetchAttendanceRecords(fullSectionName, e.target.value, dateTo, selectedStudent);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      border: '1px solid #DEE2E6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#212529'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6C757D', marginBottom: '6px', fontWeight: '500' }}>
                    Date To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      if (selectedSection) {
                        const gradeMatch = selectedSection.sectionId?.match(/G?(\d+)/i);
                        const grade = gradeMatch ? gradeMatch[1] : '';
                        const sectionName = (selectedSection.sectionName || '').trim().toUpperCase();
                        const fullSectionName = `${grade} ${sectionName}`;
                        fetchAttendanceRecords(fullSectionName, dateFrom, e.target.value, selectedStudent);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      border: '1px solid #DEE2E6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#212529'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6C757D', marginBottom: '6px', fontWeight: '500' }}>
                    Student
                  </label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => {
                      setSelectedStudent(e.target.value);
                      if (selectedSection) {
                        const gradeMatch = selectedSection.sectionId?.match(/G?(\d+)/i);
                        const grade = gradeMatch ? gradeMatch[1] : '';
                        const sectionName = (selectedSection.sectionName || '').trim().toUpperCase();
                        const fullSectionName = `${grade} ${sectionName}`;
                        fetchAttendanceRecords(fullSectionName, dateFrom, dateTo, e.target.value);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      border: '1px solid #DEE2E6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#212529',
                      backgroundColor: 'white'
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

            <div className="modal-content" style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#212529', margin: 0, marginBottom: '2px' }}>
                  {schoolData?.schoolName}
                </h1>
                <p style={{ fontSize: '11px', color: '#6C757D', margin: 0 }}>School ID: {schoolId}</p>
                <p style={{ fontSize: '11px', color: '#6C757D', margin: '2px 0 10px 0' }}>{schoolData?.address}</p>
                
                <div style={{ 
                  display: 'inline-block',
                  backgroundColor: '#F8F9FA',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  marginTop: '4px'
                }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#212529', margin: 0 }}>ATTENDANCE REPORT</p>
                </div>
                
                <div style={{ 
                  marginTop: '12px',
                  fontSize: '11px',
                  color: '#6C757D'
                }}>
                  <strong>Date Range:</strong> {new Date(dateFrom).toLocaleDateString()} - {new Date(dateTo).toLocaleDateString()}
                  {selectedStudent !== 'all' && (
                    <span> • <strong>Student:</strong> {sectionStudents.find(s => s.studentId === selectedStudent)?.name || 'N/A'}</span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '24px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8F9FA' }}>
                      <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6', width: '40px' }}>NO.</th>
                      {selectedStudent === 'all' && (
                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6' }}>STUDENT NAME</th>
                      )}
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6', width: '90px' }}>DATE</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6', width: '70px' }}>AM IN</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6', width: '70px' }}>AM OUT</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6', width: '70px' }}>PM IN</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6', width: '70px' }}>PM OUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.length > 0 ? (
                      attendanceRecords.map((record, index) => (
                        <tr key={`${record.studentId}-${record.date}-${index}`}>
                          <td style={{ padding: '8px', textAlign: 'center', color: '#6C757D', borderBottom: '1px solid #F8F9FA' }}>{index + 1}</td>
                          {selectedStudent === 'all' && (
                            <td style={{ padding: '8px', fontWeight: '500', color: '#212529', borderBottom: '1px solid #F8F9FA' }}>
                              {record.studentName}
                            </td>
                          )}
                          <td style={{ padding: '8px', color: '#212529', borderBottom: '1px solid #F8F9FA', fontWeight: '500' }}>
                            {new Date(record.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric'
                            })}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', color: '#249E94', borderBottom: '1px solid #F8F9FA', fontWeight: '500' }}>
                            {record.amIn || '-'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', color: '#6C757D', borderBottom: '1px solid #F8F9FA' }}>
                            {record.amOut || '-'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', color: '#249E94', borderBottom: '1px solid #F8F9FA', fontWeight: '500' }}>
                            {record.pmIn || '-'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', color: '#6C757D', borderBottom: '1px solid #F8F9FA' }}>
                            {record.pmOut || '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={selectedStudent === 'all' ? 7 : 6} style={{ padding: '28px', textAlign: 'center', color: '#ADB5BD', fontSize: '12px' }}>
                          No attendance records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ 
                marginTop: '30px', 
                paddingTop: '20px',
                borderTop: '1px solid #DEE2E6',
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '11px'
              }}>
                <div>
                  <p style={{ margin: 0, color: '#ADB5BD', fontSize: '10px' }}>Prepared by</p>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '600', color: '#212529', fontSize: '13px' }}>{selectedSection?.adviser}</p>
                  <p style={{ margin: '15px 0 0 0', color: '#DEE2E6' }}>____________________</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '9px', color: '#ADB5BD' }}>Signature</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '10px', color: '#ADB5BD' }}>Printed as of</p>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '500', color: '#212529', fontSize: '11px' }}>
                    {new Date().toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* TOP ATTENDEES MODAL */}
      {showTopAttendeesModal && (
        <div>
          <div 
            className="no-print"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
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
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              border: '1px solid #DEE2E6',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              padding: '14px 20px', 
              borderBottom: '1px solid #E9ECEF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }} className="no-print">
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#212529', margin: 0, marginBottom: '2px' }}>
                  Top Attendees - {selectedSection?.sectionName}
                </h2>
                <p style={{ fontSize: '11px', color: '#6C757D', margin: 0 }}>
                  {selectedSection?.adviser}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: '#6C757D', fontWeight: '500' }}>Top</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={topCount}
                    onChange={(e) => setTopCount(parseInt(e.target.value) || 10)}
                    style={{
                      width: '60px',
                      padding: '5px 8px',
                      border: '1px solid #DEE2E6',
                      borderRadius: '6px',
                      fontSize: '12px',
                      textAlign: 'center'
                    }}
                  />
                </div>
                <button
                  onClick={handleDownloadTopAttendeesPDF}
                  disabled={downloadingPDF}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: downloadingPDF ? '#9BC5BF' : '#17A2B8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: downloadingPDF ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {downloadingPDF ? 'Downloading...' : 'PDF'}
                </button>
                <button
                  onClick={handlePrintTopAttendees}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#249E94',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  Print
                </button>
                <button
                  onClick={() => setShowTopAttendeesModal(false)}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: '#F8F9FA',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: '#6C757D',
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="modal-content" style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#212529', margin: 0, marginBottom: '2px' }}>
                  {schoolData?.schoolName}
                </h1>
                <p style={{ fontSize: '11px', color: '#6C757D', margin: 0 }}>School ID: {schoolId}</p>
                <p style={{ fontSize: '11px', color: '#6C757D', margin: '2px 0 10px 0' }}>{schoolData?.address}</p>
                
                <div style={{ 
                  display: 'inline-block',
                  backgroundColor: '#F8F9FA',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  marginTop: '4px'
                }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#212529', margin: 0 }}>TOP {topCount} ATTENDEES</p>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8F9FA' }}>
                      <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6', width: '70px' }}>RANK</th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6' }}>STUDENT NAME</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6', width: '120px' }}>ATTENDANCE COUNT</th>
                      <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#6C757D', fontSize: '11px', borderBottom: '1px solid #DEE2E6', width: '90px' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAttendees.slice(0, topCount).map((student, index) => (
                      <tr key={student.id}>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#249E94', borderBottom: '1px solid #F8F9FA', fontWeight: '700', fontSize: '14px' }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: '8px', fontWeight: '500', color: '#212529', borderBottom: '1px solid #F8F9FA' }}>
                          {student.name}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#249E94', borderBottom: '1px solid #F8F9FA', fontWeight: '600', fontSize: '14px' }}>
                          {student.attendanceCount}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #F8F9FA' }}>
                          <span style={{ 
                            backgroundColor: student.status === 'ACTIVE' ? '#D4EDDA' : '#F8D7DA',
                            color: student.status === 'ACTIVE' ? '#155724' : '#721C24',
                            padding: '3px 10px',
                            borderRadius: '10px',
                            fontSize: '10px',
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

              <div style={{ 
                marginTop: '30px', 
                paddingTop: '20px',
                borderTop: '1px solid #DEE2E6',
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '11px'
              }}>
                <div>
                  <p style={{ margin: 0, color: '#ADB5BD', fontSize: '10px' }}>Prepared by</p>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '600', color: '#212529', fontSize: '13px' }}>{selectedSection?.adviser}</p>
                  <p style={{ margin: '15px 0 0 0', color: '#DEE2E6' }}>____________________</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '9px', color: '#ADB5BD' }}>Signature</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '10px', color: '#ADB5BD' }}>Printed as of</p>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '500', color: '#212529', fontSize: '11px' }}>
                    {new Date().toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

    </div>
  );
}