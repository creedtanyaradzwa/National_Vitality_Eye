const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/pages/Analytics.jsx');
let s = fs.readFileSync(file, 'utf8');

const pieOld = `{topDiseases.length > 0 && (
                    <motion.div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-5">
                            Overall Disease Distribution
                        </h3>
                        <motion.div className="flex items-center gap-4">
                            <ResponsiveContainer width="50%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={systemDiseases.map(d => ({ name: d._id, value: d.count }))}`;

if (!s.includes('Overall Disease Distribution')) {
  console.error('pie section not found');
  process.exit(1);
}

const pieStart = s.indexOf('{topDiseases.length > 0 && (');
const pieEnd = s.indexOf('                )}\n            </div>\n\n            {/* ── ALL-DISEASES MONTHLY OVERVIEW', pieStart);
if (pieStart < 0 || pieEnd < 0) {
  // try alternate end
  const alt = s.indexOf('{/* ── ALL-DISEASES MONTHLY OVERVIEW', pieStart);
  console.log('pieStart', pieStart, 'alt', alt);
  const snippet = s.slice(pieStart, pieStart + 200);
  console.log(snippet);
  process.exit(1);
}

const pieNew = `{distributionChart.pie.length > 0 && (
                    <motion.div className="rounded-xl bg-white/5 border border-white/10 p-6">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-1">
                            Overall Disease Distribution
                        </h3>
                        <p className="text-[10px] text-gray-500 mb-5">
                            Top {TOP_DISEASE_LIMIT} diseases
                            {distributionChart.otherCount > 0 ? ' · remaining diseases grouped as Other' : ''}
                        </p>
                        <motion.div className="flex flex-col sm:flex-row items-center gap-6">
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={distributionChart.pie}`;

// Replace pie block in smaller chunks
s = s.replace(
  /data=\{systemDiseases\.map\(d => \(\{ name: d\._id, value: d\.count \}\)\)\}/,
  'data={distributionChart.pie}'
);
s = s.replace(
  /\{systemDiseases\.map\(\(entry, index\) => \(/,
  '{distributionChart.pie.map((entry, index) => ('
);
s = s.replace(
  /\{systemDiseases\.map\(\(d, idx\) => \(/,
  '{distributionChart.pie.map((d, idx) => ('
);
s = s.replace(
  /<span className="text-\[10px\] text-gray-400 truncate flex-1">\{d\._id\}<\/span>/,
  '<span className="text-[10px] text-gray-400 truncate flex-1">{d.name}</span>'
);
s = s.replace(
  /<span className="text-\[10px\] text-white font-bold">\{d\.count\}<\/span>/g,
  '<span className="text-[10px] text-white font-bold tabular-nums">{d.value}</span>'
);
s = s.replace(
  'key={d._id}',
  'key={d.name}'
);
s = s.replace(
  '{topDiseases.length > 0 && (',
  '{distributionChart.pie.length > 0 && ('
);
s = s.replace(
  'Overall Disease Distribution\n                        </h3>\n                        <div className="flex items-center gap-4">',
  'Overall Disease Distribution\n                        </h3>\n                        <p className="text-[10px] text-gray-500 mb-5">\n                            Top {TOP_DISEASE_LIMIT} diseases\n                            {distributionChart.otherCount > 0 ? \' · remaining diseases grouped as Other\' : \'\'}\n                        </p>\n                        <div className="flex flex-col sm:flex-row items-center gap-6">'
);
s = s.replace(
  '<ResponsiveContainer width="50%" height={200}>',
  '<ResponsiveContainer width="100%" height={220}>'
);

// Stacked bar
s = s.replace(
  '{processMonthlyChartData().length > 0 ? (',
  '{stackedMonthlyData.length > 0 ? ('
);
s = s.replace(
  '<BarChart data={processMonthlyChartData()}>',
  '<BarChart data={stackedMonthlyData}>'
);
s = s.replace(
  /                            \{systemDiseases\.map\(\(disease, idx\) => \(\n                                <Bar key=\{disease\._id\} dataKey=\{disease\._id\} stackId="a" fill=\{COLORS\[idx % COLORS\.length\]\} radius=\{idx === 4 \? \[4, 4, 0, 0\] : \[0, 0, 0, 0\]\} \/>\n                            \)\)\}/,
  `                            {stackedBarKeys.map((key, idx) => (
                                <Bar key={key} dataKey={key} stackId="a" fill={COLORS[idx % COLORS.length]} />
                            ))}`
);

// Move monthly before pie: swap two big blocks
const yearlyMarker = '            {/* ── YEARLY TREND + DISEASE DISTRIBUTION PIE ── */}';
const monthlyMarker = '            {/* ── ALL-DISEASES MONTHLY OVERVIEW ── */}';
const radarMarker = '            {/* ── EPIDEMIOLOGICAL RADAR (selected disease) ── */}';

const yStart = s.indexOf(yearlyMarker);
const mStart = s.indexOf(monthlyMarker);
const rStart = s.indexOf(radarMarker);

if (yStart > -1 && mStart > yStart && rStart > mStart) {
  const yearlyAndPie = s.slice(yStart, mStart);
  const monthlyBlock = s.slice(mStart, rStart);
  const nationalHeader = `            {/* ── NATIONAL OVERVIEW ── */}
            <section className="mb-8">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-8 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500" />
                    <div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">National Overview</h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">System volume, 3-month forecast, and top-10 disease mix</p>
                    </motion.div>
                </motion.div>

`;
  const monthlyRenamed = monthlyBlock
    .replace('All-Disease Monthly Overview', 'Monthly Case Volume & Forecast')
    .replace('System-wide case volume across all diseases', 'Total visits with 3-month linear projection · stacked chart shows top 10 diseases');
  const pieSection = yearlyAndPie.replace('YEARLY TREND + DISEASE DISTRIBUTION PIE', 'YEARLY TREND + TOP-10 DISTRIBUTION');
  s = s.slice(0, yStart) + nationalHeader + monthlyRenamed + '\n            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">\n' + pieSection.replace('<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">', '') + '            </div>\n            </section>\n\n' + s.slice(rStart);
}

// Section headers for disease focus
s = s.replace(
  '            {/* ── DISEASE SELECTOR + DISEASE-SPECIFIC STATS ── */}',
  `            {/* ── DISEASE INTELLIGENCE ── */}
            <section className="mb-8">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-8 w-1 rounded-full bg-gradient-to-b from-purple-500 to-pink-500" />
                    <div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Disease Intelligence</h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Select a disease for clinical metrics and AI insights</p>
                    </div>
                </div>`
);
s = s.replace(
  '            {/* ── TREND CHART + PROVINCE BREAKDOWN ── */}',
  `            </section>

            {/* ── CLINICAL ANALYTICS ── */}
            <section className="mb-8">
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-8 w-1 rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500" />
                    <div>
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Clinical Analytics</h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Trends, regional burden, and outcomes for the selected disease</p>
                    </div>
                </div>`
);
s = s.replace(
  '            {/* ── SYMPTOMS + OUTCOMES + VISIT TYPES ── */}',
  `            </section>

            {/* ── CLINICAL DETAIL ── */}`
);

// Fix typo in national header if motion.div slipped in
s = s.replace(/<\/motion\.div>\s*<\/motion\.motion.div>/g, '</div>\n                </motion.div>');
s = s.replace('</motion.div>\n                </motion.div>', '</div>\n                </div>');

fs.writeFileSync(file, s);
console.log('patched Analytics.jsx');
