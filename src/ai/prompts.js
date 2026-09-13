/**
 * Optimized prompt templates designed for high-density physiological insights
 * while minimizing input and output token consumption (< 600 input, < 400 output).
 */

const SYSTEM_INSTRUCTION = `Eres el Asistente Biométrico y Médico Deportólogo de élite de un atleta que utiliza un smartwatch Huawei con sensores TruSense.
Tu objetivo es analizar los datos biométricos procesados (sueño, pulso, variabilidad, pasos, oxígeno) y ofrecer diagnósticos claros, empáticos y accionables.
REGLAS ESTRICTAS:
1. Responde SIEMPRE en español, con tono motivador, riguroso y profesional.
2. Sé conciso y directo: usa listas con viñetas, negritas y emojis representativos.
3. No saludes con párrafos largos. Ve directo al diagnóstico.
4. Explica siempre el 'por qué' biológico detrás de los números (ej. por qué subió el pulso o por qué la fase REM fue alta).
5. Termina con 1 o 2 recomendaciones prácticas para el día.`;

function buildSleepPrompt(sleepData, prevSleepData) {
  return `Analiza la última noche de sueño con los siguientes datos precalculados:
- Noche analizada: ${sleepData.date} (${sleepData.startTime} a ${sleepData.endTime})
- Tiempo total en cama: ${sleepData.inBedHours}h | Tiempo real dormido: ${sleepData.totalSleepHours}h
- Eficiencia del sueño: ${sleepData.efficiencyPct}%
- Fases: Profundo: ${sleepData.deepPct}% (${(sleepData.deepSeconds/60).toFixed(0)} min) | REM: ${sleepData.remPct}% (${(sleepData.remSeconds/60).toFixed(0)} min) | Ligero: ${sleepData.lightPct}% | Despierto: ${sleepData.awakePct}% (${(sleepData.awakeSeconds/60).toFixed(0)} min, ${sleepData.awakeCount} despertares)
- Ciclos ultradianos completos (~90m): ${sleepData.cyclesCount}
- Despertó en fase profunda: ${sleepData.wokenUpInDeep ? 'SÍ (puede causar inercia/aturdimiento)' : 'NO'}
${prevSleepData ? `- Noche anterior de referencia: ${prevSleepData.date} (${prevSleepData.totalSleepHours}h dormido, REM: ${prevSleepData.remPct}%, Profundo: ${prevSleepData.deepPct}%)` : ''}

Entrega:
1. Calificación y veredicto general (🟢/🟡/🔴).
2. Interpretación de la calidad de fases (REM y Profundo).
3. Comparación rápida contra la noche anterior.
4. Recomendación del día para optimizar la noche siguiente.`;
}

function buildReadinessPrompt(readinessData) {
  const c = readinessData.components;
  return `Evalúa el nivel de Batería Corporal y Score de Recuperación para hoy:
- Score de Recuperación: ${readinessData.score}/100 [Nivel: ${readinessData.level} ${readinessData.color}]
- Sueño anoche: ${c.sleepHours}h (Eficiencia: ${c.efficiencyPct}%, Profundo: ${c.deepPct}%, REM: ${c.remPct}%)
- Frecuencia Cardíaca en Reposo (RHR): ${c.currentRhr} bpm (Promedio base de 7 días: ${c.baselineRhr} bpm, Delta: ${c.rhrDelta > 0 ? '+' : ''}${c.rhrDelta} bpm)
- Oxígeno Mínimo (SpO2): ${c.minSpo2}%

Entrega:
1. Estado del semáforo de recuperación y lo que significa para hoy.
2. ¿Qué intensidad de entrenamiento o actividad física tolera el cuerpo hoy (Alta, Media, Descanso Activo)?
3. Acción clave para maximizar energía durante el día.`;
}

function buildHeartPrompt(heartData, rhrTrend, stressSpikes) {
  return `Analiza el estado cardiovascular de hoy:
- Frecuencia media: ${heartData.avgBpm} bpm | Mínima: ${heartData.minBpm} bpm | Máxima: ${heartData.maxBpm} bpm
- Frecuencia Cardíaca en Reposo (RHR): ${heartData.restingHeartRate} bpm (Media reciente de 7 días: ${rhrTrend.recent7DaysAvgRhr} bpm)
- Zonas de tiempo: Z1 (Reposo): ${heartData.zones.z1Pct}% | Z2 (Quema Grasa): ${heartData.zones.z2Pct}% | Z3 (Cardio): ${heartData.zones.z3Pct}% | Z4 (Anaeróbica): ${heartData.zones.z4Pct}% | Z5 (Máxima): ${heartData.zones.z5Pct}%
- Episodios de taquicardia en reposo (Picos de estrés >100 bpm sin pasos): ${stressSpikes.length} episodios.

Entrega:
1. Diagnóstico del pulso en reposo y carga autonómica.
2. Desglose del esfuerzo en zonas cardíacas.
3. Veredicto sobre los picos de estrés si los hubo.`;
}

function buildWeeklyPrompt(summaryData) {
  return `Genera el Informe Ejecutivo Semanal de Salud Biométrica:
${JSON.stringify(summaryData, null, 2)}

Entrega:
1. Resumen de progreso de la semana (Logros vs Áreas a Mejorar).
2. Evolución del descanso y del corazón en reposo.
3. Las 2 metas prioritarias para la semana entrante.`;
}

function buildConversationPrompt(userQuestion, healthSnapshot) {
  return `Contexto biométrico más reciente del usuario:
${JSON.stringify(healthSnapshot, null, 2)}

Pregunta del usuario: "${userQuestion}"

Responde a su duda de forma precisa, basándote en sus números reales.`;
}

module.exports = {
  SYSTEM_INSTRUCTION,
  buildSleepPrompt,
  buildReadinessPrompt,
  buildHeartPrompt,
  buildWeeklyPrompt,
  buildConversationPrompt
};
