/**
 * Formatting utilities for Telegram Markdown messages with ASCII graphs and emojis.
 */

function renderProgressBar(percentage, length = 10) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clamped / 100) * length);
  const empty = length - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${clamped.toFixed(0)}%`;
}

function formatSleepSummary(sleep, aiText = '') {
  if (!sleep) return '❌ No se encontraron registros de sueño recientes.';

  const deepBar = renderProgressBar(sleep.deepPct);
  const remBar = renderProgressBar(sleep.remPct);
  const lightBar = renderProgressBar(sleep.lightPct);

  let msg = `🌙 *REPORTE DE SUEÑO — Noche del ${sleep.date}*\n\n`;
  msg += `⏱️ *Tiempo en cama:* ${sleep.inBedHours}h (${sleep.startTime.split(' ')[1]} ➔ ${sleep.endTime.split(' ')[1]})\n`;
  msg += `💤 *Tiempo real dormido:* *${sleep.totalSleepHours}h*\n`;
  msg += `📊 *Eficiencia del sueño:* *${sleep.efficiencyPct}%* (Score: *${sleep.sleepScore}/100*)\n`;
  msg += `🔄 *Ciclos ultradianos completos:* *${sleep.cyclesCount}* (${sleep.wokenUpInDeep ? '⚠️ Despertar en fase profunda' : '✅ Despertar suave'})\n\n`;

  msg += `*Desglose de Fases:*\n`;
  msg += `• 🧠 *Fase REM:* ${(sleep.remSeconds / 60).toFixed(0)} min | ${remBar}\n`;
  msg += `• 🔋 *Profundo:* ${(sleep.deepSeconds / 60).toFixed(0)} min | ${deepBar}\n`;
  msg += `• 🛋️ *Ligero:* ${(sleep.lightSeconds / 60).toFixed(0)} min | ${lightBar}\n`;
  msg += `• 👀 *Despierto:* ${(sleep.awakeSeconds / 60).toFixed(0)} min (${sleep.awakeCount} microdespertares)\n\n`;

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
  msg += `❤️ *Frecuencia Media:* *${workout.avgHr} bpm* | *Pico Máximo:* *${workout.maxHr} bpm*\n`;
  msg += `⚡ *Nivel de Intensidad:* *${workout.intensity}*\n`;
  msg += `📈 *Carga de Entrenamiento (EPOC):* *${workout.trainingLoad} pts*\n\n`;

  msg += `🔋 *ESTADO DE RECUPERACIÓN BIOLÓGICA:*\n`;
  msg += `• *Tiempo Total de Descanso Necesario:* *${workout.recoveryHoursTotal} horas*\n`;
  msg += `• *Estado Actual:* *${workout.recoveryStatus}*\n\n`;

  if (aiText) {
    msg += `🩺 *Evaluación del Entrenador (Gemini 3.8 Flash):*\n${aiText}\n`;
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
 * Splits text into safe chunks for Telegram's 4096 character limit
 */
function splitMessage(text, maxLength = 3900) {
  if (!text || text.length <= maxLength) return [text];
  const chunks = [];
  let current = '';

  const paragraphs = text.split('\n\n');
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
  let msg = `🏋️‍♂️ *PRESCRIPCIÓN DIARIA DE ENTRENAMIENTO*\n\n`;
  msg += `⚡ *Batería Corporal:* *${p.readinessScore}/100* (${p.readinessLevel})\n`;
  msg += `🧠 *Tono Vagal / Autónomo:* *${p.ansScore}/100*\n`;
  msg += `📈 *Carga ACWR:* *${p.acwr}* (${p.acwrZone})\n\n`;
  msg += `🎯 *Sesión Prescrita:* *${p.sessionType}* ${p.icon}\n`;
  msg += `⚡ *Nivel:* *${p.intensityTag}*\n`;
  msg += `❤️ *Frecuencia Cardíaca Objetivo:* *${p.targetHeartZone}*\n`;
  msg += `⏱️ *Duración Recomendada:* *${p.targetDurationMin} minutos*\n`;
  msg += `🏃 *Actividades Sugeridas:* ${p.allowedActivities.join(', ')}\n\n`;
  msg += `💡 *Enfoque Fisiológico:* ${p.primaryFocus}\n`;
  msg += `🥗 *Directriz Nutricional:* ${p.nutritionAdvice}\n\n`;

  if (aiText) {
    msg += `🩺 *Estructura Detallada de la Sesión (Gemini Coach):*\n${aiText}\n`;
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
  let msg = `📈 *CONTROL DE CARGA DE ENTRENAMIENTO (ACWR)*\n\n`;
  msg += `⚖️ *Ratio Agudo:Crónico (ACWR):* *${acwrData.acwr}* ${acwrData.statusColor}\n`;
  msg += `🎯 *Zona de Rendimiento:* *${acwrData.zone}*\n`;
  msg += `⚡ *Carga Aguda (Últimos 7 días):* *${acwrData.acuteLoad} pts*\n`;
  msg += `🏋️ *Carga Crónica Base (Media semanal):* *${acwrData.chronicLoadWeeklyAvg} pts/sem*\n`;
  msg += `🛡️ *Riesgo Lesional Estimado:* *${acwrData.riskFactor}*\n\n`;
  msg += `💡 *Directriz Deportiva:* ${acwrData.recommendation}\n`;

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
  splitMessage
};

