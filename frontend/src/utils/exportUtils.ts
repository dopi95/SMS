const generateFileName = (filters: any) => {
  const parts = ['students-report'];
  if (filters.searchTerm) parts.push(`search-${filters.searchTerm.replace(/\s+/g, '-')}`);
  if (filters.classFilter) parts.push(`class-${filters.classFilter}`);
  if (filters.sectionFilter) parts.push(`section-${filters.sectionFilter}`);
  if (filters.batchFilter) parts.push(`batch-${filters.batchFilter}`);
  if (filters.typeFilter) parts.push(`type-${filters.typeFilter}`);
  return parts.join('-');
};

export const exportToPDF = (students: any[], filters: any) => {
  const fileName = generateFileName(filters);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <html>
      <head>
        <title>${fileName}</title>
        <style>
          @media print { @page { size: A4 landscape; margin: 0.5in; } }
          body { font-family: Arial, sans-serif; margin: 0; }
          h1 { text-align: center; color: #1f2937; margin-bottom: 10px; }
          .info { text-align: center; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; font-size: 8px; }
          th, td { border: 1px solid #333; padding: 2px; text-align: left; }
          th { background-color: #3b82f6; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <h1>Bluelight Academy - Students Report</h1>
        <div class="info">Generated: ${new Date().toLocaleDateString()} | Total: ${students.length} students</div>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>First</th><th>Middle</th><th>Last</th><th>Email</th><th>Gender</th>
              <th>Class</th><th>Section</th><th>Father</th><th>F.Phone</th><th>Mother</th>
              <th>M.Phone</th><th>Address</th><th>Payment</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => `
              <tr>
                <td>${s.studentId || ''}</td>
                <td>${s.firstName || ''}</td>
                <td>${s.middleName || ''}</td>
                <td>${s.lastName || ''}</td>
                <td>${s.email || ''}</td>
                <td>${s.gender || ''}</td>
                <td>${s.class || ''}</td>
                <td>${s.section || ''}</td>
                <td>${s.fatherName || ''}</td>
                <td>${s.fatherPhone || ''}</td>
                <td>${s.motherName || ''}</td>
                <td>${s.motherPhone || ''}</td>
                <td>${s.address || ''}</td>
                <td>${s.paymentCode || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            document.title = '${fileName}';
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export const exportToExcel = (students: any[], filters: any) => {
  const fileName = generateFileName(filters);
  const csvContent = [
    ['Student ID', 'First Name', 'Middle Name', 'Last Name', 'Email', 'Gender', 'Class', 'Section', 'Father Name', 'Father Phone', 'Mother Name', 'Mother Phone', 'Address', 'Payment Code'],
    ...students.map(s => [
      s.studentId || '',
      s.firstName || '',
      s.middleName || '',
      s.lastName || '',
      s.email || '',
      s.gender || '',
      s.class || '',
      s.section || '',
      s.fatherName || '',
      s.fatherPhone || '',
      s.motherName || '',
      s.motherPhone || '',
      s.address || '',
      s.paymentCode || ''
    ])
  ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};