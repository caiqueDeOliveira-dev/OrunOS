# ORDEM DE SERVIÇO �� MICRO-ONDAS

**Data:** registro automático
**Produto:** Micro-ondas
**Problema relatado:** Acende ao conectar na tomada, mas os botões do painel não funcionam.

---

## Diagnóstico (análise técnica)

### Sintoma
- Aparelho acende (luz interna/display aceso) ao ligar na tomada.
- Painel de botões não responde aos comandos.

### Causas prováveis (por ordem de verificação)

1. **Fonte de alimentação da placa de controle**
   - Tensões incorretas/instáveis na placa (Vcc do microcontrolador).
   - Verificar capacitores de filtro (eletrolíticos inchados/vazando) e reguladores de tensão (ex.: 7805).

2. **Placa de circuito impresso (PCB) / trilhas**
   - Trilhas rompidas, solda fria nos conectores do teclado de membrana.
   - Curto-circuito ou componente queimado (CI controlador, cristal oscilador).

3. **Teclado de membrana / painel de controle**
   - Mau contato ou teclado desgastado (falha comum em micro-ondas com uso intenso).
   - Conector flat solto ou oxidado.

4. **Relés / circuitos de comutação**
   - Relé de acionamento danificado pode impedir a leitura dos botões.

5. **Fusível / proteção**
   - Fusível com resistência alterada ou queimado parcialmente (aparelho acende, mas controle sem funcionar).

### Procedimento de verificação sugerido (passo a passo)
1. **Segurança:** descarregar o capacitor de alta tensão antes de qualquer manutenção!
2. Medir tensões na fonte da placa de controle (5V, 12V).
3. Inspecionar capacitores eletrolíticos e reguladores (visual + multímetro).
4. Testar o teclado de membrana com multímetro (continuidade das teclas).
5. Reinserir/limpar o conector flat do painel (álcool isopropílico).
6. Verificar trilhas e soldas na região do microcontrolador e do cristal.
7. Testar relés (bobina e contatos).

### Status da OS
- [x] Registrada
- [ ] Aguardando peça
- [ ] Em conserto
- [ ] Concluída
- [ ] Entregue

---

## Observações
- Substituir capacitores eletrolíticos do setor da fonte é a correção mais comum.
- Teclado de membrana pode ser substituído (peça de reposição barata).
- Avisar o cliente sobre valor do diagnóstico antes de abrir o aparelho.
