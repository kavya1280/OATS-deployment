import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, X, Search, CheckCircle, BrainCircuit } from 'lucide-react';
import "../styles/aibox.css";

export default function AIBox() {
    const { insightId } = useParams();
    const navigate = useNavigate();

    const [originalData, setOriginalData] = useState([]);
    const [allColumns, setAllColumns] = useState([]);
    const [clusterLevels, setClusterLevels] = useState([null]); // Array of selected column names
    const [clusters, setClusters] = useState({}); // { "Key": [rows] }
    const [feedback, setFeedback] = useState({}); // { "Key": { comment: "", exception: "" } }
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8080";

    useEffect(() => {
        fetchData();
    }, [insightId]);

    const fetchData = async () => {
        try {
            const res = await axios.get(`${apiBase}/aibox/${insightId}`, { withCredentials: true });
            if (res.data.data) {
                setOriginalData(res.data.data);
                if (res.data.data.length > 0) {
                    const cols = Object.keys(res.data.data[0]);
                    setAllColumns(cols);
                    setClusterLevels([cols[0]]); // Init with first column
                }
            }
            setLoading(false);
        } catch (err) {
            console.error("Error loading AI Box data:", err);
            setLoading(false);
        }
    };

    // Feature: Add/Remove Level Selectors
    const addLevel = () => setClusterLevels([...clusterLevels, allColumns[0]]);
    const removeLevel = (index) => setClusterLevels(clusterLevels.filter((_, i) => i !== index));

    // Feature: Generate Clusters (Standard)
    const generateClusters = () => {
        const validLevels = clusterLevels.filter(l => l !== null);
        if (validLevels.length === 0) return alert("Select at least one level");

        const grouped = originalData.reduce((acc, row) => {
            const key = validLevels.map(col => row[col] || "N/A").join(' - ');
            if (!acc[key]) acc[key] = [];
            acc[key].push(row);
            return acc;
        }, {});
        setClusters(grouped);
    };

    // Feature: AI Cluster (Hardcoded Logic from HTML)
    const generateAiClusters = () => {
        const grouped = originalData.reduce((acc, row) => {
            const key = `${row.BARCODE_STATUS || "N/A"} / ${row.SUB_SEGMENT || "N/A"}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(row);
            return acc;
        }, {});
        setClusters(grouped);
    };

    const handleFeedbackChange = (key, field, value) => {
        setFeedback(prev => ({
            ...prev,
            [key]: { ...prev[key], [field]: value }
        }));
    };

    // Feature: Submit All (Aggregates feedback from all visible clusters)
    const submitAll = async () => {
        const output = [];
        Object.keys(clusters).forEach(key => {
            // Only submit if user provided a comment or an exception status
            const f = feedback[key];
            if (f && (f.comment || f.exception)) {
                clusters[key].forEach(row => {
                    output.push({
                        ...row,
                        Comment: f.comment || "",
                        "Is Exception": f.exception || "",
                        "Submitted At": new Date().toISOString().slice(0, 19).replace('T', ' ')
                    });
                });
            }
        });

        if (output.length === 0) return alert("No actions were taken on clusters.");

        try {
            const res = await axios.post(`${apiBase}/submit_aibox/${insightId}`, output, { withCredentials: true });
            if (res.data.status === 'success') {
                alert("Clusters submitted successfully!");
                navigate("/dashboard");
            }
        } catch (err) {
            alert("Submission failed.");
        }
    };

    if (loading) return <div className="p-5 text-center">Loading AI Box View...</div>;

    const filteredClusterKeys = Object.keys(clusters).filter(k => k.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="aibox-page">
            {/* Header Bar */}
            <div className="header-bar shadow-sm">
                <img src="/images/logo.png" alt="Logo" className="logo-img" />
                <h1 className="page-title">
                    AI Box: {insightId.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </h1>
                <Link to={`/action/${insightId}`} className="btn btn-secondary ms-auto">Back to Action Page</Link>
            </div>

            {/* Controls Grid */}
            <div className="controls-grid">
                <div className="cluster-controls">
                    <strong className="me-2">Cluster by:</strong>
                    {clusterLevels.map((level, idx) => (
                        <div key={idx} className="d-flex align-items-center gap-1 border p-1 rounded bg-white">
                            <select 
                                className="form-select form-select-sm border-0"
                                value={level || ""}
                                onChange={(e) => {
                                    const newLevels = [...clusterLevels];
                                    newLevels[idx] = e.target.value;
                                    setClusterLevels(newLevels);
                                }}
                            >
                                {allColumns.map(col => <option key={col} value={col}>{col}</option>)}
                            </select>
                            {idx > 0 && <X size={16} className="text-danger cursor-pointer" onClick={() => removeLevel(idx)} />}
                        </div>
                    ))}
                    <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" onClick={addLevel}>
                        <Plus size={14} /> Add Level
                    </button>
                    <button className="btn btn-primary btn-sm ms-2" onClick={generateClusters}>Generate Clusters</button>
                    <button className="btn btn-info btn-sm text-white d-flex align-items-center gap-1" onClick={generateAiClusters}>
                        <BrainCircuit size={14} /> AI Cluster
                    </button>
                </div>

                <div className="search-controls">
                    <div className="input-group input-group-sm" style={{ width: '250px' }}>
                        <span className="input-group-text bg-white"><Search size={14} /></span>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Search cluster titles..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-success btn-sm d-flex align-items-center gap-1" onClick={submitAll}>
                        <CheckCircle size={14} /> Submit All
                    </button>
                </div>
            </div>

            <p className="mb-3">
                <strong>Total Clusters Generated:</strong> <span className="badge bg-primary">{filteredClusterKeys.length}</span>
            </p>

            {/* Cluster List */}
            <div className="clusters-wrapper">
                {filteredClusterKeys.map((key, idx) => (
                    <div key={idx} className="cluster-container shadow-sm">
                        <h3>{key} <span className="badge bg-secondary rounded-pill ms-2">{clusters[key].length} items</span></h3>
                        
                        <div className="aibox-table-wrapper">
                            <table className="table table-sm table-striped table-bordered mb-0">
                                <thead>
                                    <tr>{allColumns.map(col => <th key={col}>{col}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {clusters[key].map((row, rIdx) => (
                                        <tr key={rIdx}>
                                            {allColumns.map(col => <td key={col}>{row[col] || ""}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Feedback Section */}
                        <div className="mt-3 d-flex gap-2 p-3 bg-light rounded border">
                            <input 
                                type="text" 
                                placeholder="Add a single comment for this cluster..." 
                                className="form-control form-control-sm"
                                value={feedback[key]?.comment || ""}
                                onChange={(e) => handleFeedbackChange(key, 'comment', e.target.value)}
                            />
                            <select 
                                className="form-select form-select-sm" 
                                style={{ width: "200px" }}
                                value={feedback[key]?.exception || ""}
                                onChange={(e) => handleFeedbackChange(key, 'exception', e.target.value)}
                            >
                                <option value="">Is Exception?</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select>
                        </div>
                    </div>
                ))}

                {filteredClusterKeys.length === 0 && (
                    <div className="text-center py-5 text-muted bg-white rounded shadow-sm">
                        No clusters to display. Select levels and click "Generate Clusters".
                    </div>
                )}
            </div>
        </div>
    );
}