import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const DEFAULT_COLORS = ['#f5576c', '#4facfe', '#2ecc71', '#f39c12', '#a78bfa', '#ff6b9d'];

function withAlpha(hex, alpha) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function LineChart({ labels = [], series = [], height = 300 }) {
  const hasRightAxis = series.some((s) => s.axis === 'right');

  const datasets = series.map((s, i) => {
    const color = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    const onRight = s.axis === 'right';
    return {
      label: s.label,
      data: s.data,
      borderColor: color,
      backgroundColor: s.fill === false ? 'transparent' : withAlpha(color, 0.1),
      yAxisID: onRight ? 'yRight' : 'y',
      tension: 0.3,
      fill: s.fill !== false,
      pointRadius: s.pointRadius ?? 0,
    };
  });

  const data = { labels, datasets };

  const scales = {
    x: {
      ticks: { color: 'rgba(255,255,255,0.5)', maxTicksLimit: 8 },
      grid: { color: 'rgba(255,255,255,0.05)' },
    },
    y: {
      position: 'left',
      ticks: { color: 'rgba(255,255,255,0.7)' },
      grid: { color: 'rgba(255,255,255,0.05)' },
    },
  };

  if (hasRightAxis) {
    scales.yRight = {
      position: 'right',
      ticks: { color: 'rgba(255,255,255,0.7)' },
      grid: { drawOnChartArea: false },
    };
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: 'rgba(255,255,255,0.7)', boxWidth: 12 } },
      tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff' },
    },
    scales,
  };

  return (
    <div style={{ height }}>
      <Line data={data} options={options} />
    </div>
  );
}
