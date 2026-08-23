import * as XLSX from 'xlsx';

// Header aliases dictionary for flexible spreadsheet compatibility
const HEADER_MAP = {
  // First Name
  firstname: 'firstName',
  'first name': 'firstName',
  fname: 'firstName',
  name: 'firstName',

  // Last Name
  lastname: 'lastName',
  'last name': 'lastName',
  lname: 'lastName',
  surname: 'lastName',

  // Email
  email: 'email',
  'email address': 'email',
  'mail id': 'email',
  'email id': 'email',

  // Phone
  phone: 'phone',
  'phone number': 'phone',
  mobile: 'phone',
  'mobile number': 'phone',
  contact: 'phone',

  // PRN
  prn: 'prn',
  'prn number': 'prn',
  'roll no': 'prn',
  'roll number': 'prn',
  'student id': 'prn',

  // College Code
  collegecode: 'collegeCode',
  'college code': 'collegeCode',
  college: 'collegeCode',
  institute: 'collegeCode',

  // Department Code
  departmentcode: 'departmentCode',
  'department code': 'departmentCode',
  deptcode: 'departmentCode',
  'dept code': 'departmentCode',
  department: 'departmentCode',
  dept: 'departmentCode',
  branch: 'departmentCode',

  // CGPA
  cgpa: 'CGPA',
  'overall cgpa': 'CGPA',
  gpa: 'CGPA',

  // Semester GPAs
  sem1gpa: 'sem1Gpa',
  'sem 1 gpa': 'sem1Gpa',
  'sem 1': 'sem1Gpa',
  sem2gpa: 'sem2Gpa',
  'sem 2 gpa': 'sem2Gpa',
  'sem 2': 'sem2Gpa',
  sem3gpa: 'sem3Gpa',
  'sem 3 gpa': 'sem3Gpa',
  'sem 3': 'sem3Gpa',
  sem4gpa: 'sem4Gpa',
  'sem 4 gpa': 'sem4Gpa',
  'sem 4': 'sem4Gpa',
  sem5gpa: 'sem5Gpa',
  'sem 5 gpa': 'sem5Gpa',
  'sem 5': 'sem5Gpa',
  sem6gpa: 'sem6Gpa',
  'sem 6 gpa': 'sem6Gpa',
  'sem 6': 'sem6Gpa',
  sem7gpa: 'sem7Gpa',
  'sem 7 gpa': 'sem7Gpa',
  'sem 7': 'sem7Gpa',
  sem8gpa: 'sem8Gpa',
  'sem 8 gpa': 'sem8Gpa',
  'sem 8': 'sem8Gpa',

  // 10th & 12th Percentages
  percentage10th: 'percentage10th',
  'percentage 10th': 'percentage10th',
  '10th percentage': 'percentage10th',
  '10th %': 'percentage10th',
  'ssc percentage': 'percentage10th',

  percentage12th: 'percentage12th',
  'percentage 12th': 'percentage12th',
  '12th percentage': 'percentage12th',
  '12th %': 'percentage12th',
  'hsc percentage': 'percentage12th',
  'diploma percentage': 'percentage12th',
};

const REQUIRED_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email Address' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'prn', label: 'PRN / Student ID' },
  { key: 'collegeCode', label: 'College Code' },
  { key: 'departmentCode', label: 'Department Code' },
];

/**
 * Parses an Excel / CSV File buffer, validates all rows, and formats the output JSON.
 */
export async function parseAndValidateStudentExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert raw rows to 2D array
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawData || rawData.length < 2) {
          throw new Error('The spreadsheet is empty or has no data rows below headers.');
        }

        // Normalize Header row
        const headerRow = rawData[0];
        const columnMap = {}; // columnIndex -> canonicalKey

        headerRow.forEach((colName, index) => {
          if (colName && typeof colName === 'string') {
            const cleanName = colName.trim().toLowerCase();
            const canonicalKey = HEADER_MAP[cleanName];
            if (canonicalKey) {
              columnMap[index] = canonicalKey;
            }
          }
        });

        // Verify that all required fields are present in header
        const mappedCanonicalKeys = Object.values(columnMap);
        const missingHeaders = REQUIRED_FIELDS.filter(
          (rf) => !mappedCanonicalKeys.includes(rf.key)
        );

        if (missingHeaders.length > 0) {
          const missingNames = missingHeaders.map((m) => m.label).join(', ');
          throw new Error(`Missing required columns in spreadsheet: ${missingNames}`);
        }

        // Process data rows
        const parsedRows = [];
        const seenEmails = new Set();
        const seenPrns = new Set();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\d{10,15}$/;

        for (let rowIndex = 1; rowIndex < rawData.length; rowIndex++) {
          const row = rawData[rowIndex];
          
          // Skip completely empty rows
          const isEmpty = row.every((cell) => cell === '' || cell === null || cell === undefined);
          if (isEmpty) continue;

          const rowNum = rowIndex + 1;
          const rowErrors = [];
          const student = {};

          // Extract values
          Object.keys(columnMap).forEach((colIdx) => {
            const key = columnMap[colIdx];
            let val = row[colIdx];
            if (typeof val === 'string') val = val.trim();
            student[key] = val;
          });

          // Validate Required Non-Empty Strings
          REQUIRED_FIELDS.forEach((rf) => {
            const val = student[rf.key];
            if (!val || val === '') {
              rowErrors.push(`Missing required field: ${rf.label}`);
            }
          });

          // Email Validation
          if (student.email) {
            const lowerEmail = student.email.toLowerCase();
            student.email = lowerEmail;
            if (!emailRegex.test(lowerEmail)) {
              rowErrors.push(`Invalid email format: "${student.email}"`);
            } else if (seenEmails.has(lowerEmail)) {
              rowErrors.push(`Duplicate email found in file: "${student.email}"`);
            } else {
              seenEmails.add(lowerEmail);
            }
          }

          // Phone Validation
          if (student.phone) {
            const cleanPhone = String(student.phone).replace(/\D/g, '');
            student.phone = cleanPhone;
            if (!phoneRegex.test(cleanPhone)) {
              rowErrors.push(`Phone number must be 10-15 digits (got "${student.phone}")`);
            }
          }

          // PRN Duplicate check
          if (student.prn) {
            const cleanPrn = String(student.prn).trim();
            student.prn = cleanPrn;
            if (seenPrns.has(cleanPrn)) {
              rowErrors.push(`Duplicate PRN found in file: "${cleanPrn}"`);
            } else {
              seenPrns.add(cleanPrn);
            }
          }

          // Helper to parse float or null
          const parseNumOrNull = (raw, min, max, label) => {
            if (raw === '' || raw === null || raw === undefined) return null;
            const n = parseFloat(raw);
            if (isNaN(n)) {
              rowErrors.push(`${label} must be a number`);
              return null;
            }
            if (n < min || n > max) {
              rowErrors.push(`${label} must be between ${min} and ${max}`);
            }
            return n;
          };

          student.CGPA = parseNumOrNull(student.CGPA, 0, 10, 'CGPA');
          student.sem1Gpa = parseNumOrNull(student.sem1Gpa, 0, 10, 'Sem 1 GPA');
          student.sem2Gpa = parseNumOrNull(student.sem2Gpa, 0, 10, 'Sem 2 GPA');
          student.sem3Gpa = parseNumOrNull(student.sem3Gpa, 0, 10, 'Sem 3 GPA');
          student.sem4Gpa = parseNumOrNull(student.sem4Gpa, 0, 10, 'Sem 4 GPA');
          student.sem5Gpa = parseNumOrNull(student.sem5Gpa, 0, 10, 'Sem 5 GPA');
          student.sem6Gpa = parseNumOrNull(student.sem6Gpa, 0, 10, 'Sem 6 GPA');
          student.sem7Gpa = parseNumOrNull(student.sem7Gpa, 0, 10, 'Sem 7 GPA');
          student.sem8Gpa = parseNumOrNull(student.sem8Gpa, 0, 10, 'Sem 8 GPA');
          student.percentage10th = parseNumOrNull(student.percentage10th, 0, 100, '10th %');
          student.percentage12th = parseNumOrNull(student.percentage12th, 0, 100, '12th %');

          parsedRows.push({
            rowNumber: rowNum,
            data: student,
            isValid: rowErrors.length === 0,
            errors: rowErrors,
          });
        }

        const validCount = parsedRows.filter((r) => r.isValid).length;
        const errorCount = parsedRows.filter((r) => !r.isValid).length;

        resolve({
          fileName: file.name,
          totalRows: parsedRows.length,
          validCount,
          errorCount,
          rows: parsedRows,
          // Extract valid payload ready for POST /api/admin/bulk-student
          validStudentsPayload: parsedRows.filter((r) => r.isValid).map((r) => r.data),
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
    reader.readAsArrayBuffer(file);
  });
}
