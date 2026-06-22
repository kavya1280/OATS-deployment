// 1. The Card Wrapper with the Red-Top-Border
const ChartBox = ({ title, children }) => (
    <div className="col-xl-6 mb-4">
        <div className="card shadow-sm h-100">
            <div className="card-header">{title}</div>
            <div className="card-body">
                <div className="chart-container" style={{ height: '320px', position: 'relative' }}>
                    {children}
                </div>
            </div>
        </div>
    </div>
);

// 2. The Risk Matrix (Matrix Chart)
const RiskMatrix = () => {
    const riskLevels = ['Very Low', 'Low', 'Medium', 'High', 'Critical'];
    const colors = [
        ['#33691e', '#33691e', '#9ccc65', '#9ccc65', '#fbc02d'],
        ['#33691e', '#33691e', '#9ccc65', '#fbc02d', '#f57f17'],
        ['#33691e', '#33691e', '#fbc02d', '#f57f17', '#b71c1c'],
        ['#9ccc65', '#fbc02d', '#f57f17', '#b71c1c', '#b71c1c'],
        ['#fbc02d', '#f57f17', '#f57f17', '#b71c1c', '#b71c1c']
    ];
    
    const heatmapData = [];
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            heatmapData.push({
                x: riskLevels[x],
                y: riskLevels[4 - y],
                v: Math.floor(Math.random() * 25) + 5,
                color: colors[4 - y][x]
            });
        }
    }

    return (
        <BaseChart
            type="matrix"
            data={{
                datasets: [{
                    data: heatmapData,
                    backgroundColor: (c) => c.raw?.color,
                    width: ({ chart }) => chart.chartArea ? chart.chartArea.width / 5 - 5 : 50,
                    height: ({ chart }) => chart.chartArea ? chart.chartArea.height / 5 - 5 : 50,
                    datalabels: { color: '#fff', font: { weight: 'bold' }, formatter: (v) => v.v }
                }]
            }}
            options={{
                maintainAspectRatio: false,
                scales: {
                    x: { type: 'category', labels: riskLevels, grid: { display: false } },
                    y: { type: 'category', labels: [...riskLevels].reverse(), offset: true, grid: { display: false } }
                },
                plugins: { legend: false }
            }}
        />
    );
};

// 3. Chart Global Options
const chartOptionsStacked = { 
    responsive: true, 
    maintainAspectRatio: false, 
    scales: { x: { stacked: true }, y: { stacked: true } },
    plugins: { legend: { position: 'top' } } 
};

const chartOptionsSimple = { 
    responsive: true, 
    maintainAspectRatio: false, 
    plugins: { legend: false, datalabels: { anchor: 'end', align: 'top' } } 
};

const chartOptionsHorizontal = { 
    indexAxis: 'y', 
    responsive: true, 
    maintainAspectRatio: false, 
    plugins: { legend: false } 
};