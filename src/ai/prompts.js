/**
 * Optimized prompt templates designed for high-density physiological insights
 * with concise, punchy, athlete-friendly executive summaries without text spam.
 */

const SYSTEM_INSTRUCTION = `Eres el Coach Biométrico y Médico Deportólogo personal de Miguel (21 años, deportista activo).
Tu misión es interpretar con rigor y máxima claridad los datos fisiológicos de su Huawei GT (tecnología TruSense).

REGLAS DE ORO DE ESTILO Y EXTENSIÓN:
1. EQUILIBRIO EN LA EXTENSIÓN (PUNCHY Y DIRECTO):
   - Sé conciso, dinámico y al grano. NUNCA escribas parrafadas teóricas interminables ni ensayos académicos que nadie lee en Telegram.
   - En respuestas a consultas (/pregunta): máximo 2 o 3 párrafos breves o viñetas directas.
   - En diagnósticos (/comodormi, /prescripcion, /edad_biologica): mantén un formato ejecutivo de 150 a 300 palabras, destacando los números clave y qué hacer hoy.
2. LENGUAJE ENTENDIBLE (CERO RELLENO BIOQUÍMICO):
   - Prohibido abusar de términos complejos innecesarios (como PGC-1α, AMPK, autofagia celular, mitofagia, senescencia) a menos que el usuario pregunte específicamente por ellos.
   - Explica el impacto práctico en energía, rendimiento y recuperación muscular con lenguaje natural, motivador y claro.
3. PROHIBICIÓN TOTAL DE ENCABEZADOS CON HASHTAGS (#, ##, ###, ####):
   - Telegram NO renderiza encabezados con '#' y se ven horribles. NUNCA uses '#' para títulos.
   - Usa SIEMPRE negrita con emojis para separar secciones (ejemplo: 🔹 *Veredicto Clínico:* o 🎯 *Consejo de Hoy:*).
4. PROHIBICIÓN TOTAL DE TABLAS MARKDOWN:
   - Telegram no soporta tablas (| col | col |). Presenta comparaciones en listas con viñetas elegantes (ejemplo: • Métrica: Noche 1 ➔ Noche 2 — Detalle).
5. EDAD REAL DEL ATLETA:
   - Miguel tiene 21 años (nacido en 2004). NUNCA inventes que tiene 28 años ni supongas otra edad.`;

function buildSleepPrompt(sleepData, prevSleepData) {
  return `Analiza la última noche de sueño con estos datos biométricos exactos:
- Fecha: ${sleepData.date}
- Horario en cama: ${sleepData.startTime} ➔ ${sleepData.endTime} (${sleepData.inBedHours}h en cama)
- Tiempo real dormido: ${sleepData.totalSleepHours}h (Eficiencia: ${sleepData.efficiencyPct}%, Score: ${sleepData.sleepScore}/100)
- Fases: REM ${sleepData.remPct}%, Profundo ${sleepData.deepPct}%, Ligero ${sleepData.lightPct}%, Despierto ${sleepData.awakePct}% (${sleepData.awakeCount} microdespertares)
- Ciclos ultradianos (~90 min): ${sleepData.cyclesCount} ciclos | Despertar: fase ${sleepData.lastStage.toUpperCase()}
${prevSleepData ? `- Noche anterior (${prevSleepData.date}): ${prevSleepData.totalSleepHours}h (REM: ${prevSleepData.remPct}%, Profundo: ${prevSleepData.deepPct}%)` : ''}

INSTRUCCIONES DE RESPUESTA:
- Sé conciso, ejecutivo y ágil (máximo 250 palabras). NO uses encabezados '#' ni tablas '|'.
- Estructura con negrita y emojis:
  🏆 *Veredicto General:* 1-2 frases con la nota y sensación física esperada hoy.
  🧠 *Recuperación Mental & Física:* Breve balance del sueño profundo y REM en viñetas cortas.
  📈 *Comparativa vs Noche Anterior:* 2 viñetas breves (ej: • Métrica: Noche A ➔ Noche B).
  🎯 *Consejos Prácticos para Hoy:* 2 acciones claras y directas.`;
}

function buildWorkoutPrompt(workoutData) {
  return `Analiza el último entrenamiento registrado:
- Actividad: ${workoutData.type} | Fecha: ${workoutData.datetime}
- Duración: ${workoutData.durationMinutes} min | Calorías: ${workoutData.calories} kcal | Distancia: ${workoutData.distanceKm} km
- Pulso: Media ${workoutData.avgHr} bpm | Pico ${workoutData.maxHr} bpm | Intensidad: ${workoutData.intensity}
- Carga EPOC: ${workoutData.trainingLoad} pts | Horas de recuperación: ${workoutData.recoveryHoursTotal}h (Restantes: ${workoutData.hoursRemaining}h)

INSTRUCCIONES:
- Sé dinámico y al grano (máximo 200 palabras). NO uses '#' ni tablas '|'.
- Estructura:
  💥 *Impacto Cardiovascular:* Análisis rápido del pulso medio vs pico.
  🔋 *Carga & Recuperación:* Estado muscular y horas recomendadas antes de volver a exigir el cuerpo.
  🥗 *Nutrición Post-Entreno:* Qué reponer hoy de forma sencilla.`;
}

function buildReadinessPrompt(readinessData) {
  const c = readinessData.components;
  return `Evalúa la Batería Corporal y Score de Recuperación para hoy:
- Score: ${readinessData.score}/100 [Nivel: ${readinessData.level} ${readinessData.color}]
- Sueño: ${c.sleepHours}h (Eficiencia: ${c.efficiencyPct}%, Profundo: ${c.deepPct}%, REM: ${c.remPct}%)
- RHR en reposo: ${c.currentRhr} bpm (Base 7d: ${c.baselineRhr} bpm, Delta: ${c.rhrDelta > 0 ? '+' : ''}${c.rhrDelta} bpm)
- Oxígeno mínimo: ${c.minSpo2}%

INSTRUCCIONES:
- Sé breve y ejecutivo (máximo 150 palabras). NO uses '#' ni tablas '|'.
- Estructura:
  ⚡ *Semáforo de Energía:* Qué significa el score para tu jornada.
  🏋️ *Capacidad de Entrenamiento Hoy:* Nivel de exigencia física sugerido.
  🎯 *Acción Clave:* 1 consejo para optimizar tu día.`;
}

function buildHeartPrompt(heartData, rhrTrend, stressSpikes) {
  return `Analiza el estado cardiovascular de hoy:
- Pulso: Media ${heartData.avgBpm} bpm | Mín ${heartData.minBpm} bpm | Máx ${heartData.maxBpm} bpm
- RHR en reposo: ${heartData.restingHeartRate} bpm (Media 7d: ${rhrTrend.recent7DaysAvgRhr} bpm)
- Zonas: Z1 ${heartData.zones.z1Pct}%, Z2 ${heartData.zones.z2Pct}%, Z3 ${heartData.zones.z3Pct}%, Z4 ${heartData.zones.z4Pct}%, Z5 ${heartData.zones.z5Pct}%
- Taquicardias en reposo: ${stressSpikes.length} episodios.

INSTRUCCIONES:
- Sé claro y conciso (máximo 180 palabras). NO uses '#' ni tablas '|'.
- Estructura:
  ❤️ *Diagnóstico Cardiovascular:* Análisis del RHR y estabilidad.
  📊 *Zonas del Día:* Balance de intensidades.
  ⚡ *Veredicto de Estrés:* Conclusión sobre los picos en reposo.`;
}

function buildWeeklyPrompt(summaryData) {
  return `Genera el Informe Ejecutivo Semanal de Salud:
${JSON.stringify(summaryData, null, 2)}

INSTRUCCIONES:
- Formato ejecutivo y claro (máximo 250 palabras). NO uses '#' ni tablas '|'.
- Estructura:
  📈 *Balance de la Semana:* Logros principales y tendencias de pulso/sueño.
  🎯 *2 Metas Prioritarias:* Objetivos concretos para la próxima semana.`;
}

function buildConversationPrompt(userQuestion, healthSnapshot) {
  const r = healthSnapshot.readiness || {};
  const s = healthSnapshot.ultimoSueno || {};
  const h = healthSnapshot.ultimoPulso || {};
  const a = healthSnapshot.balanceAutonomo || {};
  const w = healthSnapshot.ultimoEntrenamiento || {};
  const p = healthSnapshot.ultimosPasos || {};
  const c = healthSnapshot.cargaAcwr || {};
  const bio = healthSnapshot.edadBiologica || {};

  return `Contexto biométrico del usuario:
- Atleta: Miguel (21 años, nacido en 2004)
- Batería Corporal: ${r.score || 85}/100 (${r.level || 'MODERADO'})
- Sueño anoche: ${s.totalSleepHours || 7.4}h (Profundo: ${s.deepPct || 16}%, REM: ${s.remPct || 29}%, Eficiencia: ${s.efficiencyPct || 93}%)
- Pulso en reposo: ${h.restingHeartRate || 45} bpm (Dip nocturno: ${a.nocturnalDipPct || 11}%)
- Pasos hoy: ${p.totalSteps || 0} pasos
- Último entrenamiento: ${w.type || 'Ninguno'} (Recuperación: ${w.recoveryStatus || 'Listo'})
- Carga ACWR: ${c.acwr || 0.2} (${c.zone || 'Normal'})
- Edad Biológica: ${bio.biologicalFitnessAge || 20} años (Edad real de Miguel: 21 años)

Pregunta del usuario: "${userQuestion}"

INSTRUCCIONES DE RESPUESTA:
1. Responde DIRECTA y EXCLUSIVAMENTE a la duda planteada por Miguel.
2. Sé conciso y breve: máximo 2 o 3 párrafos cortos o viñetas directas.
3. NO uses encabezados '#' ni tablas '|'.
4. NUNCA menciones que tiene 28 años: Miguel tiene 21 años.
5. Lenguaje cercano, motivador y sin rodeos.`;
}

function buildPrescriptionPrompt(p) {
  return `Diseña la sesión de entrenamiento personalizada para hoy:
- Atleta: Miguel (21 años) | Batería Corporal: ${p.readinessScore}/100 | Tono Vagal: ${p.ansScore}/100
- Carga ACWR: ${p.acwr} (${p.acwrZone}) | Sesión Prescrita: ${p.sessionType} [${p.intensityLevel} ${p.icon}]
- Rango Cardíaco Objetivo (Karvonen): ${p.targetHeartZone} | Duración Sugerida: ${p.targetDurationMin} min
- Actividades Permitidas: ${p.allowedActivities.join(', ')}
- Enfoque: ${p.primaryFocus}

INSTRUCCIONES:
- Sé directo, práctico y motivador (máximo 250 palabras). NO uses '#' ni tablas '|'.
- Estructura:
  🎯 *Sesión de Hoy:* Objetivo, duración y zona de pulso objetivo.
  ⏱️ *Estructura del Entreno:* Calentamiento (5 min), Bloque Principal y Vuelta a la Calma.
  🥗 *Nutrición & Hidratación Rápida:* 2 pautas claras antes y después.`;
}

function buildAutonomicPrompt(ans) {
  return `Diagnóstico del Sistema Nervioso Autónomo y Tono Vagal:
- Score Autonómico: ${ans.ansScore}/100 [${ans.state}]
- Dip Cardíaco Nocturno: ${ans.nocturnalDipPct}% (${ans.dippingStatus})
- Frecuencia en Reposo: ${ans.currentRhr} bpm (Base 7d: ${ans.baselineRhr} bpm)
- Ratio Recuperación Sueño: ${ans.sleepRecoveryRatio}

INSTRUCCIONES:
- Sé conciso y al grano (máximo 200 palabras). NO uses '#' ni tablas '|'.
- Estructura:
  🧠 *Balance Autónomo:* 2 líneas sobre tu tono vagal y fatiga acumulada.
  ❤️ *Salud Cardíaca Nocturna:* Evaluación breve del dip nocturno.
  🧘 *Consejo de Regulación Vagal:* 1 o 2 pautas prácticas para hoy.`;
}

function buildBiologicalAgePrompt(bio) {
  return `Evaluación de Edad Biológica y Salud Celular:
- Atleta: Miguel, 21 años cronológicos (IMPORTANTE: tiene 21 años, NUNCA digas 28 años).
- Edad Biológica Calculada: ${bio.biologicalFitnessAge} años (${bio.rejuvenationYears > 0 ? `${bio.rejuvenationYears} años más joven` : 'en equilibrio'})
- Score de Longevidad Celular: ${bio.longevityScore}/100
- Factores Determinantes:
${bio.contributors.map(c => `  • ${c.factor}: ${c.impactYears > 0 ? '+' : ''}${c.impactYears} años`).join('\n')}

INSTRUCCIONES DE RESPUESTA:
- Sé breve, ágil y motivador (máximo 200 palabras).
- PROHIBIDO usar jerga bioquímica pesada (nada de PGC-1α, AMPK, mitofagia, senescencia celular).
- NO uses encabezados '#' ni tablas '|'.
- Estructura:
  🧬 *Veredicto:* 2 líneas explicando por qué su cuerpo rinde a esta edad biológica.
  ⚡ *Puntos Fuertes:* 2 viñetas clave.
  🚀 *2 Consejos Prácticos de Longevidad:* 2 hábitos sencillos y aplicables para el día a día.`;
}

module.exports = {
  SYSTEM_INSTRUCTION,
  buildSleepPrompt,
  buildWorkoutPrompt,
  buildReadinessPrompt,
  buildHeartPrompt,
  buildWeeklyPrompt,
  buildConversationPrompt,
  buildPrescriptionPrompt,
  buildAutonomicPrompt,
  buildBiologicalAgePrompt
};
