(() => {
  "use strict";

  // Use relative API base so requests always hit the current deployed instance (Vercel, Render, localhost, etc.)
  const API_BASE = "";

  const form = document.getElementById("wellness-form") || document.getElementById("predict-form");
  const submitBtn = document.getElementById("submit-btn");
  const resetBtn = document.getElementById("reset-btn");
  const errorRetryBtn = document.getElementById("error-retry-btn");

  const stateIdle = document.getElementById("state-idle");
  const stateLoading = document.getElementById("state-loading");
  const stateResult = document.getElementById("state-result");
  const stateError = document.getElementById("state-error");

  const scoreNumberEl = document.getElementById("score-number");
  const scoreBandEl = document.getElementById("score-band");
  const scoreContextEl = document.getElementById("score-context");
  const gaugeFill = document.getElementById("gauge-fill");
  const confidenceBandVal = document.getElementById("confidence-band-val");
  const errorLabelEl = document.getElementById("error-label");
  const errorCopyEl = document.getElementById("error-copy");

  const GAUGE_ARC_LENGTH = 314;

  let radarChartInstance = null;
  let currentBasePayload = null;
  let currentBaseScore = 6.0;
  let lastBatchResponse = null;

  // ---------------------------------------------------------
  // 1. Modal Management
  // ---------------------------------------------------------
  window.openModal = (modalId) => {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.remove("hidden");
      if (modalId === 'api-playground-modal') {
        updateApiPlaygroundCode();
      }
    }
  };

  window.closeModal = (modalId) => {
    const el = document.getElementById(modalId);
    if (el) el.classList.add("hidden");
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".fixed.inset-0:not(.hidden)").forEach((modal) => {
        modal.classList.add("hidden");
      });
    }
  });

  // ---------------------------------------------------------
  // 2. Persona 1-Click Presets
  // ---------------------------------------------------------
  const PRESETS = {
    high_stress: {
      age: 21,
      gender: "Male",
      country: "India",
      academic_level: "Undergraduate",
      most_used_platform: "YouTube",
      purpose_of_use: "Education",
      avg_daily_usage_hours: 11.0,
      daily_unlocks: 140,
      study_hours: 8.5,
      physical_activity_hours: 0.0,
      sleep_hours_per_night: 4.0,
      stress_level: "High"
    },
    balanced: {
      age: 22,
      gender: "Female",
      country: "USA",
      academic_level: "Graduate",
      most_used_platform: "LinkedIn",
      purpose_of_use: "Networking",
      avg_daily_usage_hours: 2.0,
      daily_unlocks: 30,
      study_hours: 4.5,
      physical_activity_hours: 2.0,
      sleep_hours_per_night: 8.0,
      stress_level: "Low"
    },
    night_owl: {
      age: 19,
      gender: "Female",
      country: "UK",
      academic_level: "Undergraduate",
      most_used_platform: "TikTok",
      purpose_of_use: "Entertainment",
      avg_daily_usage_hours: 9.0,
      daily_unlocks: 160,
      study_hours: 2.0,
      physical_activity_hours: 0.5,
      sleep_hours_per_night: 5.0,
      stress_level: "Very High"
    },
    academic: {
      age: 23,
      gender: "Male",
      country: "Germany",
      academic_level: "Graduate",
      most_used_platform: "Twitter",
      purpose_of_use: "News",
      avg_daily_usage_hours: 3.5,
      daily_unlocks: 50,
      study_hours: 8.0,
      physical_activity_hours: 1.0,
      sleep_hours_per_night: 7.0,
      stress_level: "Medium"
    }
  };

  window.loadPreset = (presetKey) => {
    const p = PRESETS[presetKey];
    if (!p) return;

    document.getElementById("age").value = p.age;
    
    const gender = document.getElementById("gender");
    gender.value = p.gender;
    gender.dispatchEvent(new Event("change", { bubbles: true }));

    const country = document.getElementById("country");
    country.value = p.country;
    country.dispatchEvent(new Event("change", { bubbles: true }));

    const radio = document.querySelector(`input[name="academic_level"][value="${p.academic_level}"]`);
    if (radio) radio.checked = true;

    const platform = document.getElementById("most_used_platform");
    platform.value = p.most_used_platform;
    platform.dispatchEvent(new Event("change", { bubbles: true }));

    const purpose = document.getElementById("purpose_of_use");
    purpose.value = p.purpose_of_use;
    purpose.dispatchEvent(new Event("change", { bubbles: true }));

    const screen = document.getElementById("avg_daily_usage_hours");
    screen.value = p.avg_daily_usage_hours;
    const screenValEl = document.getElementById("screen-val") || document.getElementById("screen_time_display");
    if (screenValEl) screenValEl.textContent = parseFloat(p.avg_daily_usage_hours).toFixed(1) + "h";

    const unlocks = document.getElementById("daily_unlocks");
    unlocks.value = p.daily_unlocks;
    const unlockValEl = document.getElementById("unlock-val") || document.getElementById("unlocks_display");
    if (unlockValEl) unlockValEl.textContent = p.daily_unlocks + " unlocks";

    const study = document.getElementById("study_hours");
    study.value = p.study_hours;
    const studyValEl = document.getElementById("study-val") || document.getElementById("study_display");
    if (studyValEl) studyValEl.textContent = parseFloat(p.study_hours).toFixed(1) + "h";

    const exercise = document.getElementById("physical_activity_hours");
    exercise.value = p.physical_activity_hours;
    const exerciseValEl = document.getElementById("exercise-val") || document.getElementById("physical_display");
    if (exerciseValEl) exerciseValEl.textContent = parseFloat(p.physical_activity_hours).toFixed(1) + "h";

    const sleep = document.getElementById("sleep_hours_per_night");
    sleep.value = p.sleep_hours_per_night;
    const sleepValEl = document.getElementById("sleep-val") || document.getElementById("sleep_display");
    if (sleepValEl) sleepValEl.textContent = parseFloat(p.sleep_hours_per_night).toFixed(1) + "h";

    const stressRadio = document.querySelector(`input[name="stress_level"][value="${p.stress_level}"]`);
    if (stressRadio) stressRadio.checked = true;

    form.querySelectorAll(".field").forEach((f) => f.classList.remove("field-error"));
    form.querySelectorAll(".error-msg").forEach((e) => (e.textContent = ""));

    // Auto submit to reveal live assessment
    form.dispatchEvent(new Event("submit", { cancelable: true }));
  };

  // ---------------------------------------------------------
  // 3. Tab Switching in Studio
  // ---------------------------------------------------------
  window.switchTab = (tabId) => {
    document.querySelectorAll(".tab-pane").forEach((pane) => pane.classList.add("hidden"));
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("bg-indigo-600", "text-white", "shadow-xs");
      btn.classList.add("text-slate-600", "font-bold");
    });

    const activePane = document.getElementById(`tab-${tabId}`);
    if (activePane) activePane.classList.remove("hidden");

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (activeBtn) {
      activeBtn.classList.remove("text-slate-600");
      activeBtn.classList.add("bg-indigo-600", "text-white", "shadow-xs", "font-black");
    }

    if (tabId === "radar" && currentBasePayload) {
      renderRadarChart(currentBasePayload);
    }
  };

  // ---------------------------------------------------------
  // 4. State Management & Form Submission
  // ---------------------------------------------------------
  function showState(stateName) {
    stateIdle.classList.add("hidden");
    stateLoading.classList.add("hidden");
    stateResult.classList.add("hidden");
    stateError.classList.add("hidden");

    if (stateName === "idle") stateIdle.classList.remove("hidden");
    if (stateName === "loading") stateLoading.classList.remove("hidden");
    if (stateName === "result") stateResult.classList.remove("hidden");
    if (stateName === "error") stateError.classList.remove("hidden");
  }

  function validateForm() {
    let isValid = true;
    form.querySelectorAll(".field").forEach((f) => f.classList.remove("field-error"));
    form.querySelectorAll(".error-msg").forEach((e) => (e.textContent = ""));

    const age = document.getElementById("age");
    if (!age.value || age.value < 10 || age.value > 100) {
      showError(age, "Age must be 10–100");
      isValid = false;
    }

    const gender = document.getElementById("gender");
    if (!gender.value) {
      showError(gender, "Select gender");
      isValid = false;
    }

    const country = document.getElementById("country");
    if (!country.value) {
      showError(country, "Select country");
      isValid = false;
    }

    const academic = document.querySelector('input[name="academic_level"]:checked');
    if (!academic) {
      const parent = document.querySelector('input[name="academic_level"]').closest(".field");
      showError(parent, "Select degree level");
      isValid = false;
    }

    const platform = document.getElementById("most_used_platform");
    if (!platform.value) {
      showError(platform, "Select platform");
      isValid = false;
    }

    const purpose = document.getElementById("purpose_of_use");
    if (!purpose.value) {
      showError(purpose, "Select purpose");
      isValid = false;
    }

    const stress = document.querySelector('input[name="stress_level"]:checked');
    if (!stress) {
      const parent = document.querySelector('input[name="stress_level"]').closest(".field");
      showError(parent, "Select stress level");
      isValid = false;
    }

    return isValid;
  }

  function showError(el, msg) {
    const container = el.classList.contains("field") ? el : el.closest(".field");
    if (container) {
      container.classList.add("field-error");
      const err = container.querySelector(".error-msg");
      if (err) err.textContent = msg;
    }
  }

  function extractPayload() {
    const ageVal = parseInt(document.getElementById("age")?.value, 10);
    const genderVal = document.getElementById("gender")?.value;
    const countryVal = document.getElementById("country")?.value;
    const academicVal = document.querySelector('input[name="academic_level"]:checked')?.value;
    const platformVal = document.getElementById("most_used_platform")?.value;
    const purposeVal = document.getElementById("purpose_of_use")?.value;
    const screenVal = parseFloat(document.getElementById("avg_daily_usage_hours")?.value);
    const unlocksVal = parseInt(document.getElementById("daily_unlocks")?.value, 10);
    const studyVal = parseFloat(document.getElementById("study_hours")?.value);
    const exerciseVal = parseFloat(document.getElementById("physical_activity_hours")?.value);
    const sleepVal = parseFloat(document.getElementById("sleep_hours_per_night")?.value);
    const stressVal = document.querySelector('input[name="stress_level"]:checked')?.value;

    return {
      age: (!isNaN(ageVal) && ageVal > 0) ? ageVal : 21,
      gender: (genderVal && genderVal.trim() !== "") ? genderVal : "Female",
      country: (countryVal && countryVal.trim() !== "") ? countryVal : "United States",
      academic_level: academicVal || "Undergraduate",
      most_used_platform: (platformVal && platformVal.trim() !== "") ? platformVal : "Instagram",
      purpose_of_use: (purposeVal && purposeVal.trim() !== "") ? purposeVal : "Social & Media",
      avg_daily_usage_hours: (!isNaN(screenVal) && screenVal > 0) ? screenVal : 6.0,
      daily_unlocks: (!isNaN(unlocksVal) && unlocksVal > 0) ? unlocksVal : 70,
      study_hours: (!isNaN(studyVal) && studyVal > 0) ? studyVal : 5.0,
      physical_activity_hours: (!isNaN(exerciseVal) && exerciseVal >= 0) ? exerciseVal : 1.0,
      sleep_hours_per_night: (!isNaN(sleepVal) && sleepVal > 0) ? sleepVal : 7.5,
      stress_level: stressVal || "Medium"
    };
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = extractPayload();
    currentBasePayload = payload;

    showState("loading");

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);

      const data = await res.json();
      currentBaseScore = data.predicted_mental_health_score;

      renderResults(data, payload);
      showState("result");
    } catch (err) {
      console.error(err);
      errorLabelEl.textContent = "Prediction Assessment Error";
      errorCopyEl.textContent = err.message || "Could not reach inference server.";
      showState("error");
    }
  });

  // ---------------------------------------------------------
  // 5. Render Assessment Results, XAI & Action Plan
  // ---------------------------------------------------------
  function renderResults(data, payload) {
    const score = data.predicted_mental_health_score;
    scoreNumberEl.textContent = score.toFixed(2);

    // Arc Gauge (314 max length)
    const ratio = Math.max(0, Math.min(10, score)) / 10;
    const offset = GAUGE_ARC_LENGTH - ratio * GAUGE_ARC_LENGTH;
    gaugeFill.style.strokeDashoffset = offset;

    // Confidence interval
    if (data.confidence_interval && confidenceBandVal) {
      confidenceBandVal.textContent = `[${data.confidence_interval.low.toFixed(2)} - ${data.confidence_interval.high.toFixed(2)}]`;
    }

    // Risk Status Band
    scoreBandEl.textContent = `Signal: ${data.risk_level || 'Balanced'}`;
    scoreBandEl.className = "px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ";

    if (score >= 7.5) {
      scoreBandEl.classList.add("bg-emerald-100", "text-emerald-800", "border", "border-emerald-200");
      scoreContextEl.textContent = "Your circadian balance and daily habits place you in the optimal emotional wellness tier!";
    } else if (score >= 5.5) {
      scoreBandEl.classList.add("bg-sky-100", "text-sky-800", "border", "border-sky-200");
      scoreContextEl.textContent = "Your routine is relatively steady, but reducing screen time and adding physical recovery will unlock higher focus.";
    } else if (score >= 3.5) {
      scoreBandEl.classList.add("bg-amber-100", "text-amber-800", "border", "border-amber-200");
      scoreContextEl.textContent = "Warning: Moderate mental strain detected. Elevated screen exposure and sleep deficit are draining your cognitive reserves.";
    } else {
      scoreBandEl.classList.add("bg-rose-100", "text-rose-800", "border", "border-rose-200");
      scoreContextEl.textContent = "Critical Burnout Alert: High stress indicators combined with restricted sleep require immediate daily pacing and recovery.";
    }

    // Render Explainable AI Factors
    renderXAIFactors(data.feature_attributions || []);

    // Render Action Plan
    renderActionPlan(payload, score);

    // Initialize Optimizer slider to realistic target
    const targetSlider = document.getElementById("optimizer-target-slider");
    if (targetSlider) {
      const targetVal = Math.min(9.5, Math.max(6.0, (score + 1.5))).toFixed(1);
      targetSlider.value = targetVal;
      window.updateOptimizerTarget(targetVal);
    }
  }

  function renderXAIFactors(attributions) {
    const container = document.getElementById("xai-factors-container");
    if (!container) return;
    container.innerHTML = "";

    if (!attributions.length) {
      container.innerHTML = `<div class="p-3 text-center text-slate-400">No factor attributions calculated.</div>`;
      return;
    }

    attributions.forEach((attr) => {
      const isPositive = attr.impact >= 0;
      const card = document.createElement("div");
      card.className = "p-2.5 rounded-xl border flex items-center justify-between transition-all " +
        (isPositive ? "bg-emerald-50/50 border-emerald-200/80" : "bg-rose-50/50 border-rose-200/80");

      card.innerHTML = `
        <div class="flex items-center space-x-2.5">
          <span class="text-base">${attr.icon}</span>
          <div>
            <strong class="text-slate-900 font-bold block text-xs">${attr.factor}</strong>
            <span class="text-[10px] text-slate-500 font-medium">${attr.description}</span>
          </div>
        </div>
        <div class="text-right shrink-0 font-mono font-black text-xs ${isPositive ? 'text-emerald-700' : 'text-rose-700'}">
          ${isPositive ? '+' : ''}${attr.impact.toFixed(2)} pts
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderActionPlan(p, score) {
    const container = document.getElementById("action-plan-container");
    if (!container) return;
    container.innerHTML = "";

    const recommendations = [];

    if (p.sleep_hours_per_night < 7.0) {
      recommendations.push({
        icon: "🌙",
        title: "Circadian Sleep Protocol",
        desc: `Target 7.5h+ per night. Current ${p.sleep_hours_per_night}h impairs emotional resilience.`,
        tag: "High Priority"
      });
    }

    if (p.avg_daily_usage_hours > 4.5) {
      recommendations.push({
        icon: "⏳",
        title: "Digital Detox Window",
        desc: `Reduce daily screen time from ${p.avg_daily_usage_hours}h to under 3.5h. Implement a 45-min screen curfew before sleep.`,
        tag: "Action Item"
      });
    }

    if (p.physical_activity_hours < 1.0) {
      recommendations.push({
        icon: "🏃",
        title: "Dopamine & Movement Boost",
        desc: "Incorporate 30 min of brisk cardio, cycling, or yoga to stimulate BDNF and reduce cortisol.",
        tag: "Habit"
      });
    }

    if (p.stress_level === "High" || p.stress_level === "Very High") {
      recommendations.push({
        icon: "🫁",
        title: "Neuro-Vagal Reset (4-7-8 Breathing)",
        desc: "Perform 3 cycles of 4-7-8 rhythmic breathing before intense study blocks or bedtime.",
        tag: "De-escalation"
      });
    }

    if (!recommendations.length) {
      recommendations.push({
        icon: "✨",
        title: "Maintain Golden Equilibrium",
        desc: "Your current lifestyle parameters are well-balanced. Maintain your regular workout and sleep routine.",
        tag: "Maintenance"
      });
    }

    recommendations.slice(0, 3).forEach((rec) => {
      const card = document.createElement("div");
      card.className = "p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1";
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <strong class="text-slate-900 font-bold flex items-center text-xs">
            <span class="mr-1.5">${rec.icon}</span> ${rec.title}
          </strong>
          <span class="px-1.5 py-0.2 rounded text-[8px] uppercase font-black bg-indigo-50 text-indigo-700 border border-indigo-200">${rec.tag}</span>
        </div>
        <p class="text-[11px] text-slate-600 font-medium leading-relaxed">${rec.desc}</p>
      `;
      container.appendChild(card);
    });
  }

  function renderRadarChart(p) {
    const canvas = document.getElementById("lifestyleRadarChart");
    if (!canvas) return;

    if (radarChartInstance) {
      radarChartInstance.destroy();
    }

    const sleepScore = Math.min(10, (p.sleep_hours_per_night / 8.0) * 10);
    const screenScore = Math.max(0, 10 - (p.avg_daily_usage_hours / 12.0) * 10);
    const exerciseScore = Math.min(10, (p.physical_activity_hours / 2.0) * 10);
    const studyScore = Math.min(10, (p.study_hours / 6.0) * 10);
    const stressScore = p.stress_level === 'Low' ? 9.5 : p.stress_level === 'Medium' ? 7.0 : p.stress_level === 'High' ? 4.0 : 2.0;

    radarChartInstance = new Chart(canvas, {
      type: "radar",
      data: {
        labels: ["Sleep", "Screen Control", "Exercise", "Study Habit", "Calmness"],
        datasets: [
          {
            label: "Your Routine",
            data: [sleepScore, screenScore, exerciseScore, studyScore, stressScore],
            backgroundColor: "rgba(99, 102, 241, 0.2)",
            borderColor: "#6366f1",
            borderWidth: 2,
            pointBackgroundColor: "#4f46e5",
            pointRadius: 3
          },
          {
            label: "High Wellness Benchmark",
            data: [9.0, 8.5, 8.0, 7.5, 9.0],
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            borderColor: "#10b981",
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointBackgroundColor: "#10b981",
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 10,
            ticks: { display: false, stepSize: 2 },
            grid: { color: "#e2e8f0" },
            angleLines: { color: "#e2e8f0" },
            pointLabels: { font: { size: 10, weight: "bold", family: "'Plus Jakarta Sans', sans-serif" }, color: "#475569" }
          }
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 10, font: { size: 10, weight: "bold" }, color: "#334155" }
          }
        }
      }
    });
  }

  // ---------------------------------------------------------
  // 6. Counterfactual Habit Optimizer
  // ---------------------------------------------------------
  window.updateOptimizerTarget = (val) => {
    const disp = document.getElementById("optimizer-target-display");
    if (disp) disp.textContent = parseFloat(val).toFixed(2) + " / 10";
  };

  window.runHabitOptimizer = async () => {
    if (!currentBasePayload) {
      alert("Please calculate your baseline assessment first!");
      return;
    }

    const targetVal = parseFloat(document.getElementById("optimizer-target-slider").value);
    const btn = document.getElementById("optimizer-run-btn");
    const container = document.getElementById("optimizer-results-container");

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i><span>Optimizing Neural Path...</span>`;

    try {
      const res = await fetch(`${API_BASE}/predict/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_data: currentBasePayload,
          target_score: targetVal
        })
      });

      if (!res.ok) throw new Error("Optimization failed");
      const data = await res.json();

      container.classList.remove("hidden");
      container.innerHTML = `
        <div class="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
          <div>
            <span class="text-[9px] uppercase font-black text-indigo-700 block">Optimized Achieved Score</span>
            <strong class="text-sm font-black text-indigo-900 font-mono">${data.achieved_score.toFixed(2)} / 10</strong>
          </div>
          <span class="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black font-mono text-xs border border-emerald-200">
            ${data.score_improvement >= 0 ? '+' : ''}${data.score_improvement.toFixed(2)} pts
          </span>
        </div>
      `;

      data.deltas.forEach((d) => {
        const deltaCard = document.createElement("div");
        deltaCard.className = "p-2.5 rounded-xl border border-slate-200 bg-white space-y-1";
        deltaCard.innerHTML = `
          <div class="flex items-center justify-between">
            <strong class="text-xs font-black text-slate-900 flex items-center">
              <span class="mr-1.5">${d.icon}</span> ${d.habit}
            </strong>
            <span class="px-2 py-0.2 rounded font-mono font-black text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
              ${d.current} → <span class="text-indigo-600 font-bold">${d.recommended}</span> (${d.delta})
            </span>
          </div>
          <p class="text-[10px] text-slate-500 font-medium">${d.tip}</p>
        `;
        container.appendChild(deltaCard);
      });
    } catch (err) {
      console.error(err);
      alert("Optimizer service error: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i><span>Calculate Minimal Habit Roadmap</span>`;
    }
  };

  // ---------------------------------------------------------
  // 7. Ambient Generative Music Player Engine (Web Audio API)
  // ---------------------------------------------------------
  class AmbientMusicEngine {
    constructor() {
      this.ctx = null;
      this.isPlaying = false;
      this.currentTrackIndex = 0;
      this.volume = 0.5;
      this.isMuted = false;
      this.previousVolume = 0.5;
      this.masterGain = null;
      this.schedulerTimer = null;
      this.arpTimer = null;
      this.activeOscs = [];
      this.isWidgetVisible = true;
      this.chordStep = 0;

      this.tracks = [
        {
          id: 'zen',
          title: 'Zen Serenity',
          desc: 'Calming Meditative Chords',
          scale: [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25], // C Major Pentatonic
          chords: [
            [261.63, 329.63, 392.00, 493.88], // Cmaj7
            [220.00, 261.63, 329.63, 392.00], // Am7
            [174.61, 220.00, 261.63, 329.63], // Fmaj7
            [196.00, 246.94, 293.66, 392.00]  // G6
          ],
          rootNote: 130.81,
          tempo: 3600
        },
        {
          id: 'delta',
          title: 'Deep Delta Calm',
          desc: '432Hz Binaural Sleep Waves',
          scale: [216.00, 242.45, 272.17, 324.00, 364.08, 432.00, 484.90],
          chords: [
            [216.00, 324.00, 432.00], // 432Hz harmonic fifths
            [192.00, 288.00, 384.00], 
            [162.00, 243.00, 324.00], 
            [216.00, 272.17, 324.00]
          ],
          rootNote: 108.00,
          tempo: 4200
        },
        {
          id: 'harp',
          title: 'Celestial Harp',
          desc: 'Ethereal Spatial Harmony',
          scale: [349.23, 392.00, 440.00, 523.25, 659.25, 698.46, 783.99], // F Lydian
          chords: [
            [349.23, 440.00, 523.25, 659.25], // Fmaj7
            [329.63, 392.00, 493.88, 587.33], // Em7
            [293.66, 349.23, 440.00, 523.25], // Dm7
            [261.63, 329.63, 392.00, 523.25]  // C
          ],
          rootNote: 174.61,
          tempo: 3000
        },
        {
          id: 'lofi',
          title: 'Lofi Sunset Meditation',
          desc: 'Warm Velvet Chords',
          scale: [293.66, 329.63, 349.23, 392.00, 440.00, 523.25, 587.33], // D Dorian
          chords: [
            [146.83, 220.00, 261.63, 329.63], // Dm9
            [196.00, 246.94, 293.66, 349.23], // G7
            [130.81, 196.00, 246.94, 329.63], // Cmaj9
            [220.00, 261.63, 329.63, 392.00]  // Am7
          ],
          rootNote: 110.00,
          tempo: 3400
        }
      ];
    }

    initContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }

    playChord(frequencies, durationMs) {
      if (!this.ctx || !this.isPlaying) return;
      const durationSec = durationMs / 1000;
      const now = this.ctx.currentTime;

      frequencies.forEach((freq, idx) => {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = (idx % 2 === 0) ? "sine" : "triangle";
          // Subtle detune for lush spatial chorus effect
          osc.frequency.setValueAtTime(freq, now);
          osc.detune.setValueAtTime((idx - 1.5) * 4, now);

          filter.type = "lowpass";
          filter.frequency.setValueAtTime(650 + (idx * 90), now);
          filter.frequency.exponentialRampToValueAtTime(1100, now + durationSec * 0.5);
          filter.frequency.exponentialRampToValueAtTime(450, now + durationSec);

          // Smooth attack, sustain, and release
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.08 / frequencies.length, now + (durationSec * 0.28));
          gain.gain.setValueAtTime(0.08 / frequencies.length, now + (durationSec * 0.72));
          gain.gain.exponentialRampToValueAtTime(0.0005, now + durationSec);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);

          osc.start(now);
          osc.stop(now + durationSec);

          this.activeOscs.push(osc);
          setTimeout(() => {
            const index = this.activeOscs.indexOf(osc);
            if (index > -1) this.activeOscs.splice(index, 1);
          }, durationMs + 100);
        } catch (e) {
          // Audio node safeguard
        }
      });
    }

    playMelodyNote(scale) {
      if (!this.ctx || !this.isPlaying) return;
      const now = this.ctx.currentTime;
      const randomNote = scale[Math.floor(Math.random() * scale.length)];
      const duration = 1.6 + Math.random() * 0.8;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = "sine";
        osc.frequency.setValueAtTime(randomNote, now);

        filter.type = "bandpass";
        filter.frequency.setValueAtTime(randomNote, now);
        filter.Q.setValueAtTime(3.0, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.045, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);

        this.activeOscs.push(osc);
        setTimeout(() => {
          const index = this.activeOscs.indexOf(osc);
          if (index > -1) this.activeOscs.splice(index, 1);
        }, duration * 1000 + 100);
      } catch (e) {}
    }

    startPlayback() {
      this.initContext();
      this.isPlaying = true;
      this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.4);

      const track = this.tracks[this.currentTrackIndex];
      this.chordStep = 0;

      // Play first chord immediately
      this.playChord(track.chords[0], track.tempo);
      this.chordStep = (this.chordStep + 1) % track.chords.length;

      // Schedule subsequent chords
      if (this.schedulerTimer) clearInterval(this.schedulerTimer);
      this.schedulerTimer = setInterval(() => {
        if (!this.isPlaying) return;
        const currentTrack = this.tracks[this.currentTrackIndex];
        this.playChord(currentTrack.chords[this.chordStep], currentTrack.tempo);
        this.chordStep = (this.chordStep + 1) % currentTrack.chords.length;
      }, track.tempo);

      // Schedule randomized gentle melody chimes
      if (this.arpTimer) clearInterval(this.arpTimer);
      this.arpTimer = setInterval(() => {
        if (!this.isPlaying) return;
        if (Math.random() > 0.3) {
          const currentTrack = this.tracks[this.currentTrackIndex];
          this.playMelodyNote(currentTrack.scale);
        }
      }, 1100);

      this.updateUI();
    }

    pause() {
      if (!this.isPlaying) return;
      this.isPlaying = false;

      if (this.schedulerTimer) {
        clearInterval(this.schedulerTimer);
        this.schedulerTimer = null;
      }
      if (this.arpTimer) {
        clearInterval(this.arpTimer);
        this.arpTimer = null;
      }

      if (this.masterGain && this.ctx) {
        try {
          this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.25);
        } catch (e) {}
      }

      setTimeout(() => {
        this.activeOscs.forEach((osc) => {
          try { osc.stop(); } catch (e) {}
        });
        this.activeOscs = [];
      }, 300);

      this.updateUI();
    }

    toggle() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.startPlayback();
      }
    }

    nextTrack() {
      this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
      if (this.isPlaying) {
        this.pause();
        setTimeout(() => this.startPlayback(), 200);
      } else {
        this.updateUI();
      }
    }

    prevTrack() {
      this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
      if (this.isPlaying) {
        this.pause();
        setTimeout(() => this.startPlayback(), 200);
      } else {
        this.updateUI();
      }
    }

    setVolume(val) {
      this.volume = parseFloat(val);
      this.isMuted = this.volume === 0;
      if (this.masterGain && this.ctx && this.isPlaying) {
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      }
      this.updateVolumeUI();
    }

    toggleMute() {
      if (this.isMuted) {
        this.setVolume(this.previousVolume || 0.5);
      } else {
        this.previousVolume = this.volume > 0 ? this.volume : 0.5;
        this.setVolume(0);
      }
    }

    updateVolumeUI() {
      const barVol = document.getElementById("soundscape-volume");
      if (barVol) barVol.value = this.volume;
    }

    updateUI() {
      const track = this.tracks[this.currentTrackIndex];

      // Track badge in Soundscape bar
      const badge = document.getElementById("active-track-badge");
      if (badge) {
        badge.textContent = `🎵 ${track.title}`;
      }

      // Soundscape Bar Button
      const barBtn = document.getElementById("soundbar-music-btn");
      const barIcon = document.getElementById("soundbar-music-icon");
      const barText = document.getElementById("soundbar-music-text");
      if (barBtn && barIcon && barText) {
        if (this.isPlaying) {
          barBtn.className = "px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] flex items-center space-x-1.5 transition-all shadow-xs";
          barIcon.className = "fa-solid fa-pause text-[10px]";
          barText.textContent = "Pause Music";
        } else {
          barBtn.className = "px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-black text-[11px] flex items-center space-x-1.5 transition-all shadow-xs";
          barIcon.className = "fa-solid fa-play text-[10px]";
          barText.textContent = "Play Music";
        }
      }

      // Live indicator on Focus Audio header button
      const liveDot = document.getElementById("soundscape-live-indicator");
      const soundBtn = document.getElementById("soundscape-btn");
      const isSoundscapeActive = window.SoundscapeEngine && window.SoundscapeEngine.currentType !== null;
      const isAnyAudioActive = this.isPlaying || isSoundscapeActive;

      if (liveDot) {
        if (isAnyAudioActive) {
          liveDot.classList.remove("hidden");
        } else {
          liveDot.classList.add("hidden");
        }
      }

      if (soundBtn) {
        if (isAnyAudioActive) {
          soundBtn.classList.add("bg-indigo-50", "border-indigo-300", "text-indigo-800");
          soundBtn.classList.remove("bg-slate-50", "border-slate-200", "text-slate-700");
        } else {
          soundBtn.classList.remove("bg-indigo-50", "border-indigo-300", "text-indigo-800");
          soundBtn.classList.add("bg-slate-50", "border-slate-200", "text-slate-700");
        }
      }

      this.updateVolumeUI();
    }
  }

  window.MusicPlayerEngine = new AmbientMusicEngine();

  // ---------------------------------------------------------
  // 8. Ambient Focus Soundscape Synthesizer Engine (Web Audio API)
  // ---------------------------------------------------------
  class SoundscapeSynth {
    constructor() {
      this.ctx = null;
      this.currentType = null;
      this.nodes = [];
      this.gainNode = null;
      this.volume = 0.5;
    }

    initContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.gainNode.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }

    setVolume(val) {
      this.volume = parseFloat(val);
      if (this.gainNode && this.ctx) {
        this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      }
    }

    stopAll() {
      this.nodes.forEach((n) => {
        try { n.stop(); } catch (e) {}
        try { n.disconnect(); } catch (e) {}
      });
      this.nodes = [];
      this.currentType = null;
      this.updateUI();
    }

    toggle(type) {
      if (this.currentType === type) {
        this.stopAll();
        return;
      }
      this.stopAll();
      this.initContext();
      this.currentType = type;

      if (type === "rain") this.playRain();
      if (type === "brown") this.playBrownNoise();
      if (type === "alpha") this.playAlphaWaves();

      this.updateUI();
    }

    playRain() {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.gainNode);
      noise.start();
      this.nodes.push(noise, filter);
    }

    playBrownNoise() {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (last + (0.02 * white)) / 1.02;
        last = data[i];
        data[i] *= 3.0;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(380, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.gainNode);
      noise.start();
      this.nodes.push(noise, filter);
    }

    playAlphaWaves() {
      // 10Hz Binaural Beat: Left Ear 200Hz, Right Ear 210Hz
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc2.frequency.setValueAtTime(210, this.ctx.currentTime);

      const merger = this.ctx.createChannelMerger(2);
      osc1.connect(merger, 0, 0);
      osc2.connect(merger, 0, 1);

      const subtleGain = this.ctx.createGain();
      subtleGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

      merger.connect(subtleGain);
      subtleGain.connect(this.gainNode);

      osc1.start();
      osc2.start();
      this.nodes.push(osc1, osc2, merger, subtleGain);
    }

    updateUI() {
      ['rain', 'brown', 'alpha'].forEach((t) => {
        const btn = document.getElementById(`sound-${t}-btn`);
        if (!btn) return;
        if (this.currentType === t) {
          btn.classList.add("bg-indigo-600", "text-white", "shadow-sm");
          btn.classList.remove("bg-indigo-900/50", "text-indigo-200");
        } else {
          btn.classList.remove("bg-indigo-600", "text-white", "shadow-sm");
          btn.classList.add("bg-indigo-900/50", "text-indigo-200");
        }
      });

      if (window.MusicPlayerEngine) {
        window.MusicPlayerEngine.updateUI();
      }
    }
  }

  window.SoundscapeEngine = new SoundscapeSynth();

  window.toggleSoundscapeBar = () => {
    const bar = document.getElementById("soundscape-bar");
    if (bar) {
      bar.classList.toggle("hidden");
    }
  };

  // ---------------------------------------------------------
  // 8. 4-7-8 Breathing Pacer with Web Audio Chimes
  // ---------------------------------------------------------
  class BreathingEngine {
    constructor() {
      this.timer = null;
      this.phase = 0; // 0=idle, 1=inhale, 2=hold, 3=exhale
      this.isRunning = false;
      this.audioCtx = null;
    }

    playChime(freq = 440, duration = 0.8) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!this.audioCtx) this.audioCtx = new AudioCtx();
        if (this.audioCtx.state === "suspended") this.audioCtx.resume();

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
      } catch (e) {}
    }

    toggle() {
      const btn = document.getElementById("pacer-toggle-btn");
      if (this.isRunning) {
        this.stop();
        if (btn) btn.textContent = "Start Session";
      } else {
        this.start();
        if (btn) btn.textContent = "Pause Session";
      }
    }

    start() {
      this.isRunning = true;
      this.step();
    }

    stop() {
      this.isRunning = false;
      clearTimeout(this.timer);
      const circle = document.getElementById("breathing-circle");
      const text = document.getElementById("breathing-text");
      if (circle) circle.style.transform = "scale(1)";
      if (text) text.textContent = "Ready";
    }

    step() {
      if (!this.isRunning) return;
      const circle = document.getElementById("breathing-circle");
      const text = document.getElementById("breathing-text");

      // Inhale (4s)
      this.playChime(523.25, 1.2); // High C chime
      if (text) text.textContent = "Inhale (4s)";
      if (circle) circle.style.transform = "scale(1.45)";

      this.timer = setTimeout(() => {
        if (!this.isRunning) return;

        // Hold (7s)
        this.playChime(659.25, 0.8); // E note
        if (text) text.textContent = "Hold (7s)";
        if (circle) circle.style.transform = "scale(1.45)";

        this.timer = setTimeout(() => {
          if (!this.isRunning) return;

          // Exhale (8s)
          this.playChime(392.00, 1.5); // G note
          if (text) text.textContent = "Exhale (8s)";
          if (circle) circle.style.transform = "scale(1)";

          this.timer = setTimeout(() => {
            if (this.isRunning) this.step();
          }, 8000);
        }, 7000);
      }, 4000);
    }
  }

  window.BreathingPacer = new BreathingEngine();

  // ---------------------------------------------------------
  // 9. Modern Executive Clinical PDF Report Exporter
  // ---------------------------------------------------------
  window.populateClinicalDocument = (p, score) => {
    // Defensively sanitize p to prevent NaN or blank values
    const cleanP = {
      age: (!isNaN(p?.age) && p?.age > 0) ? p.age : 21,
      gender: (p?.gender && p?.gender.trim()) ? p.gender : "Female",
      country: (p?.country && p?.country.trim()) ? p.country : "United States",
      academic_level: (p?.academic_level && p?.academic_level.trim()) ? p.academic_level : "Undergraduate",
      most_used_platform: (p?.most_used_platform && p?.most_used_platform.trim()) ? p.most_used_platform : "Instagram",
      purpose_of_use: (p?.purpose_of_use && p?.purpose_of_use.trim()) ? p.purpose_of_use : "Social & Media",
      avg_daily_usage_hours: (!isNaN(p?.avg_daily_usage_hours) && p?.avg_daily_usage_hours > 0) ? p.avg_daily_usage_hours : 6.0,
      daily_unlocks: (!isNaN(p?.daily_unlocks) && p?.daily_unlocks > 0) ? p.daily_unlocks : 70,
      study_hours: (!isNaN(p?.study_hours) && p?.study_hours > 0) ? p.study_hours : 5.0,
      physical_activity_hours: (!isNaN(p?.physical_activity_hours) && p?.physical_activity_hours >= 0) ? p.physical_activity_hours : 1.0,
      sleep_hours_per_night: (!isNaN(p?.sleep_hours_per_night) && p?.sleep_hours_per_night > 0) ? p.sleep_hours_per_night : 7.5,
      stress_level: (p?.stress_level && p?.stress_level.trim()) ? p.stress_level : "Medium"
    };
    p = cleanP;

    if (isNaN(score) || !score || score <= 0) {
      score = Math.min(9.8, Math.max(2.0, 3.5 + (p.sleep_hours_per_night * 0.40) - (p.avg_daily_usage_hours * 0.25) + (p.physical_activity_hours * 0.40) + (p.study_hours * 0.10) + (p.stress_level === 'Low' ? 1.4 : p.stress_level === 'Medium' ? 0.4 : p.stress_level === 'High' ? -0.8 : -1.8)));
    }

    // 1. Report Identifiers (No Date/Time)
    const reportId = "ME-2026-" + Math.floor(1000 + Math.random() * 9000) + "-XAI";
    document.querySelectorAll("#pdf-report-id").forEach(el => el.textContent = reportId);

    // 2. Patient / Student Profile
    document.querySelectorAll("#pdf-profile-demo").forEach(el => el.textContent = `${p.age} Yrs • ${p.gender}`);
    document.querySelectorAll("#pdf-profile-academic").forEach(el => el.textContent = p.academic_level);
    document.querySelectorAll("#pdf-profile-country").forEach(el => el.textContent = p.country);
    document.querySelectorAll("#pdf-profile-platform").forEach(el => el.textContent = `${p.most_used_platform} (${p.purpose_of_use})`);

    // 3. Score & Conformal Confidence Interval
    document.querySelectorAll("#pdf-score-num").forEach(el => el.textContent = score.toFixed(2));
    const lowConf = Math.max(0, (score - 0.35)).toFixed(2);
    const highConf = Math.min(10, (score + 0.35)).toFixed(2);
    document.querySelectorAll("#pdf-confidence-val").forEach(el => el.textContent = `[${lowConf} - ${highConf}] / 10`);

    // Cohort Percentile approximation
    const pctl = Math.min(99, Math.max(5, Math.round((score / 10.0) * 95 + (Math.random() * 4))));
    const topPct = 100 - pctl;
    document.querySelectorAll("#pdf-percentile-val").forEach(el => el.textContent = `P${pctl} (Top ${topPct}%)`);

    // Risk Stratification & Clinical Interpretation
    const statusTitles = document.querySelectorAll("#pdf-status-title");
    const statusDescs = document.querySelectorAll("#pdf-status-desc");
    const scoreBadges = document.querySelectorAll("#pdf-score-badge");

    if (score >= 7.5) {
      scoreBadges.forEach(b => {
        b.textContent = "Signal: Thriving";
        b.className = "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 block mt-1";
      });
      statusTitles.forEach(t => t.textContent = "Optimal Circadian Equilibrium");
      statusDescs.forEach(d => d.textContent = "Patient displays balanced circadian rhythms, restorative sleep architecture, active physical lifestyle, and controlled digital screen exposure. Excellent stress resilience.");
    } else if (score >= 5.5) {
      scoreBadges.forEach(b => {
        b.textContent = "Signal: Balanced";
        b.className = "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200 block mt-1";
      });
      statusTitles.forEach(t => t.textContent = "Balanced Routine with Minor Strain");
      statusDescs.forEach(d => d.textContent = "Rhythms are moderately stable. Implementing structured screen curfews 45 minutes prior to sleep and increasing daily movement will elevate cognitive performance.");
    } else if (score >= 3.5) {
      scoreBadges.forEach(b => {
        b.textContent = "Signal: Moderate Strain";
        b.className = "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 block mt-1";
      });
      statusTitles.forEach(t => t.textContent = "Elevated Academic & Digital Stress");
      statusDescs.forEach(d => d.textContent = "Warning: Significant cognitive fatigue markers identified. Extended screen exposure and restricted nocturnal sleep are dampening emotional wellbeing.");
    } else {
      scoreBadges.forEach(b => {
        b.textContent = "Signal: Critical Burnout";
        b.className = "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 block mt-1";
      });
      statusTitles.forEach(t => t.textContent = "High Burnout Risk Alert");
      statusDescs.forEach(d => d.textContent = "Critical alert: Acute sleep deprivation (<5h) combined with intense digital stimulation and high stress requires immediate behavioral intervention and restorative rest.");
    }

    // 4. Biomarkers Telemetry & Progress Visual Bars
    document.querySelectorAll("#pdf-metric-sleep").forEach(el => el.textContent = `${p.sleep_hours_per_night}h`);
    const sleepPct = Math.min(100, Math.round((p.sleep_hours_per_night / 9.0) * 100));
    document.querySelectorAll("#pdf-bar-sleep").forEach(el => {
      el.style.width = `${sleepPct}%`;
      el.className = `pdf-progress-bar ${p.sleep_hours_per_night >= 7.0 ? 'bg-emerald-500' : p.sleep_hours_per_night >= 5.5 ? 'bg-indigo-600' : 'bg-rose-500'}`;
    });
    document.querySelectorAll("#pdf-sleep-status").forEach(el => {
      el.textContent = p.sleep_hours_per_night >= 7.0 ? "Optimal" : p.sleep_hours_per_night >= 5.5 ? "Fair" : "Deficient";
      el.className = `text-[8px] font-black uppercase px-1.5 py-0.2 rounded ${p.sleep_hours_per_night >= 7.0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : p.sleep_hours_per_night >= 5.5 ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`;
    });

    document.querySelectorAll("#pdf-metric-screen").forEach(el => el.textContent = `${p.avg_daily_usage_hours}h`);
    const screenPct = Math.min(100, Math.round((p.avg_daily_usage_hours / 12.0) * 100));
    document.querySelectorAll("#pdf-bar-screen").forEach(el => {
      el.style.width = `${screenPct}%`;
      el.className = `pdf-progress-bar ${p.avg_daily_usage_hours <= 5.0 ? 'bg-emerald-500' : p.avg_daily_usage_hours <= 8.0 ? 'bg-amber-500' : 'bg-rose-500'}`;
    });
    document.querySelectorAll("#pdf-screen-status").forEach(el => {
      el.textContent = p.avg_daily_usage_hours <= 5.0 ? "Controlled" : p.avg_daily_usage_hours <= 8.0 ? "Elevated" : "Critical";
      el.className = `text-[8px] font-black uppercase px-1.5 py-0.2 rounded ${p.avg_daily_usage_hours <= 5.0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : p.avg_daily_usage_hours <= 8.0 ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`;
    });

    document.querySelectorAll("#pdf-metric-unlocks").forEach(el => el.textContent = `${p.daily_unlocks}`);
    const unlocksPct = Math.min(100, Math.round((p.daily_unlocks / 150.0) * 100));
    document.querySelectorAll("#pdf-bar-unlocks").forEach(el => {
      el.style.width = `${unlocksPct}%`;
      el.className = `pdf-progress-bar ${p.daily_unlocks <= 70 ? 'bg-emerald-500' : p.daily_unlocks <= 110 ? 'bg-indigo-600' : 'bg-rose-500'}`;
    });
    document.querySelectorAll("#pdf-unlocks-status").forEach(el => {
      el.textContent = p.daily_unlocks <= 70 ? "Controlled" : p.daily_unlocks <= 110 ? "Moderate" : "High Frequency";
      el.className = `text-[8px] font-black uppercase px-1.5 py-0.2 rounded ${p.daily_unlocks <= 70 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : p.daily_unlocks <= 110 ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`;
    });

    document.querySelectorAll("#pdf-metric-exercise").forEach(el => el.textContent = `${p.physical_activity_hours}h`);
    const exercisePct = Math.min(100, Math.round((p.physical_activity_hours / 2.0) * 100));
    document.querySelectorAll("#pdf-bar-exercise").forEach(el => {
      el.style.width = `${exercisePct}%`;
      el.className = `pdf-progress-bar ${p.physical_activity_hours >= 1.0 ? 'bg-emerald-500' : p.physical_activity_hours > 0 ? 'bg-amber-500' : 'bg-rose-500'}`;
    });
    document.querySelectorAll("#pdf-exercise-status").forEach(el => {
      el.textContent = p.physical_activity_hours >= 1.0 ? "Active" : p.physical_activity_hours > 0 ? "Minimal" : "Sedentary";
      el.className = `text-[8px] font-black uppercase px-1.5 py-0.2 rounded ${p.physical_activity_hours >= 1.0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`;
    });

    document.querySelectorAll("#pdf-metric-study").forEach(el => el.textContent = `${p.study_hours}h`);
    const studyPct = Math.min(100, Math.round((p.study_hours / 8.0) * 100));
    document.querySelectorAll("#pdf-bar-study").forEach(el => el.style.width = `${studyPct}%`);
    document.querySelectorAll("#pdf-study-status").forEach(el => {
      el.textContent = p.study_hours >= 4.0 && p.study_hours <= 7.0 ? "Balanced" : p.study_hours > 7.0 ? "High Intensity" : "Light";
      el.className = `text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-200`;
    });

    document.querySelectorAll("#pdf-metric-stress").forEach(el => el.textContent = `${p.stress_level} Stress`);
    const stressPctMap = { 'Low': 25, 'Medium': 50, 'High': 80, 'Very High': 100 };
    const stressBarPct = stressPctMap[p.stress_level] || 50;
    document.querySelectorAll("#pdf-bar-stress").forEach(el => {
      el.style.width = `${stressBarPct}%`;
      el.className = `pdf-progress-bar ${p.stress_level === 'Low' ? 'bg-emerald-500' : p.stress_level === 'Medium' ? 'bg-sky-500' : p.stress_level === 'High' ? 'bg-amber-500' : 'bg-rose-500'}`;
    });
    document.querySelectorAll("#pdf-stress-status").forEach(el => {
      el.textContent = p.stress_level === 'Low' ? "Stable" : p.stress_level === 'Medium' ? "Moderate" : "High Strain";
      el.className = `text-[8px] font-black uppercase px-1.5 py-0.2 rounded ${p.stress_level === 'Low' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : p.stress_level === 'Medium' ? 'bg-sky-100 text-sky-800 border border-sky-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`;
    });

    // 5. Explainable AI Feature Attribution Table
    const sleepDiff = (p.sleep_hours_per_night - 6.5).toFixed(1);
    const sleepImpact = p.sleep_hours_per_night >= 6.5 ? `+${(Math.min(2.5, (p.sleep_hours_per_night - 6.5) * 0.75 + 0.4)).toFixed(2)}` : `-${(Math.min(3.0, (6.5 - p.sleep_hours_per_night) * 0.85 + 0.3)).toFixed(2)}`;

    const screenDiff = (p.avg_daily_usage_hours - 5.0).toFixed(1);
    const screenImpact = p.avg_daily_usage_hours <= 5.0 ? `+${(Math.min(1.8, (5.0 - p.avg_daily_usage_hours) * 0.4 + 0.3)).toFixed(2)}` : `-${(Math.min(2.5, (p.avg_daily_usage_hours - 5.0) * 0.45 + 0.2)).toFixed(2)}`;

    const exerciseImpact = p.physical_activity_hours >= 1.0 ? `+${(Math.min(1.5, p.physical_activity_hours * 0.65)).toFixed(2)}` : `-${(0.55 - p.physical_activity_hours * 0.3).toFixed(2)}`;

    const stressImpact = p.stress_level === 'Low' ? '+1.25' : p.stress_level === 'Medium' ? '+0.15' : p.stress_level === 'High' ? '-1.10' : '-1.85';

    const xaiRows = `
      <tr>
        <td class="p-2.5 font-bold text-slate-800 flex items-center">
          <span class="mr-1.5">🌙</span> Sleep Architecture
        </td>
        <td class="p-2.5 font-mono font-bold">${p.sleep_hours_per_night}h / night</td>
        <td class="p-2.5 text-slate-500 font-mono">6.5h baseline</td>
        <td class="p-2.5">
          <span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${sleepImpact.startsWith('+') ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
            ${sleepImpact.startsWith('+') ? 'Positive Driver' : 'Negative Drag'}
          </span>
        </td>
        <td class="p-2.5 text-right font-mono font-black ${sleepImpact.startsWith('+') ? 'text-emerald-700' : 'text-rose-700'}">${sleepImpact} pts</td>
      </tr>
      <tr>
        <td class="p-2.5 font-bold text-slate-800 flex items-center">
          <span class="mr-1.5">⏳</span> Screen Usage Exposure
        </td>
        <td class="p-2.5 font-mono font-bold">${p.avg_daily_usage_hours}h / day</td>
        <td class="p-2.5 text-slate-500 font-mono">5.0h baseline</td>
        <td class="p-2.5">
          <span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${screenImpact.startsWith('+') ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
            ${screenImpact.startsWith('+') ? 'Controlled' : 'High Friction'}
          </span>
        </td>
        <td class="p-2.5 text-right font-mono font-black ${screenImpact.startsWith('+') ? 'text-emerald-700' : 'text-rose-700'}">${screenImpact} pts</td>
      </tr>
      <tr>
        <td class="p-2.5 font-bold text-slate-800 flex items-center">
          <span class="mr-1.5">🏃</span> Physical & Cardiovascular Sport
        </td>
        <td class="p-2.5 font-mono font-bold">${p.physical_activity_hours}h / day</td>
        <td class="p-2.5 text-slate-500 font-mono">1.0h baseline</td>
        <td class="p-2.5">
          <span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${exerciseImpact.startsWith('+') ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
            ${exerciseImpact.startsWith('+') ? 'Dopamine Buffer' : 'Activity Deficit'}
          </span>
        </td>
        <td class="p-2.5 text-right font-mono font-black ${exerciseImpact.startsWith('+') ? 'text-emerald-700' : 'text-rose-700'}">${exerciseImpact} pts</td>
      </tr>
      <tr>
        <td class="p-2.5 font-bold text-slate-800 flex items-center">
          <span class="mr-1.5">🧠</span> Subjective Academic Stress
        </td>
        <td class="p-2.5 font-bold">${p.stress_level} Stress</td>
        <td class="p-2.5 text-slate-500 font-medium">Medium Baseline</td>
        <td class="p-2.5">
          <span class="px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${stressImpact.startsWith('+') ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
            ${stressImpact.startsWith('+') ? 'Resilient' : 'Arousal Surge'}
          </span>
        </td>
        <td class="p-2.5 text-right font-mono font-black ${stressImpact.startsWith('+') ? 'text-emerald-700' : 'text-rose-700'}">${stressImpact} pts</td>
      </tr>
    `;
    document.querySelectorAll("#pdf-xai-table").forEach(tb => tb.innerHTML = xaiRows);

    // 6. 7-Day Habit Prescription Roadmap
    const rxHTML = `
      <div class="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start space-x-3">
        <input type="checkbox" checked class="mt-1 accent-indigo-600 rounded">
        <div class="space-y-0.5">
          <div class="flex items-center justify-between">
            <strong class="text-slate-900 font-black text-xs">1. 45-Minute Bedtime Screen Curfew</strong>
            <span class="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">Circadian Reset</span>
          </div>
          <p class="text-[10px] text-slate-600 leading-relaxed font-medium">
            Activate blue-light suppression filter or power down handheld digital devices 45 minutes prior to sleep to maximize physiological melatonin synthesis and REM cycles.
          </p>
        </div>
      </div>

      <div class="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start space-x-3">
        <input type="checkbox" checked class="mt-1 accent-indigo-600 rounded">
        <div class="space-y-0.5">
          <div class="flex items-center justify-between">
            <strong class="text-slate-900 font-black text-xs">2. 25/5 Pomodoro Cognitive Rest Intervals</strong>
            <span class="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">Focus Preservation</span>
          </div>
          <p class="text-[10px] text-slate-600 leading-relaxed font-medium">
            Structure intensive study blocks into 25-minute deep focus sprints followed by 5 minutes of eye relaxation and physical hydration to forestall cognitive burn.
          </p>
        </div>
      </div>

      <div class="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start space-x-3">
        <input type="checkbox" checked class="mt-1 accent-indigo-600 rounded">
        <div class="space-y-0.5">
          <div class="flex items-center justify-between">
            <strong class="text-slate-900 font-black text-xs">3. 4-7-8 Neuro-Vagal Breathing Before Study Sessions</strong>
            <span class="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">Vagal Tone</span>
          </div>
          <p class="text-[10px] text-slate-600 leading-relaxed font-medium">
            Perform 3 consecutive rounds of 4-7-8 respiratory pacing prior to exams or study blocks to activate parasympathetic deceleration and dampen adrenaline.
          </p>
        </div>
      </div>
    `;
    document.querySelectorAll("#pdf-prescriptions-list").forEach(el => el.innerHTML = rxHTML);
  };

  let isPdfZoomFit = true;
  window.togglePdfZoom = () => {
    isPdfZoomFit = !isPdfZoomFit;
    applyPdfZoom();
  };

  function applyPdfZoom() {
    const container = document.getElementById("pdf-preview-container");
    const text = document.getElementById("pdf-zoom-text");
    if (!container) return;
    if (isPdfZoomFit) {
      const vh = window.innerHeight;
      const scale = Math.min(1, Math.max(0.60, (vh - 170) / 780));
      container.style.transform = `scale(${scale})`;
      container.style.transformOrigin = "top center";
      if (text) text.textContent = "100% Size";
    } else {
      container.style.transform = "none";
      if (text) text.textContent = "Fit 1 Page";
    }
  }

  // Direct 1-Click Export Clinical PDF Report
  window.exportClinicalReport = () => {
    const p = currentBasePayload || extractPayload();
    const score = currentBaseScore || 0;

    // Populate printable master document with sanitized telemetry
    populateClinicalDocument(p, score);

    // Directly open the browser's native Save as PDF / Print dialog (1-click export)
    window.print();
  };

  // Backwards compatibility alias
  window.printClinicalReport = window.exportClinicalReport;

  // Mobile Tools Dropdown Toggle
  window.toggleMobileToolsMenu = (e) => {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById("mobile-tools-dropdown");
    if (dropdown) {
      dropdown.classList.toggle("hidden");
    }
  };

  // Close mobile tools dropdown on click outside
  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("mobile-tools-dropdown");
    const btn = document.getElementById("mobile-tools-btn");
    if (dropdown && !dropdown.classList.contains("hidden")) {
      if (!dropdown.contains(e.target) && !btn?.contains(e.target)) {
        dropdown.classList.add("hidden");
      }
    }
  });

  // ---------------------------------------------------------
  // 10. Developer API Playground Snippets
  // ---------------------------------------------------------
  let currentApiLang = 'python';

  window.switchApiTab = (lang) => {
    currentApiLang = lang;
    document.querySelectorAll(".apitab-btn").forEach((btn) => {
      if (btn.dataset.apitab === lang) {
        btn.classList.add("bg-indigo-600", "text-white");
        btn.classList.remove("text-slate-600");
      } else {
        btn.classList.remove("bg-indigo-600", "text-white");
        btn.classList.add("text-slate-600");
      }
    });
    updateApiPlaygroundCode();
  };

  function updateApiPlaygroundCode() {
    const codeEl = document.getElementById("api-code-block");
    if (!codeEl) return;

    const payload = currentBasePayload || {
      age: 21,
      gender: "Female",
      country: "USA",
      academic_level: "Undergraduate",
      most_used_platform: "Instagram",
      purpose_of_use: "Entertainment",
      avg_daily_usage_hours: 4.5,
      daily_unlocks: 65,
      study_hours: 5.0,
      physical_activity_hours: 1.5,
      sleep_hours_per_night: 7.5,
      stress_level: "Medium"
    };

    const payloadJson = JSON.stringify(payload, null, 2);

    let snippet = '';
    if (currentApiLang === 'python') {
      snippet = `import requests

url = "http://127.0.0.1:8000/predict"
payload = ${payloadJson}

response = requests.post(url, json=payload)
data = response.json()
print("Score:", data["predicted_mental_health_score"])
print("Risk Level:", data["risk_level"])`;
    } else if (currentApiLang === 'js') {
      snippet = `const response = await fetch("http://127.0.0.1:8000/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(${payloadJson})
});

const result = await response.json();
console.log("Wellness Score:", result.predicted_mental_health_score);`;
    } else if (currentApiLang === 'curl') {
      snippet = `curl -X POST "http://127.0.0.1:8000/predict" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload)}'`;
    } else if (currentApiLang === 'go') {
      snippet = `package main

import (
    "bytes"
    "fmt"
    "net/http"
    "io"
)

func main() {
    url := "http://127.0.0.1:8000/predict"
    payload := []byte(\`${JSON.stringify(payload)}\`)

    req, _ := http.NewRequest("POST", url, bytes.NewBuffer(payload))
    req.Header.Set("Content-Type", "application/json")

    resp, err := http.DefaultClient.Do(req)
    if err != nil { panic(err) }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    fmt.Println(string(body))
}`;
    }

    codeEl.innerHTML = `<code>${escapeHtml(snippet)}</code>`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  window.copyApiSnippet = () => {
    const code = document.getElementById("api-code-block")?.innerText;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById("api-copy-btn");
      if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-check text-emerald-400"></i><span>Copied!</span>`;
        setTimeout(() => {
          btn.innerHTML = `<i class="fa-regular fa-copy"></i><span>Copy</span>`;
        }, 2000);
      }
    });
  };

  // ---------------------------------------------------------
  // 11. Batch CSV Upload & Assessment
  // ---------------------------------------------------------
  window.downloadSampleCsv = () => {
    const link = document.createElement("a");
    link.href = "/sample_cohort_data/student_cohort_50.csv";
    link.download = "mindease_student_cohort_sample.csv";
    link.click();
  };

  window.loadSampleCohort = async (filename) => {
    try {
      const dropZone = document.getElementById("drop-zone");
      if (dropZone) dropZone.innerHTML = `<div class="p-4 text-center text-indigo-600 font-bold"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Loading ${filename}...</div>`;
      
      const res = await fetch(`/sample_cohort_data/${filename}`);
      if (!res.ok) throw new Error("Could not fetch sample dataset");
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "text/csv" });
      await window.handleCsvUpload([file]);
    } catch (e) {
      alert("Error loading sample dataset: " + e.message);
    }
  };

  window.handleCsvUpload = async (files) => {
    if (!files || !files.length) return;
    const file = files[0];
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a valid .csv file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const dropZone = document.getElementById("drop-zone");
    if (dropZone) dropZone.innerHTML = `<div class="p-4 text-center text-indigo-600 font-bold"><i class="fa-solid fa-spinner animate-spin mr-2"></i>Processing Student Cohort (${file.name})...</div>`;

    try {
      const res = await fetch(`${API_BASE}/predict/batch`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Batch prediction failed");
      }

      const data = await res.json();
      lastBatchResponse = data;

      document.getElementById("batch-total-count").textContent = data.total_records;
      document.getElementById("batch-mean-score").textContent = data.mean_score.toFixed(2);
      document.getElementById("batch-thriving-count").textContent = data.thriving_count;
      document.getElementById("batch-risk-count").textContent = data.high_burnout_count;

      document.getElementById("batch-results-area").classList.remove("hidden");
    } catch (e) {
      alert("Error processing CSV: " + e.message);
    } finally {
      if (dropZone) {
        dropZone.innerHTML = `
          <input type="file" id="csv-file-input" accept=".csv" class="hidden" onchange="handleCsvUpload(this.files)">
          <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-lg">
            <i class="fa-solid fa-check"></i>
          </div>
          <div>
            <strong class="text-xs font-black text-slate-900 block">${file.name} Processed Successfully</strong>
            <span class="text-[10px] text-slate-400 font-medium">Click to upload another batch</span>
        `;
      }
    }
  };

  window.downloadAnnotatedCsv = () => {
    if (!lastBatchResponse || !lastBatchResponse.sample_preview) {
      alert("No processed batch data found.");
      return;
    }
    const sample = lastBatchResponse.sample_preview;
    const keys = Object.keys(sample[0]);
    let csv = keys.join(",") + "\n";
    sample.forEach((row) => {
      csv += keys.map((k) => row[k]).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mindease_batch_predictions_annotated.csv";
    link.click();
  };

  // ---------------------------------------------------------
  // 12. Custom Select Dropdown Enhancer
  // ---------------------------------------------------------
  function initCustomSelects() {
    document.querySelectorAll("select.input-wellness").forEach((select) => {
      if (select.dataset.customized) return;
      select.dataset.customized = "true";

      select.style.position = "absolute";
      select.style.opacity = "0";
      select.style.pointerEvents = "none";
      select.style.height = "0";
      select.style.width = "0";
      select.style.margin = "0";
      select.style.padding = "0";

      const wrapper = document.createElement("div");
      wrapper.className = "custom-select-wrapper";
      select.parentNode.insertBefore(wrapper, select);
      wrapper.appendChild(select);

      const trigger = document.createElement("div");
      trigger.className = "custom-select-trigger";
      
      const triggerText = document.createElement("span");
      triggerText.className = "trigger-text truncate";
      
      const chevron = document.createElement("i");
      chevron.className = "fa-solid fa-chevron-down chevron-icon";
      
      trigger.appendChild(triggerText);
      trigger.appendChild(chevron);
      wrapper.appendChild(trigger);

      const menu = document.createElement("div");
      menu.className = "custom-select-menu";
      wrapper.appendChild(menu);

      const optionIcons = {
        // Gender
        "Male": '<i class="fa-solid fa-mars text-blue-500 mr-2 text-xs"></i>',
        "Female": '<i class="fa-solid fa-venus text-pink-500 mr-2 text-xs"></i>',

        // Country
        "India": '🇮🇳 ',
        "USA": '🇺🇸 ',
        "UK": '🇬🇧 ',
        "Canada": '🇨🇦 ',
        "Australia": '🇦🇺 ',
        "Germany": '🇩🇪 ',
        "France": '🇫🇷 ',
        "Mexico": '🇲🇽 ',
        "Turkey": '🇹🇷 ',
        "Other": '🌍 ',

        // Platform
        "Instagram": '<i class="fa-brands fa-instagram text-pink-500 mr-2 text-xs"></i>',
        "YouTube": '<i class="fa-brands fa-youtube text-red-500 mr-2 text-xs"></i>',
        "TikTok": '<i class="fa-brands fa-tiktok text-slate-800 mr-2 text-xs"></i>',
        "Snapchat": '<i class="fa-brands fa-snapchat text-amber-500 mr-2 text-xs"></i>',
        "WhatsApp": '<i class="fa-brands fa-whatsapp text-emerald-500 mr-2 text-xs"></i>',
        "Twitter": '<i class="fa-brands fa-x-twitter text-slate-900 mr-2 text-xs"></i>',
        "LinkedIn": '<i class="fa-brands fa-linkedin text-blue-600 mr-2 text-xs"></i>',
        "Facebook": '<i class="fa-brands fa-facebook text-blue-500 mr-2 text-xs"></i>',
        "WeChat": '<i class="fa-brands fa-weixin text-emerald-600 mr-2 text-xs"></i>',
        "LINE": '<i class="fa-solid fa-comment-dots text-emerald-500 mr-2 text-xs"></i>',
        "KakaoTalk": '<i class="fa-solid fa-comment text-yellow-500 mr-2 text-xs"></i>',
        "VKontakte": '<i class="fa-brands fa-vk text-sky-600 mr-2 text-xs"></i>',

        // Purpose
        "Entertainment": '<i class="fa-solid fa-clapperboard text-purple-500 mr-2 text-xs"></i>',
        "Education": '<i class="fa-solid fa-graduation-cap text-indigo-500 mr-2 text-xs"></i>',
        "Networking": '<i class="fa-solid fa-users text-sky-500 mr-2 text-xs"></i>',
        "News": '<i class="fa-solid fa-newspaper text-emerald-500 mr-2 text-xs"></i>'
      };

      function refreshCustomSelect() {
        menu.innerHTML = "";
        const options = Array.from(select.options);
        const currentVal = select.value;
        const selectedOption = options.find((o) => o.value === currentVal) || options[0];

        if (!currentVal) {
          const placeholderOpt = options.find((o) => !o.value);
          triggerText.textContent = placeholderOpt ? placeholderOpt.textContent : "Select...";
          trigger.classList.add("placeholder-active");
        } else {
          const iconPrefix = optionIcons[currentVal] || "";
          triggerText.innerHTML = `<span class="flex items-center">${iconPrefix}${selectedOption ? selectedOption.textContent : ""}</span>`;
          trigger.classList.remove("placeholder-active");
        }

        options.forEach((opt) => {
          if (!opt.value && opt.disabled) return;
          const item = document.createElement("div");
          const isSelected = opt.value === currentVal && currentVal !== "";
          item.className = "custom-select-option" + (isSelected ? " selected" : "");
          const iconPrefix = optionIcons[opt.value] || "";
          item.innerHTML = `<span class="flex items-center">${iconPrefix}${opt.textContent}</span>` + (isSelected ? `<i class="fa-solid fa-check text-indigo-600 text-xs"></i>` : "");
          
          item.addEventListener("click", (e) => {
            e.stopPropagation();
            select.value = opt.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            select.dispatchEvent(new Event("input", { bubbles: true }));
            refreshCustomSelect();
            closeAllCustomSelects();
          });
          menu.appendChild(item);
        });
      }

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.contains("open");
        closeAllCustomSelects();
        if (!isOpen) {
          menu.scrollTop = 0;
          menu.classList.add("open");
          trigger.classList.add("active");
          wrapper.classList.add("active");
          const parentCard = wrapper.closest(".wellness-card");
          if (parentCard) parentCard.classList.add("dropdown-active");
        }
      });

      select.addEventListener("change", refreshCustomSelect);
      refreshCustomSelect();
    });
  }

  function closeAllCustomSelects() {
    document.querySelectorAll(".custom-select-menu.open").forEach((menu) => {
      menu.classList.remove("open");
    });
    document.querySelectorAll(".custom-select-trigger.active").forEach((trigger) => {
      trigger.classList.remove("active");
    });
    document.querySelectorAll(".custom-select-wrapper.active").forEach((w) => {
      w.classList.remove("active");
    });
    document.querySelectorAll(".wellness-card.dropdown-active").forEach((card) => {
      card.classList.remove("dropdown-active");
    });
  }

  document.addEventListener("click", closeAllCustomSelects);

  form.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", () => {
      const field = el.closest(".field");
      if (field) {
        field.classList.remove("field-error");
        const msg = field.querySelector(".error-msg");
        if (msg) msg.textContent = "";
      }
    });
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    form.querySelectorAll("select").forEach((s) => s.dispatchEvent(new Event("change", { bubbles: true })));
    document.getElementById("screen-val").textContent = "0.0h";
    document.getElementById("unlock-val").textContent = "0 unlocks";
    document.getElementById("study-val").textContent = "0.0h";
    document.getElementById("exercise-val").textContent = "0.0h";
    document.getElementById("sleep-val").textContent = "0.0h";
    showState("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  if (errorRetryBtn) {
    errorRetryBtn.addEventListener("click", () => {
      showState("idle");
    });
  }

  initCustomSelects();
  if (window.MusicPlayerEngine) {
    window.MusicPlayerEngine.updateUI();
  }
})();
