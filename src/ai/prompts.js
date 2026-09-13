/**
 * Optimized prompt templates designed for high-density physiological insights
 * with generous space for thorough, complete analyses without premature cutoffs.
 */

const SYSTEM_INSTRUCTION = `Eres el Asistente Biométrico y Médico Deportólogo de élite de un atleta que utiliza un smartwatch Huawei GT con tecnología biométrica TruSense.
Tu misión es interpretar con rigor científico, profundidad y calidez los datos fisiológicos (sueño, variabilidad, pulso en reposo, zonas cardíacas, actividades y entrenamientos).
REGLAS IMPORTANTES:
1. Responde SIEMPRE en español, con un tono motivador, profesional y exhaustivo.
2. Desarrolla las respuestas de forma COMPLETA: no dejes secciones incompletas ni a medias. Explica el contexto biológico detrás de cada cifra.
3. Utiliza formato Markdown limpio con negritas, listas ordenadas y emojis claros.
4. Analiza siempre los 'por qué': por ejemplo, qué relación hay entre el esfuerzo físico, la temperatura, el pulso en reposo y las fases de sueño.
5. Termina SIEMPRE con recomendaciones prácticas y accionables para el atleta.`;

function buildSleepPrompt(sleepData, prevSleepData) {
  return `Realiza un análisis completo y detallado de la última noche de sueño con estos datos biométricos exactos:
- Fecha de la noche: ${sleepData.date}
- Horario en cama: ${sleepData.startTime} ➔ ${sleepData.endTime} (Total en cama: ${sleepData.inBedHours} horas)
- Tiempo real dormido: ${sleepData.totalSleepHours} horas
- Eficiencia del sueño: ${sleepData.efficiencyPct}% (Puntuación de sueño: ${sleepData.sleepScore}/100)
- Fases del sueño:
  • Fase REM: ${sleepData.remPct}% (${(sleepData.remSeconds / 60).toFixed(0)} min) [Ideal: 20-25%]
  • Sueño Profundo: ${sleepData.deepPct}% (${(sleepData.deepSeconds / 60).toFixed(0)} min) [Ideal: 15-20%]
  • Sueño Ligero: ${sleepData.lightPct}% (${(sleepData.lightSeconds / 60).toFixed(0)} min)
  • Tiempo Despierto: ${sleepData.awakePct}% (${(sleepData.awakeSeconds / 60).toFixed(0)} min en ${sleepData.awakeCount} microdespertares)
- Ciclos ultradianos (~90 min): ${sleepData.cyclesCount} ciclos completados
- Estado al despertar: Despertó en fase ${sleepData.lastStage.toUpperCase()} (${sleepData.wokenUpInDeep ? 'Fase profunda - Riesgo de inercia del sueño' : 'Fase ligera/REM - Despertar óptimo'})
${prevSleepData ? `- Noche anterior comparativa (${prevSleepData.date}): Durmió ${prevSleepData.totalSleepHours}h (REM: ${prevSleepData.remPct}%, Profundo: ${prevSleepData.deepPct}%, Eficiencia: ${prevSleepData.efficiencyPct}%)` : ''}

Estructura tu diagnóstico de forma completa:
1. 🏆 **Veredicto Clínico General:** Calificación de 1 a 100 con justificación.
2. 🧠 **Análisis de Recuperación Mental (Fase REM) y Física (Sueño Profundo):** Qué beneficios celulares y cognitivos obtuvo el atleta con estos porcentajes.
3. 🔄 **Evaluación de Ciclos e Higiene Circadiana:** Regularidad del horario, latencia y si el despertar fue limpio.
4. 📈 **Comparativa vs Noche Anterior:** Progresos o cambios notables.
5. 🎯 **2 Consejos Accionables:** Recomendaciones precisas para el día de hoy.`;
}

function buildWorkoutPrompt(workoutData) {
  return `Realiza un análisis profundo del último entrenamiento registrado por el smartwatch:
- Tipo de actividad / Deporte: ${workoutData.type}
- Fecha y hora: ${workoutData.datetime}
- Duración activa: ${workoutData.durationMinutes} minutos (${workoutData.activeSeconds} seg)
- Gasto calórico: ${workoutData.calories} kcal
- Distancia recorrida: ${workoutData.distanceKm} km
- Frecuencia cardíaca media: ${workoutData.avgHr} bpm
- Frecuencia cardíaca máxima (Pico): ${workoutData.maxHr} bpm
- Nivel de intensidad calculado: ${workoutData.intensity}
- Carga de entrenamiento estimada (EPOC): ${workoutData.trainingLoad} puntos
- Tiempo total de recuperación sugerido: ${workoutData.recoveryHoursTotal} horas
- Estado actual de recuperación: ${workoutData.recoveryStatus} (${workoutData.hoursRemaining}h restantes)

Estructura tu análisis:
1. 💥 **Evaluación del Rendimiento Cardiovascular:** Análisis del pulso medio vs pico máximo y zonas alcanzadas.
2. 🔋 **Carga Fisiológica y Desgaste Metabólico:** Impacto en el sistema neuromuscular y consumo calórico.
3. ⏱️ **Cronograma de Recuperación Biológica:** Cuántas horas necesita el cuerpo para supercompensar y cuándo conviene volver a entrenar fuerte.
4. 🥗 **Estrategia Nutricional y de Hidratación:** Qué reponer hoy para acelerar la regeneración muscular.`;
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
  const r = healthSnapshot.readiness || {};
  const s = healthSnapshot.ultimoSueno || {};
  const h = healthSnapshot.ultimoPulso || {};
  const a = healthSnapshot.balanceAutonomo || {};
  const w = healthSnapshot.ultimoEntrenamiento || {};
  const p = healthSnapshot.ultimosPasos || {};
  const c = healthSnapshot.cargaAcwr || {};
  const bio = healthSnapshot.edadBiologica || {};

  return `Contexto biométrico del usuario:
- Batería Corporal (Readiness): ${r.score || 85}/100 (${r.level || 'MODERADO'})
- Sueño anoche: ${s.totalSleepHours || 7.4}h (Profundo: ${s.deepPct || 16}%, REM: ${s.remPct || 29}%, Eficiencia: ${s.efficiencyPct || 93}%)
- Pulso en reposo: ${h.restingHeartRate || 45} bpm (Dip nocturno: ${a.nocturnalDipPct || 11}%)
- Pasos hoy: ${p.totalSteps || 0} pasos
- Último entrenamiento: ${w.type || 'Ninguno'} (Recuperación: ${w.recoveryStatus || 'Listo'})
- Carga ACWR: ${c.acwr || 0.2} (${c.zone || 'Normal'})
- Edad Biológica: ${bio.biologicalFitnessAge || 22} años (Ref: 28 años)

Mensaje / Pregunta del usuario: "${userQuestion}"

INSTRUCCIONES DE RESPUESTA:
1. Responde DIRECTA y EXCLUSIVAMENTE a la duda o tema puntual que el usuario ha planteado.
2. Sé conciso y al grano: máximo 2 o 3 párrafos breves.
3. NO generes un diagnóstico global de todas las áreas del cuerpo a menos que el usuario te haya pedido explícitamente un resumen general.
4. Mantén un tono motivador, empático y profesional como su médico deportólogo personal.`;
}

function buildPrescriptionPrompt(p) {
  return `Diseña la sesión de entrenamiento personalizada para hoy basada en este diagnóstico multivariable:
- Estado del Atleta: Batería Corporal ${p.readinessScore}/100 (${p.readinessLevel}) | Tono Vagal: ${p.ansScore}/100
- Carga ACWR (Ratio Agudo:Crónico): ${p.acwr} (${p.acwrZone})
- Sesión Prescrita: ${p.sessionType} [Nivel: ${p.intensityLevel} ${p.icon}]
- Rango Cardíaco Objetivo (Fórmula Karvonen): ${p.targetHeartZone}
- Duración Sugerida: ${p.targetDurationMin} minutos
- Actividades Permitidas: ${p.allowedActivities.join(', ')}
- Enfoque Fisiológico: ${p.primaryFocus}
- Fatiga Residual Previa: ${p.residualWorkoutFatigue}

Estructura el entrenamiento de forma profesional y completa:
1. ⏱️ **Protocolo de la Sesión:** Calentamiento neuromuscular (8-10 min), Bloque Central (manteniendo el rango de FC objetivo), y Vuelta a la Calma.
2. 🧬 **Explicación Fisiológica:** Por qué esta intensidad exacta favorece su recuperación o adaptación biológica sin sobreentrenar.
3. 💧 **Estrategia Nutricional e Hidratación:** Qué comer antes y después para máxima absorción y rendimiento.`;
}

function buildAutonomicPrompt(ans) {
  return `Diagnóstico del Sistema Nervioso Autónomo y Tono Vagal:
- Score Autonómico: ${ans.ansScore}/100 [${ans.state}]
- Dip Cardíaco Nocturno: ${ans.nocturnalDipPct}% (${ans.dippingStatus}) [Normal: 10-20%]
- Frecuencia Cardíaca en Reposo: ${ans.currentRhr} bpm (Base 7d: ${ans.baselineRhr} bpm, Delta: ${ans.rhrDelta > 0 ? '+' : ''}${ans.rhrDelta} bpm)
- Ratio de Recuperación de Sueño: ${ans.sleepRecoveryRatio} (Ideal > 0.60)
- Índice de Tensión Cardiovascular (CSI): ${ans.cardiovascularStrainIndex}/100
- Predominio Simpático / Estrés: ${ans.sympatheticOverdrive ? 'SÍ (Alerta de sobrecarga)' : 'NO (Equilibrio adecuado)'}

Entrega un informe clínico:
1. 🧠 **Balance Simpático vs Parasimpático:** Qué nos dice el descenso nocturno de pulso y la variabilidad sobre la fatiga acumulada.
2. ❤️ **Salud Endotelial y Barorreceptores:** Evaluación del fenómeno dipper nocturno.
3. 🧘 **2 Técnicas de Regulación Vagal:** Prácticas para inducir relajación profunda hoy.`;
}

function buildBiologicalAgePrompt(bio) {
  return `Evaluación de Edad Biológica y Salud Celular:
- Edad Cronológica de Referencia: ${bio.chronologicalReferenceAge} años
- Edad Biológica Calculada: ${bio.biologicalFitnessAge} años (${bio.rejuvenationYears > 0 ? `${bio.rejuvenationYears} años más joven` : `${Math.abs(bio.rejuvenationYears)} años de sobrecarga`})
- Score de Longevidad Celular: ${bio.longevityScore}/100
- Factores Determinantes:
${bio.contributors.map(c => `  • ${c.factor}: ${c.impactYears > 0 ? '+' : ''}${c.impactYears} años`).join('\n')}

Entrega:
1. 🧬 **Veredicto de Edad Biológica:** Por qué sus biomarcadores reflejan este estado metabólico y cardiovascular.
2. 🛡️ **Puntos Fuertes y Puntos de Vulnerabilidad.**
3. 🚀 **Plan de Longevidad:** 2 intervenciones de estilo de vida para seguir rejuveneciendo sus arterias y mitocondrias.`;
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

