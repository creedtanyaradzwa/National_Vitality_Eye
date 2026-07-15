/**
 * Analytics helpers — real data only. No mock defaults.
 */

const MIN_TREND_MONTHS = 1;
const MIN_PROJECTION_MONTHS = 1;
const RECOMMENDATION_TARGET = 30;

/** All provinces tied for the highest case count */
function resolvePrimaryHotspots(provinceBreakdown = []) {
    const rows = (provinceBreakdown || []).filter((p) => p?.province && (p.count ?? 0) > 0);
    if (!rows.length) {
        return { hotspots: [], label: null, maxCount: 0 };
    }
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

function clampPercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.min(100, Math.max(0, Math.round(n)));
}

/** Raw % change → 0–100 index (50 = stable, 0 = strong decline, 100 = strong surge). */
function toGrowthIndex(rawPercent) {
    if (!Number.isFinite(Number(rawPercent))) return 50;
    const clamped = Math.max(-50, Math.min(50, Number(rawPercent)));
    return clampPercent(((clamped + 50) / 100) * 100);
}

function rawGrowthPercent(current, previous) {
    const c = current || 0;
    const p = previous || 0;
    if (p > 0) return Math.round(((c - p) / p) * 100);
    if (c > 0) return 100;
    return 0;
}

const ZIMBABWE_PROVINCES = [
    'Harare', 'Bulawayo', 'Manicaland', 'Mashonaland Central', 'Mashonaland East',
    'Mashonaland West', 'Masvingo', 'Matabeleland North', 'Matabeleland South', 'Midlands'
];

function periodDateWindows(period = 'all') {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    switch (period) {
        case '30days':
            return {
                currentStart: new Date(now.getTime() - 30 * day),
                previousStart: new Date(now.getTime() - 60 * day),
                previousEnd: new Date(now.getTime() - 30 * day)
            };
        case '90days':
            return {
                currentStart: new Date(now.getTime() - 90 * day),
                previousStart: new Date(now.getTime() - 180 * day),
                previousEnd: new Date(now.getTime() - 90 * day)
            };
        case 'year':
            return {
                currentStart: new Date(now.getTime() - 365 * day),
                previousStart: new Date(now.getTime() - 730 * day),
                previousEnd: new Date(now.getTime() - 365 * day)
            };
        default:
            return {
                currentStart: null,
                previousStart: null,
                previousEnd: null,
                growthCurrentStart: new Date(now.getTime() - 30 * day),
                growthPreviousStart: new Date(now.getTime() - 60 * day),
                growthPreviousEnd: new Date(now.getTime() - 30 * day)
            };
    }
}

/** Mongo match for current period totals vs prior window (for growth). */
function periodMatches(baseMatch, period = 'all') {
    const w = periodDateWindows(period);
    const current = w.currentStart
        ? { ...baseMatch, visitDate: { $gte: w.currentStart } }
        : { ...baseMatch };
    const previous = w.previousStart
        ? { ...baseMatch, visitDate: { $gte: w.previousStart, $lt: w.previousEnd } }
        : (w.growthPreviousStart
            ? { ...baseMatch, visitDate: { $gte: w.growthPreviousStart, $lt: w.growthPreviousEnd } }
            : null);
    const growthCurrent = w.growthCurrentStart
        ? { ...baseMatch, visitDate: { $gte: w.growthCurrentStart } }
        : current;
    return { current, previous, growthCurrent };
}

function riskLevelFromCasesAndGrowth(total, growthIndex) {
    if (total >= 100 || growthIndex >= 75) return 'CRITICAL';
    if (total >= 50 || growthIndex >= 60) return 'HIGH';
    if (total > 0) return 'MODERATE';
    return 'LOW';
}

/** Returns null when age data is insufficient — never fabricates splits. */
function normalizeDemographics(child, adult, elderly) {
    const c = Math.max(0, child || 0);
    const a = Math.max(0, adult || 0);
    const e = Math.max(0, elderly || 0);
    const sum = c + a + e;
    if (sum === 0) return null;
    return {
        child: clampPercent((c / sum) * 100),
        adult: clampPercent((a / sum) * 100),
        elderly: clampPercent((e / sum) * 100)
    };
}

function buildMonthlyProjections(monthlyPoints, horizon = 3) {
    if (!monthlyPoints?.length) return [];

    const series = monthlyPoints.map((p, i) => ({
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
        if (m > 12) {
            m = 1;
            y += 1;
        }
        if (i > 0) predicted = Math.max(0, predicted + slope);
        out.push({
            _id: { year: y, month: m },
            count: predicted,
            projected: true
        });
    }
    return out;
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

function growthRateFromSeries(series) {
    if (!series?.length || series.length < 2) return null;
    const last = series[series.length - 1]?.count ?? 0;
    const prev = series[series.length - 2]?.count ?? 0;
    if (prev === 0) return last > 0 ? 100 : 0;
    return clampPercent(((last - prev) / prev) * 100);
}

/** Null when insufficient history — never generic filler text. */
function generateTrendInsight(series, projections, diseaseName = 'this disease') {
    if (!series?.length || series.length < MIN_TREND_MONTHS) return null;

    const historical = series.map((s) => s.count);
    const last = historical[historical.length - 1];
    const prev = historical[historical.length - 2];
    const growth = prev > 0 ? ((last - prev) / prev) * 100 : (last > 0 ? 100 : 0);
    const projectedPeak = projections?.length
        ? Math.max(...projections.map((p) => p.count))
        : null;

    const projectionNote = projectedPeak != null
        ? ` Linear forecast for next period: ~${projectedPeak} cases.`
        : '';

    if (prev === 0 && last > 0) {
        return `${diseaseName}: ${last} cases in the latest month with no prior-month baseline — cannot compute period-over-period growth yet.${projectionNote}`;
    }
    if (growth > 15) {
        return `${diseaseName}: latest month +${clampPercent(growth)}% vs previous (${prev} → ${last} cases).${projectionNote}`;
    }
    if (growth > 5) {
        return `${diseaseName}: moderate rise +${clampPercent(growth)}% (${prev} → ${last} cases).${projectionNote}`;
    }
    if (growth < -5) {
        return `${diseaseName}: decline ${clampPercent(growth)}% (${prev} → ${last} cases).${projectionNote}`;
    }
    return `${diseaseName}: stable between months (${prev} → ${last} cases, ${clampPercent(Math.abs(growth))}% change).${projectionNote}`;
}

function generateOverviewInsight(monthlyTotals, projections) {
    if (!monthlyTotals?.length || monthlyTotals.length < MIN_TREND_MONTHS) return null;

    const totals = monthlyTotals.map((m) => m.count);
    const last = totals[totals.length - 1];
    const prev = totals[totals.length - 2];
    const growth = prev > 0 ? ((last - prev) / prev) * 100 : (last > 0 ? 100 : 0);
    const nextProjected = projections?.length ? projections[0].count : null;
    const projNote = nextProjected != null ? ` Forecast next month: ~${nextProjected} total visits.` : '';

    if (prev === 0 && last > 0) {
        return `System total: ${last} visits in latest month; no prior month for comparison.${projNote}`;
    }
    if (growth > 12) {
        return `All-disease volume +${clampPercent(growth)}% (${prev} → ${last} visits).${projNote}`;
    }
    if (growth < -8) {
        return `All-disease volume ${clampPercent(growth)}% (${prev} → ${last} visits).${projNote}`;
    }
    return `All-disease volume change ${clampPercent(growth)}% (${prev} → ${last} visits).${projNote}`;
}

/** Profile built only from recorded aggregates — no name-based guessing. */
function buildDiseaseProfileFromData({
    monthlyTrend,
    provinceBreakdown,
    topSymptoms,
    outcomes,
    total,
    growthRate,
    currentPeriodCount,
    previousPeriodCount
}) {
    if (!total || total <= 0) return null;

    const profile = {
        totalCases: total,
        focusAreas: []
    };

    if (previousPeriodCount > 0) {
        profile.recentGrowth = `${growthRate > 0 ? '+' : ''}${growthRate}% (last 30d: ${currentPeriodCount} vs prior ${previousPeriodCount})`;
    } else if (currentPeriodCount > 0) {
        profile.recentGrowth = `${currentPeriodCount} cases in last 30 days (no prior 30-day baseline)`;
    }

    if (monthlyTrend?.length >= MIN_TREND_MONTHS) {
        const peak = monthlyTrend.reduce((best, m) => (m.count > best.count ? m : best), monthlyTrend[0]);
        profile.peakMonth = `${peak._id.month}/${peak._id.year} (${peak.count} cases)`;
    }

    (provinceBreakdown || []).forEach((p) => {
        profile.focusAreas.push(`${p.province}: ${p.count} cases (${p.percentage}% of disease total)`);
    });

    (topSymptoms || []).forEach((s) => {
        profile.focusAreas.push(`Symptom "${s.symptom}": ${s.percentage}% of cases (${s.count} records)`);
    });

    const outcomeEntries = Object.entries(outcomes || {}).filter(([, v]) => v?.count > 0);
    if (outcomeEntries.length) {
        profile.outcomeSummary = outcomeEntries
            .map(([name, v]) => `${name} ${v.count} (${v.percentage}%)`)
            .join(' · ');
    }

    return profile.focusAreas.length || profile.peakMonth || profile.recentGrowth
        ? profile
        : { totalCases: total, focusAreas: [] };
}

function pushRec(list, rec) {
    if (rec && rec.title && rec.action && rec.reason) list.push(rec);
}

/**
 * Generate 30+ recommendations only from supplied metrics. No generic filler.
 */
function buildDataDrivenRecommendations(ctx) {
    const recs = [];
    const {
        diseaseName = 'Disease',
        total = 0,
        growthRate = 0,
        currentPeriodCount = 0,
        previousPeriodCount = 0,
        provinceBreakdown = [],
        outcomes = {},
        topSymptoms = [],
        visitTypes = [],
        vitalsProfile = null,
        monthlyTrend = [],
        demographics = null,
        chronicConditions = [],
        hotspot = null,
        primaryHotspots = []
    } = ctx;

    if (!total) return recs;

    const hotspotLabel = primaryHotspots.length
        ? primaryHotspots.map((h) => h.province).join(' & ')
        : hotspot;

    if (previousPeriodCount > 0) {
        const gr = Math.round(growthRate);
        if (gr > 20) {
            pushRec(recs, {
                type: 'URGENT',
                title: `30-day surge — ${diseaseName}`,
                action: hotspotLabel
                    ? `Escalate response in ${hotspotLabel}; ${currentPeriodCount} cases vs ${previousPeriodCount} prior 30 days.`
                    : `Review surge protocol; ${currentPeriodCount} vs ${previousPeriodCount} cases (30-day windows).`,
                reason: `Recorded +${gr}% growth from live case counts.`
            });
        } else if (gr > 5) {
            pushRec(recs, {
                type: 'MONITOR',
                title: `Rising 30-day caseload`,
                action: `Increase surveillance; ${currentPeriodCount} cases vs ${previousPeriodCount} previous period.`,
                reason: `+${gr}% from database counts (not estimated).`
            });
        } else if (gr < -5) {
            pushRec(recs, {
                type: 'POSITIVE',
                title: `Declining 30-day caseload`,
                action: `Maintain monitoring; ${currentPeriodCount} vs ${previousPeriodCount} cases.`,
                reason: `${gr}% reduction in 30-day windows.`
            });
        } else {
            pushRec(recs, {
                type: 'STABILITY',
                title: `Stable 30-day volume`,
                action: `Continue standard protocols (${currentPeriodCount} vs ${previousPeriodCount} cases).`,
                reason: `${gr}% change between consecutive 30-day periods.`
            });
        }
    } else if (currentPeriodCount > 0) {
        pushRec(recs, {
            type: 'DATA',
            title: 'No prior 30-day baseline',
            action: `Document and monitor ${currentPeriodCount} recent cases; growth rate unavailable until next period.`,
            reason: 'Previous 30-day count is zero in the database.'
        });
    }

    const tiedNames = new Set((primaryHotspots || []).map((h) => h.province));
    (provinceBreakdown || []).forEach((p) => {
        if (!p.province || !p.count) return;
        const isPrimary = tiedNames.has(p.province);
        pushRec(recs, {
            type: isPrimary ? 'GEOGRAPHIC' : 'REGIONAL',
            title: `${p.province} — ${p.percentage}% of cases`,
            action: isPrimary
                ? `Primary hotspot${tiedNames.size > 1 ? ' (tied)' : ''}: allocate outreach to ${p.province} (${p.count} recorded cases).`
                : `Review capacity in ${p.province} (${p.count} cases, ${p.percentage}% share).`,
            reason: `Derived from ${total} total ${diseaseName} records.`
        });
    });

    (topSymptoms || []).forEach((s) => {
        if (!s.symptom || !s.count) return;
        pushRec(recs, {
            type: 'CLINICAL',
            title: `Symptom: ${s.symptom}`,
            action: `Screen and triage for "${s.symptom}" in ${diseaseName} workups (${s.percentage}% prevalence).`,
            reason: `${s.count} of ${total} records list this symptom.`
        });
    });

    Object.entries(outcomes).forEach(([name, data]) => {
        if (!data?.count) return;
        const type = name === 'Deceased' ? 'CRITICAL' : name === 'Admitted' ? 'RESOURCE' : 'OUTCOME';
        pushRec(recs, {
            type,
            title: `Outcome — ${name}`,
            action: `Plan resources for ${data.count} ${name.toLowerCase()} cases (${data.percentage}% of outcomes).`,
            reason: `Recorded disposition data for ${diseaseName}.`
        });
    });

    (visitTypes || []).forEach((v) => {
        if (!v.count) return;
        pushRec(recs, {
            type: 'OPERATIONS',
            title: `Visit type — ${v.type || 'Unknown'}`,
            action: `Align staffing to ${v.count} ${v.type || 'unknown'} visits (${v.percentage}%).`,
            reason: `Visit-type field on medical records.`
        });
    });

    if (vitalsProfile?.sampleSize >= 1) {
        const v = vitalsProfile;
        if (v.temperature != null) {
            pushRec(recs, {
                type: v.temperature > 37.5 ? 'CLINICAL' : 'VITALS',
                title: `Mean temperature ${v.temperature}°C`,
                action: v.temperature > 37.5
                    ? 'Prioritize fever management in triage.'
                    : 'Temperature within recorded mean — continue standard monitoring.',
                reason: `Average from ${v.sampleSize} records with vitals.`
            });
        }
        if (v.heartRate != null) {
            pushRec(recs, {
                type: v.heartRate > 100 ? 'CLINICAL' : 'VITALS',
                title: `Mean heart rate ${v.heartRate} bpm`,
                action: v.heartRate > 100 ? 'Cardiac monitoring for tachycardia presentations.' : 'Heart rate mean documented in cohort.',
                reason: `${v.sampleSize} vitals samples.`
            });
        }
        if (v.bloodPressure?.systolic != null) {
            pushRec(recs, {
                type: v.bloodPressure.systolic > 140 ? 'CLINICAL' : 'VITALS',
                title: `Mean BP ${v.bloodPressure.systolic}/${v.bloodPressure.diastolic}`,
                action: v.bloodPressure.systolic > 140 ? 'Hypertension management per recorded averages.' : 'BP documented in patient vitals.',
                reason: `${v.sampleSize} samples with blood pressure.`
            });
        }
        if (v.oxygenSaturation != null) {
            pushRec(recs, {
                type: v.oxygenSaturation < 95 ? 'CRITICAL' : 'VITALS',
                title: `Mean SpO₂ ${v.oxygenSaturation}%`,
                action: v.oxygenSaturation < 95 ? 'Ensure oxygen availability — cohort mean below 95%.' : 'Oxygen saturation recorded in vitals.',
                reason: `${v.sampleSize} SpO₂ readings averaged.`
            });
        }
        if (v.respiratoryRate != null) {
            pushRec(recs, {
                type: 'VITALS',
                title: `Mean respiratory rate ${v.respiratoryRate}/min`,
                action: 'Use cohort respiratory rate as triage reference.',
                reason: `${v.sampleSize} records with respiratory rate.`
            });
        }
        if (v.bmi != null) {
            pushRec(recs, {
                type: 'VITALS',
                title: `Mean BMI ${v.bmi}`,
                action: 'Factor BMI distribution into chronic-care planning.',
                reason: `${v.sampleSize} BMI values in records.`
            });
        }
    }
    if (demographics) {
        if (demographics.child > 0) {
            pushRec(recs, {
                type: 'PREVENTION',
                title: `Pediatric share ${demographics.child}%`,
                action: 'Target pediatric screening where this age band is represented.',
                reason: 'Age derived from patient date-of-birth on linked records.'
            });
        }
        if (demographics.adult > 0) {
            pushRec(recs, {
                type: 'PREVENTION',
                title: `Adult share ${demographics.adult}%`,
                action: 'Workplace and community programs for adult cohort.',
                reason: 'Recorded age distribution.'
            });
        }
        if (demographics.elderly > 0) {
            pushRec(recs, {
                type: 'PREVENTION',
                title: `Geriatric share ${demographics.elderly}%`,
                action: 'Protect high-risk geriatric patients in care pathways.',
                reason: 'Recorded age distribution.'
            });
        }
    }

    (chronicConditions || []).forEach((c) => {
        if (!c.condition || !c.prevalence) return;
        pushRec(recs, {
            type: 'COMORBIDITY',
            title: `Comorbidity: ${c.condition}`,
            action: `Screen for ${c.condition} during ${diseaseName} assessments.`,
            reason: `${c.prevalence}% of AI-learned cohort (${c.count ?? 'n/a'} co-occurrences).`
        });
    });

    if ((monthlyTrend || []).length >= MIN_TREND_MONTHS) {
        for (let i = 1; i < monthlyTrend.length; i++) {
            const prev = monthlyTrend[i - 1];
            const cur = monthlyTrend[i];
            const delta = cur.count - prev.count;
            const pct = prev.count > 0 ? clampPercent((delta / prev.count) * 100) : (cur.count > 0 ? 100 : 0);
            const label = `${prev._id.month}/${prev._id.year}→${cur._id.month}/${cur._id.year}`;
            if (Math.abs(pct) > 0 || delta !== 0) {
                pushRec(recs, {
                    type: pct > 0 ? 'MONITOR' : 'POSITIVE',
                    title: `Monthly shift ${label}`,
                    action: `${pct > 0 ? 'Investigate' : 'Review factors behind'} change (${prev.count} → ${cur.count} cases).`,
                    reason: `${pct > 0 ? '+' : ''}${pct}% month-over-month from stored visits.`
                });
            }
        }
        const peak = monthlyTrend.reduce((b, m) => (m.count > b.count ? m : b), monthlyTrend[0]);
        pushRec(recs, {
            type: 'SEASONAL',
            title: `Historical peak ${peak._id.month}/${peak._id.year}`,
            action: `Pre-position resources before peak month (${peak.count} cases recorded).`,
            reason: 'Highest monthly count in available history.'
        });
    }

    const avgProvince = provinceBreakdown.length
        ? provinceBreakdown.reduce((s, p) => s + p.count, 0) / provinceBreakdown.length
        : 0;
    provinceBreakdown
        .filter((p) => p.count > 0 && p.count < avgProvince * 0.5)
        .forEach((p) => {
            pushRec(recs, {
                type: 'EQUITY',
                title: `Low reporting — ${p.province}`,
                action: `Verify surveillance coverage in ${p.province} (${p.count} cases vs cohort average ${Math.round(avgProvince)}).`,
                reason: 'Province count below 50% of mean provincial volume.'
            });
        });

  return recs;
}

function patternToRecommendationContext(pattern, diseaseName, extras = {}) {
    const total = pattern.count || 0;
    const provinceBreakdown = Array.from(pattern.provinces?.entries() || [])
        .sort((a, b) => b[1] - a[1])
        .map(([province, count]) => ({
            province,
            count,
            percentage: total > 0 ? clampPercent((count / total) * 100) : 0
        }));

    const topSymptoms = Array.from(pattern.symptoms?.entries() || [])
        .sort((a, b) => b[1] - a[1])
        .map(([symptom, count]) => ({
            symptom,
            count,
            percentage: total > 0 ? clampPercent((count / total) * 100) : 0
        }));

    const outcomes = {
        Discharged: { count: pattern.outcomes?.recovered || 0, percentage: 0 },
        Admitted: { count: pattern.outcomes?.admitted || 0, percentage: 0 },
        Deceased: { count: pattern.outcomes?.deceased || 0, percentage: 0 },
        Transferred: { count: pattern.outcomes?.referred || 0, percentage: 0 }
    };
    const outcomeTotal = Object.values(outcomes).reduce((s, o) => s + o.count, 0);
    Object.keys(outcomes).forEach((k) => {
        outcomes[k].percentage = outcomeTotal > 0 ? clampPercent((outcomes[k].count / outcomeTotal) * 100) : 0;
    });

    const chronicConditions = Array.from(pattern.chronicConditions?.entries() || [])
        .sort((a, b) => b[1] - a[1])
        .map(([condition, count]) => ({
            condition,
            count,
            prevalence: total > 0 ? clampPercent((count / total) * 100) : 0
        }));

    const vitals = pattern.vitalSignsAverages || {};
    const sampleSize = Math.max(
        vitals.temperature?.count || 0,
        vitals.heartRate?.count || 0,
        vitals.oxygenSaturation?.count || 0
    );
    const vitalsProfile = sampleSize >= 1 ? {
        temperature: vitals.temperature?.avg ?? null,
        heartRate: vitals.heartRate?.avg ?? null,
        bloodPressure: vitals.systolicBP?.avg ? {
            systolic: vitals.systolicBP.avg,
            diastolic: vitals.diastolicBP?.avg ?? null
        } : null,
        oxygenSaturation: vitals.oxygenSaturation?.avg ?? null,
        respiratoryRate: vitals.respiratoryRate?.avg ?? null,
        bmi: vitals.bmi?.avg ?? null,
        sampleSize
    } : (sampleSize > 0 ? { sampleSize } : null);

    return {
        diseaseName,
        total,
        provinceBreakdown,
        topSymptoms,
        outcomes,
        chronicConditions,
        vitalsProfile,
        visitTypes: extras.visitTypes || [],
        monthlyTrend: extras.monthlyTrend || [],
        growthRate: extras.growthRate ?? 0,
        currentPeriodCount: extras.currentPeriodCount ?? 0,
        previousPeriodCount: extras.previousPeriodCount ?? 0,
        demographics: extras.demographics ?? null,
        primaryHotspots: resolvePrimaryHotspots(provinceBreakdown).hotspots,
        hotspot: resolvePrimaryHotspots(provinceBreakdown).label
    };
}

/**
 * Disease analytics payload for a disease + time period (map, insights sidebar).
 */
async function buildDiseasePeriodAnalytics({ MedicalRecord, baseMatch, period = 'all', diseaseLabel = '' }) {
    const { current, previous, growthCurrent } = periodMatches(baseMatch, period);

    const [provinces, outcomes, visitTypes, symptoms, vitals, monthlyTrend,
           currentPeriodCount, previousPeriodCount, totalInPeriod] = await Promise.all([
        MedicalRecord.aggregate([{ $match: current }, { $group: { _id: '$province', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        MedicalRecord.aggregate([{ $match: current }, { $group: { _id: '$disposition', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        MedicalRecord.aggregate([{ $match: current }, { $group: { _id: '$visitType', count: { $sum: 1 } } }]),
        MedicalRecord.aggregate([
            { $match: current },
            { $match: { $or: [
                { symptoms: { $exists: true, $ne: [] } },
                { 'presentingComplaints.symptom': { $exists: true } }
            ] } },
            { $facet: {
                fromSymptoms: [
                    { $match: { symptoms: { $exists: true, $ne: [] } } },
                    { $unwind: '$symptoms' },
                    { $group: { _id: '$symptoms', count: { $sum: 1 } } }
                ],
                fromComplaints: [
                    { $match: { 'presentingComplaints.0': { $exists: true } } },
                    { $unwind: '$presentingComplaints' },
                    { $match: { 'presentingComplaints.symptom': { $exists: true, $ne: '' } } },
                    { $group: { _id: '$presentingComplaints.symptom', count: { $sum: 1 } } }
                ]
            } }
        ]),
        MedicalRecord.aggregate([
            { $match: current },
            { $group: {
                _id: null,
                avgTemperature: { $avg: '$vitalSigns.temperature' },
                avgHeartRate: { $avg: '$vitalSigns.heartRate' },
                avgSystolic: { $avg: '$vitalSigns.bloodPressure.systolic' },
                avgDiastolic: { $avg: '$vitalSigns.bloodPressure.diastolic' },
                avgOxygenSat: { $avg: '$vitalSigns.oxygenSaturation' },
                avgRespiratoryRate: { $avg: '$vitalSigns.respiratoryRate' },
                avgBMI: { $avg: '$vitalSigns.bmi' },
                count: { $sum: 1 }
            }}
        ]),
        MedicalRecord.aggregate([
            { $match: current },
            { $group: { _id: { year: { $year: '$visitDate' }, month: { $month: '$visitDate' } }, count: { $sum: 1 } } },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]),
        MedicalRecord.countDocuments(growthCurrent),
        previous ? MedicalRecord.countDocuments(previous) : Promise.resolve(0),
        MedicalRecord.countDocuments(current)
    ]);

    let growthRate = rawGrowthPercent(currentPeriodCount, previousPeriodCount);
    const totalRecords = await MedicalRecord.countDocuments();
    const totalOutcomes = outcomes.reduce((s, o) => s + o.count, 0);

    const provinceBreakdown = provinces
        .filter(p => p._id)
        .map((p) => ({
            province: p._id,
            count: p.count,
            percentage: totalInPeriod > 0 ? clampPercent((p.count / totalInPeriod) * 100) : 0
        }));
    const primaryHotspotInfo = resolvePrimaryHotspots(provinceBreakdown);
    const projections = buildMonthlyProjections(monthlyTrend, 3);
    const trendInsight = generateTrendInsight(monthlyTrend, projections, diseaseLabel);

    const outcomesMap = outcomes.reduce((acc, o) => {
        const key = o._id || 'Unknown';
        acc[key] = {
            count: o.count,
            percentage: totalOutcomes > 0 ? clampPercent((o.count / totalOutcomes) * 100) : 0
        };
        return acc;
    }, {});
    // Remove null/empty keys that break frontend rendering
    delete outcomesMap[null];
    delete outcomesMap[''];

    // Merge symptoms from both sources (symptoms[] array + presentingComplaints[].symptom)
    const rawSymptoms = symptoms[0] || { fromSymptoms: [], fromComplaints: [] };
    const mergedSymptomMap = new Map();
    [...(rawSymptoms.fromSymptoms || []), ...(rawSymptoms.fromComplaints || [])].forEach(s => {
        if (!s._id) return;
        const existing = mergedSymptomMap.get(s._id) || 0;
        mergedSymptomMap.set(s._id, existing + s.count);
    });
    const mergedSymptoms = Array.from(mergedSymptomMap.entries())
        .map(([id, count]) => ({ _id: id, count }))
        .sort((a, b) => b.count - a.count);

    const topSymptomsList = mergedSymptoms.map((s) => ({
        symptom: s._id,
        count: s.count,
        percentage: totalInPeriod > 0 ? clampPercent((s.count / totalInPeriod) * 100) : 0
    }));

    const visitTypesList = visitTypes.map((v) => ({
        type: v._id || 'Unknown',
        count: v.count,
        percentage: totalInPeriod > 0 ? clampPercent((v.count / totalInPeriod) * 100) : 0
    }));

    const v0 = vitals[0];
    const vitalsProfile = v0 && v0.count >= 1 ? {
        temperature: v0.avgTemperature ? Math.round(v0.avgTemperature * 10) / 10 : null,
        heartRate: v0.avgHeartRate ? Math.round(v0.avgHeartRate) : null,
        bloodPressure: v0.avgSystolic ? { systolic: Math.round(v0.avgSystolic), diastolic: Math.round(v0.avgDiastolic) } : null,
        oxygenSaturation: v0.avgOxygenSat ? Math.round(v0.avgOxygenSat * 10) / 10 : null,
        respiratoryRate: v0.avgRespiratoryRate ? Math.round(v0.avgRespiratoryRate) : null,
        bmi: v0.avgBMI ? Math.round(v0.avgBMI * 10) / 10 : null,
        sampleSize: v0.count
    } : null;

    return {
        totalCases: totalInPeriod,
        growthRate,
        growthIndex: toGrowthIndex(growthRate),
        prevalenceShare: totalRecords > 0 ? clampPercent((totalInPeriod / totalRecords) * 100) : 0,
        currentPeriodCases: currentPeriodCount,
        previousPeriodCases: previousPeriodCount,
        provinceBreakdown,
        primaryHotspots: primaryHotspotInfo.hotspots,
        hotspot: primaryHotspotInfo.label,
        hotspotCases: primaryHotspotInfo.maxCount,
        outcomes: outcomesMap,
        visitTypes: visitTypesList,
        topSymptoms: topSymptomsList,
        monthlyTrend,
        projections,
        trendInsight,
        vitalsProfile,
        period
    };
}

/**
 * Build map-ready province rows + summary for a disease/period filter.
 * @param {object} opts - { MedicalRecord, matchFilter, period }
 */
async function buildMapProvinceStats({ MedicalRecord, matchFilter = {}, period = 'all' }) {
    const windows = periodDateWindows(period);
    const baseMatch = { ...matchFilter };

    const currentMatch = windows.currentStart
        ? { ...baseMatch, visitDate: { $gte: windows.currentStart } }
        : { ...baseMatch };

    const previousMatch = windows.previousStart
        ? { ...baseMatch, visitDate: { $gte: windows.previousStart, $lt: windows.previousEnd } }
        : (windows.growthPreviousStart
            ? { ...baseMatch, visitDate: { $gte: windows.growthPreviousStart, $lt: windows.growthPreviousEnd } }
            : null);

    const [currentByProvince, previousByProvince, diseaseByProvince, totalCount] = await Promise.all([
        MedicalRecord.aggregate([
            { $match: currentMatch },
            { $group: { _id: '$province', count: { $sum: 1 } } }
        ]),
        previousMatch
            ? MedicalRecord.aggregate([
                { $match: previousMatch },
                { $group: { _id: '$province', count: { $sum: 1 } } }
            ])
            : Promise.resolve([]),
        MedicalRecord.aggregate([
            { $match: currentMatch },
            { $group: { _id: { province: '$province', disease: '$disease' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]),
        MedicalRecord.countDocuments(currentMatch)
    ]);

    const currentMap = new Map(currentByProvince.map((r) => [r._id, r.count]));
    const previousMap = new Map(previousByProvince.map((r) => [r._id, r.count]));

    const diseasesPerProvince = new Map();
    diseaseByProvince.forEach((row) => {
        const prov = row._id?.province;
        const dis = row._id?.disease;
        if (!prov || !dis) return;
        if (!diseasesPerProvince.has(prov)) diseasesPerProvince.set(prov, []);
        diseasesPerProvince.get(prov).push({ name: dis, cases: row.count });
    });
    diseasesPerProvince.forEach((list, prov) => {
        list.sort((a, b) => b.cases - a.cases);
        diseasesPerProvince.set(prov, list);
    });

    const provinceBreakdownForHotspot = [];
    const provinces = ZIMBABWE_PROVINCES.map((name) => {
        const total = currentMap.get(name) || 0;
        const prev = previousMap.get(name) || 0;
        const rawGrowth = rawGrowthPercent(total, prev);
        const growthIndex = toGrowthIndex(rawGrowth);
        const projectedCount = Math.max(0, Math.round(total * (1 + rawGrowth / 100)));
        const projectedGrowth = toGrowthIndex(rawGrowth * 1.1);

        if (total > 0) {
            provinceBreakdownForHotspot.push({
                province: name,
                count: total,
                percentage: totalCount > 0 ? clampPercent((total / totalCount) * 100) : 0
            });
        }

        const diseases = diseasesPerProvince.get(name) || [];
        const topDisease = diseases[0] || null;

        return {
            _id: name,
            total,
            count: total,
            growthRate: growthIndex,
            growthRateRaw: rawGrowth,
            projectedGrowth,
            projectedCount,
            riskLevel: riskLevelFromCasesAndGrowth(total, growthIndex),
            topDisease,
            diseases
        };
    });

    const hotspotInfo = resolvePrimaryHotspots(provinceBreakdownForHotspot);

    const [currentTotal, previousTotal] = await Promise.all([
        MedicalRecord.countDocuments(currentMatch),
        previousMatch ? MedicalRecord.countDocuments(previousMatch) : Promise.resolve(0)
    ]);
    const nationalRawGrowth = rawGrowthPercent(currentTotal, previousTotal);
    const aggregatedGrowthIndex = toGrowthIndex(nationalRawGrowth);

    return {
        provinces,
        summary: {
            totalCases: totalCount,
            aggregatedGrowthIndex,
            growthRateRaw: nationalRawGrowth,
            hotspot: hotspotInfo.label,
            hotspotCases: hotspotInfo.maxCount,
            primaryHotspots: hotspotInfo.hotspots
        }
    };
}

module.exports = {
    clampPercent,
    toGrowthIndex,
    rawGrowthPercent,
    periodMatches,
    buildDiseasePeriodAnalytics,
    buildMapProvinceStats,
    periodDateWindows,
    resolvePrimaryHotspots,
    normalizeDemographics,
    buildMonthlyProjections,
    aggregateMonthlyTotals,
    growthRateFromSeries,
    generateTrendInsight,
    generateOverviewInsight,
    buildDiseaseProfileFromData,
    buildDataDrivenRecommendations,
    patternToRecommendationContext,
    MIN_TREND_MONTHS,
    MIN_PROJECTION_MONTHS,
    RECOMMENDATION_TARGET
};
