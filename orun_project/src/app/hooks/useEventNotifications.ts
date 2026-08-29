// src/app/hooks/useEventNotifications.ts
//
// Connects the Event Bus + agent notify tool to the Toast UI.
// Listens for:
//   1. app:notify IPC (from agent notify tool) → toast
//   2. Event Bus events (hub:delegate:*, shield:*, memory:*) → toast
//   3. OS notifications for critical events

import { useEffect } from "react";
import { useToast } from "../components/Toast";

type ToastType = "error" | "success" | "info" | "warning";

/** Map event topics to toast types and messages. */
function eventToToast(topic: string, data: Record<string, unknown>): { message: string; type: ToastType } | null {
  switch (topic) {
    case "hub:delegate:started":
      return { message: `Delegando para ${data.targetAgent || "agente"}...`, type: "info" };
    case "hub:delegate:completed":
      return { message: `Tarefa concluída por ${data.agent || "agente"}.`, type: "success" };
    case "hub:delegate:escalated":
      return { message: `Escalação: ${data.error || "falha na execução"}`, type: "warning" };
    case "shield:threat:detected":
      return { message: `Ameaça detectada: ${data.title || "verificar"}`, type: "error" };
    case "shield:scan:completed":
      return { message: `Scan concluído — ${data.findings || 0} achados.`, type: "info" };
    case "memory:saved":
      return { message: "Memória salva.", type: "success" };
    case "memory:consolidated":
      return { message: "Memórias consolidadas.", type: "success" };
    case "planner:goal:completed":
      return { message: `Objetivo concluído: ${data.goal || ""}`, type: "success" };
    case "planner:task:failed":
      return { message: `Tarefa falhou: ${data.error || ""}`, type: "error" };
    case "knowledge:doc:created":
      return { message: `Doc criado: ${data.title || ""}`, type: "info" };
    default:
      return null;
  }
}

/**
 * Hook that wires IPC + Event Bus notifications to the Toast system.
 * Mount once at the app root (inside ToastProvider).
 */
export function useEventNotifications() {
  const { show } = useToast();

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // 1. Wire agent notify tool → toast
    if (window.orun?.app?.onNotify) {
      const unsub = window.orun.app.onNotify((data: { title?: string; body?: string }) => {
        const msg = data.title && data.body ? `${data.title}: ${data.body}` : data.title || data.body || "Notificação";
        show(msg, "info");
      });
      unsubs.push(unsub);
    }

    // 2. Wire Event Bus → toast (subscribe to key topics)
    if (window.orun?.eventBus?.subscribe) {
      const { unsubscribe } = window.orun.eventBus.subscribe(
        ["hub:**", "shield:**", "memory:**", "planner:**", "knowledge:**"],
        (event: { topic: string; data: Record<string, unknown> }) => {
          const toast = eventToToast(event.topic, event.data);
          if (toast) show(toast.message, toast.type);
        }
      );
      unsubs.push(unsubscribe);
    }

    return () => unsubs.forEach((fn) => fn());
  }, [show]);
}
