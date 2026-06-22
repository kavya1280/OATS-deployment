import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState("");

  // Table State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const [filters, setFilters] = useState({
    insight: "all",
    risk: "all",
    org: "all",
    status: "all",
  });

  const insightChartRef = useRef(null);
  const orgChartRef = useRef(null);
  const statusChartRef = useRef(null);
  const riskChartRef = useRef(null);
  const chartInstances = useRef({});

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/dashboard`,
        {
          params: filters,
          withCredentials: true,
        }
      );
      setData(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Dashboard Load Error:", error);
      if (error.response?.status === 401) navigate("/login");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.get(`${import.meta.env.VITE_API_URL}/logout`, {
        withCredentials: true,
      });
      localStorage.removeItem("user");
      navigate("/login");
    } catch (error) {
      navigate("/login");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- TABLE LOGIC ---
  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const processedRows = useMemo(() => {
    if (!data?.table_data) return [];
    let filtered = data.table_data.filter(
      (row) =>
        row.objective.toLowerCase().includes(tableSearch.toLowerCase()) ||
        row.exception.toLowerCase().includes(tableSearch.toLowerCase())
    );
    if (sortConfig.key !== null) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (!isNaN(aVal) && !isNaN(bVal)) {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [data, tableSearch, sortConfig]);

  const totalPages = Math.ceil(processedRows.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = processedRows.slice(indexOfFirstRow, indexOfLastRow);

  const getSortIcon = (key) => {
    if (sortConfig.key !== key)
      return <ChevronsUpDown size={14} className="text-muted ms-1" />;
    return sortConfig.direction === "asc" ? (
      <ChevronUp size={14} className="ms-1" />
    ) : (
      <ChevronDown size={14} className="ms-1" />
    );
  };

  // --- CHART LOGIC ---
  useEffect(() => {
    if (!data || !data.chart_data || !insightChartRef.current) return;

    Chart.register(ChartDataLabels);

    const renderChart = (id, ref, config) => {
      if (chartInstances.current[id]) chartInstances.current[id].destroy();
      if (ref.current) {
        chartInstances.current[id] = new Chart(ref.current, config);
      }
    };

    const createGradient = (ctx, colors) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[1]);
      return gradient;
    };

    // Insight Chart (Horizontal Bar)
    const insightCtx = insightChartRef.current.getContext("2d");
    renderChart("insight", insightChartRef, {
      type: "bar",
      data: {
        labels: data.chart_data.items_per_insight.labels,
        datasets: [
          {
            data: data.chart_data.items_per_insight.data,
            backgroundColor: "#A569BD", // Matching the purple in image
            barThickness: 15,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            anchor: "end",
            align: "right",
            color: "#333",
            font: { size: 10 },
          },
        },
        scales: {
          x: {
            grid: { color: "#f0f0f0" },
            ticks: { stepSize: 500, font: { size: 10 } },
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 10 }, autoSkip: false }, // Show all labels
          },
        },
      },
    });

    // Org Chart (Vertical Bar)
    renderChart("org", orgChartRef, {
      type: "bar",
      data: {
        labels: data.chart_data.items_per_org.labels,
        datasets: [
          {
            data: data.chart_data.items_per_org.data,
            backgroundColor: "#57B8A4", // Matching the teal in image
            borderRadius: 0.5,
          },
        ],
      },
options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: { anchor: "end", align: "top", font: { size: 10 } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 9 } } },
      y: { 
        grid: { color: "#f0f0f0" },
        beginAtZero: true,
        ticks: { font: { size: 10 } }
      }
    }
  },    }); // Status Chart (Doughnut)
    renderChart("status", statusChartRef, {
      type: "doughnut",
      data: {
        labels: data.chart_data.status_breakdown.labels,
        datasets: [
          {
            data: data.chart_data.status_breakdown.data,
            backgroundColor: ["#f39c12", "#27ae60", "#3498db"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true, // Must be true
        aspectRatio: 1, // Must be 1
        plugins: {
          legend: { position: "top" },
          datalabels: {
            display: true,
            color: "#fff",
            font: { weight: "bold" },
          },
        },
      },
    });
    // Risk Chart (Pie)
    renderChart("risk", riskChartRef, {
      type: "pie",
      data: {
        labels: data.chart_data.insights_by_risk.labels,
        datasets: [
          {
            data: data.chart_data.insights_by_risk.data,
            backgroundColor: ["#e74c3c", "#f1c40f", "#3498db", "#2ecc71"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true, // Must be true
        aspectRatio: 1, // Must be 1
        plugins: {
          legend: { position: "top" },
          datalabels: {
            display: true,
            color: "#fff",
            font: { weight: "bold" },
          },
        },
      },
    });
  }, [data]);

  if (loading || !data) {
    return (
      <div className="dashboard-wrapper">
        <div className="loading-overlay">
          <div className="loading-capsule">
            <div className="spinner-border spinner-border-sm text-primary me-3"></div>
            <span>Data Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <nav className="navbar navbar-expand-lg sticky-top">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">
            <img src="/images/logo.png" alt="Logo" height="40" />
          </a>
          <div className="d-flex align-items-center">
            <span className="me-3">
              Welcome, <b>{data.user}</b>
            </span>
            <span className="me-3">|</span>
            <span className="me-3">
              Auditor: <b>{data.assigned_auditor}</b>
            </span>
            <button
              onClick={handleLogout}
              className="btn btn-outline-danger btn-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container-fluid p-4">
        {/* KPI Cards */}
        <div className="row g-4 mb-4">
          <div className="col-lg-3 col-md-6">
            <div className="kpi-card kpi-blue">
              <h1>{data.kpi_data.total_insights}</h1>
              <p>Total Insights Assigned</p>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div className="kpi-card kpi-greeen">
              <h1>{data.kpi_data.total_exceptions}</h1>
              <p># Total Exceptions</p>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div className="kpi-card kpi-orangee">
              <h1>{data.kpi_data.pending_items}</h1>
              <p>Pending for Your Comments</p>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div className="kpi-card kpi-grey">
              <h1>{data.last_refresh?.split(" ")[1]}</h1>
              <p>Last Refresh ({data.last_refresh?.split(" ")[0]})</p>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="card filter-card mb-4 border-0">
          <div className="row g-3 align-items-end">
            <div className="col">
              <label className="form-label small fw-bold">Insight</label>
              <select
                className="form-select"
                value={filters.insight}
                onChange={(e) =>
                  setFilters({ ...filters, insight: e.target.value })
                }
              >
                <option value="all">All</option>
                {data.filter_options.insights.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div className="col">
              <label className="form-label small fw-bold">Risk Level</label>
              <select
                className="form-select"
                value={filters.risk}
                onChange={(e) =>
                  setFilters({ ...filters, risk: e.target.value })
                }
              >
                <option value="all">All</option>
                {data.filter_options.risks.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="col">
              <label className="form-label small fw-bold">Organization</label>
              <select
                className="form-select"
                value={filters.org}
                onChange={(e) =>
                  setFilters({ ...filters, org: e.target.value })
                }
              >
                <option value="all">All</option>
                {data.filter_options.organizations.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="col">
              <label className="form-label small fw-bold">Current Status</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <option value="all">All</option>
                {data.filter_options.statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-auto">
              <button onClick={loadData} className="btn btn-primary px-4">
                Filter
              </button>
            </div>
          </div>
        </div>
        {/* Charts Grid */}
        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            <div className="chart-card">
              <h5 className="chart-title">Total Items per Insight</h5>
              <div className="chart-container">
                <canvas ref={insightChartRef}></canvas>
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="chart-card">
              <h5 className="chart-title">Pending Items by Organization</h5>
              <div className="chart-container">
                <canvas ref={orgChartRef}></canvas>
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="chart-card">
              <h5 className="chart-title">Status of Pending Items</h5>
              <div className="chart-container1">
                <canvas ref={statusChartRef}></canvas>
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="chart-card">
              <h5 className="chart-title">Insights by Risk Level</h5>
              <div className="chart-container1">
                <canvas ref={riskChartRef}></canvas>
              </div>
            </div>
          </div>
        </div>

        {/* Exception Table */}
        <div className="card table-card border-0 shadow-sm">
          <div className="d-flex flex-column flex-md-row justify-content-between mb-3 align-items-center gap-2">
            <div className="d-flex align-items-center">
              <span className="me-2">Show</span>
              <select
                className="form-select form-select-sm w-auto"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="ms-2">entries</span>
            </div>
            <h5 className="fw-bold mb-0">Exception Table</h5>
            <input
              type="text"
              className="form-control w-25 shadow-sm"
              placeholder="Search table..."
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th onClick={() => requestSort("sl_no")} className="sortable">
                    Sl No {getSortIcon("sl_no")}
                  </th>
                  <th
                    onClick={() => requestSort("objective")}
                    className="sortable"
                  >
                    Insight Objective {getSortIcon("objective")}
                  </th>
                  <th
                    onClick={() => requestSort("exception")}
                    className="sortable"
                  >
                    Exception Name {getSortIcon("exception")}
                  </th>
                  <th
                    onClick={() => requestSort("total_count")}
                    className="sortable"
                  >
                    Total {getSortIcon("total_count")}
                  </th>
                  <th
                    onClick={() => requestSort("pending_count")}
                    className="sortable"
                  >
                    Pending {getSortIcon("pending_count")}
                  </th>
                  <th onClick={() => requestSort("risk")} className="sortable">
                    Risk {getSortIcon("risk")}
                  </th>
                  <th
                    onClick={() => requestSort("due_date_str")}
                    className="sortable"
                  >
                    Due Date {getSortIcon("due_date_str")}
                  </th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row, idx) => (
                  <tr key={idx}>
                    <td>{indexOfFirstRow + idx + 1}</td>
                    <td>{row.objective}</td>
                    <td>{row.exception}</td>
                    <td>{row.total_count}</td>
                    <td>{row.pending_count}</td>
                    <td>
                      <span
                        className={`badge ${
                          row.risk === "Critical"
                            ? "bg-danger"
                            : row.risk === "High"
                            ? "bg-warning text-dark"
                            : row.risk === "Low"
                            ? "bg-success" // This makes Low green
                            : "bg-info" // This is the fallback for Medium or others
                        }`}
                      >
                        {row.risk}
                      </span>
                    </td>
                    <td className={row.is_overdue ? "overdue" : ""}>
                      {row.due_date_str}
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/action/${row.file_id}`)}
                        className="btn btn-take-action btn-sm"
                      >
                        Take Action
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="small text-muted">
              Showing {indexOfFirstRow + 1} to{" "}
              {Math.min(indexOfLastRow, processedRows.length)} of{" "}
              {processedRows.length} entries
            </div>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li
                  className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </button>
                </li>
                {[...Array(totalPages)].map((_, i) => (
                  <li
                    key={i}
                    className={`page-item ${
                      currentPage === i + 1 ? "active" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li
                  className={`page-item ${
                    currentPage === totalPages ? "disabled" : ""
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
