const { Telegraf, Markup } = require('telegraf');
const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const config = require('../config/config');
const sleepEngine = require('../analytics/sleepEngine');
const heartEngine = require('../analytics/heartEngine');
const oxygenEngine = require('../analytics/oxygenEngine');
const activityEngine = require('../analytics/activityEngine');
const workoutEngine = require('../analytics/workoutEngine');
const readinessEngine = require('../analytics/readinessEngine');
const crossAnalytics = require('../analytics/crossAnalytics');
const geminiCoach = require('../ai/geminiCoach');
const prompts = require('../ai/prompts');
const formatters = require('./formatters');
const driveSync = require('../drive/driveSync');

class HealthTelegramBot {
  constructor(token = config.TELEGRAM_TOKEN) {
    this.token = token;
    this.bot = new Telegraf(this.token);
    this.server = null;
    this.isLaunched = false;
    this.syncInterval = null;
    this.keepAliveInterval = null;
  }

  getMenuKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🏋️ Prescripción Hoy', 'btn_prescripcion'),
        Markup.button.callback('⚡ Batería / Readiness', 'btn_readiness')
      ],
      [
        Markup.button.callback('🌙 ¿Cómo dormí?', 'btn_comodormi'),
        Markup.button.callback('🧠 Tono Autónomo', 'btn_autonomo')
      ],
      [
        Markup.button.callback('🏃 Monitor Entreno', 'btn_actividad'),
        Markup.button.callback('📈 Carga ACWR', 'btn_acwr')
      ],
      [
        Markup.button.callback('❤️ Corazón & RHR', 'btn_corazon'),
        Markup.button.callback('🧬 Edad Biológica', 'btn_edad_bio')
      ],
      [
        Markup.button.callback('🚶 Pasos y Actividad', 'btn_pasos'),
        Markup.button.callback('📅 Resumen Hoy', 'btn_hoy')
      ],
      [
        Markup.button.callback('📊 Fases de Sueño', 'btn_fases'),
        Markup.button.callback('📈 Informe Semanal', 'btn_semanal')
      ],
      [
        Markup.button.callback('🔄 Sincronizar Drive', 'btn_sync'),
        Markup.button.callback('💰 Tokens & Costo', 'btn_presupuesto')
      ]
    ]);
  }

  setupRoutes() {
    const bot = this.bot;
    const sendTyping = (ctx) => ctx.sendChatAction('typing').catch(() => {});

    // Helper to send messages safely with chunking
    const sendSafeMessage = async (ctx, text) => {
      const chunks = formatters.splitMessage(text);
      for (const chunk of chunks) {
        await ctx.replyWithMarkdown(chunk).catch(async () => {
          // Fallback if markdown parsing has rare issues
          await ctx.reply(chunk);
        });
      }
    };

    // START & MENU
    const handleStart = async (ctx) => {
      const text = `👋 *¡Hola! Soy tu Asistente Biométrico y Coach Personal de Salud.*\n\n` +
        `Estoy conectado a los datos de tu smartwatch *Huawei Watch GT* (vía Health Sync).\n` +
        `Analizo tu sueño, frecuencia cardíaca, pasos, oxígeno y entrenamientos con *Gemini 3.8 Flash (Thinking MEDIUM)* ` +
        `para darte diagnósticos médicos y deportivos comprensibles y profundos.\n\n` +
        `👇 *Selecciona una opción del menú o escribe cualquier comando:*`;
      await ctx.replyWithMarkdown(text, this.getMenuKeyboard());
    };
    bot.start(handleStart);
    bot.command('menu', handleStart);

    // AYUDA
    const handleHelp = async (ctx) => {
      let text = `📖 *GUÍA COMPLETA DE COMANDOS DEL COACH BIOMÉTRICO*\n\n` +
        `🏋️ *Entrenamiento de Alto Rendimiento:*\n` +
        `• /prescripcion o /plan_hoy - Sesión del día calculada según tu recuperación, pulso y carga\n` +
        `• /acwr o /carga_entrenamiento - Ratio Agudo:Crónico de carga y prevención de lesiones\n` +
        `• /actividad o /entrenamiento - Análisis del último ejercicio registrado\n` +
        `• /recuperacion_entreno - Horas restantes de supercompensación muscular\n` +
        `• /historial_actividades - Historial de los últimos entrenamientos\n\n` +
        `🌙 *Sueño y Descanso:*\n` +
        `• /comodormi - Diagnóstico completo de anoche con IA\n` +
        `• /fases - Gráfico de barras de fases (REM, Profundo, Ligero)\n` +
        `• /ciclos - Conteo de ciclos ultradianos (~90 min)\n` +
        `• /eficiencia - Porcentaje real dormido vs tiempo en cama\n` +
        `• /deuda_sueno - Déficit acumulado en 7 días\n` +
        `• /cronotipo - Regularidad circadiana y tipo de reloj biológico\n` +
        `• /apnea_oxigeno - Cruce de despertares con caídas de SpO2\n\n` +
        `🧠 *Corazón, Autónomo & Longevidad:*\n` +
        `• /sistema_autonomo o /estres_cardiaco - Tono vagal, descanso nocturno (dip) y balance simpático\n` +
        `• /edad_biologica o /longevidad - Edad biológica vs cronológica basada en tus biomarcadores\n` +
        `• /corazon - Estadísticas y pulso de hoy\n` +
        `• /frecuencia_reposo - Pulso en reposo (RHR) y tendencia 7d\n` +
        `• /zonas - Minutos en Zonas Cardíacas Z1 a Z5 (Karvonen)\n` +
        `• /picos_estres - Taquicardias en reposo detectadas\n\n` +
        `⚡ *Batería Corporal & Día a Día:*\n` +
        `• /readiness o /bateria - Semáforo de energía y preparación física (0-100)\n` +
        `• /pasos - Pasos, distancia, calorías y hora pico\n` +
        `• /sedentarismo - Horas continuas de inactividad diurna\n` +
        `• /hoy - Tablero de mando integral 360° del día\n` +
        `• /semanal - Informe ejecutivo semanal con metas\n` +
        `• /sync - Sincronizar carpetas de Google Drive\n` +
        `• /presupuesto - Control de tokens y saldo restante ($5/mes)\n\n` +
        `📎 *Subida Directa:* ¡También puedes enviarme cualquier archivo CSV por este chat y lo analizaré de inmediato!`;
      await sendSafeMessage(ctx, text);
    };
    bot.help(handleHelp);
    bot.command('ayuda', handleHelp);

    // SYNC DRIVE
    const handleSync = async (ctx) => {
      sendTyping(ctx);
      await ctx.reply('🔄 Conectando con Google Drive para sincronizar archivos nuevos...');
      const res = await driveSync.syncAll();
      if (res.success) {
        await ctx.replyWithMarkdown(`✅ *Sincronización Exitosa!*\n• Archivos descargados: *${res.syncedCount}* nuevos.`);
      } else {
        await ctx.replyWithMarkdown(`⚠️ *Nota de Google Drive:*\n${res.message}\n\n💡 *Tip:* También puedes enviar archivos CSV directamente por este chat adjuntándolos como documento.`);
      }
    };
    bot.command('sync', handleSync);

    // COMODORMI
    const handleSleep = async (ctx) => {
      sendTyping(ctx);
      const sleep = sleepEngine.getLatestNight();
      const prevSleep = sleepEngine.getPreviousNight();
      if (!sleep) {
        return ctx.replyWithMarkdown('❌ No se encontraron registros de sueño en la carpeta. Usa /sync o envía un CSV.');
      }
      try {
        const prompt = prompts.buildSleepPrompt(sleep, prevSleep);
        const aiRes = await geminiCoach.generateAnalysis(prompt);
        const msg = formatters.formatSleepSummary(sleep, aiRes.text);
        await sendSafeMessage(ctx, msg);
      } catch (err) {
        const msg = formatters.formatSleepSummary(sleep, `(Nota: Análisis local - ${err.message})`);
        await sendSafeMessage(ctx, msg);
      }
    };
    bot.command('comodormi', handleSleep);

    // PRESCRIPCION DIARIA DE ENTRENAMIENTO
    const handlePrescription = async (ctx) => {
      sendTyping(ctx);
      const prescription = crossAnalytics.getDailyPrescription();
      try {
        const prompt = prompts.buildPrescriptionPrompt(prescription);
        const aiRes = await geminiCoach.generateAnalysis(prompt);
        const msg = formatters.formatPrescriptionReport(prescription, aiRes.text);
        await sendSafeMessage(ctx, msg);
      } catch (err) {
        const msg = formatters.formatPrescriptionReport(prescription, `(Plan base algorítmico: ${err.message})`);
        await sendSafeMessage(ctx, msg);
      }
    };
    bot.command('prescripcion', handlePrescription);
    bot.command('plan_hoy', handlePrescription);

    // SISTEMA AUTONOMO & TONO VAGAL
    const handleAutonomic = async (ctx) => {
      sendTyping(ctx);
      const ans = crossAnalytics.getAutonomicBalance();
      try {
        const prompt = prompts.buildAutonomicPrompt(ans);
        const aiRes = await geminiCoach.generateAnalysis(prompt);
        const msg = formatters.formatAutonomicReport(ans, aiRes.text);
        await sendSafeMessage(ctx, msg);
      } catch (err) {
        const msg = formatters.formatAutonomicReport(ans, `(Diagnóstico base: ${err.message})`);
        await sendSafeMessage(ctx, msg);
      }
    };
    bot.command('sistema_autonomo', handleAutonomic);
    bot.command('tono_vagal', handleAutonomic);
    bot.command('estres_cardiaco', handleAutonomic);

    // EDAD BIOLOGICA & LONGEVIDAD
    const handleBiologicalAge = async (ctx) => {
      sendTyping(ctx);
      const bio = crossAnalytics.getBiologicalFitnessAge();
      try {
        const prompt = prompts.buildBiologicalAgePrompt(bio);
        const aiRes = await geminiCoach.generateAnalysis(prompt);
        const msg = formatters.formatBiologicalAgeReport(bio, aiRes.text);
        await sendSafeMessage(ctx, msg);
      } catch (err) {
        const msg = formatters.formatBiologicalAgeReport(bio, `(Diagnóstico base: ${err.message})`);
        await sendSafeMessage(ctx, msg);
      }
    };
    bot.command('edad_biologica', handleBiologicalAge);
    bot.command('longevidad', handleBiologicalAge);

    // CARGA DE ENTRENAMIENTO ACWR
    const handleAcwr = async (ctx) => {
      sendTyping(ctx);
      const acwr = crossAnalytics.calculateACWR();
      const msg = formatters.formatAcwrReport(acwr);
      await sendSafeMessage(ctx, msg);
    };
    bot.command('acwr', handleAcwr);
    bot.command('carga_entrenamiento', handleAcwr);

    // ACTIVIDAD / ENTRENAMIENTO
    const handleWorkout = async (ctx) => {
      sendTyping(ctx);
      const workout = workoutEngine.getLatestWorkout();
      if (!workout) {
        return ctx.replyWithMarkdown('❌ No se encontraron actividades en la carpeta de Actividades.');
      }
      try {
        const prompt = prompts.buildWorkoutPrompt(workout);
        const aiRes = await geminiCoach.generateAnalysis(prompt);
        const msg = formatters.formatWorkoutReport(workout, aiRes.text);
        await sendSafeMessage(ctx, msg);
      } catch (err) {
        const msg = formatters.formatWorkoutReport(workout, `(Diagnóstico base: ${err.message})`);
        await sendSafeMessage(ctx, msg);
      }
    };
    bot.command('actividad', handleWorkout);
    bot.command('entrenamiento', handleWorkout);

    // RECUPERACION ENTRENO
    bot.command('recuperacion_entreno', async (ctx) => {
      const workout = workoutEngine.getLatestWorkout();
      if (!workout) return ctx.replyWithMarkdown('❌ No hay entrenamientos registrados.');
      let t = `🔋 *ESTADO DE RECUPERACIÓN BIOLÓGICA*\n\n` +
        `• *Última Actividad:* ${workout.type} (${workout.datetime})\n` +
        `• *Duración:* ${workout.durationMinutes} min | *Pulsaciones Máx:* ${workout.maxHr} bpm\n` +
        `• *Nivel de Exigencia:* *${workout.intensity}*\n` +
        `• *Carga de Entrenamiento (EPOC):* ${workout.trainingLoad} pts\n` +
        `• *Horas de Descanso Recomendadas:* *${workout.recoveryHoursTotal} horas*\n` +
        `• *Estado Actual:* *${workout.recoveryStatus}*\n\n` +
        `💡 *Criterio Fisiológico:* Respetar el tiempo de recuperación previene lesiones articulares y optimiza la supercompensación muscular.`;
      await sendSafeMessage(ctx, t);
    });

    // HISTORIAL DE ACTIVIDADES
    bot.command('historial_actividades', async (ctx) => {
      const history = workoutEngine.getWorkoutHistory(5);
      if (history.length === 0) return ctx.replyWithMarkdown('❌ Sin historial de actividades.');
      let t = `🏃 *HISTORIAL DE ENTRENAMIENTOS RECIENTES*\n\n`;
      history.forEach((w, idx) => {
        t += `*${idx + 1}. ${w.type}* (${w.datetime})\n`;
        t += `   ⏱️ ${w.durationMinutes} min | 🔥 ${w.calories} kcal | ❤️ ${w.avgHr} bpm (Pico: ${w.maxHr} bpm)\n`;
        t += `   ⚡ Intensidad: ${w.intensity} | 🔋 ${w.recoveryHoursTotal}h descanso\n\n`;
      });
      await sendSafeMessage(ctx, t);
    });

    // FASES
    bot.command('fases', async (ctx) => {
      const sleep = sleepEngine.getLatestNight();
      if (!sleep) return ctx.replyWithMarkdown('❌ Sin datos de sueño.');
      const msgText = formatters.formatSleepSummary(sleep, '');
      await sendSafeMessage(ctx, msgText);
    });

    // CICLOS
    bot.command('ciclos', async (ctx) => {
      const sleep = sleepEngine.getLatestNight();
      if (!sleep) return ctx.replyWithMarkdown('❌ Sin datos de sueño.');
      let t = `🔄 *ANÁLISIS DE CICLOS ULTRADIANOS*\n\n` +
        `• *Ciclos completos estimados (~90 min):* *${sleep.cyclesCount} ciclos*\n` +
        `• *Fase final al despertar:* *${sleep.lastStage.toUpperCase()}*\n` +
        `• *Veredicto:* ${sleep.wokenUpInDeep ? '⚠️ Te despertaste en fase profunda, lo que suele causar inercia del sueño (sensación de pesadez matutina).' : '✅ Despertaste en fase ligera/REM, lo que favorece un despertar lúcido y ágil.'}`;
      await sendSafeMessage(ctx, t);
    });

    // EFICIENCIA
    bot.command('eficiencia', async (ctx) => {
      const sleep = sleepEngine.getLatestNight();
      if (!sleep) return ctx.replyWithMarkdown('❌ Sin datos de sueño.');
      let t = `⏱️ *EFICIENCIA DEL SUEÑO — ${sleep.date}*\n\n` +
        `• *Tiempo en cama:* ${sleep.inBedHours} horas\n` +
        `• *Tiempo real dormido:* ${sleep.totalSleepHours} horas\n` +
        `• *Eficiencia:* *${sleep.efficiencyPct}%* ${formatters.renderProgressBar(sleep.efficiencyPct)}\n` +
        `• *Evaluación Clínica:* ${sleep.efficiencyPct >= 85 ? '🟢 Excelente (óptima higiene de sueño).' : sleep.efficiencyPct >= 75 ? '🟡 Normal/Aceptable.' : '🔴 Baja (pasas mucho tiempo despierto en cama).'}`;
      await sendSafeMessage(ctx, t);
    });

    // DEUDA DE SUEÑO
    bot.command('deuda_sueno', async (ctx) => {
      const debt = sleepEngine.calculateSleepDebt(config.USER_GOALS.sleepHours);
      let t = `📉 *DEUDA ACUMULADA DE SUEÑO (Últimos 7 días)*\n\n` +
        `• *Meta diaria:* ${debt.targetHoursPerDay}h | *Promedio real:* *${debt.avgDailySleepHours}h*\n` +
        `• *Horas esperadas (${debt.daysCount} días):* ${debt.expectedHours}h\n` +
        `• *Horas dormidas reales:* ${debt.totalActualHours}h\n` +
        `• *Balance / Deuda:* *${debt.totalDebtHours > 0 ? `-${debt.totalDebtHours}h (Déficit)` : `+${Math.abs(debt.totalDebtHours)}h (Superávit)`}*\n\n` +
        `💡 *Consejo:* ${debt.totalDebtHours > 2 ? 'Tienes déficit de sueño acumulado. Añade una siesta de 20-25 minutos o adelanta tu hora de dormir 45 minutos.' : '¡Excelente regularidad! Estás cumpliendo con tus requerimientos de descanso.'}`;
      await sendSafeMessage(ctx, t);
    });

    // CRONOTIPO
    bot.command('cronotipo', async (ctx) => {
      const chrono = sleepEngine.determineChronotype();
      let t = `🕰️ *PERFIL CIRCADIANO Y CRONOTIPO*\n\n` +
        `• *Clasificación estimada:* *${chrono.chronotype}*\n` +
        `• *Muestras analizadas:* ${chrono.sessionsSampled} noches\n\n` +
        `💡 *Interpretación:* Tu reloj biológico muestra una tendencia hacia horarios ${chrono.chronotype.includes('Búho') ? 'vespertinos/noctámbulos. Intenta exponer tu vista a luz solar matutina para fijar la producción de melatonina nocturna.' : 'regulares y matutinos. Mantén esa consistencia.'}`;
      await sendSafeMessage(ctx, t);
    });

    // APNEA & OXIGENO
    bot.command('apnea_oxigeno', async (ctx) => {
      const sleep = sleepEngine.getLatestNight();
      const corr = oxygenEngine.correlateWithSleep(sleep);
      if (!corr) return ctx.replyWithMarkdown('❌ No se encontraron datos de oxígeno para la última noche.');
      let t = `💨 *CALIDAD RESPIRATORIA NOCTURNA*\n\n` +
        `• *SpO2 Medio al dormir:* *${corr.avgSleepSpo2}%*\n` +
        `• *SpO2 Mínimo registrado:* *${corr.minSleepSpo2}%*\n` +
        `• *Eventos de desaturación (< 95%):* *${corr.desaturationEvents}*\n` +
        `• *Estabilidad respiratoria:* *${corr.breathingStability}*\n\n` +
        `💡 *Veredicto:* ${corr.desaturationEvents === 0 ? 'Oxigenación nocturna impecable. Vías aéreas despejadas y descanso profundo continuo.' : 'Se registraron pequeñas caídas de saturación. Revisa la ventilación del dormitorio o la posición de la almohada.'}`;
      await sendSafeMessage(ctx, t);
    });

    // READINESS / BATERIA
    const handleReadiness = async (ctx) => {
      sendTyping(ctx);
      const readiness = readinessEngine.calculateReadiness();
      try {
        const prompt = prompts.buildReadinessPrompt(readiness);
        const aiRes = await geminiCoach.generateAnalysis(prompt);
        const msg = formatters.formatReadinessReport(readiness, aiRes.text);
        await sendSafeMessage(ctx, msg);
      } catch (err) {
        const msg = formatters.formatReadinessReport(readiness, `(Diagnóstico base: ${err.message})`);
        await sendSafeMessage(ctx, msg);
      }
    };
    bot.command('readiness', handleReadiness);
    bot.command('bateria', handleReadiness);

    // CORAZON
    const handleHeart = async (ctx) => {
      sendTyping(ctx);
      const heart = heartEngine.getLatestDayStats();
      const rhrTrend = heartEngine.getRhrTrend();
      const spikes = heartEngine.detectStressSpikes(heart ? heart.date : '');
      if (!heart) return ctx.replyWithMarkdown('❌ No hay datos de frecuencia cardíaca disponibles.');
      try {
        const prompt = prompts.buildHeartPrompt(heart, rhrTrend, spikes);
        const aiRes = await geminiCoach.generateAnalysis(prompt);
        const msg = formatters.formatHeartReport(heart, rhrTrend, aiRes.text);
        await sendSafeMessage(ctx, msg);
      } catch (err) {
        const msg = formatters.formatHeartReport(heart, rhrTrend, `(Diagnóstico base: ${err.message})`);
        await sendSafeMessage(ctx, msg);
      }
    };
    bot.command('corazon', handleHeart);

    // FRECUENCIA REPOSO
    bot.command('frecuencia_reposo', async (ctx) => {
      const trend = heartEngine.getRhrTrend();
      let t = `🛌 *FRECUENCIA CARDÍACA EN REPOSO (RHR)*\n\n` +
        `• *RHR Último Registro:* *${trend.latestRhr} bpm*\n` +
        `• *Promedio Últimos 7 Días:* *${trend.recent7DaysAvgRhr} bpm*\n\n` +
        `*Historial reciente:*\n`;
      trend.trend.slice(-5).forEach(x => {
        t += `• ${x.date}: *${x.rhr} bpm* (media día: ${x.avg} bpm)\n`;
      });
      t += `\n💡 *Regla médica:* Un RHR estable o a la baja indica adaptación física positiva. Si sube > 5 bpm, indica fatiga acumulada, estrés o deshidratación.`;
      await sendSafeMessage(ctx, t);
    });

    // ZONAS
    bot.command('zonas', async (ctx) => {
      const heart = heartEngine.getLatestDayStats();
      if (!heart) return ctx.replyWithMarkdown('❌ No hay datos de corazón.');
      const msgText = formatters.formatHeartReport(heart, heartEngine.getRhrTrend(), '');
      await sendSafeMessage(ctx, msgText);
    });

    // PICOS DE ESTRES
    bot.command('picos_estres', async (ctx) => {
      const days = heartEngine.getDaysList();
      const latestDay = days.length > 0 ? days[days.length - 1] : '';
      const spikes = heartEngine.detectStressSpikes(latestDay);
      let t = `⚡ *PICOS DE FRECUENCIA CARDÍACA EN REPOSO (${latestDay})*\n\n`;
      if (spikes.length === 0) {
        t += `✅ *Cero picos inusuales detectados.* Tu sistema nervioso autónomo se mantuvo en equilibrio durante los momentos de inactividad física.`;
      } else {
        t += `⚠️ *Se detectaron ${spikes.length} episodios de pulso elevado (>100 bpm) sin movimiento:*\n`;
        spikes.slice(0, 5).forEach(s => {
          t += `• ${s.datetime.split(' ')[1]}: *${s.bpm} bpm* (Pasos: 0)\n`;
        });
        t += `\n💡 Posibles causas: estrés agudo, cafeína, digestión pesada o deshidratación.`;
      }
      await sendSafeMessage(ctx, t);
    });

    // PASOS
    const handleSteps = async (ctx) => {
      const act = activityEngine.getLatestDayStats();
      const msg = formatters.formatStepsReport(act);
      await sendSafeMessage(ctx, msg);
    };
    bot.command('pasos', handleSteps);

    // SEDENTARISMO
    bot.command('sedentarismo', async (ctx) => {
      const act = activityEngine.getLatestDayStats();
      if (!act) return ctx.replyWithMarkdown('❌ Sin datos de pasos.');
      let t = `🪑 *ANÁLISIS DE SEDENTARISMO DIURNO (${act.date})*\n\n` +
        `• *Horas sedentarias diurnas (<100 pasos):* *${act.sedentaryDaytimeHours} horas*\n` +
        `• *Racha continua máxima sentado:* *${act.maxSedentaryStreakHours} horas consecutivas*\n\n` +
        `💡 *Recomendación:* Por cada 60 minutos sentado, realiza 2 minutos de caminata o estiramientos para reactivar la circulación y el aclaramiento de glucosa.`;
      await sendSafeMessage(ctx, t);
    });

    // HOY
    bot.command('hoy', async (ctx) => {
      sendTyping(ctx);
      const sleep = sleepEngine.getLatestNight();
      const heart = heartEngine.getLatestDayStats();
      const act = activityEngine.getLatestDayStats();
      const readiness = readinessEngine.calculateReadiness();

      let t = `📊 *TABLERO 360° DE HOY*\n\n`;
      t += `🔋 *Batería Corporal:* *${readiness.score}/100* ${readiness.color} (${readiness.level})\n\n`;
      if (sleep) {
        t += `🌙 *Sueño:* ${sleep.totalSleepHours}h (Score: ${sleep.sleepScore}/100, REM: ${sleep.remPct}%, Profundo: ${sleep.deepPct}%)\n`;
      }
      if (heart) {
        t += `❤️ *Corazón:* ${heart.avgBpm} bpm (RHR: ${heart.restingHeartRate} bpm | Pico: ${heart.maxBpm} bpm)\n`;
      }
      if (act) {
        t += `🚶 *Pasos:* ${act.totalSteps.toLocaleString()} / ${act.targetSteps.toLocaleString()} (${act.distanceKm} km | ${act.activeCalories} kcal)\n`;
      }
      t += `\n🎯 *Veredicto del Coach:* ${readiness.advice}`;
      await sendSafeMessage(ctx, t);
    });

    // SEMANAL
    bot.command('semanal', async (ctx) => {
      sendTyping(ctx);
      const rhrTrend = heartEngine.getRhrTrend();
      const stepSummary = activityEngine.getWeeklySummary();
      const sleepDebt = sleepEngine.calculateSleepDebt(8.0);

      const summaryPayload = {
        diasAnalizados: stepSummary.daysAnalyzed,
        pasosTotales: stepSummary.totalSteps,
        pasosPromedioDiario: stepSummary.avgDailySteps,
        pulsoReposoPromedio7d: rhrTrend.recent7DaysAvgRhr,
        horasSuenoPromedioDiario: sleepDebt.avgDailySleepHours,
        deudaSuenoAcumulada: sleepDebt.totalDebtHours
      };

      try {
        const prompt = prompts.buildWeeklyPrompt(summaryPayload);
        const aiRes = await geminiCoach.generateAnalysis(prompt);
        let t = `📈 *INFORME EJECUTIVO SEMANAL*\n\n` +
          `• 👣 *Pasos Semanales:* ${stepSummary.totalSteps.toLocaleString()} (Media: ${stepSummary.avgDailySteps.toLocaleString()}/día)\n` +
          `• 🛌 *Sueño Promedio:* ${sleepDebt.avgDailySleepHours}h/noche (Deuda: ${sleepDebt.totalDebtHours}h)\n` +
          `• ❤️ *RHR Base:* ${rhrTrend.recent7DaysAvgRhr} bpm\n\n` +
          `🏆 *Diagnóstico Semanal de Gemini:*\n${aiRes.text}`;
        await sendSafeMessage(ctx, t);
      } catch (err) {
        await ctx.replyWithMarkdown(`Error generando reporte semanal: ${err.message}`);
      }
    });

    // PRESUPUESTO
    bot.command('presupuesto', async (ctx) => {
      const s = geminiCoach.getCostSummary();
      let t = `💰 *ESTADO DE PRESUPUESTO & CONTROL DE TOKENS*\n\n` +
        `• *Modelo activo:* \`gemini-3.8-flash\` (Thinking: MEDIUM)\n` +
        `• *Consultas realizadas:* *${s.queriesCount}*\n` +
        `• *Tokens de Entrada:* ${s.totalInputTokens.toLocaleString()} tokens\n` +
        `• *Tokens de Salida:* ${s.totalOutputTokens.toLocaleString()} tokens\n` +
        `• *Costo total acumulado:* *$${s.totalCostUsd} USD*\n` +
        `• *Presupuesto restante ($5.00/mes):* *$${s.remainingBudgetUsd} USD*\n\n` +
        `🛡️ *Garantía de Presupuesto:* Gracias al motor de compresión local, cada consulta cuesta menos de $0.0005 USD. Tienes saldo para más de 10,000 consultas adicionales este mes.`;
      await sendSafeMessage(ctx, t);
    });

    // Manejador de subida directa de archivos CSV
    bot.on('document', async (ctx) => {
      const doc = ctx.message.document;
      if (!doc || !doc.file_name.toLowerCase().endsWith('.csv')) {
        return ctx.reply('📎 Por favor envía archivos en formato .csv');
      }

      sendTyping(ctx);
      await ctx.reply(`📥 Recibiendo *${doc.file_name}*...`, { parse_mode: 'Markdown' });

      try {
        const fileLink = await ctx.telegram.getFileLink(doc.file_id);
        const name = doc.file_name;
        let targetFolder = 'Health Sync Sueño';

        if (name.includes('Frecuencia') || name.includes('cardíaca') || name.includes('cardiaca')) {
          targetFolder = 'Health Sync Frecuencia cardíaca';
        } else if (name.includes('Pasos')) {
          targetFolder = 'Health Sync Pasos';
        } else if (name.includes('oxígeno') || name.includes('oxigeno') || name.includes('Saturación')) {
          targetFolder = 'Health Sync Saturación de oxígeno';
        } else if (name.includes('Actividades') || name.includes('GENERIC') || name.includes('Actividad')) {
          targetFolder = 'Health Sync Actividades';
        }

        const destDir = path.join(config.HEALTH_DATA_DIR, targetFolder);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        const destFile = path.join(destDir, name);

        // Download via HTTPS
        await new Promise((resolve, reject) => {
          const fileStream = fs.createWriteStream(destFile);
          https.get(fileLink.href, res => {
            res.pipe(fileStream);
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
          }).on('error', reject);
        });

        await ctx.replyWithMarkdown(`✅ *¡Archivo guardado en ${targetFolder}!* Procesando análisis...`);

        // Trigger analysis
        if (targetFolder === 'Health Sync Sueño') {
          await handleSleep(ctx);
        } else if (targetFolder === 'Health Sync Frecuencia cardíaca') {
          await handleHeart(ctx);
        } else if (targetFolder === 'Health Sync Pasos') {
          await handleSteps(ctx);
        } else if (targetFolder === 'Health Sync Actividades') {
          await handleWorkout(ctx);
        }
      } catch (err) {
        await ctx.reply(`❌ Error guardando el archivo: ${err.message}`);
      }
    });

    // Inline Button Handlers
    bot.action('btn_prescripcion', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      await handlePrescription(ctx);
    });
    bot.action('btn_autonomo', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      await handleAutonomic(ctx);
    });
    bot.action('btn_edad_bio', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      await handleBiologicalAge(ctx);
    });
    bot.action('btn_acwr', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      await handleAcwr(ctx);
    });
    bot.action('btn_comodormi', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      await handleSleep(ctx);
    });
    bot.action('btn_readiness', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      await handleReadiness(ctx);
    });
    bot.action('btn_actividad', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      await handleWorkout(ctx);
    });
    bot.action('btn_corazon', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      await handleHeart(ctx);
    });
    bot.action('btn_pasos', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      await handleSteps(ctx);
    });
    bot.action('btn_fases', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const sleep = sleepEngine.getLatestNight();
      await sendSafeMessage(ctx, formatters.formatSleepSummary(sleep, ''));
    });
    bot.action('btn_zonas', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      const heart = heartEngine.getLatestDayStats();
      await sendSafeMessage(ctx, formatters.formatHeartReport(heart, heartEngine.getRhrTrend(), ''));
    });
    bot.action('btn_hoy', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      ctx.message = { text: '/hoy' };
      bot.handleUpdate({ message: { chat: ctx.chat, text: '/hoy' } });
    });
    bot.action('btn_semanal', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      ctx.message = { text: '/semanal' };
      bot.handleUpdate({ message: { chat: ctx.chat, text: '/semanal' } });
    });
    bot.action('btn_sync', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      await handleSync(ctx);
    });
    bot.action('btn_presupuesto', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      ctx.message = { text: '/presupuesto' };
      bot.handleUpdate({ message: { chat: ctx.chat, text: '/presupuesto' } });
    });
    bot.action('btn_ayuda', async (ctx) => {
      await ctx.answerCbQuery().catch(() => {});
      await handleHelp(ctx);
    });

    // Natural Language fallback
    bot.on('text', async (ctx) => {
      const text = ctx.message.text;
      if (!text || text.startsWith('/')) return;
      sendTyping(ctx);

      const snapshot = {
        ultimoSueno: sleepEngine.getLatestNight(),
        ultimoPulso: heartEngine.getLatestDayStats(),
        ultimosPasos: activityEngine.getLatestDayStats(),
        ultimoEntrenamiento: workoutEngine.getLatestWorkout(),
        readiness: readinessEngine.calculateReadiness(),
        prescripcion: crossAnalytics.getDailyPrescription(),
        balanceAutonomo: crossAnalytics.getAutonomicBalance(),
        edadBiologica: crossAnalytics.getBiologicalFitnessAge(),
        cargaAcwr: crossAnalytics.calculateACWR()
      };

      try {
        const prompt = prompts.buildConversationPrompt(text, snapshot);
        const aiRes = await geminiCoach.generateAnalysis(prompt);
        await sendSafeMessage(ctx, `💬 *Respuesta de tu Coach:*\n\n${aiRes.text}`);
      } catch (err) {
        await ctx.replyWithMarkdown(`No pude procesar la consulta: ${err.message}`);
      }
    });
  }

  start(options = {}) {
    this.setupRoutes();
    const port = process.env.PORT || 8080;

    // Start HTTP healthcheck server
    this.server = http.createServer((req, res) => {
      if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'online',
          bot: '@AnalistaBotMiguelAcuBot',
          model: config.MODEL_ID,
          timestamp: new Date().toISOString(),
          budget: geminiCoach.getCostSummary()
        }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    this.server.listen(port, () => {
      console.log(`[HTTP Healthcheck] Servidor de salud activo en puerto ${port} (/health)`);
    });

    // Launch Telegram Bot
    this.bot.launch().then(() => {
      this.isLaunched = true;
      console.log('🤖 [Bot] @AnalistaBotMiguelAcuBot está conectado a Telegram y escuchando mensajes!');

      // Sincronización inicial inmediata
      driveSync.syncAll().then(r => {
        if (r.syncedCount > 0) {
          console.log(`[AutoSync Inicial] ✅ ${r.syncedCount} archivos nuevos descargados de Drive.`);
        }
      }).catch(err => console.warn('[AutoSync Inicial]', err.message));

      // Sincronización periódica automática cada 10 minutos (600.000 ms)
      const TEN_MINUTES_MS = 10 * 60 * 1000;
      this.syncInterval = setInterval(async () => {
        try {
          const res = await driveSync.syncAll();
          if (res.syncedCount > 0) {
            console.log(`[AutoSync 10m] 🔄 ${res.syncedCount} archivos nuevos descargados automáticamente.`);
          }
        } catch (err) {
          console.warn('[AutoSync 10m] Error en sincronización periódica:', err.message);
        }
      }, TEN_MINUTES_MS);

      // 🛡️ ANTI-INACTIVIDAD (Keep-Alive): Evita que Render se duerma en el plan gratuito
      const NINE_MINUTES_MS = 9 * 60 * 1000;
      const externalUrl = process.env.RENDER_EXTERNAL_URL || 'https://huawei-gt6.onrender.com';
      this.keepAliveInterval = setInterval(() => {
        https.get(`${externalUrl}/health`, (res) => {
          console.log(`[KeepAlive] ✅ Ping preventivo a ${externalUrl}/health (Status: ${res.statusCode})`);
        }).on('error', (err) => {
          console.warn('[KeepAlive] Error en ping preventivo:', err.message);
        });
      }, NINE_MINUTES_MS);

    }).catch(err => {
      console.error('[Bot] Error en launch:', err.message);
    });
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    if (this.bot && this.isLaunched) {
      this.bot.stop('SIGINT');
      this.isLaunched = false;
    }
    if (this.server) {
      this.server.close();
    }
    console.log('[Bot] Detenido correctamente.');
  }
}

module.exports = HealthTelegramBot;
