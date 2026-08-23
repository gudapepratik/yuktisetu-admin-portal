import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Upload, AlertCircle } from 'lucide-react';

export function ExcelDropzone({ onFileSelected, loading, error }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      alert('Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    onFileSelected(file);
  };

  return (
    <div>
      <div
        className={`dropzone ${isDragOver ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
        />

        <FileSpreadsheet className="dropzone-icon" />
        <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
          {loading ? 'Reading & Validating Spreadsheet...' : 'Select or Drag & Drop Student Spreadsheet'}
        </h4>
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
          Supports .xlsx, .xls, .csv files. Required columns: First Name, Last Name, Email, Phone, PRN, College Code, Department Code.
        </p>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ marginTop: '14px' }}
          disabled={loading}
        >
          <Upload size={13} /> Browse File
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: '14px' }}>
          <AlertCircle size={16} flexShrink={0} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
