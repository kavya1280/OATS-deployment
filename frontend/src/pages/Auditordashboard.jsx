import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Chart from "chart.js/auto";
import { useNavigate } from "react-router-dom";
import "../styles/auditordashboard.css";

export default function Auditordashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    const [emailForm, setEmailForm] = useState({
        to: "auditee@lenovo.com",
        cc: "",
        bcc: "",
        subject: "Reminder for Insight Review",
        body: "Dear Auditee, Please login to your OATS profile, review the pending insights and submit your comments. Regards, Auditor",
        attachment: null
    });

    const chartRefs = {
        category: useRef(null),
        status: useRef(null),
        risk: useRef(null),
        owner: useRef(null)
    };
    const chartInstances = useRef({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/auditor_dashboard`, { withCredentials: true });
                setData(res.data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                if (err.response?.status === 401) navigate("/login");
            }
        };
        fetchData();
    }, [navigate]);

    useEffect(() => {
        if (!data) return;

        const renderChart = (id, ref, type, labels, values, bgColor) => {
            if (chartInstances.current[id]) chartInstances.current[id].destroy();
            const ctx = ref.current.getContext('2d');
            chartInstances.current[id] = new Chart(ctx, {
                type: type,
                data: {
                    labels: labels,
                    datasets: [{ data: values, backgroundColor: bgColor }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        };

        const c = data.chart_data;
        renderChart("category", chartRefs.category, 'bar', c.categories.labels, c.categories.values, '#8e44ad');
        renderChart("status", chartRefs.status, 'pie', c.status.labels, c.status.values, ['#e74c3c', '#f1c40f', '#2ecc71']);
        renderChart("risk", chartRefs.risk, 'bar', c.risk.labels, c.risk.values, '#3498db');
        renderChart("owner", chartRefs.owner, 'bar', c.owner.labels, c.owner.values, '#f39c12');

    }, [data]);

    // Exact logic from HTML: confirm first, then maybe show modal
    const handleEmailClick = (insightId) => {
        if (window.confirm("Send email to default auditee(s)?")) {
            alert(`Email sent to default auditee(s) for ${insightId}`);
        } else {
            setShowModal(true);
        }
    };

    const submitEmail = async () => {
        const formData = new FormData();
        Object.keys(emailForm).forEach(key => formData.append(key, emailForm[key]));

        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/send_email`, formData, { withCredentials: true });
            alert("Email sent successfully!");
            setShowModal(false);
        } catch (err) {
            alert("Failed to send email.");
        }
    };

    if (loading) return <div className="p-5 text-center">Loading...</div>;

    return (
        <div className="auditor-wrapper">
            <div className="header-nav">
                <img src="/images/logo.png" className="logo" alt="Logo" />
                <h1>Auditor Dashboard</h1>
                <button onClick={() => navigate("/logout")} className="btn btn-danger">Logout</button>
            </div>

            <div className="kpi-container">
                <div className="kpi-box">Total Insights: <span>{data.kpis.total_insights}</span></div>
                <div className="kpi-box">Auditees Assigned: <span>{data.kpis.auditee_count}</span></div>
                <div className="kpi-box">Total Items: <span>{data.kpis.total_items}</span></div>
                <div className="kpi-box pending">Pending by Auditee: <span>{data.kpis.pending_auditee}</span></div>
                <div className="kpi-box pending">Pending by Auditor: <span>{data.kpis.pending_auditor}</span></div>
                <button onClick={() => navigate("/report")} className="btn btn-success" style={{alignSelf: 'center'}}>View Analytics Report</button>
            </div>

            <div className="charts-grid">
                <div className="chart-wrapper"><canvas ref={chartRefs.category}></canvas></div>
                <div className="chart-wrapper"><canvas ref={chartRefs.status}></canvas></div>
                <div className="chart-wrapper"><canvas ref={chartRefs.risk}></canvas></div>
                <div className="chart-wrapper"><canvas ref={chartRefs.owner}></canvas></div>
            </div>

            <div className="table-section">
                <h2>Insights</h2>
                <table>
                    <thead>
                        <tr><th>Insight ID</th><th>Action</th><th>Email</th></tr>
                    </thead>
                    <tbody>
                        {data.insights.map(id => (
                            <tr key={id}>
                                <td>{id}</td>
                                <td><button className="btn btn-primary btn-sm" onClick={() => navigate(`/auditor_action/${id}`)}>Review</button></td>
                                <td><button className="btn btn-secondary btn-sm" onClick={() => handleEmailClick(id)}>Send Email</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <h2>Auditee Status</h2>
                <table>
                    <thead>
                        <tr><th>Insight Name</th><th>Auditee</th><th>Submitted</th><th>Pending</th><th>Timeline</th><th>Current Status</th></tr>
                    </thead>
                    <tbody>
                        {data.status_table.map((row, i) => (
                            <tr key={i}>
                                <td>{row.insight}</td>
                                <td>{row.auditee}</td>
                                <td>{row.submitted}</td>
                                <td>{row.pending}</td>
                                <td>{row.timeline}</td>
                                <td><span className={`status-label ${row.status_class}`}>{row.current_status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="custom-modal-overlay">
                    <div className="custom-modal">
                        <span className="close" style={{float:'right', cursor:'pointer'}} onClick={() => setShowModal(false)}>×</span>
                        <h3>Email Composer</h3>
                        <label>To:</label>
                        <input type="email" value={emailForm.to} onChange={e => setEmailForm({...emailForm, to: e.target.value})} />
                        <label>CC:</label>
                        <input type="email" onChange={e => setEmailForm({...emailForm, cc: e.target.value})} />
                        <label>Subject:</label>
                        <input type="text" value={emailForm.subject} onChange={e => setEmailForm({...emailForm, subject: e.target.value})} />
                        <label>Body:</label>
                        <textarea value={emailForm.body} onChange={e => setEmailForm({...emailForm, body: e.target.value})} />
                        <label>Attachment:</label>
                        <input type="file" onChange={e => setEmailForm({...emailForm, attachment: e.target.files[0]})} />
                        <button className="btn-send" onClick={submitEmail}>Send</button>
                    </div>
                </div>
            )}
        </div>
    );
}