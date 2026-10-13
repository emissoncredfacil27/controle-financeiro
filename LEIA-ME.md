# Meu Financeiro

Aplicativo completo em HTML, CSS e JavaScript puro. Sem backend, sem cadastro e sem mensalidade do aplicativo. Dados em localStorage neste navegador. Gráficos Chart.js pelo CDN.

## Subir no GitHub Pages

1. Extraia o ZIP.
2. Abra o repositório `controle-financeiro` → **Add file → Upload files**.
3. Envie os arquivos da pasta (não o ZIP) na raiz e confirme **Commit changes** na branch `main`. Substitua `index.html` e os demais arquivos de mesmo nome.
4. O GitHub Pages já configurado publica a atualização. Abra o link e atualize a página.

Arquivos de execução: `index.html`, `styles.css`, `core.js`, `app.js`, `manifest.json`, `sw.js`, `icon.svg`, `icon-192.png`, `icon-512.png`. `tests.cjs` e este manual são opcionais na hospedagem.

## iPhone

Safari → Compartilhar → Adicionar à Tela de Início. O aplicativo tem manifest, ícone e service worker para recursos locais offline. Os gráficos precisam de acesso ao CDN; se ele estiver indisponível, os totais e os resumos textuais continuam funcionando.

## Regras dos cálculos

- Valores são guardados em centavos. Saldo previsto = receitas do mês − todas as despesas do mês. Receitas recebidas aparecem separadamente.
- Pago, pendente e atrasado referem-se às despesas. Atrasado é parte de pendente. Data do lançamento determina o mês; lançamentos antigos sem data ficam no mês da migração.
- Parcelamento: o valor é por parcela. Cada parcela gera um lançamento mensal, com vencimentos ajustados ao último dia dos meses curtos. Pagamentos, parcelas restantes e saldo da dívida são recalculados pelo histórico. A edição altera uma parcela por vez.
- Contas recorrentes são criadas ao abrir o respectivo mês. “Novo mês” copia contas fixas e recorrentes do mês selecionado para o próximo, evitando duplicações e mantendo o histórico. Parcelas já programadas não são copiadas novamente.
- Cartões mostram despesas pendentes vinculadas, incluindo parcelas futuras. O valor do mês é calculado pelas datas dos lançamentos. Fechamento e vencimento são referências; não há importação automática de fatura bancária.
- Metas e reservas são controles manuais independentes dos lançamentos. Limites por categoria e meta de economia se repetem em cada mês.
- Alertas do topo cobrem todos os meses; cards e gráficos cobrem o mês selecionado. O badge destaca contas atrasadas, de hoje e de amanhã.

## Dados, backup e migração

O app importa automaticamente o formato anterior `controle-financeiro-v1` no mesmo navegador e endereço, sem remover essa cópia. O novo formato usa `meu-financeiro-v3`. Backups antigos em JSON também podem ser importados. Não há sincronização entre aparelhos ou navegadores. Sua esposa terá dados separados no celular dela.

Mais → Baixar backup JSON. A importação substitui os dados atuais após confirmação. CSV exporta o mês selecionado. Imprimir relatório permite salvar PDF pela impressão do navegador. Os exemplos são opcionais e possuem botão para apagar somente os exemplos.

## Limites verificados

As notificações dependem de HTTPS, permissão e suporte do navegador. São disparadas ao abrir ou usar o aplicativo. Sem servidor/push, não há notificações agendadas com o app fechado. No iPhone, o suporte a notificações depende do uso instalado na Tela de Início e da versão do iOS. Os alertas internos independem dessa permissão.

## Testar

Execute `node tests.cjs`. Não é necessário instalar pacotes. Valida datas, atraso, pago, centavos, parcelas, repetição mensal, novo mês, totais, migração, backup e CSV. Testes reais de instalação e notificações no iPhone precisam ser feitos no aparelho.

Para uma atualização futura do cache offline, altere o nome `CACHE` em `sw.js`. A estratégia usa a rede primeiro para receber a versão atual; os dados financeiros nunca são armazenados no cache do service worker.
