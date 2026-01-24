import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      schoolId,
      schoolName,
      schoolYear,
      month,
      gradeLevel,
      section,
      students,
      daysInMonth,
    } = data;

    const templatePath = path.join(process.cwd(), 'public', 'templates', 'SF2_Template.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      throw new Error('Template worksheet not found');
    }

    // Calculate weekdays only
    const year = parseInt(schoolYear.split('-')[1]);
    const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month);
    const weekdays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(year, monthIndex, day).getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        let label = '';
        if (dayOfWeek === 1) label = 'M';
        else if (dayOfWeek === 2) label = 'T';
        else if (dayOfWeek === 3) label = 'W';
        else if (dayOfWeek === 4) label = 'TH';
        else if (dayOfWeek === 5) label = 'F';
        weekdays.push({ day, label });
      }
    }
    const numWeekdays = weekdays.length;

    // Fill in school information
    worksheet.getCell('C6').value = schoolId;
    worksheet.getCell('K6').value = schoolYear;
    worksheet.getCell('X6').value = month;
    worksheet.getCell('C8').value = schoolName;
    worksheet.getCell('X8').value = gradeLevel;
    worksheet.getCell('AC8').value = section;

    const firstDayCol = 4; // Column D
    
    // Clear ALL columns from D to AJ (4 to 36) for date/day rows
    for (let col = 4; col <= 36; col++) {
      worksheet.getCell(11, col).value = null;
      worksheet.getCell(12, col).value = null;
    }

    // Fill weekdays starting at column D (4)
    for (let i = 0; i < numWeekdays; i++) {
      const col = firstDayCol + i;
      
      const dateCell = worksheet.getCell(11, col);
      dateCell.value = weekdays[i].day;
      dateCell.font = { bold: true, size: 10 };
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      const dayCell = worksheet.getCell(12, col);
      dayCell.value = weekdays[i].label;
      dayCell.font = { bold: true, size: 11 };
      dayCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Fixed column positions for totals and remarks
    const absentCol = 29; // Column AC
    const tardyCol = 30;  // Column AD
    const remarksCol = 31; // Column AE

    // Unmerge existing cells in the header area to avoid conflicts
    try {
      worksheet.unMergeCells('AC10:AD11');
    } catch (e) {
      // Cell might not be merged, that's okay
    }
    
    try {
      worksheet.unMergeCells('AE10:AJ13');
    } catch (e) {
      // Cell might not be merged, that's okay
    }

    // Set "Total for the Month" header - merged cells AC10:AD11
    worksheet.mergeCells('AC10:AD11');
    const totalHeader = worksheet.getCell('AC10');
    totalHeader.value = 'Total for the Month';
    totalHeader.font = { bold: true, size: 10 };
    totalHeader.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    totalHeader.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Set "ABSENT" label at AC12
    const absentLabel = worksheet.getCell('AC12');
    absentLabel.value = 'ABSENT';
    absentLabel.font = { bold: true, size: 10 };
    absentLabel.alignment = { horizontal: 'center', vertical: 'middle' };
    absentLabel.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Set "TARDY" label at AD12
    const tardyLabel = worksheet.getCell('AD12');
    tardyLabel.value = 'TARDY';
    tardyLabel.font = { bold: true, size: 10 };
    tardyLabel.alignment = { horizontal: 'center', vertical: 'middle' };
    tardyLabel.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Set "REMARKS" header - merged cells AE10:AJ13
    worksheet.mergeCells('AE10:AJ13');
    const remarksHeader = worksheet.getCell('AE10');
    remarksHeader.value = 'REMARKS (If DROPPED OUT, state reason, please refer to legend number 2. If TRANSFERRED IN/OUT, write the name of School.)';
    remarksHeader.font = { name: 'Arial Narrow', bold: true, size: 12 };
    remarksHeader.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    remarksHeader.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Clear student rows (14-34 for male, 36-60 for female)
    for (let row = 14; row <= 34; row++) {
      worksheet.getCell(row, 1).value = null;
      worksheet.getCell(row, 2).value = null;
      for (let col = firstDayCol; col < firstDayCol + 31; col++) {
        worksheet.getCell(row, col).value = null;
      }
      worksheet.getCell(row, absentCol).value = null;
      worksheet.getCell(row, tardyCol).value = null;
      worksheet.getCell(row, remarksCol).value = null;
    }

    // Clear female student rows (36-60)
    for (let row = 36; row <= 60; row++) {
      worksheet.getCell(row, 1).value = null;
      worksheet.getCell(row, 2).value = null;
      for (let col = firstDayCol; col < firstDayCol + 31; col++) {
        worksheet.getCell(row, col).value = null;
      }
      worksheet.getCell(row, absentCol).value = null;
      worksheet.getCell(row, tardyCol).value = null;
      worksheet.getCell(row, remarksCol).value = null;
    }

    const maleStudents = students.filter((s: any) => s.gender === 'MALE');
    const femaleStudents = students.filter((s: any) => s.gender === 'FEMALE');

    // MALE students: rows 14-34, numbering starts from 1
    let currentRow = 14;
    let maleStudentNumber = 1;

    for (const student of maleStudents) {
      worksheet.getCell(currentRow, 1).value = maleStudentNumber;
      worksheet.getCell(currentRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
      
      worksheet.getCell(currentRow, 2).value = student.name;
      worksheet.getCell(currentRow, 2).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      
      let absentCount = 0;
      for (let j = 0; j < numWeekdays; j++) {
        const cell = worksheet.getCell(currentRow, firstDayCol + j);
        const dayNumber = weekdays[j].day;
        
        const isPresent = student.attendance && Array.isArray(student.attendance) && student.attendance[dayNumber - 1];
        
        if (isPresent) {
          cell.value = '/';
          cell.font = { size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          absentCount++;
          cell.value = null;
        }
      }
      
      worksheet.getCell(currentRow, absentCol).value = absentCount;
      worksheet.getCell(currentRow, absentCol).alignment = { horizontal: 'center', vertical: 'middle' };
      
      maleStudentNumber++;
      currentRow++;
    }

    // MALE TOTAL at row 35 with arrows
    const maleTotalRow = 35;
    const maleTotalLabel = worksheet.getCell(maleTotalRow, 2);
    maleTotalLabel.value = '◄    MALE | TOTAL Per Day    ►';
    maleTotalLabel.font = { bold: true, size: 10 };
    maleTotalLabel.alignment = { horizontal: 'center', vertical: 'middle' };
    
    for (let i = 0; i < numWeekdays; i++) {
      let total = 0;
      const dayNumber = weekdays[i].day;
      for (const student of maleStudents) {
        if (student.attendance && Array.isArray(student.attendance) && student.attendance[dayNumber - 1]) {
          total++;
        }
      }
      const cell = worksheet.getCell(maleTotalRow, firstDayCol + i);
      cell.value = total;
      cell.font = { bold: true, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // FEMALE students: rows 36-60, numbering starts from 1
    currentRow = 36;
    let femaleStudentNumber = 1;
    
    for (const student of femaleStudents) {
      worksheet.getCell(currentRow, 1).value = femaleStudentNumber;
      worksheet.getCell(currentRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
      
      worksheet.getCell(currentRow, 2).value = student.name;
      worksheet.getCell(currentRow, 2).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      
      let absentCount = 0;
      for (let j = 0; j < numWeekdays; j++) {
        const cell = worksheet.getCell(currentRow, firstDayCol + j);
        const dayNumber = weekdays[j].day;
        
        const isPresent = student.attendance && Array.isArray(student.attendance) && student.attendance[dayNumber - 1];
        
        if (isPresent) {
          cell.value = '/';
          cell.font = { size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          absentCount++;
          cell.value = null;
        }
      }
      
      worksheet.getCell(currentRow, absentCol).value = absentCount;
      worksheet.getCell(currentRow, absentCol).alignment = { horizontal: 'center', vertical: 'middle' };
      
      femaleStudentNumber++;
      currentRow++;
    }

    // FEMALE TOTAL at row 61 with arrows
    const femaleTotalRow = 61;
    const femaleTotalLabel = worksheet.getCell(femaleTotalRow, 2);
    femaleTotalLabel.value = '◄    FEMALE | TOTAL Per Day    ►';
    femaleTotalLabel.font = { bold: true, size: 10 };
    femaleTotalLabel.alignment = { horizontal: 'center', vertical: 'middle' };
    
    for (let i = 0; i < numWeekdays; i++) {
      let total = 0;
      const dayNumber = weekdays[i].day;
      for (const student of femaleStudents) {
        if (student.attendance && Array.isArray(student.attendance) && student.attendance[dayNumber - 1]) {
          total++;
        }
      }
      const cell = worksheet.getCell(femaleTotalRow, firstDayCol + i);
      cell.value = total;
      cell.font = { bold: true, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // COMBINED TOTAL at row 62
    const combinedTotalRow = 62;
    for (let i = 0; i < numWeekdays; i++) {
      let total = 0;
      const dayNumber = weekdays[i].day;
      for (const student of students) {
        if (student.attendance && Array.isArray(student.attendance) && student.attendance[dayNumber - 1]) {
          total++;
        }
      }
      const cell = worksheet.getCell(combinedTotalRow, firstDayCol + i);
      cell.value = total;
      cell.font = { bold: true, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="SF2_${section}_${month}_${schoolYear}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating SF2:', error);
    return NextResponse.json({ 
      error: 'Failed to generate SF2',
      message: error.message 
    }, { status: 500 });
  }
}