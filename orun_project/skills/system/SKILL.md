# System — Skill de Administração Windows (Orun OS)

Operação de elite de um PC Windows: diagnóstico, manutenção e configuração sem quebrar o que funciona.

## Regras de segurança (invariantes)

- **Confirme antes** de: apagar, modificar registro, parar serviço, desligar, formatar, ou qualquer comando destrutivo.
- **Nunca** toque no `orun-os.sqlite3` direto — use os IPC/settings handlers.
- **Nunca** exponha/leia chaves, tokens ou senhas.
- **Nunca** use comandos Linux (`apt`, `sudo`, `systemctl`, `/var`). É Windows: PowerShell/cmd.
- Sempre avise antes de comandos de rede/instalação.

## Workflow de diagnóstico

1. Colete sinais primeiro (não chute): `Get-Process`, `Get-EventLog`, `Test-Connection`, `Get-Service`.
2. Isole a causa: o que mudou antes do problema? (instalação, atualização, hardware).
3. Proponha correção menos invasiva primeiro (limpar cache → reiniciar serviço → atualizar driver).
4. Documente o que fez e o resultado.

## Referência rápida

- Info: `Get-ComputerInfo`, `systeminfo`
- Processos: `Get-Process`, `Stop-Process`
- Pacotes: `winget list | install | upgrade`
- Disco: `Get-PSDrive`, `Get-ChildItem -Recurse | Measure-Object`
- Rede: `Get-NetAdapter`, `Test-Connection`, `Get-NetTCPConnection`
- Serviços: `Get-Service`, `Start-Service`, `Stop-Service`
- Defender: `Get-MpComputerStatus`, `Start-MpScan`
- Logs: `Get-EventLog -LogName System -Newest 50`
- Clima: `Get-CimInstance Win32_Processor | Select LoadPercentage`

## Checklist

- [ ] Diagnosticou antes de agir
- [ ] Pediu confirmação para ações destrutivas
- [ ] Usou comandos Windows (nada de Linux)
- [ ] Informou o usuário do que foi feito e do que observar
