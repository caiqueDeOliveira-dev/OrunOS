# Orun Social - Workflows (via Buffer)

## Configuração

### 1. Criar conta no Buffer
1. Acesse [buffer.com](https://buffer.com)
2. Crie uma conta gratuita
3. Conecte suas redes sociais (Instagram, Twitter, TikTok)
4. Vá em **Settings** → **API** → copie a **API Key**

### 2. Descobrir os Channel IDs
Execute no PowerShell (substitua `SUA_API_KEY`):
```powershell
$headers = @{"Authorization" = "Bearer SUA_API_KEY"; "Content-Type" = "application/json"}
$body = '{"query": "{ account { organizations { id name } } }"}'
Invoke-RestMethod -Uri "https://api.buffer.com" -Method POST -Headers $headers -Body $body
```

Depois pegue o `organizationId` e rode:
```powershell
$body = '{"query": "{ channels(input: { organizationId: \"SEU_ORG_ID\" }) { id name service } }"}'
Invoke-RestMethod -Uri "https://api.buffer.com" -Method POST -Headers $headers -Body $body
```

### 3. Importar workflows no n8n
1. Abra o n8n (http://localhost:5678)
2. Clique em **Import from File**
3. Importe os 3 arquivos:
   - `orun-social-instagram.json`
   - `orun-social-twitter.json`
   - `orun-social-tiktok.json`

### 4. Configurar credencial Buffer no n8n
1. No n8n, vá em **Credentials** → **Add Credential**
2. Busque por **Header Auth**
3. Configure:
   - **Name**: Buffer API
   - **Header Name**: Authorization
   - **Header Value**: `Bearer SUA_API_KEY`
4. Salve

### 5. Atualizar workflows
Em cada workflow:
1. Clique no nó **Buffer API**
2. Na credencial, selecione **Buffer API**
3. Salve e ative o workflow

### 6. Testar
```powershell
# Testar Instagram (precisa de imagem)
Invoke-RestMethod -Uri "http://localhost:5678/webhook/social-instagram" -Method POST -ContentType "application/json" -Body '{"body": {"text": "Teste Orun OS!", "imageUrl": "https://exemplo.com/foto.jpg"}}'

# Testar Twitter
Invoke-RestMethod -Uri "http://localhost:5678/webhook/social-twitter" -Method POST -ContentType "application/json" -Body '{"body": {"text": "Teste Orun OS!"}}'
```

## URLs dos Webhooks
| Plataforma | URL |
|------------|-----|
| Instagram | `http://localhost:5678/webhook/social-instagram` |
| Twitter | `http://localhost:5678/webhook/social-twitter` |
| TikTok | `http://localhost:5678/webhook/social-tiktok` |

## Estrutura do Payload
```json
{
  "body": {
    "text": "Texto da postagem",
    "imageUrl": "https://exemplo.com/foto.jpg (opcional para Instagram)",
    "mediaType": "post | story | reel (opcional, padrão: post)"
  }
}
```

## IDs já configurados
- Organization: `6a5632ddea5435fe72b230ef`
- Instagram: `6a56336480cc80cdcab126c3`
- Twitter: `6a56337980cc80cdcab127ba`
- TikTok: `6a56339f80cc80cdcab12992`
