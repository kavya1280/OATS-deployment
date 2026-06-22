import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import "../styles/action.css";

// --- Internal Sub-component for History Table (Styled like Auditor Table) ---
const HistoryTable = ({ data, columns }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const currentRows = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  if (!data || data.length === 0) return <div className="alert alert-info mt-3">No history found.</div>;

  return (
    <div className="card custom-card mt-4 fade-in">
      <div className="card-header-styled bg-secondary text-white">History Lookup (Previously Commented)</div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-striped table-hover custom-table">
            <thead>
              <tr>
                {columns.map((c) => <th key={c}>{c.replace(/_/g, ' ')}</th>)}
              </tr>
            </thead>
            <tbody>
              {currentRows.map((hr, i) => (
                <tr key={i}>
                  {columns.map((col) => <td key={col}>{hr[col] || "N/A"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <div className="info">Showing Page {currentPage} of {totalPages}</div>
          <div className="pagination-buttons">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Action() {
  const { insightId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [historyData, setHistoryData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  useEffect(() => { fetchData(); }, [insightId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/get_action_data/${insightId}`, { withCredentials: true });
      setColumns(res.data.columns);
      setRows(res.data.data);
    } catch (err) {
      if (err.response?.status === 401) navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (showHistory) return setShowHistory(false);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/get_history_data/${insightId}`, { withCredentials: true });
      setHistoryData(res.data || []);
      setShowHistory(true);
    } catch (err) { alert("Error fetching history"); }
  };

  // Logic: Search and Sort
  const processedRows = useMemo(() => {
    let filtered = rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(searchTerm.toLowerCase()))
    );
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key] ?? "";
        const bVal = b[sortConfig.key] ?? "";
        return sortConfig.direction === "asc" ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
      });
    }
    return filtered;
  }, [rows, searchTerm, sortConfig]);

  const totalPages = Math.ceil(processedRows.length / rowsPerPage);
  const currentRows = processedRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleInputChange = (idxOnPage, col, val) => {
    const updated = [...rows];
    const masterIdx = rows.indexOf(currentRows[idxOnPage]);
    if (masterIdx !== -1) {
      updated[masterIdx][col] = val;
      setRows(updated);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      setRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
      alert("File uploaded!");
    };
    reader.readAsBinaryString(file);
  };

  const submitAction = async () => {
    const toSubmit = rows.filter(r => r.Comment?.trim());
    if (!toSubmit.length) return alert("No comments added.");
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/submit_action_data/${insightId}`, toSubmit, { withCredentials: true });
      alert("Submitted!");
      navigate("/dashboard");
    } catch (err) { alert("Error submitting"); }
  };

  if (loading) return <div className="loading-state">Loading action items...</div>;

  return (
    <div className="auditor-page-wrapper">
      <header className="dashboard-header">
        <div className="header-left">
          <img src="/images/logo.png" alt="Logo" className="header-logo" />
          <div className="header-text">
            <h1 className="header-title">{insightId.replace(/_/g, " ").toUpperCase()}</h1>
            <p className="header-subtitle">User Action & Comments Input</p>
          </div>
        </div>

        <div className="header-actions">
          <button onClick={() => navigate("/dashboard")} className="btn-nav btn-grey">Back</button>
          <button onClick={() => XLSX.writeFile(XLSX.utils.book_append_sheet(XLSX.utils.book_new(), XLSX.utils.json_to_sheet(rows), "Data"), `${insightId}.xlsx`)} className="btn-nav btn-blue">Download</button>
          <button onClick={() => fileInputRef.current.click()} className="btn-nav btn-yellow">Upload</button>
          <input type="file" ref={fileInputRef} hidden accept=".xlsx" onChange={handleFileUpload} />
          <button onClick={submitAction} className="btn-nav btn-purple">Submit</button>
          <button onClick={() => navigate(`/aibox/${insightId}`)} className="btn-nav btn-ai">AI Box</button>
        </div>
      </header>

      <div className="container-fluid px-4 mt-4">
        <div className="card custom-card">
          <div className="card-header-styled">Action Data Table</div>
          <div className="card-body">
            
            <div className="table-controls">
              <div className="entries-wrapper">
                Show 
                <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                  <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
                </select> 
                entries
              </div>
              <div className="search-wrapper">
                Search: 
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Type to filter..." />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-striped table-hover custom-table">
                <thead>
                  <tr>
                    <th>Sl No</th>
                    {columns.map((c) => (
                      <th key={c} onClick={() => setSortConfig({ key: c, direction: sortConfig.key === c && sortConfig.direction === "asc" ? "desc" : "asc" })} style={{ cursor: "pointer" }}>
                        {c} {sortConfig.key === c ? (sortConfig.direction === "asc" ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : <ChevronsUpDown size={14}/>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((row, idx) => (
                    <tr key={idx}>
                      <td>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                      {columns.map((col) => (
                        <td key={col}>
                          {col === "Comment" ? (
                            <textarea className="form-control form-control-sm" rows="1" value={row[col] || ""} onChange={(e) => handleInputChange(idx, col, e.target.value)} />
                          ) : col === "Is Exception" ? (
                            <select className="form-select form-select-sm" value={row[col] || ""} onChange={(e) => handleInputChange(idx, col, e.target.value)}>
                              <option value="">Select</option><option value="Yes">Yes</option><option value="No">No</option>
                            </select>
                          ) : (row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <div className="info">
                Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, processedRows.length)} of {processedRows.length} entries
              </div>
              <div className="pagination-buttons">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
                <span className="page-number">Page {currentPage} of {totalPages || 1}</span>
                <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 mb-5 d-flex flex-column align-items-center">
          <button onClick={fetchHistory} className="btn-nav btn-grey shadow-sm px-4">
            {showHistory ? "Hide History" : "History Lookup"}
          </button>
          {showHistory && <div className="w-100"><HistoryTable data={historyData} columns={columns} /></div>}
        </div>
      </div>
    </div>
  );
}