/** Client analytics helpers — charts & prevalence only; insights come from API when possible */

const TOP_DISEASE_LIMIT = 10;
const PROJECTION_HORIZON = 3;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MIN_MONTHS = 1;

function clampPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.min(100, Math.max(0, Math.round(n)));
}

/** Raw % change -> 0-100 index (50 = stable). */
function toGrowthIndex(rawPercent) {
    const val = Number(rawPercent);
    if (!Number.isFinite(val)) return 50;
    const clamped = Math.max(-50, Math.min(50, val));
    return clampPercent(((clamped + 50) / 100) * 100);
}

function resolvePrimaryHotspots(provinceBreakdown = []) {
    const rows = (provinceBreakdown || []).filter((p) => p?.province && (p.count ?? 0) > 0);
    if (!rows.length) return { hotspots: [], label: null, maxCount: 0 };
    const maxCount = Math.max(...rows.map((p) => p.count));
    const hotspots = rows
        .filter((p) => p.count === maxCount)
        .map((p) => ({ province: p.province, count: p.count, percentage: p.percentage }));
    return {
        hotspots,
        label: hotspots.map((h) => h.province).join(' & '),
        maxCount
    };
}

function mergeDiseaseLists(topDiseases = [], allDiseases = []) {
    const map = new Map();
    [...topDiseases, ...allDiseases].forEach((d) => {
        if (!d?._id) return;
        const existing = map.get(d._id);
        map.set(d._id, {
            _id: d._id,
            count: Math.max(existing?.count ?? 0, d.count ?? 0)
        });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function pickTopDiseases(diseases, limit = TOP_DISEASE_LIMIT) {
    return [...(diseases || [])].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, limit);
}

function buildDistributionPieData(diseases, limit = TOP_DISEASE_LIMIT) {
    const sorted = [...(diseases || [])].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
    const top = sorted.slice(0, limit);
    const otherCount = sorted.slice(limit).reduce((s, d) => s + (d.count ?? 0), 0);
    const pie = top.map((d) => ({ name: d._id, value: d.count ?? 0 }));
    if (otherCount > 0) pie.push({ name: 'Other', value: otherCount });
    return { pie, top, otherCount, totalTracked: sorted.length };
}

const monthSortKey = (point) => {
    const y = point._id?.year ?? point.year ?? 0;
    const m = point._id?.month ?? point.month ?? 0;
    return `${y}-${String(m).padStart(2, '0')}`;
};

function sortMonthlySeries(points = []) {
    return [...points].sort((a, b) => monthSortKey(a).localeCompare(monthSortKey(b)));
}

function buildMonthlyProjections(monthlyPoints, horizon = PROJECTION_HORIZON) {
    if (!monthlyPoints?.length || monthlyPoints.length < MIN_MONTHS) return [];

    const series = sortMonthlySeries(monthlyPoints).map((p, i) => ({
        x: i,
        count: p.count ?? 0,
        year: p._id?.year ?? p.year,
        month: p._id?.month ?? p.month
    }));

    const n = series.length;
    if (n === 1) {
        const only = series[0];
        return projectForward(only.year, only.month, only.count, 0, horizon);
    }

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    series.forEach(({ x, count }) => {
        sumX += x;
        sumY += count;
        sumXY += x * count;
        sumXX += x * x;
    });
    const denom = n * sumXX - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;
    const last = series[n - 1];
    const nextY = Math.max(0, Math.round(intercept + slope * n));
    return projectForward(last.year, last.month, nextY, Math.max(0, Math.round(slope)), horizon);
}

function projectForward(year, month, baseCount, slope, horizon) {
    const out = [];
    let y = year;
    let m = month;
    let predicted = baseCount;
    for (let i = 0; i < horizon; i++) {
        m += 1;
        if (m > 12) { m = 1; y += 1; }
        if (i > 0) predicted = Math.max(0, predicted + slope);
        out.push({ _id: { year: y, month: m }, count: predicted, projected: true });
    }
    return out;
}

function buildChartSeriesWithProjections(
    historicalFull = [],
    displayMonthCount = 6,
    apiProjections = null,
    horizon = PROJECTION_HORIZON,
    months = MONTH_LABELS
) {
    const sorted = sortMonthlySeries(historicalFull);
    if (!sorted.length) return [];

    const displayed = sorted.slice(-displayMonthCount);
    const allProjections = apiProjections?.length
        ? sortMonthlySeries(apiProjections)
        : buildMonthlyProjections(sorted, horizon);

    const lastDisplayed = displayed[displayed.length - 1];
    const lastKey = monthSortKey(lastDisplayed);
    const futureOnly = allProjections.filter((p) => monthSortKey(p) > lastKey);

    return buildTrendChartRows(displayed, futureOnly, months);
}

function aggregateMonthlyTotals(trendsData) {
    const monthlyTotals = {};
    (trendsData || []).forEach((item) => {
        const key = `${item._id.year}-${item._id.month}`;
        monthlyTotals[key] = (monthlyTotals[key] || 0) + item.count;
    });
    return Object.entries(monthlyTotals)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => {
            const [year, month] = key.split('-').map(Number);
            return { _id: { year, month }, count };
        });
}

function buildTrendChartRows(historical, projections, months = MONTH_LABELS) {
    const hist = (historical || []).map((d) => ({
        label: `${months[(d._id?.month ?? 1) - 1]} ${d._id?.year}`,
        actual: d.count,
        projected: null
    }));
    const proj = (projections || []).map((d) => ({
        label: `${months[(d._id?.month ?? 1) - 1]} ${d._id?.year}`,
        actual: null,
        projected: d.count
    }));
    if (hist.length && proj.length) {
        const bridge = { ...hist[hist.length - 1], projected: hist[hist.length - 1].actual };
        return [...hist.slice(0, -1), bridge, ...proj];
    }
    return [...hist, ...proj];
}

function buildStackedMonthlyChartData(trendsData, topDiseaseIds, months = MONTH_LABELS) {
    const topSet = new Set(topDiseaseIds);
    const chartData = {};

    (trendsData || []).forEach((item) => {
        const monthKey = `${item._id.year}-${item._id.month}`;
        if (!chartData[monthKey]) {
            chartData[monthKey] = {
                month: `${months[item._id.month - 1]} ${item._id.year}`,
                Other: 0
            };
            topDiseaseIds.forEach((id) => { chartData[monthKey][id] = 0; });
        }
        const disease = item._id.disease;
        if (topSet.has(disease)) {
            chartData[monthKey][disease] = (chartData[monthKey][disease] || 0) + item.count;
        } else {
            chartData[monthKey].Other = (chartData[monthKey].Other || 0) + item.count;
        }
    });

    return Object.values(chartData).sort((a, b) => a.month.localeCompare(b.month));
}

function generateOverviewInsight(monthlyTotals, projections) {
    if (!monthlyTotals?.length || monthlyTotals.length < MIN_MONTHS) return null;
    const totals = monthlyTotals.map((m) => m.count);
    const last = totals[totals.length - 1];
    const prev = totals.length > 1 ? totals[totals.length - 2] : null;
    const growth = prev != null && prev > 0 ? ((last - prev) / prev) * 100 : (last > 0 && prev === 0 ? 100 : 0);
    const nextProjected = projections?.length ? projections[0].count : null;
    const projNote = nextProjected != null ? ` Forecast next month: ~${nextProjected} total visits.` : '';
    if (prev == null) return `Latest month: ${last} total visits.${projNote}`;
    if (prev === 0 && last > 0) return `System total: ${last} visits in latest month; no prior month for comparison.${projNote}`;
    if (growth > 12) return `All-disease volume +${clampPercent(growth)}% (${prev} -> ${last} visits).${projNote}`;
    if (growth < -8) return `All-disease volume ${clampPercent(growth)}% (${prev} -> ${last} visits).${projNote}`;
    return `All-disease volume change ${clampPercent(growth)}% (${prev} -> ${last} visits).${projNote}`;
}

export {
    TOP_DISEASE_LIMIT,
    PROJECTION_HORIZON,
    MONTH_LABELS,
    clampPercent,
    toGrowthIndex,
    resolvePrimaryHotspots,
    mergeDiseaseLists,
    pickTopDiseases,
    buildDistributionPieData,
    sortMonthlySeries,
    buildMonthlyProjections,
    buildChartSeriesWithProjections,
    aggregateMonthlyTotals,
    buildTrendChartRows,
    buildStackedMonthlyChartData,
    generateOverviewInsight
};
