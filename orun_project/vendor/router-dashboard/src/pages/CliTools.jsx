import React from "react";
import { Card, SectionTitle } from "../components/ui";

export default function CliTools({ onNavigate }) {
  const scripts = [
    {
      name: "OpenAI-compatible",
      code: `const OpenAI = require("openai");
const client = new OpenAI({ baseURL: "http://localhost:4321/v1", apiKey: "orun" });
const res = await client.chat.completions.create({
  model: "default",
  messages: [{ role: "user", content: "oi" }],
});
console.log(res.choices[0].message.content);`,
    },
    {
      name: "curl",
      code: `curl http://localhost:4321/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{"model":"default","messages":[{"role":"user","content":"oi"}]}'`,
    },
    {
      name: "Python (openai SDK)",
      code: `from openai import OpenAI
client = OpenAI(base_url="http://localhost:4321/v1", api_key="orun")
res = client.chat.completions.create(
  model="default",
  messages=[{"role": "user", "content": "oi"}],
)
print(res.choices[0].message.content)`,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-lg font-display font-semibold tracking-tight">CLI Tools</h1>
        <p className="text-sm text-orun-textSecondary mt-0.5">
          Aponte qualquer tool OpenAI-compatible para o Orun Router.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Endpoint</SectionTitle>
          <div className="space-y-2">
            {[
              { label: "Base URL", value: "http://localhost:4321/v1" },
              { label: "Models", value: "GET /v1/models" },
              { label: "Chat", value: "POST /v1/chat/completions" },
              { label: "Anthropic", value: "POST /v1/messages" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between text-xs py-1">
                <span className="text-orun-textSecondary">{r.label}</span>
                <span className="text-orun-text font-mono text-2xs">{r.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {scripts.map((s) => (
          <Card key={s.name}>
            <SectionTitle>{s.name}</SectionTitle>
            <pre className="text-xs text-orun-textSecondary whitespace-pre-wrap font-mono rounded-lg bg-orun-bg border border-orun-border p-3 overflow-x-auto">
              {s.code}
            </pre>
          </Card>
        ))}
      </div>
    </div>
  );
}
