# Squad Memory: HomeLab Squad

## Estilo de Escrita

- Tom: operacional, preventivo, orientado a segurança
- Linguagem: status binários (OK/ALERTA), métricas numéricas, ação recomendada
- Formato: dashboards, checklists, tabelas de status
- Tom de voz: vigilante, calmo, proativo

## Design Visual

- Status lights: verde OK, âmbar atenção, vermelho crítico
- Gráficos: tempo real (energia, temperatura, presença)
- Mapas: planta da casa com status por cômodo
- Alertas: toast + push + voz (se crítico)

## Estrutura de Conteúdo

1. Health Check (dispositivos online, sensores reportando, HA saudável)
2. Segurança (portas, janelas, alarme, câmeras, motion)
3. Energia (solar, bateria, grid, consumo por circuito)
4. Automações (ativas, falhando, órfãs, performance)
5. Manutenção (firmware, baterias, limpeza, calibração)

## Proibições Explícitas

- Não desarmar alarme sem confirmação explícita
- Não abrir portas/portões sem confirmação de identidade
- Não desligar equipamentos críticos (bomba, freezer, médica)
- Não alterar firmware sem backup + rollback plan
- Não ignorar alerta crítico (fumaça, vazamento, intrusão)

## Técnico (específico do squad)

- Stack: Home Assistant + ESPHome + Zigbee2MQTT + Frigate + MQTT
- Rede: VLAN IoT isolada, MQTT TLS, mDNS local only
- Backup: HA snapshot diário, configs no Git, ESPHome OTA
- Segurança: TLS everywhere, auth obrigatório, fail2ban
- Integração: Hampton (presença → rotinas), Automação n8n (webhooks)