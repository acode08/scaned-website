// app/api/generate-sf2/route.ts - VERCEL FIX (Fetch template from public URL)
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

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

    // ✅ VERCEL FIX: Fetch template from public URL instead of filesystem
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      'http://localhost:3000';

    console.log('📋 SF2 Generation - VERCEL COMPATIBLE');
    console.log(`   Base URL: ${baseUrl}`);
    console.log(`   Students: ${students.length}`);

    const templateUrl = `${baseUrl}/templates/SF2_TEMPLATE.xlsx`;
    const templateResponse = await fetch(templateUrl);

    if (!templateResponse.ok) {
      throw new Error(
        `Failed to fetch template from ${templateUrl}: ${templateResponse.status} ${templateResponse.statusText}`
      );
    }

    const arrayBuffer = await templateResponse.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer as any);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      throw new Error('Template worksheet not found');
    }

    const maleStudents = students.filter((s: any) => s.gender === 'MALE');
    const femaleStudents = students.filter((s: any) => s.gender === 'FEMALE');

    console.log(`   Males: ${maleStudents.length}, Females: ${femaleStudents.length}`);

    // ✅ FILL BASIC INFO
    worksheet.getCell('C6').value = schoolId;
    worksheet.getCell('K6').value = schoolYear;
    worksheet.getCell('X6').value = month;
    worksheet.getCell('C8').value = schoolName;
    worksheet.getCell('X8').value = gradeLevel;
    worksheet.getCell('AC8').value = section;

    // Calculate weekdays
    const year = parseInt(schoolYear.split('-')[1]);
    const monthIndex = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ].indexOf(month);

    const weekdays: { day: number; label: string }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const dayOfWeek = date.getDay();

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
    console.log(`📅 Weekdays: ${numWeekdays}`);

    const firstDayCol = 4;
    const absentCol = 29;

    // Helper function to get column letter
    const getColumnLetter = (col: number): string => {
      let letter = '';
      while (col > 0) {
        const remainder = (col - 1) % 26;
        letter = String.fromCharCode(65 + remainder) + letter;
        col = Math.floor((col - 1) / 26);
      }
      return letter;
    };

    // 🔧 STEP 1: CLEAR AND RESET ALL CELLS
    console.log('🔧 Step 1: Clearing all cells...');

    // Clear column A (auto numbers) - rows 14 to 94 - UPRIGHT (0 degrees)
    for (let row = 14; row <= 94; row++) {
      const cell = worksheet.getCell(row, 1);
      const existingStyle = cell.style || {};
      cell.value = null;
      cell.style = {
        ...existingStyle,
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
          textRotation: 0,
          wrapText: false,
        },
      };
    }

    // Clear attendance area (remove dotted slashes)
    for (let row = 14; row <= 94; row++) {
      for (let col = firstDayCol; col < firstDayCol + 25; col++) {
        const cell = worksheet.getCell(row, col);
        cell.value = null;
        const existingStyle = cell.style || {};
        cell.style = {
          ...existingStyle,
          alignment: {
            horizontal: 'center',
            vertical: 'middle',
          },
        };
      }
    }

    // Clear day numbers (row 11) - VERTICAL (90 degrees)
    for (let col = firstDayCol; col < firstDayCol + 25; col++) {
      const cell = worksheet.getCell(11, col);
      cell.value = null;
      const existingStyle = cell.style || {};
      cell.style = {
        ...existingStyle,
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
          textRotation: 90,
        },
      };
    }

    // Clear day labels (row 12) - VERTICAL (90 degrees)
    for (let col = firstDayCol; col < firstDayCol + 25; col++) {
      const cell = worksheet.getCell(12, col);
      cell.value = null;
      const existingStyle = cell.style || {};
      cell.style = {
        ...existingStyle,
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
          textRotation: 90,
        },
      };
    }

    // 📅 STEP 2: FILL DAY NUMBERS AND LABELS (VERTICAL - 90 degrees)
    console.log('📅 Step 2: Filling dates and day labels (VERTICAL)...');
    for (let i = 0; i < numWeekdays; i++) {
      const col = firstDayCol + i;

      // Day number - VERTICAL
      const dayCell = worksheet.getCell(11, col);
      dayCell.value = weekdays[i].day;
      const dayStyle = dayCell.style || {};
      dayCell.style = {
        ...dayStyle,
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
          textRotation: 90,
        },
      };

      // Day label - VERTICAL
      const labelCell = worksheet.getCell(12, col);
      labelCell.value = weekdays[i].label;
      const labelStyle = labelCell.style || {};
      labelCell.style = {
        ...labelStyle,
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
          textRotation: 90,
        },
      };
    }

    // 👨 STEP 3: FILL MALE STUDENTS
    console.log('👨 Step 3: Filling male students...');
    let currentRow = 14;
    let maleNumber = 1;

    for (const student of maleStudents) {
      if (currentRow > 53) break;

      // Auto number - UPRIGHT (0 degrees)
      const numberCell = worksheet.getCell(currentRow, 1);
      numberCell.value = maleNumber;
      const numberStyle = numberCell.style || {};
      numberCell.style = {
        ...numberStyle,
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
          textRotation: 0,
        },
      };

      // Student name
      const nameCell = worksheet.getCell(currentRow, 2);
      nameCell.value = student.name;

      // Attendance marks
      for (let i = 0; i < numWeekdays; i++) {
        const col = firstDayCol + i;
        const dayNumber = weekdays[i].day;

        const isPresent =
          student.attendance &&
          Array.isArray(student.attendance) &&
          student.attendance[dayNumber - 1] === true;

        if (isPresent) {
          const cell = worksheet.getCell(currentRow, col);
          cell.value = '/';
        }
      }

      // Absent count formula
      const firstDateCol = getColumnLetter(firstDayCol);
      const lastDateCol = getColumnLetter(firstDayCol + numWeekdays - 1);

      const absentCell = worksheet.getCell(currentRow, absentCol);
      absentCell.value = {
        formula: `${numWeekdays}-COUNTIF(${firstDateCol}${currentRow}:${lastDateCol}${currentRow},"/")`,
      };

      maleNumber++;
      currentRow++;
    }

    const lastMaleRow = currentRow - 1;

    // 🎯 MALE TOTAL ROW
    const maleTotalRow = 54;
    const maleTotalLabel = worksheet.getCell(maleTotalRow, 1);
    maleTotalLabel.value = '◄ MALE | TOTAL Per Day ►';
    const maleLabelStyle = maleTotalLabel.style || {};
    maleTotalLabel.style = {
      ...maleLabelStyle,
      alignment: {
        horizontal: 'center',
        vertical: 'middle',
        textRotation: 0,
      },
      font: { bold: true, size: 10 },
    };

    // MALE TOTAL VALUES - VERTICAL (90 degrees)
    for (let i = 0; i < numWeekdays; i++) {
      const col = firstDayCol + i;
      const colLetter = getColumnLetter(col);

      const cell = worksheet.getCell(maleTotalRow, col);
      cell.value = {
        formula: `COUNTIF(${colLetter}14:${colLetter}${lastMaleRow},"/")`,
      };
      const existingStyle = cell.style || {};
      cell.style = {
        ...existingStyle,
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
          textRotation: 90,
        },
      };
    }

    // 👩 STEP 4: FILL FEMALE STUDENTS
    console.log('👩 Step 4: Filling female students...');
    currentRow = 55;
    let femaleNumber = 1;

    for (const student of femaleStudents) {
      if (currentRow > 94) break;

      // Auto number - UPRIGHT (0 degrees)
      const numberCell = worksheet.getCell(currentRow, 1);
      numberCell.value = femaleNumber;
      const numberStyle = numberCell.style || {};
      numberCell.style = {
        ...numberStyle,
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
          textRotation: 0,
        },
      };

      // Student name
      const nameCell = worksheet.getCell(currentRow, 2);
      nameCell.value = student.name;

      // Attendance marks
      for (let i = 0; i < numWeekdays; i++) {
        const col = firstDayCol + i;
        const dayNumber = weekdays[i].day;

        const isPresent =
          student.attendance &&
          Array.isArray(student.attendance) &&
          student.attendance[dayNumber - 1] === true;

        if (isPresent) {
          const cell = worksheet.getCell(currentRow, col);
          cell.value = '/';
        }
      }

      // Absent count formula
      const firstDateCol = getColumnLetter(firstDayCol);
      const lastDateCol = getColumnLetter(firstDayCol + numWeekdays - 1);

      const absentCell = worksheet.getCell(currentRow, absentCol);
      absentCell.value = {
        formula: `${numWeekdays}-COUNTIF(${firstDateCol}${currentRow}:${lastDateCol}${currentRow},"/")`,
      };

      femaleNumber++;
      currentRow++;
    }

    const lastFemaleRow = currentRow - 1;

    // 🎯 FEMALE TOTAL ROW
    const femaleTotalRow = 95;
    const femaleTotalLabel = worksheet.getCell(femaleTotalRow, 1);
    femaleTotalLabel.value = '◄ FEMALE | TOTAL Per Day ►';
    const femaleLabelStyle = femaleTotalLabel.style || {};
    femaleTotalLabel.style = {
      ...femaleLabelStyle,
      alignment: {
        horizontal: 'center',
        vertical: 'middle',
        textRotation: 0,
      },
      font: { bold: true, size: 10 },
    };

    // FEMALE TOTAL VALUES - VERTICAL (90 degrees)
    for (let i = 0; i < numWeekdays; i++) {
      const col = firstDayCol + i;
      const colLetter = getColumnLetter(col);

      const cell = worksheet.getCell(femaleTotalRow, col);
      cell.value = {
        formula: `COUNTIF(${colLetter}55:${colLetter}${lastFemaleRow},"/")`,
      };
      const existingStyle = cell.style || {};
      cell.style = {
        ...existingStyle,
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
          textRotation: 90,
        },
      };
    }

    // 🎯 COMBINED TOTAL ROW
    const combinedTotalRow = 96;
    const combinedLabel = worksheet.getCell(combinedTotalRow, 1);
    if (!combinedLabel.value) {
      combinedLabel.value = 'Combined TOTAL PER DAY';
    }
    const combinedLabelStyle = combinedLabel.style || {};
    combinedLabel.style = {
      ...combinedLabelStyle,
      alignment: {
        horizontal: 'center',
        vertical: 'middle',
        textRotation: 0,
      },
      font: { bold: true, size: 10 },
    };

    // COMBINED TOTAL VALUES - VERTICAL (90 degrees)
    for (let i = 0; i < numWeekdays; i++) {
      const col = firstDayCol + i;
      const colLetter = getColumnLetter(col);

      const cell = worksheet.getCell(combinedTotalRow, col);
      cell.value = {
        formula: `${colLetter}${maleTotalRow}+${colLetter}${femaleTotalRow}`,
      };
      const existingStyle = cell.style || {};
      cell.style = {
        ...existingStyle,
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
          textRotation: 90,
        },
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();

    console.log('✅ SF2 COMPLETE - All correct orientations!');
    console.log('   - Auto numbers: UPRIGHT (0°)');
    console.log('   - Dates/Days: VERTICAL (90°)');
    console.log('   - Totals: VERTICAL (90°)');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="SF2_${section}_${month}_${schoolYear}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate SF2',
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}