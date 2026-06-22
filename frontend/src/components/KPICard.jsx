const KPICard = ({ title, value, colorClass }) => (
  <div className="col">
    <div className={`kpi-card ${colorClass}`}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-title">{title}</div>
    </div>
  </div>
);