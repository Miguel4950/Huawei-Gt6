/**
 * Formatting utilities for Telegram Markdown messages with ASCII graphs and emojis.
 */

function renderProgressBar(percentage, length = 10) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clamped / 100) * length);
  const empty = length - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${clamped.toFixed(0)}%`;
}

function formatSleepSummary(sleep, aiText = '', historyStats = null) {
  if (!sleep) return '❌ No se encontraron registros de sueño recientes.';

  const deepBar = renderProgressBar(sleep.deepPct);
  const remBar = renderProgressBar(sleep.remPct);
  const lightBar = renderProgressBar(sleep.lightPct);

  let dateNotice = '';
  try {
    const endTimestamp = new Date(sleep.endTime.replace(/\./g, '-')).getTime();
    const diffHours = (Date.now() - endTimestamp) / (1000 * 60 * 60);
    if (diffHours > 18) {
      dateNotice = `⚠️ _Aviso: Datos del ${sleep.date} (hace ~${Math.round(diffHours)}h). Si ya despertaste hoy, abre Huawei Health y Health Sync en tu móvil para sincronizar, o escribe /sync._\n\n`;
    }
  } catch (e) {}

  let msg = `🌙 *REPORTE DE SUEÑO — Noche del ${sleep.date}*\n\n${dateNotice}`;
  msg += `⏱️ *Tiempo en cama:* ${sleep.inBedHours}h (${sleep.startTime.split(' ')[1]} ➔ ${sleep.endTime.split(' ')[1]})\n`;
  msg += `💤 *Tiempo real dormido:* *${sleep.totalSleepHours}h*\n`;
  msg += `📊 *Eficiencia del sueño:* *${sleep.efficiencyPct}%* (Score: *${sleep.sleepScore}/100*)\n`;
  msg += `🔄 *Ciclos ultradianos completos:* *${sleep.cyclesCount}* (${sleep.wokenUpInDeep ? '⚠️ Despertar en fase profunda' : '✅ Despertar suave'})\n\n`;

  msg += `*Desglose de Fases de Anoche:*\n`;
  msg += `• 🧠 *Fase REM:* ${(sleep.remSeconds / 60).toFixed(0)} min (${sleep.remPct}%) | ${remBar}\n`;
  msg += `• 🔋 *Profundo:* ${(sleep.deepSeconds / 60).toFixed(0)} min (${sleep.deepPct}%) | ${deepBar}\n`;
  msg += `• 🛋️ *Ligero:* ${(sleep.lightSeconds / 60).toFixed(0)} min (${sleep.lightPct}%) | ${lightBar}\n`;
  msg += `• 👀 *Despierto:* ${(sleep.awakeSeconds / 60).toFixed(0)} min (${sleep.awakeCount} microdespertares)\n\n`;

  if (historyStats && historyStats.weekly) {
    const w = historyStats.weekly;
    const m = historyStats.monthly;
    const d = historyStats.debt;
    const ch = historyStats.chronotype;

    msg += `📈 *Contexto & Comparativa (Semana / Mes):*\n`;
    msg += `• 📅 *vs Media Semanal (${w.avgHours}h):* ${w.deltaHours >= 0 ? '+' : ''}${w.deltaHours}h | Profundo: ${w.deltaDeepPct >= 0 ? '+' : ''}${w.deltaDeepPct}%\n`;
    if (m) {
      msg += `• 🗓️ *vs Media Mensual (${m.avgHours}h):* ${m.deltaHours >= 0 ? '+' : ''}${m.deltaHours}h | Eficiencia: ${w.deltaEfficiency >= 0 ? '+' : ''}${w.deltaEfficiency}%\n`;
    }
    msg += `• 📉 *Deuda de Sueño (7 días):* *${d.totalDebtHours > 0 ? `-${d.totalDebtHours}h déficit` : `+${Math.abs(d.totalDebtHours)}h superávit`}* (Media: ${d.avgDailySleepHours}h/día)\n`;
    if (ch && ch.chronotype) {
      msg += `• 🕰️ *Cronotipo & Midpoint:* ${ch.chronotype} (Punto medio: ${sleep.sleepMidpoint || 'N/D'})\n`;
    }
    msg += `\n`;
  }

  if (aiText) {
    msg += `💡 *Diagnóstico de Gemini (Coach Biométrico):*\n${aiText}\n`;
  }

  return msg;
}

function formatWorkoutReport(workout, aiText = '') {
  if (!workout) return '❌ No hay sesiones de entrenamiento registradas en la carpeta de Actividades.';

  let msg = `🏃 *MONITOR DE ENTRENAMIENTO & ACTIVIDAD FÍSICA*\n\n`;
  msg += `🏷️ *Deporte / Actividad:* *${workout.type}*\n`;
  msg += `📅 *Fecha:* ${workout.datetime}\n`;
  msg += `⏱️ *Duración Activa:* *${workout.durationMinutes} minutos*\n`;
  msg += `🔥 *Calorías Quemadas:* *${workout.calories} kcal*\n`;
  if (workout.distanceKm > 0) {
    msg += `📏 *Distancia:* *${workout.distanceKm} km*\n`;
  }
  if (workout.paceFormatted) {
    msg += `⏱️ *Ritmo Medio:* *${workout.paceFormatted}*\n`;
  }
  if (workout.steps > 0) {
    msg += `🚶 *Pasos en la Sesión:* *${workout.steps.toLocaleString()} pasos*\n`;
  }
  msg += `❤️ *Frecuencia Media:* *${workout.avgHr} bpm* | *Pico Máximo:* *${workout.maxHr} bpm*\n`;
  msg += `⚡ *Nivel de Intensidad:* *${workout.intensity}*\n`;
  msg += `📈 *Carga de Entrenamiento (EPOC):* *${workout.trainingLoad} pts*\n\n`;

  msg += `🔋 *ESTADO DE RECUPERACIÓN BIOLÓGICA:*\n`;
  msg += `• *Tiempo Total de Descanso Necesario:* *${workout.recoveryHoursTotal} horas*\n`;
  msg += `• *Estado Actual:* *${workout.recoveryStatus}*\n\n`;

  if (aiText) {
    msg += `🩺 *Evaluación del Coach de Salud (Gemini 3.8 Flash):*\n${aiText}\n`;
  }

  return msg;
}

function formatReadinessReport(readiness, aiText = '') {
  let msg = `⚡ *NIVEL DE BATERÍA CORPORAL Y RECUPERACIÓN*\n\n`;
  msg += `🏆 *Score de Recuperación:* *${readiness.score}/100* ${readiness.color} (*${readiness.level}*)\n\n`;

  const c = readiness.components;
  msg += `📋 *Factores Clave:*\n`;
  msg += `• 🛌 *Calidad de Sueño:* ${c.sleepHours}h dormidas (${c.deepPct}% Profundo, ${c.remPct}% REM)\n`;
  msg += `• ❤️ *Pulso en Reposo (RHR):* *${c.currentRhr} bpm* (Base 7d: ${c.baselineRhr} bpm | Delta: ${c.rhrDelta > 0 ? '+' : ''}${c.rhrDelta} bpm)\n`;
  msg += `• 💨 *Oxígeno Mínimo:* *${c.minSpo2}%*\n\n`;

  msg += `🎯 *Recomendación Inicial:* ${readiness.advice}\n\n`;

  if (aiText) {
    msg += `🩺 *Análisis Fisiológico de Gemini:*\n${aiText}\n`;
  }

  return msg;
}

function formatHeartReport(heart, rhrTrend, aiText = '') {
  if (!heart) return '❌ No hay datos de frecuencia cardíaca disponibles.';

  let msg = `❤️ *ESTADO CARDIOVASCULAR — ${heart.date}*\n\n`;
  msg += `• 💓 *Frecuencia Media:* *${heart.avgBpm} bpm*\n`;
  msg += `• 🛌 *Frecuencia en Reposo (RHR):* *${heart.restingHeartRate} bpm* (Media 7 días: ${rhrTrend.recent7DaysAvgRhr} bpm)\n`;
  msg += `• ⚡ *Rango del día:* ${heart.minBpm} bpm (Mín) ➔ *${heart.maxBpm} bpm (Pico)*\n\n`;

  msg += `*Distribución en Zonas Cardíacas:*\n`;
  msg += `• Z1 (Reposo < 100 bpm): ${renderProgressBar(heart.zones.z1Pct)}\n`;
  msg += `• Z2 (Quema Grasa 100-120): ${renderProgressBar(heart.zones.z2Pct)}\n`;
  msg += `• Z3 (Aeróbico 120-140): ${renderProgressBar(heart.zones.z3Pct)}\n`;
  msg += `• Z4 (Umbral 140-160): ${renderProgressBar(heart.zones.z4Pct)}\n`;
  msg += `• Z5 (Máximo > 160 bpm): ${renderProgressBar(heart.zones.z5Pct)}\n\n`;

  if (aiText) {
    msg += `💡 *Veredicto de Gemini:*\n${aiText}\n`;
  }

  return msg;
}

function formatStepsReport(activity) {
  if (!activity) return '❌ No hay datos de pasos disponibles.';

  const bar = renderProgressBar(activity.completionPct);

  let msg = `🚶 *ACTIVIDAD Y PASOS — ${activity.date}*\n\n`;
  msg += `🎯 *Progreso hacia el objetivo:* ${bar}\n`;
  msg += `• 👣 *Pasos Totales:* *${activity.totalSteps.toLocaleString()}* / ${activity.targetSteps.toLocaleString()}\n`;
  msg += `• 📏 *Distancia Estimada:* *${activity.distanceKm} km*\n`;
  msg += `• 🔥 *Calorías Activas:* *${activity.activeCalories} kcal*\n`;
  msg += `• 🚀 *Hora Pico:* ${activity.peakHour}\n`;
  msg += `• 🪑 *Horas sedentarias diurnas:* ${activity.sedentaryDaytimeHours}h (Racha máxima continua: ${activity.maxSedentaryStreakHours}h)\n`;

  return msg;
}

/**
 * Converts markdown tables (| Col | Col |) into mobile-friendly bullet lists
 * because Telegram doesn't support Markdown tables and renders them misaligned.
 */
function convertMarkdownTables(text) {
  if (!text || !text.includes('|')) return text;

  const lines = text.split('\n');
  const resultLines = [];
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];

  const isSeparator = (line) => /^\|?\s*[-:]+[-| :]*\|?$/.test(line.trim());
  const isRow = (line) => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|');
  };

  const parseCells = (line) => {
    const trimmed = line.trim();
    const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '');
    return inner.split('|').map(c => c.trim());
  };

  const cleanBold = (str) => (str || '').replace(/^[*_`]+|[*_`]+$/g, '').trim();

  const flushTable = () => {
    if (tableRows.length > 0) {
      tableRows.forEach(row => {
        if (row.length === 0 || row.every(c => c.length === 0)) return;

        const name = cleanBold(row[0]);

        if (row.length === 4) {
          const v1 = cleanBold(row[1]);
          const v2 = cleanBold(row[2]);
          const desc = row[3].trim();
          resultLines.push(`• *${name}:* ${v1} ➔ *${v2}* — ${desc}`);
        } else if (row.length === 3) {
          const v1 = cleanBold(row[1]);
          const v2 = cleanBold(row[2]);
          resultLines.push(`• *${name}:* ${v1} ➔ *${v2}*`);
        } else if (row.length === 2) {
          const v1 = cleanBold(row[1]);
          resultLines.push(`• *${name}:* ${v1}`);
        } else {
          const parts = row.slice(1).map((val, idx) => {
            const h = tableHeaders[idx + 1] ? `*${tableHeaders[idx + 1]}:* ` : '';
            return `${h}${cleanBold(val)}`;
          });
          resultLines.push(`• *${name}:* ${parts.join(' | ')}`);
        }
      });
      resultLines.push('');
    }
    inTable = false;
    tableHeaders = [];
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isRow(line)) {
      if (isSeparator(line)) {
        inTable = true;
        continue;
      }
      const cells = parseCells(line);
      if (!inTable && tableHeaders.length === 0) {
        tableHeaders = cells;
      } else {
        inTable = true;
        tableRows.push(cells);
      }
    } else {
      if (inTable || tableRows.length > 0) {
        flushTable();
      }
      resultLines.push(line);
    }
  }

  if (inTable || tableRows.length > 0) {
    flushTable();
  }

  return resultLines.join('\n');
}

/**
 * Cleans markdown formatting for Telegram:
 * 1. Converts Markdown tables to bullet cards
 * 2. Converts ### and #### headers into clean bold emoji headers (Telegram doesn't support # headers)
 * 3. Cleans triple asterisks ***text*** to *text*
 */
function cleanTelegramMarkdown(text) {
  if (!text) return '';

  // 1. Convert tables
  let cleaned = convertMarkdownTables(text);

  // 2. Convert markdown headers (### and ####) into clean bold emoji headings
  cleaned = cleaned.replace(/^[ \t]*#{4,6}\s*(.+)$/gm, '🔸 *$1*');
  cleaned = cleaned.replace(/^[ \t]*#{1,3}\s*(.+)$/gm, '🔹 *$1*');

  // 3. Clean triple asterisks
  cleaned = cleaned.replace(/\*\*\*([^*]+)\*\*\*/g, '*$1*');

  return cleaned;
}

/**
 * Splits text into safe chunks for Telegram's 4096 character limit
 */
function splitMessage(text, maxLength = 3900) {
  if (!text) return [''];
  const formattedText = cleanTelegramMarkdown(text);
  if (formattedText.length <= maxLength) return [formattedText];
  const chunks = [];
  let current = '';

  const paragraphs = formattedText.split('\n\n');
  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxLength) {
      if (current.length > 0) chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }
  return chunks;
}

function formatPrescriptionReport(p, aiText = '') {
  let msg = `🏃 *PRESCRIPCIÓN DE ACTIVIDAD FÍSICA & SALUD*\n\n`;
  msg += `⚡ *Batería Corporal:* *${p.readinessScore}/100* (${p.readinessLevel})\n`;
  msg += `🧠 *Tono Vagal / Autónomo:* *${p.ansScore}/100*\n`;
  msg += `📈 *Carga ACWR:* *${p.acwr}* (${p.acwrZone})\n\n`;
  msg += `🎯 *Sesión Prescrita:* *${p.sessionType}* ${p.icon}\n`;
  msg += `⚡ *Nivel:* *${p.intensityTag}*\n`;
  msg += `❤️ *Frecuencia Cardíaca Objetivo:* *${p.targetHeartZone}*\n`;
  msg += `⏱️ *Duración Recomendada:* *${p.targetDurationMin} minutos*\n`;
  msg += `🏃 *Actividades Sugeridas:* ${p.allowedActivities.join(', ')}\n\n`;
  msg += `💡 *Enfoque Preventivo:* ${p.primaryFocus}\n`;
  msg += `🥗 *Directriz de Hábitos:* ${p.nutritionAdvice}\n\n`;

  if (aiText) {
    msg += `🩺 *Guía de Movimiento y Hábitos (Gemini 3.8 Flash):*\n${aiText}\n`;
  }

  return msg;
}

function formatAutonomicReport(ans, aiText = '') {
  let msg = `🧠 *SISTEMA NERVIOSO AUTÓNOMO & TONO VAGAL*\n\n`;
  msg += `📊 *Score Autonómico:* *${ans.ansScore}/100* (${ans.state})\n`;
  msg += `📉 *Descenso Cardíaco Nocturno (Dip):* *${ans.nocturnalDipPct}%* (${ans.dippingStatus})\n`;
  msg += `🛌 *Pulso en Reposo (RHR):* *${ans.currentRhr} bpm* (Base: ${ans.baselineRhr} bpm | Delta: ${ans.rhrDelta > 0 ? '+' : ''}${ans.rhrDelta} bpm)\n`;
  msg += `🔋 *Ratio Restaurativo de Sueño:* *${ans.sleepRecoveryRatio}* (Ideal > 0.60)\n`;
  msg += `⚡ *Índice de Tensión Cardíaca (CSI):* *${ans.cardiovascularStrainIndex}/100*\n`;
  msg += `🌿 *Tono Vagal:* ${ans.vagalTone}\n\n`;

  if (aiText) {
    msg += `💡 *Diagnóstico Clínico de Gemini:*\n${aiText}\n`;
  }

  return msg;
}

function formatBiologicalAgeReport(bio, aiText = '') {
  let msg = `🧬 *EVALUACIÓN DE EDAD BIOLÓGICA Y LONGEVIDAD*\n\n`;
  msg += `🎂 *Edad Cronológica Referencial:* *${bio.chronologicalReferenceAge} años*\n`;
  msg += `⚡ *Edad Biológica Biométrica:* *${bio.biologicalFitnessAge} años*\n`;
  msg += `🏆 *Score de Longevidad Celular:* *${bio.longevityScore}/100*\n`;
  msg += `🌟 *Veredicto:* ${bio.verdict}\n\n`;

  msg += `*Factores Determinantes:*\n`;
  bio.contributors.forEach(c => {
    msg += `• ${c.factor}: *${c.impactYears > 0 ? '+' : ''}${c.impactYears} años*\n`;
  });
  msg += `\n`;

  if (aiText) {
    msg += `🩺 *Estrategia de Longevidad (Gemini 3.8 Flash):*\n${aiText}\n`;
  }

  return msg;
}

function formatAcwrReport(acwrData) {
  let msg = `📈 *CONTROL DE ACTIVIDAD & CARGA FÍSICA (ACWR)*\n\n`;
  msg += `⚖️ *Ratio Agudo:Crónico (ACWR):* *${acwrData.acwr}* ${acwrData.statusColor}\n`;
  msg += `🎯 *Zona de Rendimiento:* *${acwrData.zone}*\n`;
  msg += `⚡ *Carga Aguda (Últimos 7 días):* *${acwrData.acuteLoad} pts*\n`;
  msg += `🏋️ *Carga Crónica Base (Media semanal):* *${acwrData.chronicLoadWeeklyAvg} pts/sem*\n`;
  msg += `🛡️ *Riesgo Lesional Estimado:* *${acwrData.riskFactor}*\n\n`;
  msg += `💡 *Directriz de Movimiento:* ${acwrData.recommendation}\n`;

  return msg;
}

function formatWeightReport(weightData) {
  if (!weightData) {
    return '❌ No hay registros de peso disponibles en la carpeta de Health Sync.';
  }

  let msg = `⚖️ *MONITOR DE PESO Y COMPOSICIÓN CORPORAL*\n\n`;
  msg += `📅 *Fecha de registro:* ${weightData.datetime}\n`;
  msg += `⚖️ *Peso Corporal:* *${weightData.weightKg} kg*\n`;
  if (weightData.bodyFatPct > 0) {
    msg += `📉 *Grasa Corporal:* *${weightData.bodyFatPct}%*\n`;
  }
  if (weightData.muscleMassKg > 0) {
    msg += `💪 *Masa Muscular:* *${weightData.muscleMassKg} kg*\n`;
  }
  if (weightData.waterPct > 0) {
    msg += `💧 *Agua Corporal:* *${weightData.waterPct}%*\n`;
  }
  if (weightData.bmrCalories > 0) {
    msg += `🔥 *Metabolismo Basal (BMR):* *${weightData.bmrCalories} kcal*\n`;
  }
  return msg;
}

function formatOxygenReport(ox) {
  if (!ox) {
    return '❌ No hay registros de saturación de oxígeno (SpO2) disponibles en la carpeta de Health Sync.';
  }

  let msg = `💨 *MONITOR DE SATURACIÓN DE OXÍGENO (SpO2)*\n\n`;
  msg += `📅 *Fecha:* ${ox.date}\n`;
  msg += `💨 *SpO2 Promedio del Día:* *${ox.avgSpo2}%*\n`;
  msg += `📉 *Mínimo Registrado:* *${ox.minSpo2}%* | 📈 *Máximo:* *${ox.maxSpo2}%*\n`;
  msg += `🌙 *Media Nocturna:* *${ox.nocturnalAvgSpo2}%* | ☀️ *Media Diurna:* *${ox.daytimeAvgSpo2}%*\n`;
  msg += `⚠️ *Caídas < 95%:* ${ox.dropsBelow95Count} | *Caídas severas < 90%:* ${ox.dropsBelow90Count}\n`;
  msg += `🩺 *Riesgo Respiratorio:* *${ox.respiratoryRisk === 'NORMAL' ? '🟢 Normal (Vías despejadas)' : ox.respiratoryRisk === 'MODERADO' ? '🟡 Moderado (Monitorear)' : '🔴 Alto'}*\n\n`;
  msg += `💡 *Criterio Clínico:* En una persona de 20 años sana, niveles diurnos de 95% a 99% son óptimos.`;
  return msg;
}

module.exports = {
  renderProgressBar,
  formatSleepSummary,
  formatWorkoutReport,
  formatReadinessReport,
  formatHeartReport,
  formatStepsReport,
  formatPrescriptionReport,
  formatAutonomicReport,
  formatBiologicalAgeReport,
  formatAcwrReport,
  formatWeightReport,
  formatOxygenReport,
  convertMarkdownTables,
  cleanTelegramMarkdown,
  splitMessage
};


