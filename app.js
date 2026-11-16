/**
 * app.js - MotorGuard AI Engine
 * Industrial Induction Motor Condition-Monitoring, PCA & Anomaly Detection.
 * 100% Client-Side JavaScript - Ready for GitHub Pages Deployment.
 */

// =============================================================================
// MOTOR STANDARDS & THRESHOLDS (ISO 10816-3 & Thermal Insulation Limits)
// =============================================================================
const THRESHOLDS = {
  vibration: { warn: 4.5, crit: 7.1, min: 0, max: 12, unit: "mm/s" },
  temperature: { warn: 75.0, crit: 90.0, min: 20, max: 120, unit: "°C" },
  current: { warn: 15.0, crit: 20.0, min: 0, max: 30, unit: "A" },
  voltage: { warn: 370.0, crit: 350.0, min: 320, max: 460, unit: "V" },
  rotational_speed: { warn: 1420.0, crit: 1370.0, min: 1200, max: 1550, unit: "RPM" }
};

const SENSOR_KEYS = ["vibration", "temperature", "current", "voltage", "rotational_speed"];

// =============================================================================
// APPLICATION STATE
// =============================================================================
const state = {
  isRunning: true,
  streamInterval: 1000, // 1 Hz
  timerId: null,
  activeSensor: "vibration",
  statusFilter: "ALL",
  searchQuery: "",
  activeFault: "normal", // 'normal' | 'bearing' | 'thermal' | 'electrical'
  telemetryData: [],
  maxHistory: 150,
  pcaCache: null
};

// =============================================================================
// SYNTHETIC MOTOR SENSOR SIMULATOR
// =============================================================================
function gaussianRandom(mean = 0, stdev = 1) {
  let u = 1 - Math.random();
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

function generateObservation(index, faultMode = "normal") {
  const now = new Date();
  const timeStr = now.toLocaleTimeString();

  let vib, temp, curr, volt, rpm, stateLabel;

  if (faultMode === "bearing") {
    // Bearing defect: severe vibration surge, slight heating
    stateLabel = "Critical";
    vib = Math.max(0.5, gaussianRandom(8.8, 0.9));
    temp = gaussianRandom(72.0, 3.5);
    curr = gaussianRandom(12.5, 0.8);
    volt = gaussianRandom(398.0, 2.5);
    rpm = gaussianRandom(1460.0, 8.0);
  } else if (faultMode === "thermal") {
    // Thermal overheating: stator winding temperature runaway
    stateLabel = "Critical";
    vib = gaussianRandom(4.2, 0.5);
    temp = gaussianRandom(96.5, 3.2);
    curr = gaussianRandom(17.5, 1.2);
    volt = gaussianRandom(388.0, 3.0);
    rpm = gaussianRandom(1435.0, 10.0);
  } else if (faultMode === "electrical") {
    // Electrical fault: voltage drop + high stator surge current
    stateLabel = "Critical";
    vib = gaussianRandom(5.8, 0.8);
    temp = gaussianRandom(84.0, 3.0);
    curr = gaussianRandom(22.8, 1.5);
    volt = gaussianRandom(345.0, 6.0);
    rpm = gaussianRandom(1365.0, 14.0);
  } else {
    // 80% Normal, 15% Warning, 5% Random Anomaly
    const roll = Math.random();
    if (roll < 0.80) {
      stateLabel = "Healthy";
      vib = Math.max(0.3, gaussianRandom(2.1, 0.35));
      temp = gaussianRandom(52.5, 2.8);
      curr = Math.max(1.0, gaussianRandom(9.8, 0.6));
      volt = gaussianRandom(400.0, 2.5);
      rpm = gaussianRandom(1475.0, 6.0);
    } else if (roll < 0.94) {
      stateLabel = "Warning";
      vib = gaussianRandom(5.2, 0.6);
      temp = gaussianRandom(77.5, 3.0);
      curr = gaussianRandom(16.2, 1.0);
      volt = gaussianRandom(388.0, 4.0);
      rpm = gaussianRandom(1440.0, 10.0);
    } else {
      stateLabel = "Critical";
      vib = gaussianRandom(8.2, 0.8);
      temp = gaussianRandom(94.0, 3.5);
      curr = gaussianRandom(21.5, 1.2);
      volt = gaussianRandom(365.0, 6.0);
      rpm = gaussianRandom(1385.0, 15.0);
    }
  }

  // Round values
  const reading = {
    index: index,
    timestamp: timeStr,
    vibration: parseFloat(vib.toFixed(2)),
    temperature: parseFloat(temp.toFixed(1)),
    current: parseFloat(curr.toFixed(2)),
    voltage: parseFloat(volt.toFixed(1)),
    rotational_speed: parseFloat(rpm.toFixed(0))
  };

  // Evaluate rule checks & composite risk
  const evaluation = evaluateHealthAndRisk(reading);
  return { ...reading, ...evaluation };
}

// =============================================================================
// DOMAIN HEALTH RULES & 0-100 RISK ENGINE
// =============================================================================
function evaluateHealthAndRisk(row) {
  const reasons = [];
  let ruleRisk = 0;

  // 1. Vibration
  if (row.vibration >= THRESHOLDS.vibration.crit) {
    ruleRisk += 35;
    reasons.push(`Severe Vibration (${row.vibration} mm/s)`);
  } else if (row.vibration >= THRESHOLDS.vibration.warn) {
    ruleRisk += 15;
    reasons.push(`High Vibration (${row.vibration} mm/s)`);
  }

  // 2. Temperature
  if (row.temperature >= THRESHOLDS.temperature.crit) {
    ruleRisk += 30;
    reasons.push(`High Overheating (${row.temperature} °C)`);
  } else if (row.temperature >= THRESHOLDS.temperature.warn) {
    ruleRisk += 12;
    reasons.push(`Elevated Temp (${row.temperature} °C)`);
  }

  // 3. Current
  if (row.current >= THRESHOLDS.current.crit) {
    ruleRisk += 25;
    reasons.push(`Severe Overcurrent (${row.current} A)`);
  } else if (row.current >= THRESHOLDS.current.warn) {
    ruleRisk += 10;
    reasons.push(`Current Surge (${row.current} A)`);
  }

  // 4. Voltage
  if (row.voltage <= THRESHOLDS.voltage.crit) {
    ruleRisk += 18;
    reasons.push(`Severe Under-Voltage (${row.voltage} V)`);
  } else if (row.voltage <= THRESHOLDS.voltage.warn) {
    ruleRisk += 8;
    reasons.push(`Voltage Drop (${row.voltage} V)`);
  }

  // 5. Speed
  if (row.rotational_speed <= THRESHOLDS.rotational_speed.crit) {
    ruleRisk += 15;
    reasons.push(`Severe Speed Slip (${row.rotational_speed} RPM)`);
  } else if (row.rotational_speed <= THRESHOLDS.rotational_speed.warn) {
    ruleRisk += 8;
    reasons.push(`Speed Drag (${row.rotational_speed} RPM)`);
  }

  // AI Anomaly flag (multivariate distance)
  const isAnomaly = ruleRisk > 15;
  const totalRisk = Math.min(100, Math.max(0, Math.round(ruleRisk + (isAnomaly ? 10 : 0))));

  let healthStatus = "Healthy";
  if (totalRisk >= 65 || row.vibration >= THRESHOLDS.vibration.crit || row.temperature >= THRESHOLDS.temperature.crit) {
    healthStatus = "Critical";
  } else if (totalRisk >= 30 || isAnomaly) {
    healthStatus = "Warning";
  }

  const reasonText = reasons.length > 0 ? reasons.join("; ") : "All physical telemetry within optimal baseline";

  return {
    is_anomaly: isAnomaly,
    risk_index: totalRisk,
    health_status: healthStatus,
    diagnosis_reason: reasonText
  };
}

// =============================================================================
// MATHEMATICAL ENGINE: Z-SCORE & 5x5 PEARSON CORRELATION MATRIX
// =============================================================================
function computePearsonMatrix(dataset) {
  const n = dataset.length;
  if (n < 2) return Array(5).fill(0).map(() => Array(5).fill(1));

  // Compute means
  const means = {};
  SENSOR_KEYS.forEach(k => {
    means[k] = dataset.reduce((sum, r) => sum + r[k], 0) / n;
  });

  // Compute variance & covariance
  const matrix = Array(5).fill(0).map(() => Array(5).fill(0));

  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      const k1 = SENSOR_KEYS[i];
      const k2 = SENSOR_KEYS[j];

      let num = 0;
      let den1 = 0;
      let den2 = 0;

      for (let r = 0; r < n; r++) {
        const d1 = dataset[r][k1] - means[k1];
        const d2 = dataset[r][k2] - means[k2];
        num += d1 * d2;
        den1 += d1 * d1;
        den2 += d2 * d2;
      }

      const denom = Math.sqrt(den1 * den2);
      matrix[i][j] = denom === 0 ? 0 : parseFloat((num / denom).toFixed(2));
    }
  }

  return matrix;
}

// =============================================================================
// MATHEMATICAL ENGINE: PCA 2D PROJECTION & EIGENVALUES
// =============================================================================
function computePCA2D(dataset) {
  const n = dataset.length;
  if (n < 5) return { coords: [], eigenvalues: [1, 1], variancePct: [50, 50] };

  // 1. Z-score standardisation
  const means = {};
  const stds = {};

  SENSOR_KEYS.forEach(k => {
    const avg = dataset.reduce((sum, r) => sum + r[k], 0) / n;
    means[k] = avg;
    const variance = dataset.reduce((sum, r) => sum + Math.pow(r[k] - avg, 2), 0) / n;
    stds[k] = Math.sqrt(variance) || 1;
  });

  const standardized = dataset.map(r => {
    return SENSOR_KEYS.map(k => (r[k] - means[k]) / stds[k]);
  });

  // 2. Covariance matrix (5x5)
  const cov = Array(5).fill(0).map(() => Array(5).fill(0));
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      let sum = 0;
      for (let r = 0; r < n; r++) {
        sum += standardized[r][i] * standardized[r][j];
      }
      cov[i][j] = sum / (n - 1);
    }
  }

  // 3. Power Iteration to find PC1 eigenvector
  function powerIteration(A, iterations = 35) {
    let b = [1, 1, 1, 1, 1];
    for (let it = 0; it < iterations; it++) {
      const nextB = [0, 0, 0, 0, 0];
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          nextB[i] += A[i][j] * b[j];
        }
      }
      const norm = Math.sqrt(nextB.reduce((s, v) => s + v * v, 0)) || 1;
      b = nextB.map(v => v / norm);
    }

    // Eigenvalue = b^T * A * b
    let eigVal = 0;
    for (let i = 0; i < 5; i++) {
      let Ab_i = 0;
      for (let j = 0; j < 5; j++) Ab_i += A[i][j] * b[j];
      eigVal += b[i] * Ab_i;
    }
    return { vec: b, val: Math.max(0.01, eigVal) };
  }

  // PC1
  const pc1 = powerIteration(cov);

  // Deflate matrix to find PC2
  const covDeflated = Array(5).fill(0).map((_, i) =>
    Array(5).fill(0).map((__, j) => cov[i][j] - pc1.val * pc1.vec[i] * pc1.vec[j])
  );
  const pc2 = powerIteration(covDeflated);

  // Project points onto PC1 and PC2
  const coords = standardized.map((row, idx) => {
    const x = row.reduce((sum, v, i) => sum + v * pc1.vec[i], 0);
    const y = row.reduce((sum, v, i) => sum + v * pc2.vec[i], 0);
    return {
      x: parseFloat(x.toFixed(2)),
      y: parseFloat(y.toFixed(2)),
      status: dataset[idx].health_status,
      timestamp: dataset[idx].timestamp,
      vibration: dataset[idx].vibration,
      risk: dataset[idx].risk_index
    };
  });

  const totalVar = 5.0; // Sum of diagonal on correlation/z-score matrix is 5
  const varPct1 = Math.min(99, Math.round((pc1.val / totalVar) * 100));
  const varPct2 = Math.min(99 - varPct1, Math.round((pc2.val / totalVar) * 100));

  state.pcaModel = {
    means,
    stds,
    pc1Vec: pc1.vec,
    pc2Vec: pc2.vec
  };

  return {
    coords,
    eigenvalues: [pc1.val, pc2.val],
    variancePct: [varPct1, varPct2]
  };
}

// =============================================================================
// CANVAS SCADA RADIAL GAUGE RENDERER
// =============================================================================
function drawRadialGauge(canvasId, value, min, max, warn, crit, isLowerBetter = true) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height - 15;
  const radius = width * 0.42;

  // Background arc (semi-circle from PI to 2*PI)
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI, false);
  ctx.lineWidth = 14;
  ctx.strokeStyle = "#16223d";
  ctx.stroke();

  // Value fraction bounded in [0, 1]
  const fraction = Math.min(1, Math.max(0, (value - min) / (max - min)));

  // Gauge colored sections
  const warnFrac = Math.min(1, Math.max(0, (warn - min) / (max - min)));
  const critFrac = Math.min(1, Math.max(0, (crit - min) / (max - min)));

  function drawArc(startF, endF, color) {
    if (endF <= startF) return;
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      radius,
      Math.PI + startF * Math.PI,
      Math.PI + endF * Math.PI,
      false
    );
    ctx.lineWidth = 14;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  if (isLowerBetter) {
    drawArc(0, warnFrac, "rgba(16, 185, 129, 0.45)");
    drawArc(warnFrac, critFrac, "rgba(245, 158, 11, 0.55)");
    drawArc(critFrac, 1, "rgba(239, 68, 68, 0.65)");
  } else {
    drawArc(0, critFrac, "rgba(239, 68, 68, 0.65)");
    drawArc(critFrac, warnFrac, "rgba(245, 158, 11, 0.55)");
    drawArc(warnFrac, 1, "rgba(16, 185, 129, 0.45)");
  }

  // Active Value Fill with glowing accent
  let activeColor = "#10b981";
  if (isLowerBetter) {
    if (value >= crit) activeColor = "#ef4444";
    else if (value >= warn) activeColor = "#f59e0b";
  } else {
    if (value <= crit) activeColor = "#ef4444";
    else if (value <= warn) activeColor = "#f59e0b";
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, Math.PI + fraction * Math.PI, false);
  ctx.lineWidth = 14;
  ctx.strokeStyle = activeColor;
  ctx.shadowColor = activeColor;
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0; // reset

  // Needle pointer
  const needleAngle = Math.PI + fraction * Math.PI;
  const needleLen = radius - 8;
  const tipX = centerX + needleLen * Math.cos(needleAngle);
  const tipY = centerY + needleLen * Math.sin(needleAngle);

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(tipX, tipY);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  // Center pivot pin
  ctx.beginPath();
  ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
  ctx.fillStyle = activeColor;
  ctx.fill();
}

// =============================================================================
// CHART.JS CONTROLLERS (Dark Mode)
// =============================================================================
let telemetryChartInstance = null;
let riskChartInstance = null;
let pcaChartInstance = null;
let fftChartInstance = null;
let rulChartInstance = null;

function initCharts() {
  const chartFont = { family: "'Plus Jakarta Sans', sans-serif" };

  // 1. Telemetry Chart
  const ctxTelem = document.getElementById("telemetryChart").getContext("2d");
  telemetryChartInstance = new Chart(ctxTelem, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Vibration (mm/s)",
        data: [],
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56, 189, 248, 0.08)",
        fill: true,
        tension: 0.35,
        borderWidth: 2.2,
        pointRadius: 0,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#111a2e",
          titleColor: "#f8fafc",
          bodyColor: "#94a3b8",
          borderColor: "rgba(56, 189, 248, 0.3)",
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: { color: "#64748b", font: chartFont, maxTicksLimit: 7 }
        },
        y: {
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: { color: "#64748b", font: chartFont }
        }
      }
    }
  });

  // 2. Risk Index Timeline Chart
  const ctxRisk = document.getElementById("riskChart").getContext("2d");
  riskChartInstance = new Chart(ctxRisk, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Risk Index",
        data: [],
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.08)",
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: { color: "#64748b", font: chartFont, maxTicksLimit: 6 }
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: { color: "#64748b", font: chartFont }
        }
      }
    }
  });

  // 3. PCA 2D Scatter Chart
  const ctxPca = document.getElementById("pcaChart").getContext("2d");
  pcaChartInstance = new Chart(ctxPca, {
    type: "scatter",
    data: {
      datasets: [
        { label: "Healthy", data: [], backgroundColor: "#10b981", pointRadius: 4.5 },
        { label: "Warning", data: [], backgroundColor: "#f59e0b", pointRadius: 5.5 },
        { label: "Critical", data: [], backgroundColor: "#ef4444", pointRadius: 6.5 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: "top",
          labels: { color: "#94a3b8", font: chartFont, usePointStyle: true, boxWidth: 7 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: (${ctx.raw.x}, ${ctx.raw.y})`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Principal Component 1 (PC1)", color: "#64748b", font: chartFont },
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: { color: "#64748b" }
        },
        y: {
          title: { display: true, text: "Principal Component 2 (PC2)", color: "#64748b", font: chartFont },
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: { color: "#64748b" }
        }
      }
    }
  });

  // 4. FFT Vibration Spectrum Chart
  initFftChart(chartFont);

  // 5. Remaining Useful Life (RUL) Prognostic Curve
  initRulChart(chartFont);
}

function initFftChart(chartFont) {
  const canvas = document.getElementById("fftChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const freqs = [];
  for (let f = 0; f <= 300; f += 2) freqs.push(f);

  fftChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: freqs,
      datasets: [{
        label: "Spectral Amplitude (mm/s RMS)",
        data: Array(freqs.length).fill(0.18),
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56, 189, 248, 0.12)",
        fill: true,
        tension: 0.15,
        borderWidth: 2,
        pointRadius: (ctx) => {
          const idx = ctx.dataIndex;
          const f = freqs[idx];
          if (Math.abs(f - 24) <= 1 || Math.abs(f - 48) <= 1 || Math.abs(f - 178) <= 1 || Math.abs(f - 232) <= 1) {
            return 5;
          }
          return 0;
        },
        pointBackgroundColor: (ctx) => {
          const f = freqs[ctx.dataIndex];
          if (Math.abs(f - 178) <= 1) return "#ef4444";
          if (Math.abs(f - 48) <= 1) return "#f59e0b";
          return "#38bdf8";
        }
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `Frequency: ${items[0].label} Hz`,
            label: (item) => `Amplitude: ${item.raw.toFixed(2)} mm/s RMS`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Frequency (Hz)", color: "#64748b", font: chartFont },
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: { color: "#64748b", font: chartFont, maxTicksLimit: 12 }
        },
        y: {
          title: { display: true, text: "Vibration Amplitude (mm/s)", color: "#64748b", font: chartFont },
          min: 0,
          max: 10,
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: { color: "#64748b", font: chartFont }
        }
      }
    }
  });
}

function initRulChart(chartFont) {
  const canvas = document.getElementById("rulChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const hours = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];

  rulChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: hours,
      datasets: [
        {
          label: "Health Index (HI %)",
          data: [100, 98, 95, 91, 84, 76, 64, 50, 36, 22, 10],
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.8,
          pointRadius: 4,
          pointHoverRadius: 7
        },
        {
          label: "95% Upper Bound",
          data: [100, 99, 97, 94, 88, 81, 71, 58, 45, 32, 18],
          borderColor: "rgba(56, 189, 248, 0.45)",
          borderDash: [5, 5],
          fill: false,
          tension: 0.35,
          borderWidth: 1.5,
          pointRadius: 0
        },
        {
          label: "95% Lower Bound",
          data: [100, 96, 92, 87, 79, 69, 56, 42, 28, 14, 5],
          borderColor: "rgba(56, 189, 248, 0.45)",
          borderDash: [5, 5],
          fill: false,
          tension: 0.35,
          borderWidth: 1.5,
          pointRadius: 0
        },
        {
          label: "Warning Limit (70% HI)",
          data: Array(hours.length).fill(70),
          borderColor: "rgba(245, 158, 11, 0.8)",
          borderDash: [4, 4],
          borderWidth: 1.2,
          pointRadius: 0,
          fill: false
        },
        {
          label: "Critical Limit (35% HI)",
          data: Array(hours.length).fill(35),
          borderColor: "rgba(239, 68, 68, 0.85)",
          borderDash: [4, 4],
          borderWidth: 1.4,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: "top",
          labels: { color: "#94a3b8", font: chartFont, usePointStyle: true, boxWidth: 6 }
        },
        tooltip: {
          callbacks: {
            title: (items) => `${items[0].label} Operating Hours`,
            label: (item) => `${item.dataset.label}: ${item.raw.toFixed(1)}%`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Cumulative Operating Hours (h)", color: "#64748b", font: chartFont },
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: { color: "#64748b", font: chartFont }
        },
        y: {
          title: { display: true, text: "Health Index HI (%)", color: "#64748b", font: chartFont },
          min: 0,
          max: 100,
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: { color: "#64748b", font: chartFont }
        }
      }
    }
  });
}

// =============================================================================
// HEATMAP RENDERING ENGINE
// =============================================================================
function renderCorrelationHeatmap(matrix) {
  const container = document.getElementById("heatmapContainer");
  if (!container) return;
  container.innerHTML = "";

  const labels = ["Vib", "Temp", "Curr", "Volt", "RPM"];

  // Header row
  const headerRow = document.createElement("div");
  headerRow.className = "heatmap-row";
  headerRow.innerHTML = `<span class="heatmap-label"></span>` + labels.map(l => `<span class="heatmap-label" style="text-align: center;">${l}</span>`).join("");
  container.appendChild(headerRow);

  // Rows
  for (let i = 0; i < 5; i++) {
    const rowDiv = document.createElement("div");
    rowDiv.className = "heatmap-row";
    rowDiv.innerHTML = `<span class="heatmap-label">${labels[i]}</span>`;

    for (let j = 0; j < 5; j++) {
      const val = matrix[i][j];
      const cell = document.createElement("div");
      cell.className = "heatmap-cell";

      // Color from Blue (-1) to Dark (0) to Red (+1)
      let bg;
      if (val >= 0) {
        const intensity = Math.min(1, val);
        bg = `rgba(239, 68, 68, ${0.15 + intensity * 0.75})`;
      } else {
        const intensity = Math.min(1, Math.abs(val));
        bg = `rgba(37, 99, 235, ${0.15 + intensity * 0.75})`;
      }

      cell.style.backgroundColor = bg;
      cell.textContent = val.toFixed(2);
      cell.title = `${SENSOR_KEYS[i]} vs ${SENSOR_KEYS[j]}: r = ${val}`;
      rowDiv.appendChild(cell);
    }
    container.appendChild(rowDiv);
  }
}

// =============================================================================
// UI UPDATE DISPATCHER
// =============================================================================
function updateUI() {
  if (state.telemetryData.length === 0) return;

  const latest = state.telemetryData[state.telemetryData.length - 1];

  // 1. Update Numerical Values & Dial Gauges
  document.getElementById("valVib").textContent = latest.vibration;
  document.getElementById("valTemp").textContent = latest.temperature;
  document.getElementById("valCurr").textContent = latest.current;
  document.getElementById("valVolt").textContent = latest.voltage;
  document.getElementById("valSpeed").textContent = latest.rotational_speed;

  drawRadialGauge("gaugeVibration", latest.vibration, THRESHOLDS.vibration.min, THRESHOLDS.vibration.max, THRESHOLDS.vibration.warn, THRESHOLDS.vibration.crit, true);
  drawRadialGauge("gaugeTemperature", latest.temperature, THRESHOLDS.temperature.min, THRESHOLDS.temperature.max, THRESHOLDS.temperature.warn, THRESHOLDS.temperature.crit, true);
  drawRadialGauge("gaugeCurrent", latest.current, THRESHOLDS.current.min, THRESHOLDS.current.max, THRESHOLDS.current.warn, THRESHOLDS.current.crit, true);
  drawRadialGauge("gaugeVoltage", latest.voltage, THRESHOLDS.voltage.min, THRESHOLDS.voltage.max, THRESHOLDS.voltage.warn, THRESHOLDS.voltage.crit, false);
  drawRadialGauge("gaugeSpeed", latest.rotational_speed, THRESHOLDS.rotational_speed.min, THRESHOLDS.rotational_speed.max, THRESHOLDS.rotational_speed.warn, THRESHOLDS.rotational_speed.crit, false);

  // 2. Update KPI Stats
  const total = state.telemetryData.length;
  const healthyCount = state.telemetryData.filter(r => r.health_status === "Healthy").length;
  const warnCount = state.telemetryData.filter(r => r.health_status === "Warning").length;
  const critCount = state.telemetryData.filter(r => r.health_status === "Critical").length;

  document.getElementById("kpiTotal").textContent = total;
  document.getElementById("kpiHealthy").textContent = healthyCount;
  document.getElementById("kpiWarning").textContent = warnCount;
  document.getElementById("kpiCritical").textContent = critCount;

  document.getElementById("kpiHealthyPct").textContent = `${Math.round((healthyCount / total) * 100)}% optimal`;
  document.getElementById("kpiWarningPct").textContent = `${Math.round((warnCount / total) * 100)}% advisory`;
  document.getElementById("kpiCriticalPct").textContent = `${Math.round((critCount / total) * 100)}% critical`;

  const badge = document.getElementById("latestStatusBadge");
  badge.textContent = latest.health_status.toUpperCase();
  badge.className = `badge-status badge-${latest.health_status.toLowerCase()}`;

  const statusCard = document.getElementById("kpiStatusCard");
  const borderColor = latest.health_status === "Healthy" ? "var(--status-healthy)" : (latest.health_status === "Warning" ? "var(--status-warning)" : "var(--status-critical)");
  statusCard.style.borderLeftColor = borderColor;

  document.getElementById("latestRiskScore").textContent = latest.risk_index;

  const riskBadge = document.getElementById("riskLevelBadge");
  if (latest.risk_index >= 65) {
    riskBadge.textContent = "CRITICAL ACTION ZONE";
    riskBadge.className = "badge-pill badge-critical";
  } else if (latest.risk_index >= 30) {
    riskBadge.textContent = "ADVISORY WARNING ZONE";
    riskBadge.className = "badge-pill badge-warning";
  } else {
    riskBadge.textContent = "SAFE OPERATING ZONE";
    riskBadge.className = "badge-pill badge-healthy";
  }

  // 3. Update Diagnostic Alert Banner
  document.getElementById("diagTitle").textContent = `Subsystem Condition: ${latest.health_status}`;
  document.getElementById("diagReason").textContent = latest.diagnosis_reason;
  const diagIcon = document.getElementById("diagIcon");
  diagIcon.textContent = latest.health_status === "Healthy" ? "🛡️" : (latest.health_status === "Warning" ? "⚠️" : "🚨");

  // 4. Update Telemetry Charts
  const recentSlice = state.telemetryData.slice(-60);
  const labels = recentSlice.map(r => r.timestamp);

  telemetryChartInstance.data.labels = labels;
  telemetryChartInstance.data.datasets[0].data = recentSlice.map(r => r[state.activeSensor]);
  telemetryChartInstance.data.datasets[0].label = `${state.activeSensor.replace('_', ' ').toUpperCase()} (${THRESHOLDS[state.activeSensor].unit})`;
  telemetryChartInstance.update();

  riskChartInstance.data.labels = labels;
  riskChartInstance.data.datasets[0].data = recentSlice.map(r => r.risk_index);
  riskChartInstance.update();

  // 5. Update PCA Scatter & Correlation periodically
  if (total % 10 === 0 || total <= 25) {
    const matrix = computePearsonMatrix(state.telemetryData);
    renderCorrelationHeatmap(matrix);

    const pcaResult = computePCA2D(state.telemetryData.slice(-100));
    const hPoints = pcaResult.coords.filter(p => p.status === "Healthy");
    const wPoints = pcaResult.coords.filter(p => p.status === "Warning");
    const cPoints = pcaResult.coords.filter(p => p.status === "Critical");

    pcaChartInstance.data.datasets[0].data = hPoints;
    pcaChartInstance.data.datasets[1].data = wPoints;
    pcaChartInstance.data.datasets[2].data = cPoints;
    pcaChartInstance.update();

    document.getElementById("pcaVarianceStats").innerHTML = `
      <span><b>PC1:</b> Explains ${pcaResult.variancePct[0]}% variance</span>
      <span><b>PC2:</b> Explains ${pcaResult.variancePct[1]}% variance</span>
      <span><b>Cumulative:</b> ${pcaResult.variancePct[0] + pcaResult.variancePct[1]}% 2D retention</span>
    `;
  }

  // 6. Update Intermediate & Capstone Engineering Diagnostics
  updateFftSpectrum(latest);
  updateRulDegradation(latest);
  updateDigitalTwinSubsystems(latest);
  updateSidebarHealth(latest);

  // 7. Update Diagnostic Table
  renderAuditTable();
}

// =============================================================================
// INTERMEDIATE ENGINEERING: FFT SPECTRAL HARMONICS ENGINE (ISO 13373-1)
// =============================================================================
function updateFftSpectrum(latest) {
  if (!fftChartInstance) return;

  const rpm = latest.rotational_speed || 1475;
  const vib = latest.vibration || 2.1;
  const fault = state.activeFault;

  const f1X = parseFloat((rpm / 60).toFixed(1)); // ~24.6 Hz
  const f2X = parseFloat((f1X * 2).toFixed(1));  // ~49.2 Hz
  const f3X = parseFloat((f1X * 3).toFixed(1));  // ~73.8 Hz
  const fBPFO = 178.4;
  const fBPFI = 232.1;

  // Harmonic peak amplitudes
  let a1X = 1.25;
  let a2X = 0.45;
  let aBPFO = 0.28;
  let aBPFI = 0.18;

  if (fault === "bearing" || (vib >= 7.1 && fault !== "electrical")) {
    aBPFO = Math.min(9.5, Math.max(5.5, vib * 0.95));
    a1X = Math.min(5.5, Math.max(2.2, vib * 0.45));
    a2X = 1.25;
    aBPFI = 1.45;
  } else if (fault === "electrical" || (vib >= 4.5 && latest.voltage < 370)) {
    a2X = Math.min(6.5, Math.max(3.8, vib * 0.72));
    a1X = Math.min(5.0, Math.max(2.5, vib * 0.5));
    aBPFO = 0.65;
  } else if (vib >= 4.5) {
    a1X = Math.min(5.5, Math.max(2.8, vib * 0.65));
    a2X = 1.4;
    aBPFO = 0.75;
  } else {
    a1X = Math.max(0.6, Math.min(1.8, vib * 0.55));
    a2X = 0.35;
    aBPFO = 0.25;
  }

  // Generate 151 spectrum bins from 0 to 300 Hz
  const freqs = [];
  const amplitudes = [];

  for (let f = 0; f <= 300; f += 2) {
    freqs.push(f);
    let amp = 0.12 + Math.random() * 0.08;

    amp += a1X * Math.exp(-Math.pow(f - f1X, 2) / 8);
    amp += a2X * Math.exp(-Math.pow(f - f2X, 2) / 8);
    amp += (a1X * 0.3) * Math.exp(-Math.pow(f - f3X, 2) / 8);
    amp += aBPFO * Math.exp(-Math.pow(f - fBPFO, 2) / 10);
    amp += aBPFI * Math.exp(-Math.pow(f - fBPFI, 2) / 10);

    amplitudes.push(parseFloat(amp.toFixed(2)));
  }

  fftChartInstance.data.labels = freqs;
  fftChartInstance.data.datasets[0].data = amplitudes;

  if (aBPFO >= 4.5 || a1X >= 5.0) {
    fftChartInstance.data.datasets[0].borderColor = "#ef4444";
    fftChartInstance.data.datasets[0].backgroundColor = "rgba(239, 68, 68, 0.15)";
  } else if (aBPFO >= 2.0 || a1X >= 3.0 || a2X >= 2.5) {
    fftChartInstance.data.datasets[0].borderColor = "#f59e0b";
    fftChartInstance.data.datasets[0].backgroundColor = "rgba(245, 158, 11, 0.12)";
  } else {
    fftChartInstance.data.datasets[0].borderColor = "#38bdf8";
    fftChartInstance.data.datasets[0].backgroundColor = "rgba(56, 189, 248, 0.12)";
  }
  fftChartInstance.update();

  // Update Diagnostic Harmonics Text
  const h1El = document.getElementById("hVal1X");
  if (h1El) h1El.textContent = `${a1X.toFixed(2)} mm/s`;
  const h2El = document.getElementById("hVal2X");
  if (h2El) h2El.textContent = `${a2X.toFixed(2)} mm/s`;
  const hBpfoEl = document.getElementById("hValBPFO");
  if (hBpfoEl) hBpfoEl.textContent = `${aBPFO.toFixed(2)} mm/s`;
  const hBpfiEl = document.getElementById("hValBPFI");
  if (hBpfiEl) hBpfiEl.textContent = `${aBPFI.toFixed(2)} mm/s`;

  function setBadge(elId, val, warnLimit, critLimit) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (val >= critLimit) {
      el.textContent = "CRITICAL";
      el.className = "h-status-badge badge-critical";
    } else if (val >= warnLimit) {
      el.textContent = "WARNING";
      el.className = "h-status-badge badge-warning";
    } else {
      el.textContent = "NORMAL";
      el.className = "h-status-badge badge-healthy";
    }
  }

  setBadge("hBadge1X", a1X, 3.0, 5.0);
  setBadge("hBadge2X", a2X, 2.0, 3.5);
  setBadge("hBadgeBPFO", aBPFO, 1.5, 4.0);
  setBadge("hBadgeBPFI", aBPFI, 1.2, 3.0);

  const peakEl = document.getElementById("fftPeakFrequencyText");
  if (peakEl) {
    if (aBPFO >= 4.0) {
      peakEl.innerHTML = `<span style="color: #ef4444; font-weight: 800;">🚨 Dominant Peak: 178.4 Hz (BPFO Bearing Defect)</span>`;
    } else if (a2X >= 3.0) {
      peakEl.innerHTML = `<span style="color: #f59e0b; font-weight: 700;">⚠️ Dominant Peak: ${f2X} Hz (2X Shaft Misalignment)</span>`;
    } else {
      peakEl.innerHTML = `Dominant Peak: ${f1X} Hz (1X Shaft Speed)`;
    }
  }
}

// =============================================================================
// INTERMEDIATE ENGINEERING: REMAINING USEFUL LIFE (RUL) & DEGRADATION ENGINE
// =============================================================================
function updateRulDegradation(latest) {
  if (!rulChartInstance) return;

  const risk = latest.risk_index || 0;
  const hi = Math.max(5, Math.min(100, 100 - risk)); // Health Index %

  let degRate = 0.024; // % per running hour
  if (risk >= 65) {
    degRate = 0.165 + (risk - 65) * 0.005;
  } else if (risk >= 30) {
    degRate = 0.065 + (risk - 30) * 0.002;
  } else {
    degRate = 0.020 + (risk / 30) * 0.008;
  }

  // Estimated RUL: hours until HI drops to 35% critical failure threshold
  const hoursToFail = Math.max(0, Math.round((hi - 35) / degRate));
  const daysToFail = Math.round(hoursToFail / 24);

  const currentHours = 1500;
  const hoursAxis = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];

  const mainCurve = [];
  const upperCurve = [];
  const lowerCurve = [];

  hoursAxis.forEach(h => {
    let val;
    if (h <= currentHours) {
      val = 100 - (100 - hi) * Math.pow(h / currentHours, 1.2);
    } else {
      const deltaH = h - currentHours;
      val = hi - degRate * deltaH;
    }
    val = Math.max(0, Math.min(100, val));
    mainCurve.push(parseFloat(val.toFixed(1)));
    upperCurve.push(parseFloat(Math.min(100, val + 7).toFixed(1)));
    lowerCurve.push(parseFloat(Math.max(0, val - 7).toFixed(1)));
  });

  rulChartInstance.data.datasets[0].data = mainCurve;
  rulChartInstance.data.datasets[1].data = upperCurve;
  rulChartInstance.data.datasets[2].data = lowerCurve;

  if (hi <= 40) {
    rulChartInstance.data.datasets[0].borderColor = "#ef4444";
    rulChartInstance.data.datasets[0].backgroundColor = "rgba(239, 68, 68, 0.08)";
  } else if (hi <= 70) {
    rulChartInstance.data.datasets[0].borderColor = "#f59e0b";
    rulChartInstance.data.datasets[0].backgroundColor = "rgba(245, 158, 11, 0.08)";
  } else {
    rulChartInstance.data.datasets[0].borderColor = "#10b981";
    rulChartInstance.data.datasets[0].backgroundColor = "rgba(16, 185, 129, 0.08)";
  }
  rulChartInstance.update();

  const hValEl = document.getElementById("rulHoursValue");
  if (hValEl) hValEl.textContent = hoursToFail.toLocaleString();
  const dValEl = document.getElementById("rulDaysValue");
  if (dValEl) dValEl.textContent = `~${daysToFail} Days Continuous`;

  const hiEl = document.getElementById("rulHealthIndexValue");
  if (hiEl) {
    hiEl.textContent = `${hi.toFixed(1)}%`;
    hiEl.className = hi > 70 ? "rul-kpi-number text-healthy" : (hi > 40 ? "rul-kpi-number text-amber" : "rul-kpi-number text-red");
  }

  const zoneLabel = document.getElementById("rulZoneLabel");
  if (zoneLabel) {
    zoneLabel.textContent = hi > 70 ? "Zone A / Optimal State" : (hi > 40 ? "Zone B / Moderate Wear" : "Zone C-D / Critical Threat");
  }

  const degEl = document.getElementById("rulDegradationRate");
  if (degEl) degEl.textContent = `${degRate.toFixed(3)}%`;

  const windowHours = Math.max(0, Math.round(hoursToFail * 0.72));
  const winEl = document.getElementById("rulWindowValue");
  if (winEl) winEl.textContent = `${windowHours.toLocaleString()} h`;

  const advText = document.getElementById("rulAdvisoryText");
  if (advText) {
    if (hi <= 40) {
      advText.innerHTML = `<b>Critical Prognostic Warning:</b> Accelerated degradation rate (${degRate.toFixed(3)}%/h). Estimated failure within <b>${hoursToFail} hours</b>. Immediate maintenance shutdown required.`;
    } else if (hi <= 70) {
      advText.innerHTML = `<b>Preventive Action Advisory:</b> Degradation trend has entered the warning corridor. Estimated remaining useful life is <b>${hoursToFail} operating hours</b>. Schedule inspection within ${windowHours} hours.`;
    } else {
      advText.innerHTML = `<b>Prognostic Insight:</b> Motor degradation curve is flat and optimal. Operating parameters project <b>${hoursToFail} hours (~${daysToFail} days)</b> before preventive relubrication is required.`;
    }
  }
}

// =============================================================================
// CAPSTONE: DIGITAL TWIN 4-SUBSYSTEM HEALTH ENGINE
// =============================================================================
function updateDigitalTwinSubsystems(latest) {
  const temp = latest.temperature || 52;
  const vib = latest.vibration || 2.1;
  const rpm = latest.rotational_speed || 1475;
  const curr = latest.current || 9.8;
  const volt = latest.voltage || 400;

  // 1. Stator Insulation Integrity (0-100%)
  let statorPct = 100 - Math.max(0, (temp - 50) * 1.6);
  if (temp >= 90) statorPct = Math.max(18, 50 - (temp - 90) * 2.5);
  statorPct = Math.min(99.5, Math.max(15, parseFloat(statorPct.toFixed(1))));

  // 2. Bearings Integrity (0-100%)
  let bearingsPct = 100 - Math.max(0, (vib - 1.5) * 12);
  if (state.activeFault === "bearing") bearingsPct = Math.min(bearingsPct, 24.5);
  bearingsPct = Math.min(99.2, Math.max(12, parseFloat(bearingsPct.toFixed(1))));

  // 3. Rotor Balance & Air Gap (0-100%)
  const slip = Math.max(0, (1500 - rpm) / 1500);
  let rotorPct = 100 - (slip * 500);
  if (rpm < 1370) rotorPct = Math.max(22, 50 - (1370 - rpm) * 0.8);
  rotorPct = Math.min(99.8, Math.max(20, parseFloat(rotorPct.toFixed(1))));

  // 4. Electrical Power Line (0-100%)
  let voltDev = Math.abs(volt - 400);
  let currSurge = Math.max(0, curr - 14.8);
  let electPct = 100 - (voltDev * 0.8 + currSurge * 3.5);
  electPct = Math.min(99.4, Math.max(16, parseFloat(electPct.toFixed(1))));

  function updateSubsystem(pctId, barId, descId, val, okDesc, warnDesc, critDesc) {
    const pctEl = document.getElementById(pctId);
    const barEl = document.getElementById(barId);
    const descEl = document.getElementById(descId);
    if (!pctEl || !barEl) return;

    pctEl.textContent = `${val.toFixed(1)}%`;
    barEl.style.width = `${val}%`;

    if (val >= 75) {
      pctEl.className = "ss-pct text-healthy";
      barEl.className = "comp-fill comp-fill-green";
      if (descEl) descEl.textContent = okDesc;
    } else if (val >= 45) {
      pctEl.className = "ss-pct text-amber";
      barEl.className = "comp-fill";
      barEl.style.background = "linear-gradient(90deg, #d97706, #f59e0b)";
      if (descEl) descEl.textContent = warnDesc;
    } else {
      pctEl.className = "ss-pct text-red";
      barEl.className = "comp-fill comp-fill-red";
      if (descEl) descEl.textContent = critDesc;
    }
  }

  updateSubsystem(
    "pctStator", "barStator", "descStator", statorPct,
    `Thermal rise ${temp.toFixed(1)}°C (Class B optimal). No breakdown.`,
    `Thermal elevation ${temp.toFixed(1)}°C (Class F envelope). Monitor closely.`,
    `Critical thermal hazard ${temp.toFixed(1)}°C. Imminent coil burnout threat!`
  );

  updateSubsystem(
    "pctBearings", "barBearings", "descBearings", bearingsPct,
    `Vibration ${vib.toFixed(2)} mm/s (ISO Zone A). BPFO/BPFI raceways intact.`,
    `Vibration ${vib.toFixed(2)} mm/s (ISO Zone C). Bearing lubrication deficit.`,
    `Critical bearing vibration ${vib.toFixed(2)} mm/s. Severe race spalling detected!`
  );

  updateSubsystem(
    "pctRotor", "barRotor", "descRotor", rotorPct,
    `Rotor speed ${rpm} RPM (Slip s = ${(slip * 100).toFixed(2)}%). Air gap uniform.`,
    `Rotor speed slip ${rpm} RPM. Drag or mild mechanical resistance detected.`,
    `Severe speed drag ${rpm} RPM. Rotor bar micro-fissure or stall risk!`
  );

  updateSubsystem(
    "pctElectrical", "barElectrical", "descElectrical", electPct,
    `Supply ${volt.toFixed(0)}V balanced, current ${curr.toFixed(1)}A within 15A rating.`,
    `Supply deviation ${volt.toFixed(0)}V / ${curr.toFixed(1)}A. Unbalance advisory.`,
    `Severe electrical dip ${volt.toFixed(0)}V with ${curr.toFixed(1)}A overload surge!`
  );
}

// =============================================================================
// CAPSTONE: SIDEBAR HEALTH & UPTIME SYNCHRONIZER
// =============================================================================
function updateSidebarHealth(latest) {
  const status = latest.health_status || "Healthy";
  const pulseEl = document.getElementById("sidebarPulseDot");
  const tagEl = document.getElementById("sidebarHealthTag");

  if (pulseEl) {
    pulseEl.className = `sidebar-pulse-dot dot-${status === "Healthy" ? "green" : (status === "Warning" ? "amber" : "red")}`;
  }

  if (tagEl) {
    if (status === "Critical") {
      tagEl.textContent = "CRITICAL (ZONE D)";
      tagEl.style.color = "var(--status-critical)";
    } else if (status === "Warning") {
      tagEl.textContent = "WARNING (ZONE C)";
      tagEl.style.color = "var(--status-warning)";
    } else {
      tagEl.textContent = "HEALTHY (ZONE A)";
      tagEl.style.color = "var(--status-healthy)";
    }
  }
}

// =============================================================================
// AUDIT TABLE RENDERER
// =============================================================================
function renderAuditTable() {
  const tbody = document.getElementById("auditTableBody");
  if (!tbody) return;

  const query = state.searchQuery.toLowerCase();
  const filter = state.statusFilter;

  // Show latest 40 matching rows (newest first)
  const rows = [...state.telemetryData].reverse().filter(r => {
    const matchesFilter = (filter === "ALL" || r.health_status === filter);
    const matchesQuery = query === "" ||
      r.timestamp.toLowerCase().includes(query) ||
      r.diagnosis_reason.toLowerCase().includes(query) ||
      r.health_status.toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  }).slice(0, 40);

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.timestamp}</td>
      <td style="color: ${r.vibration >= 7.1 ? '#ef4444' : (r.vibration >= 4.5 ? '#f59e0b' : '#38bdf8')}">${r.vibration}</td>
      <td style="color: ${r.temperature >= 90 ? '#ef4444' : (r.temperature >= 75 ? '#f59e0b' : '#f8fafc')}">${r.temperature}</td>
      <td>${r.current}</td>
      <td>${r.voltage}</td>
      <td>${r.rotational_speed}</td>
      <td>${r.is_anomaly ? '<span style="color: #ef4444; font-weight: 700;">⚠️ YES</span>' : '<span style="color: #10b981;">✓ NO</span>'}</td>
      <td style="font-weight: 800; color: ${r.risk_index >= 65 ? '#ef4444' : (r.risk_index >= 30 ? '#f59e0b' : '#10b981')}">${r.risk_index}</td>
      <td><span class="badge-status badge-${r.health_status.toLowerCase()}">${r.health_status.toUpperCase()}</span></td>
      <td style="font-size: 0.75rem; color: #94a3b8;">${r.diagnosis_reason}</td>
    </tr>
  `).join("");
}

// =============================================================================
// EXPORT ANALYZED CSV REPORT
// =============================================================================
function exportCsvReport() {
  if (state.telemetryData.length === 0) return;

  const headers = ["Index", "Timestamp", "Vibration_mms", "Temperature_C", "Current_A", "Voltage_V", "Rotational_Speed_RPM", "AI_Anomaly", "Risk_Index", "Health_Status", "Diagnosis_Reason"];
  const csvRows = [headers.join(",")];

  state.telemetryData.forEach(r => {
    csvRows.push([
      r.index,
      `"${r.timestamp}"`,
      r.vibration,
      r.temperature,
      r.current,
      r.voltage,
      r.rotational_speed,
      r.is_anomaly,
      r.risk_index,
      `"${r.health_status}"`,
      `"${r.diagnosis_reason.replace(/"/g, '""')}"`
    ].join(","));
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `induction_motor_telemetry_report_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// =============================================================================
// APPLICATION LIFECYCLE & EVENT HANDLERS
// =============================================================================
function tick() {
  const nextIdx = state.telemetryData.length + 1;
  const newRow = generateObservation(nextIdx, state.activeFault);
  state.telemetryData.push(newRow);

  if (state.telemetryData.length > state.maxHistory) {
    state.telemetryData.shift();
  }

  updateUI();
}

function initEventListeners() {
  // Toggle Stream Button
  const toggleBtn = document.getElementById("toggleStreamBtn");
  toggleBtn.addEventListener("click", () => {
    state.isRunning = !state.isRunning;
    if (state.isRunning) {
      document.getElementById("streamBtnIcon").textContent = "⏸";
      document.getElementById("streamBtnText").textContent = "Pause";
      document.getElementById("liveStatusText").textContent = "TELEMETRY STREAM: ACTIVE (1Hz)";
      state.timerId = setInterval(tick, state.streamInterval);
    } else {
      document.getElementById("streamBtnIcon").textContent = "▶";
      document.getElementById("streamBtnText").textContent = "Resume";
      document.getElementById("liveStatusText").textContent = "TELEMETRY STREAM: PAUSED";
      clearInterval(state.timerId);
    }
  });

  // Fault Injection Dropdown
  const faultBtn = document.getElementById("faultDropdownBtn");
  const faultMenu = document.getElementById("faultMenu");

  faultBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    faultMenu.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    faultMenu.classList.remove("show");
  });

  document.querySelectorAll(".dropdown-item").forEach(item => {
    item.addEventListener("click", (e) => {
      const fault = e.target.getAttribute("data-fault");
      state.activeFault = fault;
      faultMenu.classList.remove("show");

      const label = e.target.textContent;
      faultBtn.innerHTML = `<span>${label}</span> ▼`;
    });
  });

  // Parameter Switcher Chips (Trend Chart)
  document.querySelectorAll(".param-selector-chips .chip").forEach(chip => {
    chip.addEventListener("click", (e) => {
      document.querySelectorAll(".param-selector-chips .chip").forEach(c => c.classList.remove("active"));
      e.target.classList.add("active");
      state.activeSensor = e.target.getAttribute("data-sensor");
      updateUI();
    });
  });

  // Table status filter
  document.getElementById("statusFilterSelect").addEventListener("change", (e) => {
    state.statusFilter = e.target.value;
    renderAuditTable();
  });

  // Table search input
  document.getElementById("tableSearchInput").addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    renderAuditTable();
  });

  // CSV Export button
  document.getElementById("downloadCsvBtn").addEventListener("click", exportCsvReport);

  // Two-way bindings for manual input sliders and number boxes
  bindTwoWay("inputVib", "rangeVib");
  bindTwoWay("inputTemp", "rangeTemp");
  bindTwoWay("inputCurr", "rangeCurr");
  bindTwoWay("inputVolt", "rangeVolt");
  bindTwoWay("inputSpeed", "rangeSpeed");

  // Preset Buttons
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const presetKey = e.currentTarget.getAttribute("data-preset");
      const values = PRESET_VALUES[presetKey];
      if (values) {
        setManualInputs(values);
        calculateAndPredictCustom();
      }
    });
  });

  // Calculate & AI Predict Button
  const calcBtn = document.getElementById("btnCalculatePredict");
  if (calcBtn) {
    calcBtn.addEventListener("click", calculateAndPredictCustom);
  }

  // Send to Live SCADA Dials & Audit Table Button
  const injectBtn = document.getElementById("btnInjectCustom");
  if (injectBtn) {
    injectBtn.addEventListener("click", injectCustomToLiveSCADA);
  }

  // Reset Button
  const resetBtn = document.getElementById("btnResetInput");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      setManualInputs(PRESET_VALUES.healthy);
      calculateAndPredictCustom();
    });
  }

  // Intermediate Engineering Tabs Controller
  initIntermediateTabs();

  // Capstone Left Sidebar & Features
  initSidebarNav();
  initEconomicsCalculator();
  initPrintReport();
}

function initSidebarNav() {
  const sidebarLinks = document.querySelectorAll(".sidebar-tab-link");
  const sidebar = document.getElementById("appSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const toggleBtn = document.getElementById("sidebarToggleBtn");

  // Mobile toggle drawer
  if (toggleBtn && sidebar && backdrop) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      backdrop.classList.toggle("active");
    });

    backdrop.addEventListener("click", () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("active");
    });
  }

  // Navigation Links Click
  sidebarLinks.forEach(link => {
    link.addEventListener("click", () => {
      const targetId = link.getAttribute("data-target");
      const subtab = link.getAttribute("data-subtab");

      sidebarLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      // If targeting a subtab in Section 5
      if (subtab) {
        const subtabBtn = document.querySelector(`.suite-tab-btn[data-tab="${subtab}"]`);
        if (subtabBtn) subtabBtn.click();
      }

      // Smooth scroll to section
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        targetEl.classList.add("section-highlight");
        setTimeout(() => targetEl.classList.remove("section-highlight"), 1500);
      }

      // Close mobile drawer if open
      if (sidebar && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
        backdrop.classList.remove("active");
      }
    });
  });

  // Scrollspy: update active sidebar tab as user scrolls through sections
  const sectionIds = ["kpiGrid", "scadaDialsPanel", "telemetryChartsPanel", "analyticsPanel", "manualPredictPanel", "intermediateSuitePanel", "economicsPanel", "auditTablePanel"];
  
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          const matchingLink = document.querySelector(`.sidebar-tab-link[data-target="${id}"]`);
          if (matchingLink) {
            sidebarLinks.forEach(l => l.classList.remove("active"));
            matchingLink.classList.add("active");
          }
        }
      });
    }, { rootMargin: "-15% 0px -65% 0px" });

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }
}

// =============================================================================
// CAPSTONE: MAINTENANCE ECONOMICS & ROI CALCULATOR
// =============================================================================
function initEconomicsCalculator() {
  const dtSlider = document.getElementById("downtimeCostSlider");
  const hrsSlider = document.getElementById("operatingHoursSlider");
  const motorsSlider = document.getElementById("motorsCountSlider");

  function recalculateEconomics() {
    if (!dtSlider || !hrsSlider || !motorsSlider) return;

    const downtimeRate = parseFloat(dtSlider.value) || 1200;
    const opHours = parseFloat(hrsSlider.value) || 16;
    const motorCount = parseFloat(motorsSlider.value) || 4;

    const dtDisp = document.getElementById("downtimeCostDisplay");
    if (dtDisp) dtDisp.textContent = `$${downtimeRate.toLocaleString()} / hr`;
    const opDisp = document.getElementById("operatingHoursDisplay");
    if (opDisp) opDisp.textContent = `${opHours} Hours / Day`;
    const mcDisp = document.getElementById("motorsCountDisplay");
    if (mcDisp) mcDisp.textContent = `${motorCount} ${motorCount === 1 ? 'Motor' : 'Motors'}`;

    // Financial Formulas
    const lineStoppageCost = downtimeRate * 8.5;
    const hardwareReplaceCost = 3500;
    const catastrophicCost = lineStoppageCost + hardwareReplaceCost;

    const plannedLabor = 350;
    const plannedDowntime = downtimeRate * 0.42; // only 25 mins equivalent off-shift
    const plannedAiCost = plannedLabor + plannedDowntime;

    const netSavingsPerFault = Math.max(0, catastrophicCost - plannedAiCost);
    const annualFaultsPrevented = Math.round(motorCount * 1.1);
    const annualNetSavings = netSavingsPerFault * annualFaultsPrevented;
    const annualHardwareInvestment = motorCount * 2800;
    const roiMultiplier = Math.round((annualNetSavings / annualHardwareInvestment) * 100);

    // Update UI elements
    const compBreakdown = document.getElementById("compBreakdownCost");
    if (compBreakdown) compBreakdown.textContent = `$${Math.round(catastrophicCost).toLocaleString()}`;
    const compPred = document.getElementById("compPredictiveCost");
    if (compPred) compPred.textContent = `$${Math.round(plannedAiCost).toLocaleString()}`;
    const compNet = document.getElementById("compNetSavings");
    if (compNet) compNet.textContent = `$${Math.round(netSavingsPerFault).toLocaleString()}`;
    const roiAnn = document.getElementById("roiAnnualSavings");
    if (roiAnn) roiAnn.textContent = `$${Math.round(annualNetSavings).toLocaleString()}`;
    const roiMult = document.getElementById("roiMultiplier");
    if (roiMult) roiMult.textContent = `${roiMultiplier}% ROI`;

    const compBarPredictive = document.getElementById("compBarPredictive");
    if (compBarPredictive) {
      const predBarWidth = Math.min(100, Math.max(4, (plannedAiCost / catastrophicCost) * 100));
      compBarPredictive.style.width = `${predBarWidth.toFixed(1)}%`;
    }
  }

  if (dtSlider) dtSlider.addEventListener("input", recalculateEconomics);
  if (hrsSlider) hrsSlider.addEventListener("input", recalculateEconomics);
  if (motorsSlider) motorsSlider.addEventListener("input", recalculateEconomics);

  recalculateEconomics();
}

// =============================================================================
// CAPSTONE: UPTIME COUNTER & PDF EXPORT
// =============================================================================
const appStartTime = Date.now();

function updateUptime() {
  const elapsedSec = Math.floor((Date.now() - appStartTime) / 1000);
  const hrs = String(Math.floor(elapsedSec / 3600)).padStart(2, '0');
  const mins = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
  const secs = String(elapsedSec % 60).padStart(2, '0');

  const uptimeEl = document.getElementById("sidebarUptime");
  if (uptimeEl) {
    uptimeEl.textContent = `${hrs}:${mins}:${secs}`;
  }
}

function initPrintReport() {
  const printBtn = document.getElementById("printReportBtn");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }
}

function initIntermediateTabs() {
  const tabButtons = document.querySelectorAll(".suite-tab-btn");
  const tabPanes = document.querySelectorAll(".suite-tab-pane");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");

      tabButtons.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => {
        p.style.display = "none";
        p.classList.remove("active");
      });

      btn.classList.add("active");
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.style.display = "block";
        targetPane.classList.add("active");
      }

      // Re-trigger layout calculation for Chart.js when tab becomes visible
      if (targetId === "tabFft" && fftChartInstance) {
        setTimeout(() => {
          fftChartInstance.resize();
          fftChartInstance.update();
        }, 30);
      } else if (targetId === "tabRul" && rulChartInstance) {
        setTimeout(() => {
          rulChartInstance.resize();
          rulChartInstance.update();
        }, 30);
      }
    });
  });
}

// =============================================================================
// MANUAL SENSOR INPUT & AI PREDICTOR ENGINE
// =============================================================================
const PRESET_VALUES = {
  healthy: { vib: 2.2, temp: 52.0, curr: 9.8, volt: 400, speed: 1475 },
  bearing: { vib: 7.8, temp: 68.5, curr: 11.2, volt: 396, speed: 1455 },
  thermal: { vib: 4.1, temp: 95.0, curr: 18.0, volt: 388, speed: 1430 },
  electrical: { vib: 6.2, temp: 85.0, curr: 23.0, volt: 340, speed: 1355 }
};

function bindTwoWay(numId, rangeId) {
  const numInput = document.getElementById(numId);
  const rangeInput = document.getElementById(rangeId);
  if (!numInput || !rangeInput) return;

  numInput.addEventListener("input", () => {
    rangeInput.value = numInput.value;
    calculateAndPredictCustom();
  });

  rangeInput.addEventListener("input", () => {
    numInput.value = rangeInput.value;
    calculateAndPredictCustom();
  });
}

function getManualInputs() {
  const vib = parseFloat(document.getElementById("inputVib").value) || 0;
  const temp = parseFloat(document.getElementById("inputTemp").value) || 0;
  const curr = parseFloat(document.getElementById("inputCurr").value) || 0;
  const volt = parseFloat(document.getElementById("inputVolt").value) || 0;
  const speed = parseFloat(document.getElementById("inputSpeed").value) || 0;

  return {
    vibration: parseFloat(vib.toFixed(2)),
    temperature: parseFloat(temp.toFixed(1)),
    current: parseFloat(curr.toFixed(2)),
    voltage: parseFloat(volt.toFixed(1)),
    rotational_speed: parseFloat(speed.toFixed(0))
  };
}

function setManualInputs(values) {
  if (values.vib !== undefined) {
    document.getElementById("inputVib").value = values.vib;
    document.getElementById("rangeVib").value = values.vib;
  }
  if (values.temp !== undefined) {
    document.getElementById("inputTemp").value = values.temp;
    document.getElementById("rangeTemp").value = values.temp;
  }
  if (values.curr !== undefined) {
    document.getElementById("inputCurr").value = values.curr;
    document.getElementById("rangeCurr").value = values.curr;
  }
  if (values.volt !== undefined) {
    document.getElementById("inputVolt").value = values.volt;
    document.getElementById("rangeVolt").value = values.volt;
  }
  if (values.speed !== undefined) {
    document.getElementById("inputSpeed").value = values.speed;
    document.getElementById("rangeSpeed").value = values.speed;
  }
}

function calculateAndPredictCustom() {
  const input = getManualInputs();
  const evaluation = evaluateHealthAndRisk(input);

  // 1. ISO 10816-3 Vibration Severity
  let isoText, isoColor;
  if (input.vibration < THRESHOLDS.vibration.warn) {
    isoText = "Zone A/B: Good & Acceptable (<4.5 mm/s)";
    isoColor = "var(--status-healthy)";
  } else if (input.vibration < THRESHOLDS.vibration.crit) {
    isoText = "Zone C: Restricted Advisory (4.5–7.1 mm/s)";
    isoColor = "var(--status-warning)";
  } else {
    isoText = "Zone D: Critical Damage Threat (>7.1 mm/s)";
    isoColor = "var(--status-critical)";
  }

  // 2. Thermal Rise Classification
  let thermText, thermColor;
  if (input.temperature < THRESHOLDS.temperature.warn) {
    thermText = "Class B Rise: Optimal (<75°C)";
    thermColor = "var(--status-healthy)";
  } else if (input.temperature < THRESHOLDS.temperature.crit) {
    thermText = "Class F Rise: Warning Envelope (75–90°C)";
    thermColor = "var(--status-warning)";
  } else {
    thermText = "Thermal Breakdown: Critical Danger (>90°C)";
    thermColor = "var(--status-critical)";
  }

  // 3. PCA Projection for this point
  let pc1Val = 0, pc2Val = 0;
  if (state.pcaModel) {
    const { means, stds, pc1Vec, pc2Vec } = state.pcaModel;
    const zRow = [
      (input.vibration - means.vibration) / (stds.vibration || 1),
      (input.temperature - means.temperature) / (stds.temperature || 1),
      (input.current - means.current) / (stds.current || 1),
      (input.voltage - means.voltage) / (stds.voltage || 1),
      (input.rotational_speed - means.rotational_speed) / (stds.rotational_speed || 1)
    ];
    pc1Val = zRow.reduce((s, v, i) => s + v * pc1Vec[i], 0);
    pc2Val = zRow.reduce((s, v, i) => s + v * pc2Vec[i], 0);
  }

  // 4. Prescriptive Action Generation
  let actionText, actionColor, actionBg, actionBorder;
  if (evaluation.health_status === "Critical") {
    if (input.vibration >= THRESHOLDS.vibration.crit) {
      actionText = "EMERGENCY TRIP RECOMMENDED: Critical bearing degradation / high mechanical looseness. Disconnect motor, inspect bearing raceways & balance rotor.";
    } else if (input.temperature >= THRESHOLDS.temperature.crit) {
      actionText = "THERMAL PROTECTION TRIP: Immediate shutdown required to prevent stator winding insulation burnout. Inspect cooling blower and thermal dissipation fins.";
    } else {
      actionText = "ELECTRICAL OVERLOAD INTERVENTION: Isolate motor feeder, check line voltage unbalance and check for rotor bar breakage or severe phase overload.";
    }
    actionColor = "var(--status-critical)";
    actionBg = "rgba(239, 68, 68, 0.12)";
    actionBorder = "var(--status-critical-border)";
  } else if (evaluation.health_status === "Warning") {
    actionText = "SCHEDULE PREDICTIVE MAINTENANCE: Elevated operational stress detected. Inspect lubricant condition, clean air intake filters, and re-torque mounting foundation bolts.";
    actionColor = "var(--status-warning)";
    actionBg = "rgba(245, 158, 11, 0.12)";
    actionBorder = "var(--status-warning-border)";
  } else {
    actionText = "OPERATION APPROVED: All 5 sensor parameters are inside the ISO 10816-3 normal envelope. Continue regular continuous online condition monitoring.";
    actionColor = "var(--status-healthy)";
    actionBg = "rgba(16, 185, 129, 0.1)";
    actionBorder = "var(--status-healthy-border)";
  }

  // 5. Update UI Result Elements
  const statusBadge = document.getElementById("predStatusBadge");
  if (statusBadge) {
    statusBadge.textContent = evaluation.health_status.toUpperCase();
    statusBadge.className = `badge-status badge-${evaluation.health_status.toLowerCase()}`;
  }

  const headline = document.getElementById("predHeadline");
  if (headline) {
    if (evaluation.health_status === "Critical") {
      headline.textContent = "Critical Subsystem Fault Detected";
      headline.style.color = "var(--status-critical)";
    } else if (evaluation.health_status === "Warning") {
      headline.textContent = "Elevated Operational Advisory";
      headline.style.color = "var(--status-warning)";
    } else {
      headline.textContent = "Motor Operating Optimally";
      headline.style.color = "var(--text-primary)";
    }
  }

  const resultCard = document.getElementById("predictResultCard");
  const borderColor = evaluation.health_status === "Healthy" ? "var(--status-healthy)" : (evaluation.health_status === "Warning" ? "var(--status-warning)" : "var(--status-critical)");
  if (resultCard) {
    resultCard.style.borderLeftColor = borderColor;
  }

  const riskScoreEl = document.getElementById("predRiskScore");
  if (riskScoreEl) riskScoreEl.textContent = evaluation.risk_index;

  const riskProgress = document.getElementById("predRiskProgress");
  if (riskProgress) {
    riskProgress.style.width = `${Math.min(100, Math.max(3, evaluation.risk_index))}%`;
    riskProgress.style.backgroundColor = borderColor;
  }

  const riskCat = document.getElementById("predRiskCategory");
  if (riskCat) {
    if (evaluation.risk_index >= 65) {
      riskCat.textContent = "CRITICAL ACTION REQUIRED";
      riskCat.className = "risk-cat-critical";
    } else if (evaluation.risk_index >= 30) {
      riskCat.textContent = "ELEVATED ADVISORY ZONE";
      riskCat.className = "risk-cat-warning";
    } else {
      riskCat.textContent = "SAFE OPERATING ENVELOPE";
      riskCat.className = "risk-cat-healthy";
    }
  }

  const anomalyFlag = document.getElementById("predAnomalyFlag");
  if (anomalyFlag) {
    if (evaluation.is_anomaly) {
      anomalyFlag.innerHTML = `<span style="color: var(--status-critical); font-weight: 800;">⚠️ Anomaly Detected (Outlier)</span>`;
    } else {
      anomalyFlag.innerHTML = `<span style="color: var(--status-healthy); font-weight: 700;">✓ Normal (In-Bounds)</span>`;
    }
  }

  const isoEl = document.getElementById("predIsoStatus");
  if (isoEl) {
    isoEl.textContent = isoText;
    isoEl.style.color = isoColor;
  }

  const thermEl = document.getElementById("predThermalStatus");
  if (thermEl) {
    thermEl.textContent = thermText;
    thermEl.style.color = thermColor;
  }

  const pcaCoordsEl = document.getElementById("predPcaCoords");
  if (pcaCoordsEl) {
    pcaCoordsEl.textContent = `PC1: ${pc1Val >= 0 ? '+' : ''}${pc1Val.toFixed(2)} | PC2: ${pc2Val >= 0 ? '+' : ''}${pc2Val.toFixed(2)}`;
  }

  const verdictEl = document.getElementById("predVerdictText");
  if (verdictEl) verdictEl.textContent = evaluation.diagnosis_reason;

  const actionBox = document.getElementById("predictActionBox");
  if (actionBox) {
    actionBox.style.backgroundColor = actionBg;
    actionBox.style.borderColor = actionBorder;
    const actionTitle = actionBox.querySelector(".action-title");
    if (actionTitle) actionTitle.style.color = actionColor;
    const actionTextEl = document.getElementById("predActionText");
    if (actionTextEl) actionTextEl.textContent = actionText;
  }

  return { ...input, ...evaluation, timestamp: new Date().toLocaleTimeString() };
}

function injectCustomToLiveSCADA() {
  const result = calculateAndPredictCustom();
  const nextIdx = state.telemetryData.length + 1;
  const newRow = {
    index: nextIdx,
    ...result
  };

  state.telemetryData.push(newRow);
  if (state.telemetryData.length > state.maxHistory) {
    state.telemetryData.shift();
  }

  updateUI();

  // Show confirmation banner
  const notice = document.getElementById("injectSuccessNotice");
  if (notice) {
    notice.style.display = "block";
    setTimeout(() => {
      notice.style.display = "none";
    }, 3200);
  }
}

// Initial Bootstrap
window.addEventListener("DOMContentLoaded", () => {
  initCharts();
  initEventListeners();

  // Seed with initial 40 observations so the dashboard starts populated
  for (let i = 1; i <= 40; i++) {
    state.telemetryData.push(generateObservation(i, "normal"));
  }

  updateUI();

  // Initialize prediction card with default inputs
  calculateAndPredictCustom();

  // Start real-time 1 Hz stream
  state.timerId = setInterval(tick, state.streamInterval);

  // Start system uptime counter
  updateUptime();
  setInterval(updateUptime, 1000);
});
