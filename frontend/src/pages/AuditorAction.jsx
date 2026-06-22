import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import "../styles/auditoraction.css";

export default function AuditorAction() {
  const { insightId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Data States
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // Table Feature States
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  
  // --- SORTING STATE ---
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const AUDITOR_FIELDS = [
    "Auditor Comment",
    "Auditor Exception",
    "Auditor Timestamp",
  ];

  const handleFieldChange = (rowIndex, field, value) => {
    setRows((prevRows) => {
      const updated = [...prevRows];
      updated[rowIndex] = {
        ...updated[rowIndex],
        [field]: value,
      };
      return updated;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/get_auditor_action_data/${insightId}`,
          { withCredentials: true }
        );
        if (res.data.data.length) {
          setColumns(res.data.columns);
          setRows(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [insightId]);

  // --- LOGIC: SEARCHING ---
  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [rows, searchTerm]);

  // --- LOGIC: SORTING ---
  const sortedRows = useMemo(() => {
    let sortableItems = [...filteredRows];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key] ?? "";
        let bVal = b[sortConfig.key] ?? "";

        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
        }

        if (aVal.toString().toLowerCase() < bVal.toString().toLowerCase()) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aVal.toString().toLowerCase() > bVal.toString().toLowerCase()) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredRows, sortConfig]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // --- UI HELPER: STACKED ARROWS ---
  const renderSortIcons = (key) => {
    const isActive = sortConfig.key === key;
    return (
      <span className="sort-icons-stack">
        <i className={`fas fa-caret-up up-arrow ${isActive && sortConfig.direction === 'asc' ? 'active' : ''}`}></i>
        <i className={`fas fa-caret-down down-arrow ${isActive && sortConfig.direction === 'desc' ? 'active' : ''}`}></i>
      </span>
    );
  };

  // --- LOGIC: PAGINATION ---
  const indexOfLastRow = currentPage * entriesPerPage;
  const indexOfFirstRow = indexOfLastRow - entriesPerPage;
  const currentRows = sortedRows.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(sortedRows.length / entriesPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, entriesPerPage, sortConfig]);

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ReviewData");
    XLSX.writeFile(workbook, `${insightId}_review.xlsx`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      setRows(data);
      alert("Excel data loaded into table!");
    };
    reader.readAsBinaryString(file);
  };

  if (loading)
    return <div className="loading-state">Loading actionable items...</div>;

  return (
    <div className="auditor-page-wrapper">
      <header className="dashboard-header">
        <div className="header-left">
          <img src="/images/logo.png" alt="Logo" className="header-logo" />
          <div className="header-text">
            <h1 className="header-title">
              Auditor Review: {insightId?.replace(/_/g, " ").toUpperCase()}
            </h1>
            <p className="header-subtitle">
              Live Status of Exceptions & Auditor Action
            </p>
          </div>
        </div>

        <div className="header-actions">
          <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} accept=".xlsx, .xls" />
          <button onClick={() => navigate("/report")} className="btn-nav btn-grey">
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <button onClick={downloadExcel} className="btn-nav btn-blue">
            <i className="fas fa-download"></i> Download
          </button>
          <button onClick={() => fileInputRef.current.click()} className="btn-nav btn-yellow">
            <i className="fas fa-upload"></i> Upload
          </button>
          <button onClick={() => setShowHistory(!showHistory)} className="btn-nav btn-grey">
            <i className="fas fa-history"></i> History
          </button>
          <button className="btn-nav btn-purple">Submit Review</button>
        </div>
      </header>

      <div className="container-fluid px-4 mt-4">
        <div className="card custom-card">
          <div className="card-header-styled">Review Data Table</div>
          <div className="card-body">
            <div className="table-controls">
              <div className="entries-wrapper">
                Show
                <select value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                entries
              </div>
              <div className="search-wrapper">
                Search:
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type to filter..."
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-striped table-hover custom-table">
                <thead>
                  <tr>
                    {columns
                      .filter((col) => !AUDITOR_FIELDS.includes(col))
                      .map((col) => (
                        <th key={col} onClick={() => requestSort(col)} className="sortable-th">
                          <div className="th-content">
                            {col}
                            {renderSortIcons(col)}
                          </div>
                        </th>
                      ))}
                    <th onClick={() => requestSort("Auditor Comment")} className="sortable-th">
                      <div className="th-content">
                        Auditor Comment
                        {renderSortIcons("Auditor Comment")}
                      </div>
                    </th>
                    <th onClick={() => requestSort("Auditor Exception")} className="sortable-th">
                      <div className="th-content">
                        Auditor Exception
                        {renderSortIcons("Auditor Exception")}
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {currentRows.length > 0 ? (
                    currentRows.map((row, idx) => (
                      <tr key={idx}>
                        {columns
                          .filter((col) => !AUDITOR_FIELDS.includes(col))
                          .map((col) => (
                            <td key={col}>{row[col]}</td>
                          ))}

                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={row["Auditor Comment"] || ""}
                            onChange={(e) => handleFieldChange(idx, "Auditor Comment", e.target.value)}
                            placeholder="Enter comment"
                          />
                        </td>

                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={row["Auditor Exception"] || ""}
                            onChange={(e) => handleFieldChange(idx, "Auditor Exception", e.target.value)}
                          >
                            <option value="">Select</option>
                            <option value="True Positive">True Positive</option>
                            <option value="False Positive">False Positive</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={columns.length + 2} className="text-center">
                        No matching records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <div className="info">
                Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, sortedRows.length)} of {sortedRows.length} entries
              </div>
              <div className="pagination-buttons">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
                  Previous
                </button>
                <span className="page-number">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage((prev) => prev + 1)}>
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}