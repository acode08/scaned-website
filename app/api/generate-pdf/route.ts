import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { type } = data;

    // Import jsPDF with autotable
    const jsPDF = (await import('jspdf')).jsPDF;
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ format: 'a4' });
    
    // Helper: Add header
    const addHeader = (doc: any, data: any) => {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(data.schoolName, 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`School ID: ${data.schoolId}`, 105, 28, { align: 'center' });
      doc.text(data.address || '', 105, 34, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
    };

    // Helper: Add footer
    const addFooter = (doc: any, data: any) => {
      const pageHeight = doc.internal.pageSize.height;
      const footerY = pageHeight - 40;
      
      doc.setDrawColor(200, 200, 200);
      doc.line(20, footerY, 190, footerY);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Prepared by', 20, footerY + 6);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(data.preparedBy || '', 20, footerY + 12);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('____________________', 20, footerY + 22);
      doc.setFontSize(8);
      doc.text('Signature', 20, footerY + 27);
      
      doc.setFontSize(9);
      doc.text('Printed as of', 190, footerY + 6, { align: 'right' });
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(data.printedDate, 190, footerY + 12, { align: 'right' });
      
      doc.setTextColor(0, 0, 0);
    };

    if (type === 'studentList') {
      addHeader(doc, data);
      
      // Title
      doc.setFillColor(245, 245, 245);
      doc.rect(70, 42, 70, 10, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('STUDENT LIST', 105, 49, { align: 'center' });
      
      // Section info
      doc.setFontSize(11);
      doc.text(`${data.sectionName} • ${data.adviser}`, 105, 58, { align: 'center' });
      
      let startY = 68;
      
      // Male Students
      if (data.maleStudents?.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(36, 158, 148);
        doc.text(`MALE (${data.maleStudents.length})`, 20, startY);
        doc.setTextColor(0, 0, 0);
        
        const maleData = data.maleStudents.map((s: any) => [
          s.no.toString(),
          s.name,
          s.mobile,
          s.status
        ]);
        
        autoTable(doc, {
          startY: startY + 4,
          head: [['NO.', 'NAME', 'MOBILE', 'STATUS']],
          body: maleData,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [245, 245, 245], textColor: [100, 100, 100], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 70 },
            2: { cellWidth: 50 },
            3: { cellWidth: 35 }
          }
        });
        
        startY = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Female Students
      if (data.femaleStudents?.length > 0) {
        if (startY > 240) {
          doc.addPage();
          startY = 20;
        }
        
        doc.setFontSize(12);
        doc.setTextColor(36, 158, 148);
        doc.text(`FEMALE (${data.femaleStudents.length})`, 20, startY);
        doc.setTextColor(0, 0, 0);
        
        const femaleData = data.femaleStudents.map((s: any) => [
          s.no.toString(),
          s.name,
          s.mobile,
          s.status
        ]);
        
        autoTable(doc, {
          startY: startY + 4,
          head: [['NO.', 'NAME', 'MOBILE', 'STATUS']],
          body: femaleData,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [245, 245, 245], textColor: [100, 100, 100], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 70 },
            2: { cellWidth: 50 },
            3: { cellWidth: 35 }
          }
        });
      }
      
      addFooter(doc, data);
      
    } else if (type === 'attendance') {
      addHeader(doc, data);
      
      // Title
      doc.setFillColor(245, 245, 245);
      doc.rect(60, 42, 90, 10, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('ATTENDANCE REPORT', 105, 49, { align: 'center' });
      
      // Section info
      doc.setFontSize(11);
      doc.text(`${data.sectionName} • ${data.adviser}`, 105, 58, { align: 'center' });
      
      // Filters
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      let filterText = `Date Range: ${data.dateFrom} - ${data.dateTo}`;
      if (!data.isAllStudents) {
        filterText += ` • Student: ${data.studentName}`;
      } else {
        filterText += ' • All Students';
      }
      doc.text(filterText, 105, 66, { align: 'center' });
      
      const headers = data.isAllStudents 
        ? [['STUDENT NAME', 'DATE', 'AM IN', 'AM OUT', 'PM IN', 'PM OUT']]
        : [['DATE', 'AM IN', 'AM OUT', 'PM IN', 'PM OUT']];
      
      const tableData = data.records?.map((r: any) => 
        data.isAllStudents 
          ? [r.studentName, r.date, r.amIn, r.amOut, r.pmIn, r.pmOut]
          : [r.date, r.amIn, r.amOut, r.pmIn, r.pmOut]
      ) || [];
      
      autoTable(doc, {
        startY: 72,
        head: headers,
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [245, 245, 245], textColor: [100, 100, 100], fontStyle: 'bold' },
      });
      
      addFooter(doc, data);
      
    } else if (type === 'topAttendees') {
      addHeader(doc, data);
      
      // Title
      doc.setFillColor(245, 245, 245);
      doc.rect(55, 42, 100, 10, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOP ${data.topCount} ATTENDEES`, 105, 49, { align: 'center' });
      
      // Section info
      doc.setFontSize(11);
      doc.text(`${data.sectionName} • ${data.adviser}`, 105, 58, { align: 'center' });
      
      const tableData = data.students?.map((s: any) => [
        s.rank.toString(),
        s.name,
        s.attendanceCount.toString(),
        s.status
      ]) || [];
      
      autoTable(doc, {
        startY: 68,
        head: [['RANK', 'STUDENT NAME', 'ATTENDANCE COUNT', 'STATUS']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [245, 245, 245], textColor: [100, 100, 100], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 80 },
          2: { cellWidth: 40, halign: 'center' },
          3: { cellWidth: 30 }
        }
      });
      
      addFooter(doc, data);
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="report.pdf"',
      },
    });

  } catch (error) {
    console.error('PDF Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF', details: String(error) }, { status: 500 });
  }
}