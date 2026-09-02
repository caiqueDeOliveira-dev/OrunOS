// electron/__tests__/career.test.js
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import career from "../career.cjs";

let dirs = [];

function tmpDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "orun-career-test-"));
  dirs.push(d);
  return d;
}

function freshInit() {
  const userDataPath = tmpDir();
  career.init({ userDataPath });
  return userDataPath;
}

function defaultState() {
  return {
    profiles: {
      caique: { name: "Caíque", area: "", level: "", city: "", remote: "", targetRoles: [], headline: "", about: "", skills: [], experiences: [], education: [], linkedinUrl: "", updatedAt: null },
      esposa: { name: "Esposa", area: "", level: "", city: "", remote: "", targetRoles: [], headline: "", about: "", skills: [], experiences: [], education: [], linkedinUrl: "", updatedAt: null },
    },
    jobs: [],
  };
}

describe("career: perfis", () => {
  beforeEach(() => {
    career._setStateForTest(defaultState());
  });
  afterEach(() => {
    dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));
    dirs = [];
  });

  it("salva perfil do caique com updatedAt e persiste no arquivo", () => {
    const userDataPath = freshInit();
    const res = career.saveProfile("caique", { area: "desenvolvimento", skills: ["React", "TypeScript"] });
    expect(res.ok).toBe(true);
    expect(res.profile.area).toBe("desenvolvimento");
    expect(res.profile.skills).toEqual(["React", "TypeScript"]);
    expect(res.profile.updatedAt).toBeTruthy();

    const raw = JSON.parse(fs.readFileSync(path.join(userDataPath, "career-state.json"), "utf8"));
    expect(raw.profiles.caique.area).toBe("desenvolvimento");
  });

  it("aceita chaves 'caique' e 'esposa' e rejeita inválidas", () => {
    freshInit();
    expect(career.saveProfile("caique", { area: "dev" }).ok).toBe(true);
    expect(career.saveProfile("esposa", { area: "vendas" }).ok).toBe(true);
    expect(career.saveProfile("bob", {}).error).toContain("Perfil inválido");
    expect(career.getProfile("bob")).toBeNull();
  });

  it("gera conteúdo de perfil determinístico para recrutadores", () => {
    freshInit();
    career.saveProfile("caique", { area: "front", level: "pleno", city: "São Paulo", targetRoles: ["desenvolvedor react"], skills: ["React", "TypeScript"] });
    const gen = career.generateProfileContent("caique");
    expect(gen.ok).toBe(true);
    expect(gen.headlines.length).toBeGreaterThan(0);
    expect(gen.about.length).toBeGreaterThan(0);
    expect(gen.keywords).toContain("React");
    expect(gen.checklist.length).toBeGreaterThan(0);
  });
});

describe("career: vagas", () => {
  beforeEach(() => {
    career._setStateForTest(defaultState());
    freshInit();
  });
  afterEach(() => {
    dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));
    dirs = [];
  });

  it("adiciona vaga nova com status 'nova'", () => {
    const res = career.addJob({ profileKey: "caique", title: "Desenvolvedor React", company: "Acme", url: "https://linkedin.com/jobs/1" });
    expect(res.ok).toBe(true);
    expect(res.job.status).toBe("nova");
    expect(res.job.profileKey).toBe("caique");
    expect(career.getState().jobs).toHaveLength(1);
  });

  it("rejeita vaga sem título e sem link/empresa", () => {
    expect(career.addJob({ title: "" }).error).toContain("sem título");
    expect(career.addJob({ title: "X" }).error).toContain("link ou a empresa");
  });

  it("evita duplicidade por URL (case-insensitive)", () => {
    career.addJob({ title: "Vaga A", company: "Acme", url: "https://linkedin.com/jobs/ABC" });
    const dup = career.addJob({ title: "Vaga A (cópia)", company: "Acme", url: "https://LINKEDIN.com/jobs/abc" });
    expect(dup.error).toContain("já cadastrada");
  });

  it("atualiza status e registra appliedAt apenas quando enviada", () => {
    const { job } = career.addJob({ title: "Dev", company: "Acme", url: "https://x/1" });
    const bad = career.updateJobStatus(job.id, "nao-existe");
    expect(bad.error).toContain("Status inválido");

    const prep = career.updateJobStatus(job.id, "curriculo_pronto");
    expect(prep.ok).toBe(true);
    expect(prep.job.appliedAt).toBeNull();

    const sent = career.updateJobStatus(job.id, "enviada");
    expect(sent.ok).toBe(true);
    expect(sent.job.appliedAt).toBeTruthy();
    expect(career.getStats().enviadas).toBe(1);
    expect(career.getStats().enviadasHoje).toBe(1);
  });

  it("lista com filtro por perfil e status", () => {
    career.addJob({ profileKey: "caique", title: "Dev Front", company: "A", url: "https://a/1" });
    career.addJob({ profileKey: "esposa", title: "Vendedora", company: "B", url: "https://b/1" });
    career.addJob({ profileKey: "esposa", title: "Atendente", company: "C", url: "https://c/1" });

    expect(career.listJobs({ profileKey: "esposa" }).total).toBe(2);
    expect(career.listJobs({ profileKey: "caique" }).total).toBe(1);
    expect(career.listJobs({ status: "nova" }).total).toBe(3);

    const stats = career.getStats();
    expect(stats.total).toBe(3);
    expect(stats.byProfile.esposa.total).toBe(2);
    expect(stats.byProfile.caique.total).toBe(1);
  });

  it("remove vaga", () => {
    const { job } = career.addJob({ title: "Dev", company: "A", url: "https://a/1" });
    expect(career.removeJob(job.id).ok).toBe(true);
    expect(career.removeJob(job.id).error).toContain("não encontrada");
    expect(career.getState().jobs).toHaveLength(0);
  });
});

describe("career: preparação de candidatura", () => {
  afterEach(() => {
    dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));
    dirs = [];
  });

  it("gera currículo + carta e marca vaga como 'curriculo_pronto'", () => {
    career._setStateForTest(defaultState());
    freshInit();
    career.saveProfile("caique", { name: "Caíque", area: "desenvolvimento", skills: ["React"], city: "SP", linkedinUrl: "linkedin.com/in/caique" });

    const { job } = career.addJob({ title: "Dev React", company: "Acme", url: "https://linkedin.com/jobs/react-1" });
    const res = career.prepareApplication(job.id, "caique");
    expect(res.ok).toBe(true);
    expect(res.resumePath.endsWith("_curriculo.md")).toBe(true);
    expect(res.letterPath.endsWith("_carta.md")).toBe(true);
    expect(fs.existsSync(res.resumePath)).toBe(true);
    expect(fs.existsSync(res.letterPath)).toBe(true);

    const md = fs.readFileSync(res.resumePath, "utf8");
    expect(md).toContain("# Caíque");
    expect(md).toContain("Dev React");
    expect(md).toContain("**Vaga:** Dev React");

    expect(career.getJob(job.id).status).toBe("curriculo_pronto");
    expect(career.getStats().preparadas).toBe(1);
  });

  it("gera candidatura manual a partir de link sem vaga cadastrada", () => {
    career._setStateForTest(defaultState());
    freshInit();
    career.saveProfile("caique", { name: "Caíque", area: "dev" });
    const res = career.prepareApplication("https://linkedin.com/jobs/manual-99", "caique");
    expect(res.ok).toBe(true);
    expect(fs.existsSync(res.resumePath)).toBe(true);
    expect(res.jobId).toBeNull();
  });

  it("falha quando vaga não encontrada", () => {
    career._setStateForTest(defaultState());
    freshInit();
    expect(career.prepareApplication("", "caique").error).toContain("não encontrada");
  });
});

describe("career: WhatsApp determinístico", () => {
  beforeEach(() => {
    career._setStateForTest(defaultState());
    career._setSearchImplForTest(null);
    freshInit();
  });
  afterEach(() => {
    career._setSearchImplForTest(null);
    dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));
    dirs = [];
  });

  it("isCareerQuestion reconhece perguntas de vagas", () => {
    expect(career.isCareerQuestion("achou alguma vaga?")).toBe(true);
    expect(career.isCareerQuestion("quantos currículos você mandou hoje?")).toBe(true);
    expect(career.isCareerQuestion("procurou emprego pra mim?")).toBe(true);
    expect(career.isCareerQuestion("qual é a previsão do tempo?")).toBe(false);
    expect(career.isCareerQuestion("")).toBe(false);
    // Não deve casar substring genérica de outros agentes (ex.: Automotive pedindo
    // o preço de uma peça) — antes, "procura"/"busca"/"achou" no meio da frase
    // acionavam a rota do Carreiras e gravavam dados no workspace errado.
    expect(career.isCareerQuestion("me procura o valor de uma peça")).toBe(false);
    expect(career.isCareerQuestion("busca o preço da peça no estoque")).toBe(false);
    expect(career.isCareerQuestion("qual o melhor procuramento para o carro?")).toBe(false);
  });

  it("buildWhatsAppReply mostra resumo quando não há vagas", async () => {
    const reply = await career.buildWhatsAppReply("achou alguma vaga?");
    expect(reply).toContain("Encontradas: *0*");
    expect(reply).toContain("Ainda não encontrei vagas cadastradas");
  });

  it("buildWhatsAppReply reflete stats após adicionar vagas", async () => {
    career.addJob({ title: "Dev", company: "A", url: "https://a/1" });
    career.addJob({ profileKey: "esposa", title: "Vendedora", company: "B", url: "https://b/1" });
    const reply = await career.buildWhatsAppReply("mandou currículo hoje?");
    expect(reply).toContain("Encontradas: *2*");
    expect(reply).toContain("Caíque: 1 | Esposa: 1");
  });

  it("buildWhatsAppReply busca vagas quando o usuário pede busca", async () => {
    career._setSearchImplForTest(() =>
      Promise.resolve({
        engine: "stub",
        results: [{ title: "Dev React Remoto", url: "https://exemplo/vaga", description: "remota" }],
      })
    );
    const reply = await career.buildWhatsAppReply("procura vaga de dev");
    expect(reply.startsWith("📄 *Vagas de dev*")).toBe(true);
    expect(reply).toContain("Dev React Remoto");
    expect(reply).not.toContain("Encontradas:");
    // As vagas encontradas ficam salvas (workspace Carreiras).
    expect(career.listJobs().total).toBe(1);
  });

  it("extractJobQuery extrai só a área", () => {
    expect(career.extractJobQuery("procura vaga de dev")).toBe("dev");
    expect(career.extractJobQuery("busca vagas de analista de dados")).toBe("analista de dados");
    expect(career.extractJobQuery("vaga de desenvolvedor pleno")).toBe("desenvolvedor pleno");
    expect(career.extractJobQuery("mandou currículo hoje?")).toBe("");
    expect(career.extractJobQuery("achou alguma vaga?")).toBe("");
  });

  it("searchJobs valida query obrigatória", async () => {
    const res = await career.searchJobs("");
    expect(res.error).toContain("Informe uma busca");
  });
});
