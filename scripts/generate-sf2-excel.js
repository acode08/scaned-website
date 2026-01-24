const ExcelJS = require('exceljs');
const fs = require('fs');

// Read command line arguments
const [,, dataFile, outputFile] = process.argv;

if (!dataFile || !outputFile) {
  console.error('Usage: node generate-sf2-excel.js <data.json> <output.xlsx>');
  process.exit(1);
}

// Read the data
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

async function generateSF2() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('SF2 Attendance', {
    pageSetup: { 
      paperSize: 1, // Letter
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  });

  // Colors
  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  const grayFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  const maleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  const femaleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  const combinedFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0C0C0' } };

  // Borders
  const thinBorder = { style: 'thin', color: { argb: 'FF000000' } };
  const mediumBorder = { style: 'medium', color: { argb: 'FF000000' } };
  const allThinBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };
  const allMediumBorders = { top: mediumBorder, left: mediumBorder, bottom: mediumBorder, right: mediumBorder };

  // Column widths
  sheet.getColumn(1).width = 30; // Name column
  
  const daysInMonth = data.daysInMonth;
  
  // Day columns (narrow)
  for (let i = 2; i <= daysInMonth + 1; i++) {
    sheet.getColumn(i).width = 3.5;
  }
  
  // Total and remarks columns
  sheet.getColumn(daysInMonth + 2).width = 8;  // Absent
  sheet.getColumn(daysInMonth + 3).width = 8;  // Tardy
  sheet.getColumn(daysInMonth + 4).width = 25; // Remarks

  let currentRow = 1;

  // Title - Row 1
  sheet.mergeCells(1, 1, 1, 8);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = "School Form 2 (SF2) Daily Attendance Report of Learners";
  titleCell.font = { name: 'Arial', size: 14, bold: true };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  
  currentRow = 3;

  // School Info - Row 3
  sheet.getCell(3, 1).value = `School ID: ${data.schoolId}`;
  sheet.getCell(3, 4).value = `School Year: ${data.schoolYear}`;
  sheet.getCell(3, 7).value = `Month: ${data.month}`;

  // School Info - Row 4
  sheet.getCell(4, 1).value = `Name of School: ${data.schoolName}`;
  sheet.getCell(4, 4).value = `Grade Level: ${data.gradeLevel}`;
  sheet.getCell(4, 7).value = `Section: ${data.section}`;

  for (let cell of [
    sheet.getCell(3, 1), sheet.getCell(3, 4), sheet.getCell(3, 7),
    sheet.getCell(4, 1), sheet.getCell(4, 4), sheet.getCell(4, 7)
  ]) {
    cell.font = { name: 'Arial', size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  }

  currentRow = 6;

  // Header Row 1
  const nameHeader = sheet.getCell(currentRow, 1);
  nameHeader.value = "LEARNER'S NAME\n(Last Name, First Name, Middle Name)";
  nameHeader.font = { name: 'Arial', size: 11, bold: true };
  nameHeader.fill = headerFill;
  nameHeader.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  nameHeader.border = { top: mediumBorder, left: mediumBorder, right: thinBorder, bottom: thinBorder };

  // Day headers
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = sheet.getCell(currentRow, day + 1);
    dayCell.value = day;
    dayCell.font = { name: 'Arial', size: 8 };
    dayCell.fill = headerFill;
    dayCell.alignment = { vertical: 'middle', horizontal: 'center' };
    dayCell.border = { top: mediumBorder, left: thinBorder, right: thinBorder, bottom: thinBorder };
  }

  // Total for the Month (merged)
  sheet.mergeCells(currentRow, daysInMonth + 2, currentRow, daysInMonth + 3);
  const totalHeader = sheet.getCell(currentRow, daysInMonth + 2);
  totalHeader.value = "Total for the\nMonth";
  totalHeader.font = { name: 'Arial', size: 11, bold: true };
  totalHeader.fill = headerFill;
  totalHeader.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  totalHeader.border = { top: mediumBorder, left: thinBorder, right: thinBorder, bottom: thinBorder };

  // Remarks
  const remarksHeader = sheet.getCell(currentRow, daysInMonth + 4);
  remarksHeader.value = "REMARKS (if DROPPED OUT, state reason;\nplease refer to legend number 2.\nIf TRANSFERRED IN/OUT, write the name of School.)";
  remarksHeader.font = { name: 'Arial', size: 8, bold: true };
  remarksHeader.fill = headerFill;
  remarksHeader.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  remarksHeader.border = { top: mediumBorder, left: thinBorder, right: mediumBorder, bottom: thinBorder };

  currentRow++;

  // Header Row 2 - ABSENT / TARDY
  const emptyCell = sheet.getCell(currentRow, 1);
  emptyCell.border = { top: thinBorder, left: mediumBorder, right: thinBorder, bottom: mediumBorder };

  // Empty cells under days
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = sheet.getCell(currentRow, day + 1);
    dayCell.fill = headerFill;
    dayCell.border = allThinBorders;
  }

  // ABSENT
  const absentHeader = sheet.getCell(currentRow, daysInMonth + 2);
  absentHeader.value = "ABSENT";
  absentHeader.font = { name: 'Arial', size: 11, bold: true };
  absentHeader.fill = headerFill;
  absentHeader.alignment = { vertical: 'middle', horizontal: 'center' };
  absentHeader.border = { top: thinBorder, left: thinBorder, right: thinBorder, bottom: mediumBorder };

  // TARDY
  const tardyHeader = sheet.getCell(currentRow, daysInMonth + 3);
  tardyHeader.value = "TARDY";
  tardyHeader.font = { name: 'Arial', size: 11, bold: true };
  tardyHeader.fill = headerFill;
  tardyHeader.alignment = { vertical: 'middle', horizontal: 'center' };
  tardyHeader.border = { top: thinBorder, left: thinBorder, right: thinBorder, bottom: mediumBorder };

  // Empty remarks
  const remarksEmpty = sheet.getCell(currentRow, daysInMonth + 4);
  remarksEmpty.border = { top: thinBorder, left: thinBorder, right: mediumBorder, bottom: mediumBorder };

  currentRow++;

  // Separate students by gender
  const maleStudents = data.students.filter(s => s.gender === 'MALE');
  const femaleStudents = data.students.filter(s => s.gender === 'FEMALE');

  // Function to add student rows
  function addStudentRows(studentList) {
    const startRow = currentRow;
    
    for (const student of studentList) {
      // Name
      const nameCell = sheet.getCell(currentRow, 1);
      nameCell.value = student.name;
      nameCell.font = { name: 'Arial', size: 10 };
      nameCell.alignment = { vertical: 'middle', horizontal: 'left' };
      nameCell.border = { top: thinBorder, left: mediumBorder, right: thinBorder, bottom: thinBorder };

      // Days with attendance
      for (let dayIdx = 0; dayIdx < student.attendance.length; dayIdx++) {
        const dayCell = sheet.getCell(currentRow, dayIdx + 2);
        if (student.attendance[dayIdx]) {
          dayCell.fill = grayFill;
        }
        dayCell.border = allThinBorders;
      }

      // Count absences
      const absentCount = student.attendance.filter(present => !present).length;

      // Absent
      const absentCell = sheet.getCell(currentRow, daysInMonth + 2);
      absentCell.value = absentCount;
      absentCell.font = { name: 'Arial', size: 10 };
      absentCell.alignment = { vertical: 'middle', horizontal: 'center' };
      absentCell.border = allThinBorders;

      // Tardy
      const tardyCell = sheet.getCell(currentRow, daysInMonth + 3);
      tardyCell.font = { name: 'Arial', size: 10 };
      tardyCell.alignment = { vertical: 'middle', horizontal: 'center' };
      tardyCell.border = allThinBorders;

      // Remarks
      const remarksCell = sheet.getCell(currentRow, daysInMonth + 4);
      remarksCell.font = { name: 'Arial', size: 10 };
      remarksCell.alignment = { vertical: 'middle', horizontal: 'left' };
      remarksCell.border = { top: thinBorder, left: thinBorder, right: mediumBorder, bottom: thinBorder };

      currentRow++;
    }

    return currentRow;
  }

  // Function to add total row
  function addTotalRow(label, fill) {
    // Label
    const labelCell = sheet.getCell(currentRow, 1);
    labelCell.value = label;
    labelCell.font = { name: 'Arial', size: 11, bold: true };
    labelCell.fill = fill;
    labelCell.alignment = { vertical: 'middle', horizontal: 'center' };
    labelCell.border = { top: mediumBorder, left: mediumBorder, right: thinBorder, bottom: mediumBorder };

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = sheet.getCell(currentRow, day + 1);
      dayCell.fill = fill;
      dayCell.border = { top: mediumBorder, left: thinBorder, right: thinBorder, bottom: mediumBorder };
    }

    // Totals
    for (let col = daysInMonth + 2; col <= daysInMonth + 4; col++) {
      const totalCell = sheet.getCell(currentRow, col);
      totalCell.fill = fill;
      if (col === daysInMonth + 4) {
        totalCell.border = { top: mediumBorder, left: thinBorder, right: mediumBorder, bottom: mediumBorder };
      } else {
        totalCell.border = { top: mediumBorder, left: thinBorder, right: thinBorder, bottom: mediumBorder };
      }
    }

    currentRow++;
  }

  // Add male students
  addStudentRows(maleStudents);
  addTotalRow("MALE | TOTAL Per Day", maleFill);

  // Add female students
  addStudentRows(femaleStudents);
  addTotalRow("FEMALE | TOTAL Per Day", femaleFill);

  // Combined total
  addTotalRow("Combined TOTAL PER DAY", combinedFill);

  currentRow += 2;

  // Signature
  sheet.getCell(currentRow, 1).value = `Prepared by: ${data.adviser || '___________________________'}`;
  sheet.getCell(currentRow, 1).font = { name: 'Arial', size: 10 };
  sheet.getCell(currentRow, 1).alignment = { vertical: 'middle', horizontal: 'left' };

  currentRow += 2;
  sheet.getCell(currentRow, 1).value = "Signature over Printed Name";
  sheet.getCell(currentRow, 1).font = { name: 'Arial', size: 9, italic: true };
  sheet.getCell(currentRow, 1).alignment = { vertical: 'middle', horizontal: 'left' };

  // Freeze panes
  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 7 }];

  // Save
  await workbook.xlsx.writeFile(outputFile);
  console.log(`SF2 Excel form generated successfully: ${outputFile}`);
}

generateSF2().catch(err => {
  console.error('Error generating SF2:', err);
  process.exit(1);
});