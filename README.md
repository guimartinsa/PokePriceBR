from cards.models import Set, Card
set_jtg = Set.objects.get(codigo_liga="JTG")


 python manage.py atualizar_precos

 ## Celery no Windows

Durante desenvolvimento em Windows, o worker deve ser iniciado com:

celery -A pokepricebr worker -l info --pool=solo

Em produção (Linux), o pool padrão pode ser utilizado.

## Scan (`POST /api/scan/`)

O scan agora é feito por **embedding** (vetor numérico) e não mais por upload direto de imagem no backend.

Formato aceito:
- `application/json` com `{ "embedding": number[512] }`.

Regras importantes:
- O campo `embedding` é obrigatório.
- O vetor precisa ter **exatamente 512 valores numéricos**.
- O endpoint usa similaridade cosseno com limiar mínimo de confiança.

Status esperados:
- `200` quando identifica carta com confiança suficiente.
- `400` quando o payload está inválido (ex.: embedding com tamanho diferente de 512).
- `404` quando não há cartas com embedding no catálogo.
- `422` quando a similaridade encontrada está abaixo do limiar.

### Como testar no Postman

1. Método: `POST`
2. URL: `https://api.pricedex.com.br/api/scan/` (ou sua URL local)
3. Header:
   - `Content-Type: application/json`
   - `Authorization: Bearer <token>` (opcional, mas recomendado para simular o app)
4. Body (`raw` + `JSON`):

```json
{
  "embedding": [0.001, -0.031, 0.22]
}
```

> Atenção: o exemplo acima é apenas ilustrativo. Para funcionar de verdade, envie os **512** valores.

### Gerando embedding para teste

No frontend, o embedding é gerado localmente a partir da imagem em `extractImageEmbedding` e enviado para o endpoint de scan.
Isso significa que, no Postman, não adianta mais enviar `form-data` com `image`, `email`, `password`.

### Como testar o gerador de embedding do frontend (fim a fim)

Se a ideia é validar o **gerador de embedding** junto com a requisição, o melhor teste é pelo fluxo real do app:

1. Rode frontend e backend.
2. Abra a tela de scan no navegador.
3. Faça um scan normal (câmera) ou use upload de imagem (perfil admin).
4. Abra DevTools (`F12`) > aba **Network** > clique na chamada `POST /api/scan/`.
5. Confira em **Request Payload** que:
   - existe a chave `embedding`;
   - o campo é um array;
   - o tamanho é `512`.
6. Confira o status da resposta (`200`, `422`, `404` etc.) e o corpo retornado.

Esse caminho valida exatamente a mesma cadeia usada em produção:
`imagem -> extractImageEmbedding -> submitScanEmbedding -> /api/scan/`.

### Teste técnico direto no navegador (sem passar pela UI)

Com o frontend rodando em modo dev (`vite`), você também pode testar manualmente no console do browser:

```js
const { extractImageEmbedding } = await import('/src/services/embeddingService.ts');
const { submitScanEmbedding } = await import('/src/api/scan.ts');

const input = document.createElement('input');
input.type = 'file';
input.accept = 'image/*';
input.click();

input.onchange = async () => {
  const file = input.files?.[0];
  if (!file) return;

  const embedding = await extractImageEmbedding(file);
  console.log('dimensão embedding:', embedding.length); // esperado: 512

  const result = await submitScanEmbedding({ embedding });
  console.log('resultado scan:', result);
};
```

> Dica: para esse teste funcionar autenticado, garanta que existe `access` no `localStorage`, porque o frontend envia `Authorization: Bearer <token>` automaticamente quando o token está presente.

### Troubleshooting (DevTools): "seria aqui?"

Quase — no seu print você selecionou um item `data:image/...` (preview/hex da imagem), e **não** a chamada da API.

Para validar o scan corretamente no DevTools:
- Na aba **Network**, filtre por **Fetch/XHR**.
- Dispare o scan novamente.
- Procure a requisição com URL terminando em **`/api/scan/`**.
- Clique nela e confira:
  - **Headers**: `Content-Type: application/json`.
  - **Payload / Request**: JSON com `embedding`.
  - **Preview/Response**: retorno da API (`success`, `card`, `similarity` ou erro).

Se aparecer apenas `data:image/...`, você está vendo o recurso local da imagem capturada, não o request HTTP do backend.

### Se aparecer `OcrProcessingError` no console

Se o console mostrar erros como `OcrProcessingError: Não foi possível extrair nome e número...`, você provavelmente está com **bundle antigo em cache** (fluxo de OCR), e não com o fluxo novo por embedding.

No código atual da tela de scan:
- a rota `/scan` renderiza `CameraView`;
- `CameraView` gera embedding via `extractImageEmbedding(...)`;
- depois envia `POST /api/scan/` com `submitScanEmbedding(...)`.

Ou seja, `OcrProcessingError` não deveria aparecer na versão atual.

Passos para limpar cache e forçar versão nova:
1. DevTools > **Application** > **Service Workers** > `Unregister`.
2. Ainda em **Application** > **Storage** > `Clear site data`.
3. Volte em **Network** e marque `Disable cache`.
4. Faça hard reload (`Ctrl+Shift+R`).
5. Abra `/scan` e teste de novo.

Após isso, deve aparecer a chamada **`POST /api/scan/`** em `Fetch/XHR`.