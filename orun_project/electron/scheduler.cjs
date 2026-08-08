// electron/scheduler.cjs
//
// Runs scheduled per-agent tasks. Reads its schedule from settings so it
// can be reconfigured without restarting.
//
// Supported agents:
//   - Nutritionist: daily menu based on goals, yesterday's meals, PT plan
//   - Personal Trainer: daily workout based on goals and weight tracking
//   - Personal Assistant: daily agenda summary
//   - Health: weight tracking reminder
//   - Finance, Developer, Teacher (legacy)

const cron = require("node-cron");

let scheduledJobs = new Map(); // agentName -> cron task
let deps = null; // { db, aiRouter, getSecret, deliver, log, agentPrompts, processAgentReply, whatsapp }

function init(dependencies) {
  deps = dependencies;
  reloadAll();
}

function reloadAll() {
  for (const task of scheduledJobs.values()) task.stop();
  scheduledJobs.clear();

  const schedules = deps.db.getSetting("schedules", {});
  for (const [agentName, cfg] of Object.entries(schedules)) {
    if (cfg?.enabled && cfg.time) {
      // Marketing always runs hourly
      const freq = agentName === "Marketing" ? "hourly" : (cfg.frequency || "daily");
      scheduleAgent(agentName, cfg.time, freq);
    }
  }
}

function scheduleAgent(agentName, time, frequency) {
  let cronExpr;
  if (frequency === "hourly" && agentName === "Marketing") {
    const [hour, minute] = (time || "09:00").split(":").map(Number);
    cronExpr = `${minute || 0} * * * *`;
    deps.log.info(`[scheduler] ${agentName} scheduled hourly at :${minute || 0} past each hour`);
  } else {
    const [hour, minute] = (time || "07:00").split(":").map(Number);
    cronExpr = `${minute || 0} ${hour || 7} * * *`;
    deps.log.info(`[scheduler] ${agentName} scheduled daily at ${time}`);
  }
  const task = cron.schedule(cronExpr, () => runAgentTask(agentName).catch((err) => deps.log.error(`[scheduler] ${agentName} failed:`, err.message)));
  scheduledJobs.set(agentName, task);
}

async function runAgentTask(agentName) {
  const { db, aiRouter, agentPrompts, processAgentReply } = deps;
  const globalAI = { ...{ provider: "groq", model: "llama-3.3-70b-versatile" }, ...db.getSetting("ai", {}) };
  const override = db.getSetting("agentModels", {})[agentName];
  const provider = override?.provider || globalAI.provider;
  const model = override?.model || globalAI.model;
  const apiKey = deps.getSecret(provider);
  const systemPrompt = agentPrompts.promptFor(agentName, override?.systemPrompt);

  const userPrompt = await buildUserPrompt(agentName, db);

  // Use autonomous loop for agents that need tools (Marketing, Designer)
  const needsTools = agentName === "Marketing" || agentName === "Designer";

  let finalText;
  if (needsTools && deps.autonomousLoop) {
    finalText = await deps.autonomousLoop({
      messages: [{ role: "user", content: userPrompt }],
      agentId: agentName,
      sender: { isDestroyed: () => false, send: () => {} }, // no-op sender for background
      requestId: `scheduler-${agentName}-${Date.now()}`,
      cancelledRef: { cancelled: false },
    });
  } else {
    const result = await aiRouter.routeChat({
      provider, model, baseUrl: globalAI.baseUrl, apiKey,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    });
    finalText = processAgentReply ? processAgentReply(agentName, result.text) : result.text;
  }

  // Log into that agent's default conversation so it's visible in-app too.
  const conversations = db.listConversations(agentName);
  let convo = conversations[0];
  if (!convo) convo = db.createConversation(`${agentName}-${Date.now()}`, `${agentName} — daily`, agentName);
  db.addMessage(convo.id, { id: `${Date.now()}`, role: "assistant", content: finalText });

  await deps.deliver(agentName, finalText);
  return finalText;
}

async function buildUserPrompt(agentName, db) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  switch (agentName) {
    case "Nutritionist": {
      const goals = db.getHealthGoals();
      const weight = db.getWeeklyWeightComparison();
      const yesterdayMeals = db.getDailyNutrition(yesterday);
      const meals = yesterdayMeals.meals || [];
      const mealSummary = meals.length > 0
        ? meals.map((m) => `- ${m.description}: ${m.calories}kcal (${m.protein_g}g P, ${m.carbs_g}g C, ${m.fat_g}g G)`).join("\n")
        : "Nenhuma refeição registrada ontem.";
      const weightInfo = weight.current
        ? `Peso atual: ${weight.current.weight}kg. ${weight.weeklyChange != null ? `Variação semanal: ${weight.weeklyChange > 0 ? "+" : ""}${weight.weeklyChange}kg.` : ""} ${weight.totalLost != null ? `Total perdido: ${weight.totalLost}kg.` : ""}`
        : "Sem dados de peso ainda.";
      const goalInfo = goals?.target_weight_kg ? `Meta: ${goals.target_weight_kg}kg.` : "";

      return `Gere o cardápio de hoje (${today}) considerando:\n\n` +
        `METAS DO USUÁRIO:\n${goalInfo} ${weightInfo}\n\n` +
        `REFEIÇÕES DE ONTEM:\n${mealSummary}\n\n` +
        `INSTRUÇÕES:\n` +
        `1. Planeje café da manhã, almoço, lanche e jantar\n` +
        `2. Inclua calorias e macronutrientes estimados para cada refeição\n` +
        `3. Total diário deve ser adequado para perda de peso saudável\n` +
        `4. Varie os alimentos em relação a ontem\n` +
        `5. Inclua ao final um bloco JSON: {"calories": total, "protein_g": total, "carbs_g": total, "fat_g": total}\n` +
        `6. Responda em português do Brasil`;
    }

    case "Personal Trainer": {
      const goals = db.getHealthGoals();
      const weight = db.getWeeklyWeightComparison();
      const weightInfo = weight.current
        ? `Peso atual: ${weight.current.weight}kg. ${weight.weeklyChange != null ? `Variação semanal: ${weight.weeklyChange > 0 ? "+" : ""}${weight.weeklyChange}kg.` : ""}`
        : "Sem dados de peso ainda.";
      const goalInfo = goals?.target_weight_kg ? `Meta: ${goals.target_weight_kg}kg.` : "";

      return `Gere o treino de hoje (${today}) considerando:\n\n` +
        `METAS DO USUÁRIO:\n${goalInfo} ${weightInfo}\n\n` +
        `INSTRUÇÕES:\n` +
        `1. Monte um treino completo: aquecimento, 4-6 exercícios com séries/repetições, e alongamento\n` +
        `2. Foque em perda de peso e queima de calorias\n` +
        `3. Varie os exercícios em relação a dias anteriores\n` +
        `4. Inclua estimativa de calorias queimadas\n` +
        `5. Seja realista para nível iniciante/intermediário\n` +
        `6. Responda em português do Brasil`;
    }

    case "Personal Assistant": {
      const agenda = db.getDailyAgenda(today);
      const agendaList = agenda.length > 0
        ? agenda.map((a) => `- ${a.time || "??:??"} ${a.title}${a.description ? `: ${a.description}` : ""}${a.completed ? " ✅" : ""}`).join("\n")
        : "Nenhum compromisso registrado para hoje.";
      const weight = db.getWeeklyWeightComparison();
      const weightInfo = weight.current ? `Peso: ${weight.current.weight}kg` : "";
      const nutritionToday = db.getDailyNutrition(today);
      const calTotal = nutritionToday.totals?.calories || 0;

      let financeBlock = "";
      if (typeof db.getDailyFinance === "function") {
        try {
          const fin = db.getDailyFinance(yesterday);
          if (fin.totals && (fin.totals.expenses > 0 || fin.totals.income > 0)) {
            financeBlock = `\n\nFINANÇAS DE ONTEM (${yesterday}):\n` +
              `Receitas: R$ ${(fin.totals.income || 0).toFixed(2)}\n` +
              `Despesas: R$ ${(fin.totals.expenses || 0).toFixed(2)}\n` +
              `Saldo do dia: R$ ${(fin.balance || 0).toFixed(2)}\n` +
              `Despesas listadas:\n` +
              (fin.entries || []).map((e) => `- ${e.description}: R$ ${(e.amount || 0).toFixed(2)}${e.category ? ` (${e.category})` : ""}`).join("\n");
          }
        } catch (e) {
          deps.log.warn(`[scheduler] finance digest failed: ${e.message}`);
        }
      }

      let weatherBlock = "";
      const weatherLocation = db.getSetting ? db.getSetting("weatherLocation") : null;
      if (weatherLocation) {
        try {
          const w = await require("./weather-tools.cjs").getWeather({ location: weatherLocation, days: 1 });
          if (w.ok) {
            const c = w.current;
            const d = w.forecast[0] || {};
            weatherBlock = `\n\nCLIMA EM ${w.location.toUpperCase()} (${w.units}):\n` +
              `Agora: ${c.temperature != null ? `${c.temperature}°` : "—"} (sensação ${c.feelsLike != null ? `${c.feelsLike}°` : "—"}), ${c.weather}\n` +
              `Umidade: ${c.humidity != null ? `${c.humidity}%` : "—"} · Vento: ${c.windSpeed != null ? `${c.windSpeed}` : "—"}\n` +
              `Hoje: mín ${d.min != null ? `${d.min}°` : "—"} / máx ${d.max != null ? `${d.max}°` : "—"} · ` +
              `${d.weather}${d.precipitationChance != null ? ` · chuva ${d.precipitationChance}%` : ""}` +
              (d.sunrise && d.sunset ? ` · nascer ${d.sunrise.split("T")[1] || d.sunrise} / pôr ${d.sunset.split("T")[1] || d.sunset}` : "");
          } else {
            deps.log.warn(`[scheduler] weather digest failed: ${w.error}`);
          }
        } catch (e) {
          deps.log.warn(`[scheduler] weather digest error: ${e.message}`);
        }
      }

      return `Prepare o resumo diário do usuário para hoje (${today}).\n\n` +
        `AGENDA DE HOJE:\n${agendaList}\n\n` +
        `DADOS DE SAÚDE:\n${weightInfo}\nCalorias registradas hoje: ${Math.round(calTotal)}kcal\n` +
        financeBlock +
        weatherBlock +
        `\n\nINSTRUÇÕES:\n` +
        `1. Abra com um resumo do clima de hoje (dica de roupa se necessário)\n` +
        `2. Resuma a agenda do dia de forma clara e objetiva\n` +
        `3. Mencione as finanças de ontem de forma breve (gastos/saldo)\n` +
        `4. Dê uma dica motivacional do dia\n` +
        `5. Se houver dados de peso/nutrição, comente brevemente\n` +
        `6. Seja direto e útil, como um assistente pessoal\n` +
        `7. Responda em português do Brasil`;
    }

    case "Health": {
      const weight = db.getWeeklyWeightComparison();
      const goals = db.getHealthGoals();
      const weightInfo = weight.current
        ? `Peso atual: ${weight.current.weight}kg. ${weight.weeklyChange != null ? `Variação semanal: ${weight.weeklyChange > 0 ? "+" : ""}${weight.weeklyChange}kg.` : ""} ${weight.totalLost != null ? `Total perdido: ${weight.totalLost}kg.` : ""}`
        : "Sem dados de peso registrados.";
      const goalInfo = goals?.target_weight_kg ? `Meta: ${goals.target_weight_kg}kg.` : "";

      return `Faça um check-in de saúde diário.\n\nDADOS:\n${goalInfo} ${weightInfo}\n\n` +
        `INSTRUÇÕES:\n` +
        `1. Analise o progresso em relação à meta de peso\n` +
        `2. Dê dicas de bem-estar e hidratação\n` +
        `3. Inclua um lembrete para registrar peso se não foi registrado hoje\n` +
        `4. Inclua ao final um bloco JSON: {"metric": "peso", "value": peso_atual, "unit": "kg", "notes": "dica do dia"}\n` +
        `5. Responda em português do Brasil`;
    }

    case "Marketing": {
      const topics = [
        "Thomas Sankara e a revolução de Burkina Faso",
        "Patrice Lumumba e a independência do Congo",
        "Salvador Allende e o Chile socialista",
        "A resistance dos escravizados no Brasil — Quilombo dos Palmares",
        "Angela Davis e o movimento Black Power",
        "Marcus Garvey e o panafricanismo",
        "A historia de Zumbi dos Palmares",
        "Machado de Assis — o escritor que desafiou o racismo",
        "Carlos Drummond de Andrade e a poesia da resistência",
        "A luta abolicionista no Brasil — Luis Gama",
        "Mary Douglas — a ativista britânica contra a escravidão",
        "Harriet Tubman — a condutora do Underground Railroad",
        "Malcolm X e a luta pelos direitos civis",
        "A resistência feminina negra no Brasil colonial",
        "Dandara dos Palmares — a guerreira que o história esqueceu",
      ];
      const todayTopic = topics[new Date().getDay() % topics.length];
      const hour = new Date().getHours();
      const formats = ["x_post", "instagram_stories", "instagram_reels", "instagram_carousel", "tiktok"];
      const currentFormat = formats[hour % formats.length];
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const nutritionYesterday = db.getDailyNutrition(yesterday);
      const calTotal = nutritionYesterday.totals?.calories || 0;

      const formatInstructions = {
        x_post: `Post X/Twitter (280 chars): Tweet curto e impactante. Use 🧵 se for thread.`,
        instagram_stories: `Instagram Stories (15s por slide, 3-5 slides): Hook → Contexto → Clímax → CTA.`,
        instagram_reels: `Instagram Reels (30-90s): Script completo com gancho forte nos 3s, narrativa envolvente e CTA.`,
        instagram_carousel: `Instagram Carrossel (5-10 slides): Título + pontos-chave + CTA final.`,
        tiktok: `TikTok (15-60s): Hook trending, ritmo rápido, textos na tela, ending compartilhável.`,
      };

      return `Crie UMA publicação para as redes sociais sobre: "${todayTopic}".\n\n` +
        `FORMATO DE HOJE: ${currentFormat.toUpperCase()}\n` +
        `INSTRUÇÕES PARA ESSE FORMATO:\n${formatInstructions[currentFormat]}\n\n` +
        `CONTEXTO:\nCalorias consumidas ontem: ${Math.round(calTotal)}kcal\nData: ${today}\n\n` +
        `REGRAS:\n` +
        `1. Foque APENAS no formato solicitado acima\n` +
        `2. Use linguagem envolvente e emocional\n` +
        `3. Foque em histórias apagadas, resistência negra, anti-racismo\n` +
        `4. Inclua 15-20 hashtags relevantes\n` +
        `5. Ao final, publique automaticamente usando a ferramenta publish_to_social\n` +
        `   - Para instagram_stories / instagram_reels / instagram_carousel → platform: "instagram"\n` +
        `   - Para tiktok → platform: "tiktok"\n` +
        `   - Para x_post → platform: "twitter"\n` +
        `6. Gere imagem primeiro com generate_image para Instagram e TikTok\n` +
        `7. Responda em português do Brasil`;
    }

    case "System":
      return "Execute uma verificacao rapida de saude do sistema:\n" +
      "1. Verifique o uso de CPU e memoria com Get-Process\n" +
      "2. Verifique o espaco em disco com Get-PSDrive\n" +
      "3. Verifique se ha atualizacoes pendentes do Windows\n" +
      "4. Verifique o status do Windows Defender\n" +
      "5. Se encontrar qualquer problema, notifique o usuario com sugestoes de resolucao\n" +
      "6. Responda em portugues do Brasil";

    default: {
      const defaults = {
        Finance: "Analise os gastos de hoje e dê uma dica financeira breve.",
        Developer: "Revise um padrão comum de código e sugira melhorias.",
        Teacher: "Sugira um tópico de micro-aprendizado para hoje.",
      };
      return defaults[agentName] || "Gere sua atualização diária.";
    }
  }
}

function setSchedule(agentName, cfg) {
  const schedules = deps.db.getSetting("schedules", {});
  schedules[agentName] = cfg;
  deps.db.setSetting("schedules", schedules);
  reloadAll();
}

function getSchedules() {
  return deps.db.getSetting("schedules", {});
}

module.exports = { init, setSchedule, getSchedules, runAgentTask };
