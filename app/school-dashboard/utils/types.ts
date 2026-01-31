// app/school-dashboard/utils/types.ts
export interface School {
  schoolId: string;
  schoolName: string;
  principal: string;
  contactNumber: string;
  address: string;
  logo?: string;
}

export interface Section {
  id: string;
  sectionId: string;
  sectionName: string;
  adviser: string;
  schoolId: string;
}

export interface Student {
  id: string;
  studentId: string;
  name: string;
  gender: 'MALE' | 'FEMALE';
  mobileNumber: string;
  status: 'ACTIVE' | 'INACTIVE';
  attendanceCount?: number;
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  date: string;
  session: string;
  amIn: string | null;
  amOut: string | null;
  pmIn: string | null;
  pmOut: string | null;
}

export interface TodayScans {
  amIn: number;
  amOut: number;
  pmIn: number;
  pmOut: number;
}

export interface ChartDataPoint {
  date: string;
  amIn: number;
  amOut: number;
  pmIn: number;
  pmOut: number;
}