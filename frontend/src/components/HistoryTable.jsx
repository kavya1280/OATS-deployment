import React, { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export default function HistoryTable({ data, columns }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Sorting Logic
  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const currentRows = sortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  if (!data || data.length === 0) {
    return <div className="alert alert-info mt-3">No history found for this insight.</div>;
  }

  return (
    <div className="history-section mt-4 p-3 bg-white rounded shadow-sm">
      <h4 className="mb-3 text-primary">History Lookup (Previously Commented)</h4>
      
      <div className="d-flex justify-content-between align-items-center mb-2">
        <select className="form-select form-select-sm w-auto" onChange={(e) => setRowsPerPage(Number(e.target.value))}>
          <option value="10">Show 10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </select>
        <span className="small text-muted">Total History Records: {data.length}</span>
      </div>

      <div className="table-responsive" style={{ maxHeight: "400px" }}>
        <table className="table table-sm table-bordered table-hover">
          <thead className="table-dark sticky-top">
            <tr>
              {columns.map((col) => (
                <th key={col} onClick={() => requestSort(col)} style={{ cursor: "pointer" }}>
                  {col.replace(/_/g, " ")} 
                  {sortConfig.key === col ? (sortConfig.direction === "asc" ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : <ChevronsUpDown size={14} className="opacity-50"/>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => (
                  <td key={col}>{row[col] || "N/A"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="d-flex justify-content-center mt-3">
        <button className="btn btn-sm btn-outline-secondary me-2" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
        <span className="align-self-center">Page {currentPage} of {totalPages}</span>
        <button className="btn btn-sm btn-outline-secondary ms-2" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
      </div>
    </div>
  );
}