# RÉGUA — Projeto Completo do SaaS para Barbearias do Interior da Bahia

**Documento de aprovação e briefing técnico**
Versão 1.0 · Setembro/2026 · Autor: Youssef
Status: **aguardando aprovação** — depois disso vira input do Claude Code.

---

## 0. Como usar este documento

Ele tem três funções:

1. **Decidir** — você aprova nome, paleta, escopo e preço (seção 17 tem o checklist).
2. **Briefar o Claude Code** — as seções 6 a 11 são especificação técnica pronta para virar prompt.
3. **Vender** — as seções 3, 4, 13 e 14 viram sua landing page e seu script de venda.

O que estiver marcado com **[DECIDIR]** precisa da sua escolha antes de codar.

---

## 1. Leitura de mercado — o que os números dizem e o que eles escondem

### Os números

| Dado | Fonte | O que significa pra você |
|---|---|---|
| ~794 mil barbearias/salões ativos no Brasil (CNAE 9602-5/01) em 2026 | LeadJet, base de CNPJs públicos | Mercado enorme, mas o CNAE mistura salão e barbearia — o número real de barbearia masculina é menor |
| 17,8% desses abriram nos últimos 12 meses | LeadJet | ~141 mil negócios novos por ano = fluxo constante de gente que nunca teve sistema |
| 236 mil novos negócios de beleza abertos em 2025 (+18%) | Sebrae | O setor cresce, não está saturado de *negócios* |
| Bahia não está no top 5 de concentração (SP, MG, RJ, PR, RS) | LeadJet | **Os concorrentes miram o Sudeste. O interior do Nordeste é território mal atendido.** |

### O que os números escondem (a parte importante)

O mercado de **software** para barbearia está saturado. Concorrentes reais, com preço público:

| Concorrente | Preço de entrada | Modelo | Ponto forte | Ponto fraco |
|---|---|---|---|---|
| AppBarber | R$ 79,90–219,90/mês por faixa de profissionais | App próprio (iOS/Android) | 10+ anos de mercado, multi-loja maduro | Exige que o cliente **baixe um app**; caro pra 1–2 cadeiras |
| EiBarber | R$ 49/mês (Essencial) | Web + WhatsApp + IA | Comissão automática, calculadora de preço | Marca genérica, suporte remoto |
| BarberZap | Por faixa de profissionais | Link de agendamento + Mercado Pago | WhatsApp oficial Meta, PIX nativo | Recém-chegado, pouca base |
| Barbeiro.app | **Grátis** (1 prof., 50 agend./mês), Pro R$ 59,90 | PWA | Plano gratuito permanente | PWA, sem app nativo |
| BestBarbers | — | App próprio | Clube de assinatura nativo | Também exige download |
| Trinks / Fresha | Assinatura + taxa por cliente do marketplace | Marketplace | Volume | Feito pra rede grande, não pra bairro |

> **💡 A conclusão que muda tudo**
> Você **não vai ganhar de ninguém no jogo de funcionalidades**. AppBarber tem 10 anos de código, EiBarber tem 600 barbearias, Barbeiro.app é grátis. Se o RÉGUA for "mais um sistema de agendamento", ele morre.
>
> Você ganha em **três coisas que nenhum deles consegue copiar**:
> 1. **Estar em Feira de Santana.** Você instala presencialmente, treina o dono e o barbeiro na cadeira, aparece de novo em 30 dias. Suporte com cara e nome.
> 2. **Falar a língua da operação real do interior** — cliente que chega sem marcar, Pix na mão, o dono ocupado cortando cabelo. Sistema do Sudeste não modela nada disso.
> 3. **Vender gestão, não software.** O dono de barbearia não quer "um sistema". Ele quer saber quanto sobrou no fim do mês.

---

## 2. As verdades da barbearia do interior (o briefing que os concorrentes não têm)

Cada uma vira uma decisão de produto. Isso é o coração do projeto.

| # | Verdade da operação | Decisão de produto |
|---|---|---|
| 1 | **Ninguém baixa app.** O cliente tem celular cheio, internet limitada. Baixar app pra cortar cabelo é fricção demais. | Cliente agenda por **link no WhatsApp**. Zero download. PWA opcional pro dono. |
| 2 | **WhatsApp é o sistema operacional do negócio.** Toda conversa, marcação e confirmação passa por lá hoje. | O sistema **não compete com o WhatsApp — ele alimenta o WhatsApp.** |
| 3 | **O dono também corta cabelo.** Ele olha o sistema entre um cliente e outro, de pé, com a mão suja de pomada. | Dashboard tem que ser lido em **10 segundos**, com números grandes, no celular. |
| 4 | **A sazonalidade é brutal e local.** Sexta e sábado concentram tudo. Micareta, São João, formatura, Natal e Réveillon explodem. Véspera de pagamento é deserto. | Relatório por dia da semana. |
| 5 | **O dono desconfia do movimento do caixa quando não está lá.** | **Log de auditoria**: quem lançou, quem apagou, quem mudou valor. Vende sozinho. |

> **💡 Por que isso importa**
> Esse é o seu fosso competitivo. Um concorrente de São Paulo não escreve essa lista porque não vive isso. Cada linha aqui é uma decisão que ele não tomou.

---

## 3. Posicionamento e diferencial

### Posicionamento em uma frase

> **O RÉGUA é o sistema de quem corta cabelo de verdade — feito no interior, pro interior, com o dinheiro na mão e a fila na porta.**

### Contra o que a marca se posiciona

- Contra **sistema que exige que o cliente baixe app**.
- Contra **planilha e caderno** (o concorrente real: 80% das barbearias ainda usam).
- Contra **software feito pra rede de shopping** vendido pra barbearia de bairro.
- Contra **suporte por ticket que responde em 3 dias úteis**.

### Os 6 diferenciais que entram na landing page

1. **Seu cliente agenda pelo link. Sem baixar nada.**
2. **Sem burocracia de comanda.** O cliente marca serviço, barbeiro e horário — e pronto. Nada de fila de pagamento no app.
3. **Financeiro simples, sem planilha.** Você lança o que entra e o que sai, direto do celular.
4. **Implantação feita por gente, na sua barbearia.** Não é vídeo tutorial.

> **💡 O diferencial mais forte é o 4 e ele não é técnico.** É o único que ninguém escala. Guarde isso — é ele que justifica cobrar mais caro que o Barbeiro.app grátis.

---

## 4. Marca — nomes, slogan e tom de voz

### 4.1 Nomes propostos — ✅ **DECIDIDO: RÉGUA**

| Nome | Por quê | Força | Risco |
|---|---|---|---|
| **RÉGUA** ⭐ | "Corte na régua", "barba na régua" é gíria de barbearia em todo o Brasil. E régua = medida, controle, disciplina — exatamente o que um sistema de gestão faz. **Duplo sentido perfeito: o corte na régua e o negócio na régua.** | Curto, oral, memorável, funciona como verbo ("bota na régua") | Palavra comum — precisa de domínio composto |
| **CADEIRA** | A cadeira é a unidade de produção da barbearia. Cadeira vazia = prejuízo. O sistema existe pra manter cadeira cheia. | Conceito de negócio embutido no nome | Menos "gíria", mais frio |
| **DEGRADÊ** | O corte mais pedido do Brasil. Instantaneamente reconhecível pelo público. | Altíssima identificação | Ambíguo pra software; difícil pra multi-nicho depois |
| **BALCÃO** | O balcão é onde o dinheiro passa. Nome honesto, de comércio de rua. | Autêntico, nada tech | Pouco "produto digital" |
| **MARRA** | Atitude baiana. "Barbearia com marra." | Personalidade forte, regional sem ser caricato | Pode soar arrogante pra alguns donos |
| **TOCA** | "A toca do barbeiro" — o espaço masculino. | Afetivo, ligado ao ritual | Fraco pra financeiro |

**Minha recomendação: RÉGUA.**
Motivo: é o único que resolve as duas metades do produto ao mesmo tempo (o corte e a gestão), é curto, cabe em ícone de app, é fácil de falar no telefone e vira slogan sozinho.

**Domínios a checar antes de fechar:** `regua.app`, `usaregua.com.br`, `sistemaregua.com.br`, `regua.barber`. Confirmar também @regua no Instagram — se estiver ocupado, usar @regua.app ou @usaregua.

### 4.2 Slogans — ✅ **DECIDIDO: "Sua barbearia na régua."**

| Slogan | Uso |
|---|---|
| **Sua barbearia na régua.** ⭐ | Principal — assinatura da marca |
| **Cadeira cheia, caixa fechado.** | Anúncio de conversão — fala com a dor |
| **O corte é seu. A conta é nossa.** | Institucional, tom Apple |
| **Sem app pro cliente. Sem desculpa pro barbeiro.** | Anúncio comparativo, tom Samsung |
| **Fecha o caixa antes de varrer o chão.** | Reels / conteúdo — visual imediato |
| **Tudo que entra. Tudo que sai. Na régua.** | Foco no módulo financeiro |

### 4.3 Tom de voz

**Três adjetivos: Direto · Prático · Com respeito ao ofício.**

| Fazer | Não fazer |
|---|---|
| "Fechou o dia? Toca aqui." | "Realize o encerramento do seu fluxo operacional." |
| "Sua barbearia faturou R$ 840 essa semana." | "Consulte o relatório analítico de produtividade." |
| "3 clientes sumiram há mais de 45 dias. Manda um oi?" | "Identificamos oportunidades de reengajamento." |
| Falar de dinheiro sem rodeio | Fingir que barbearia é "experiência premium" quando o corte custa R$ 30 |

**O anti-DNA da marca:** nada de tesoura vintage com bigode de hipster e listra vermelha e azul. Esse visual está morto e é o que 100% dos concorrentes usam. O RÉGUA é **ferramenta de trabalho moderna**, não decoração retrô.

---

## 5. Identidade visual

### 5.1 Direção estética recomendada: **"Oficina Noturna"**

Escuro por padrão, quente, com um acento de latão. A referência não é barbearia vintage — é **painel de máquina bem-feita**: Linear + Vercel, mas com temperatura. O elemento inesquecível é o **número**: os valores em dinheiro aparecem gigantes, em fonte monoespaçada, como um visor de caixa registradora.

Por que escuro: o dono usa o sistema à noite fechando o caixa, com luz baixa, e durante o dia com a tela no brilho máximo. Tema escuro com alto contraste resolve os dois. **Tem um botão "Modo Sol"** que aumenta o contraste para uso na rua.

### 5.2 Paletas — ✅ **DECIDIDO: A**

#### Paleta A — "Aço & Âmbar" ⭐ recomendada

Preto carvão + off-white quente + âmbar de latão. O âmbar remete ao metal de navalha antiga sem cair no clichê vintage.

```css
:root {
  /* Fundos */
  --bg:            #0B0B0C;  /* fundo base */
  --surface:       #141416;  /* cards */
  --surface-2:     #1E1E21;  /* elevado, modais */
  --line:          #2A2A2E;  /* bordas */

  /* Texto */
  --fg:            #F2F1ED;  /* texto principal, off-white quente */
  --fg-muted:      #A1A1A8;  /* secundário */

  /* Acento — dominante da marca */
  --accent:        #E8B04B;  /* âmbar latão — botões, marca */
  --accent-press:  #C9963B;

  /* Semântica financeira — NUNCA usar essas cores pra outra coisa */
  --entrada:       #4FB477;  /* dinheiro entrando */
  --saida:         #E2564D;  /* dinheiro saindo */
  --info:          #6BA3D6;
}
```

**Tipografia — ✅ atualizado (v2, depois de referência visual):**
- Display (títulos, marca): **Anton** — condensada, caixa alta, super impactante, cara de letreiro/placa de oficina
- Texto (parágrafo): **Open Sans** — leve, legível, neutra
- UI (botões, rótulos, navegação): **Oswald** — condensada, uppercase, complementa o peso do Anton sem competir
- **Números e dinheiro: Space Mono** — segue igual, monoespaçada, cara de comprovante

> **💡 Histórico da tipografia — 3 rodadas até fechar**
> Começou em Bebas Neue (condensada, "cartaz"). Depois de uma referência mais editorial, passou pra DM Serif Display (serifada, autoral) — mas destoava do resto da marca, que é industrial e direta, não editorial. Fechou em **Anton**: mantém o impacto forte que a marca pedia desde o início, sem cair de volta no clichê que a Bebas Neue tinha.

#### Paleta B — "Cal & Terracota"

Identidade nordestina sem caricatura: parede de cal, telha, verde garrafa. Tema claro. Boa se você quiser fugir do dark-mode-tech que todo SaaS usa.

```css
:root {
  --bg:        #FAF7F2;  /* cal */
  --surface:   #FFFFFF;
  --line:      #E4DCD0;
  --fg:        #1A1714;
  --fg-muted:  #6E655B;
  --accent:    #C25230;  /* terracota / telha */
  --accent-2:  #164B3F;  /* verde garrafa */
  --entrada:   #2F7D5C;
  --saida:     #B23A2E;
}
```
Tipografia: Display **Fraunces** · Texto **Epilogue** · Números **Space Mono**

#### Paleta C — "Azul Noite & Cobre"

Sóbria, quase bancária. Passa confiança no módulo financeiro. Menos personalidade, mais autoridade.

```css
:root {
  --bg:       #0D1521;
  --surface:  #14202F;
  --line:     #22334A;
  --fg:       #EAF0F7;
  --fg-muted: #93A4BA;
  --accent:   #C97B4A;  /* cobre */
  --entrada:  #46A96F;
  --saida:    #D9534F;
}
```
Tipografia: Display **Unbounded** · Texto **DM Sans** · Números **Space Mono**

### 5.3 Princípios de UI (regras fixas do design system)

1. **Regra do polegar** — toda ação que o dono faz mais de 10x por dia fica na metade **inferior** da tela. Ele usa de pé, com uma mão só.
2. **Ícone nunca vem sozinho** — sempre ícone + rótulo escrito. O público não decifra pictograma.
3. **Cor semântica é lei** — verde só significa dinheiro entrando, vermelho só dinheiro saindo. Nunca usar essas cores pra sucesso/erro de formulário.
4. **Gráfico só quando muda a decisão.** Dashboard não é enfeite. Se o número resolve, é número grande, não pizza.
5. **Zero modal para ação frequente** — usar bottom sheet (painel que sobe de baixo), que cabe no polegar.
6. **Grid de 4px**, raio de canto 12px em cards / 8px em botões, uma única sombra suave.
7. **Motion contido no app** — 150 a 220ms, ease-out. O app é ferramenta, não vitrine. Animação pesada (staggered reveal, parallax) só na **landing page**.
8. **Escala tipográfica:** 12 / 14 / 16 / 20 / 28 / 40 / 64. Valor em dinheiro no dashboard usa 40 ou 64.
9. **Contraste mínimo WCAG AA (4.5:1)** em todo texto. Barbearia tem luz ruim.
10. **Estado vazio nunca fica vazio** — sempre com uma ação ("Nenhum lançamento hoje. Registrar entrada").

### 5.4 Logo — direção (para você desenhar ou briefar)

Símbolo: uma **régua estilizada** cujos traços de medição viram um **degradê de barras crescentes** (as barras do gráfico). Um símbolo, duas leituras: o corte e o faturamento. Funciona em 16px de favicon e em fachada.
Wordmark em Anton, tudo em caixa alta: **R É G U A**.

---

## 6. Escopo funcional

Dividido em três ondas. **Só o MVP entra no primeiro código.** O resto é roadmap — e roadmap serve pra você não codar coisa demais antes de vender a primeira licença.

### 6.1 MVP — o que precisa existir pra cobrar dinheiro

#### Módulo 1 — Conta e acesso

- **Conta da barbearia (dono):** e-mail e senha (mínimo 4 dígitos). Cadastro confirmado por link/código enviado ao e-mail
- **Convidar barbeiro:** o dono toca em "Convidar" no painel → o sistema mostra o link exclusivo da barbearia (`regua.app/nome-da-barbearia/equipe`) e um botão **"Enviar por WhatsApp"** (`wa.me`, texto pronto) — não fica só copiar/colar manual
- **Conta do barbeiro:** nome, WhatsApp e senha (mínimo 4 dígitos) — **o próprio barbeiro cria**, pelo link que recebeu. É esse link que amarra a conta dele a essa barbearia específica desde a criação. Fica **"pendente"** e só acessa o sistema depois que o **dono aprova no painel**
- **Perfil do barbeiro (depois de aprovado):** foto e especialidade são **preenchidos pelo próprio barbeiro** no primeiro acesso — não pelo dono. O dono só aprova a entrada; o resto é conta dele (ver Módulo 2)
- **Conta do cliente:** nome, WhatsApp e senha (**mínimo 4 dígitos**) — é só o que ele precisa pra poder agendar
- **Login:** dono por e-mail + senha · barbeiro e cliente por WhatsApp + senha
- Recuperação de senha: dono pelo e-mail · barbeiro e cliente pelo WhatsApp

> **💡 Por que a aprovação do barbeiro substitui o código de verificação**
> O ponto de checagem de identidade agora é duplo e mais simples: o **e-mail confirmado** garante que a barbearia é real, e a **aprovação manual do dono** garante que cada barbeiro é quem diz ser antes de tocar em qualquer dado. Ninguém entra "pendente" no sistema de fato — só existe depois que o dono clica em aprovar.

> **⚠️ Limite do MVP:** um barbeiro = uma barbearia. O WhatsApp dele é único no sistema, então se ele trabalha em duas barbearias diferentes que usam o RÉGUA, precisaria de duas contas — o que a checagem de WhatsApp único bloqueia hoje. É um caso raro no interior, mas fica registrado: se aparecer na prática, entra como ajuste de v1.1 (permitir um WhatsApp vinculado a mais de uma barbearia, com troca de contexto no login).

> **⚠️ O que acontece quando um barbeiro é removido:** os agendamentos futuros dele precisam de uma saída definida — a mais simples é o sistema **cancelar automaticamente e avisar os clientes afetados** (via `wa.me`, o dono revisa antes de reagendar manualmente). O histórico dele (atendimentos já concluídos, valor gerado) **fica intacto** nos relatórios — remover a conta não apaga o passado, só impede login novo.

#### Módulo 2 — Cadastros base

- Barbearia: nome, endereço, foto, horário de funcionamento, dias fechados, **Instagram**
- Profissionais: **cadastro criado pela aprovação do convite** (Módulo 1) — foto e especialidade completados pelo próprio barbeiro, horário de trabalho também
- Serviços: nome, preço, duração em minutos, cor na agenda

> **💡 Quando a barbearia fecha, ninguém agenda — mesmo que o barbeiro tenha configurado horário naquele dia**
> Dia fechado da barbearia (feriado, por exemplo) **sempre vence** o horário individual do barbeiro. Ele pode ter deixado configurado "trabalho toda terça", mas se o dono marcou aquela terça como feriado, a agenda pública não libera horário ali. É a mesma lógica de hierarquia da RLS: a regra mais ampla do dono nunca é contornada pela configuração pessoal do barbeiro.

#### Módulo 3 — Agendamento

- Grade diária e semanal, coluna por barbeiro
- **Criar agendamento** e mudar seu status: **agendado → confirmado → concluído** (ou **faltou** / **cancelado**)
- **Bloqueio de horário do barbeiro** — o próprio barbeiro configura seu horário de trabalho (dias, horário, intervalo de almoço) e pode bloquear um horário pontual (médico, folga) na própria agenda. O bloqueio some da grade pro cliente, e ninguém marca ali. **Se já existe um agendamento confirmado no horário que ele tenta bloquear, o sistema avisa e pede pra resolver o conflito primeiro** (cancelar/remarcar o cliente antes de travar o horário) — nunca bloqueia por cima de um cliente já marcado sem avisar
- **Página pública de agendamento** — link único da barbearia (`regua.app/nomedabarbearia`). Cliente entra com a conta dele (nome/WhatsApp/senha) e escolhe **serviço → barbeiro → horário → confirma**
- **"Meus agendamentos" (tela do cliente)** — próximos horários marcados e histórico dos concluídos, com botão de **cancelar** o próprio (dentro do prazo — seção 6.1.1)

> **💡 Nota técnica, não é uma tela nova**
> O sistema continua **impedindo dois agendamentos no mesmo horário com o mesmo barbeiro** — isso não é uma função visível, é uma regra de banco de dados que evita erro de digitação ou de rede duplicando horário.

> **💡 Por que o próprio barbeiro marca "concluído"**
> É ele quem sabe, na hora, se cortou ou se o cliente não apareceu. Se só o dono pudesse mudar isso, o status ficaria sempre atrasado (o dono nem sempre está olhando o sistema no momento exato). E é esse status que alimenta o "Meu desempenho" dele (Módulo 5) — sem ele marcar, o próprio número dele fica errado. **A partir de agora, é também esse status que lança dinheiro no financeiro — ver Módulo 4.**

> **⚠️ Gargalo real: agendamento que passa da hora e ninguém marca nada**
> Se o barbeiro esquecer de marcar concluído/faltou, o agendamento fica "confirmado" pra sempre — sem entrada no financeiro, sem contar no desempenho dele, sem entrar na taxa de no-show. Solução simples: na tela **Hoje** do barbeiro e do dono, todo agendamento com horário já passado e ainda "confirmado" aparece destacado no topo ("3 atendimentos de ontem sem status") até alguém resolver. Não impede nada, só não deixa esquecer.

#### Módulo 4 — Financeiro (entradas e saídas)

- **Entradas automáticas:** quando o barbeiro (ou o dono) marca um agendamento como **concluído**, o sistema lança sozinho uma entrada no valor do serviço (`valor_servico`, gravado no momento do agendamento — não muda se o preço do serviço mudar depois). **Pendente e confirmado não geram nada** (ficam neutros). **Cancelado e faltou também não entram no fluxo.**
- **Entradas manuais:** pra qualquer coisa que não veio de um agendamento (venda avulsa, outra receita)
- **Saídas**: aluguel, energia, água, internet, produtos, marketing, retirada do dono ("pró-labore"), outros — com categorias editáveis
- **Despesa fixa recorrente** — explicado no quadro abaixo
- Extrato filtrado por **período e por barbeiro**
- Exportar CSV/Excel

> **💡 Como funciona o lançamento automático**
> O gatilho é só um: **status vira "concluído"**. Nesse instante, nasce uma entrada no financeiro com a descrição do serviço e o valor gravado no agendamento. Se o barbeiro mudar de ideia e voltar o status (ex.: marcou concluído por engano), a entrada correspondente **também precisa sumir junto** — por isso o lançamento fica marcado com o `agendamento_id` de origem, pra sistema saber qual apagar. O dono ainda pode editar ou excluir esse lançamento manualmente depois — como qualquer edição no financeiro, isso **pede a senha de novo** (seção 10).

> **💡 Como funciona a despesa fixa recorrente**
> É pra gasto que se repete todo mês com o mesmo valor (ou quase) — aluguel, internet, energia, mensalidade de algum serviço. Você cadastra **uma vez**: descrição, valor e dia do mês em que vence. A partir daí, todo mês, no dia marcado, o sistema **lança essa saída sozinho no financeiro** — sem você precisar digitar de novo. Se o valor mudar num mês (conta de luz variou), você edita só aquele lançamento, sem afetar os meses seguintes. Serve pra duas coisas: você não esquece de contar aquele gasto no seu resultado, e o relatório do mês já sai correto sem trabalho manual.

#### Módulo 5 — Painel do gestor (dashboards)

Três níveis de leitura, porque o dono tem três momentos diferentes:

**Nível 1 — "Como tá hoje?" (leitura em 10 segundos, topo da tela)**
- Atendimentos feitos / agendados restantes hoje
- Entradas e saídas lançadas no dia

**Nível 2 — "Como tá o mês?" (rolagem)**
- Entradas do mês vs mês anterior (com % de variação)
- Entradas x saídas x **saldo** (o número que ninguém mostra e todo dono quer)
- Atendimentos por barbeiro
- Top 5 serviços mais agendados
- Taxa de furo (no-show)

**Nível 3 — "O que eu faço com isso?" (insights, não gráficos)**
- Horários mortos da semana (onde criar promoção)
- Alerta de despesa acima da média

Gráficos interativos: barra por dia da semana, linha de entradas/saídas do mês. **Todos com filtro de período e por barbeiro.** Toque na barra abre o detalhe do dia.

**Visão do próprio barbeiro — "Meu desempenho"** (dentro do painel reduzido dele, seção 11): atendimentos concluídos hoje / na semana / no mês, e o **valor total dos serviços que ele realizou** nesses períodos. Sem comparar com os outros barbeiros, sem ver o financeiro da barbearia — só o dele.

> **💡 Por que isso importa mesmo sem comissão**
> Comissão calculada automática saiu do escopo, mas "quanto eu fiz hoje" é uma informação que o próprio barbeiro quer ver de qualquer forma — pra saber se o dia valeu a pena, se bate com o que ele acha que fez. É retenção de uso: ele abre o sistema pra ver isso todo dia, mesmo sem ser dono.

#### Módulo 6 — WhatsApp e contato direto

Quatro mecanismos diferentes, cada um resolvendo uma parte:

- **Notificação automática pro barbeiro (API oficial, entra no MVP):** assim que o cliente confirma um agendamento, o sistema dispara sozinho uma mensagem pro WhatsApp do barbeiro — "Novo agendamento: [cliente], [serviço], [horário]." Usa a **Cloud API oficial da Meta**, categoria **utilidade** (a mais barata, ver seção 8.3). Sem QR Code, sem risco de banimento.
- **Lembrete automático pro cliente, 2h antes do horário (API oficial, entra no MVP):** o sistema dispara sozinho — "Seu horário na [barbearia] é às [hora]. Precisa cancelar? Toque aqui." Mesma categoria utilidade, mesmo custo baixo.
- **Botão "Ligar" e "Mensagem" no sistema (zero custo, sem API):** em cada agendamento, o barbeiro toca num ícone e o celular dele abre o **discador** (`tel:`) ou o **WhatsApp** (`wa.me`) já com o número que o cliente cadastrou na conta. Isso não usa a API paga — é um link que abre o app nativo do celular do barbeiro, com o número preenchido.
- **Demais mensagens, manuais via `wa.me` (como já estava):** aniversário, promoção — o sistema monta o texto, o dono ou barbeiro só toca em enviar. Fica de fora do automático por enquanto pra manter o custo baixo; migra pra automático na v1.1 se fizer sentido pelo volume de uso.

> **💡 Por que o lembrete sai 2h antes, e não 1h**
> Você fechou o cancelamento do cliente em até 1h antes do horário (seção 6.1.1). Se o lembrete chegasse exatamente 1h antes, ele chegaria no instante em que a janela de cancelamento **já fechou** — o cliente veria o aviso sem poder fazer nada com ele. Com 2h de antecedência, sobra 1h de folga real pra ele cancelar pelo próprio "Meus agendamentos" (Módulo 3) depois de ler a mensagem.

> **💡 Por que essas duas mensagens são automáticas, e as outras não**
> São as únicas que **precisam** sair sem alguém tocar em nada — uma avisa o barbeiro na hora, a outra avisa o cliente num horário que ninguém vai estar de prontidão pra mandar manualmente (pode ser de madrugada pra um horário de manhã cedo). As outras (aniversário, promoção) o dono ou barbeiro já está olhando o sistema quando fazem sentido, então o toque manual não perde o timing e mantém o custo em zero.

### 6.1.1 Permissões — quem pode alterar o quê

Regra geral: o **dono decide o que afeta o negócio como um todo** (preço, catálogo, dinheiro, quem faz parte da equipe). O **barbeiro decide o que é só dele** (sua própria agenda, seu próprio horário).

| Ação | Dono | Barbeiro | Cliente |
|---|---|---|---|
| Preço, nome e duração dos serviços | ✅ Só ele | ❌ | ❌ |
| Dados da barbearia (endereço, Instagram, horário de funcionamento geral, foto) | ✅ Só ele | ❌ | ❌ |
| Aprovar, remover ou suspender barbeiro | ✅ Só ele | ❌ | ❌ |
| Financeiro — entradas, saídas, despesas fixas, extrato | ✅ Só ele | ❌ | ❌ |
| Relatórios e dashboards da barbearia (níveis 2 e 3) | ✅ Só ele | ❌ — só vê "Meu desempenho" (o próprio) | ❌ |
| Plano, cobrança, configurações da conta | ✅ Só ele | ❌ | ❌ |
| Seu próprio horário de trabalho (dias, horário, almoço) | ✅ Pode editar o de qualquer barbeiro | ✅ Edita o próprio | ❌ |
| Bloqueio pontual na própria agenda | ✅ Pode bloquear a de qualquer barbeiro | ✅ Bloqueia a própria | ❌ |
| Criar agendamento | ✅ Qualquer barbeiro | ✅ **Só na própria agenda** | ✅ **Só pra si mesmo** |
| Mudar status pra confirmado / concluído / faltou | ✅ Qualquer barbeiro | ✅ **Só dos próprios atendimentos** | ❌ |
| **Cancelar o próprio agendamento** | ✅ Qualquer um | ✅ Só os da própria agenda | ✅ **Só o próprio, até 1h antes** |
| Ver a própria "Meu desempenho" | — | ✅ | — |
| **Ver "Meus agendamentos" (histórico e próximos)** | — | — | ✅ **Só os próprios** |

> **💡 Sugestões de mais alguns pontos pra travar — pensando no que costuma dar problema numa equipe:**
> - **Cancelar agendamento de outro barbeiro:** só o dono. Se o barbeiro pudesse cancelar a agenda alheia, um desentendimento vira bagunça na agenda.
> - **Editar o próprio nome/foto de perfil:** liberar pro barbeiro — é dado dele, não afeta ninguém.
> - **Ver o WhatsApp/e-mail de outro barbeiro:** só o dono. Não tem motivo pra um barbeiro ver o contato pessoal do colega dentro do sistema.
> - **Alterar categoria de despesa/entrada:** só o dono — mesmo raciocínio do financeiro.
> - **Editar dado já lançado no financeiro:** mesmo o dono, só com **reautenticação** (senha de novo) — já está na seção 10, reforçando aqui porque é dinheiro.

✅ **Decidido** — cancelamento do cliente até **1 hora antes** do horário. Depois disso, só o barbeiro ou o dono cancelam (evita cancelamento em cima da hora sem ninguém saber).

Essa tabela deve virar, no código, uma função central de checagem de permissão (chamada em toda ação, não copiada tela por tela) — pra não ter o risco de esquecer de aplicar a regra em uma tela nova amanhã.

### 6.1.2 Onboarding do dono — primeiro uso

Isso nunca tinha sido especificado, só citado como métrica (seção 15, "conversão do trial"). Sem esse roteiro, cada dono descobre o sistema sozinho — e é exatamente onde trial vira churn antes de virar cliente.

1. Cadastra a barbearia (nome, endereço, Instagram, horário de funcionamento)
2. Tela seguinte já é **"Convide seu primeiro barbeiro"** com o botão de WhatsApp pronto (Módulo 1) — ou "pular, sou eu que corto"
3. Cadastra pelo menos 1 serviço (obrigatório pra continuar — sem serviço não tem o que agendar)
4. Sistema mostra o **link público pronto** (`regua.app/nome-da-barbearia`) com botão de copiar e botão de compartilhar no WhatsApp/Instagram
5. Tela final: "Faça um agendamento de teste" — o dono simula um cliente marcando, pra ver o fluxo completo antes de divulgar pra clientes de verdade

> **💡 Por que o passo 5 existe**
> É o "aha moment" — o dono só confia no sistema depois de ver funcionando de ponta a ponta com os próprios olhos. Pular esse passo é o tipo de coisa que explica trial que não converte.

### 6.1.3 Fim do trial e cancelamento — o que faltava

- **Dia 11 do trial** (3 dias antes de acabar): lembrete automático por WhatsApp — "Seu teste acaba em 3 dias, escolha um plano pra não perder o acesso"
- **Dia 14, sem plano escolhido:** conta não é apagada — fica em **modo somente leitura** (vê os dados, não cria agendamento novo nem lança financeiro) até escolher um plano. Perder dados de cliente por trial vencido seria o pior jeito de perder um cliente
- **Cancelamento:** autoatendimento no painel ("Meu plano" → "Cancelar assinatura"), sem precisar falar com você. Confirma por senha. Dados ficam guardados por 90 dias (caso ele volte) e depois são apagados, conforme a política de privacidade (seção 10.3)

---

### 6.2 v1.1 — 60 a 90 dias depois do lançamento

- **Clube do Corte** (assinatura recorrente do cliente final) — detalhado na seção 7
- WhatsApp automático via API oficial da Meta
- Programa de fidelidade digital (o cartão carimbado virtual)
- Relatório mensal em PDF disparado sozinho no WhatsApp do dono todo dia 1º

### 6.3 v2 — quando tiver 30+ barbearias pagando

- Multi-unidade com relatório consolidado
- Emissão de NFS-e
- App nativo (só se a base pedir — PWA resolve 95%)
- Marketplace regional ("barbearias perto de você" em Feira e região)
- Modo revenda/white-label para outros freelancers venderem com a marca deles

---

## 7. Funções novas que eu sugiro (além do que você pediu)

Ordenadas por **retorno sobre esforço**. As cinco primeiras eu considero decisivas.

| # | Função | O que é | Impacto | Esforço | Onda |
|---|---|---|---|---|---|
| 1 | **Clube do Corte** | O cliente paga R$ 89/mês e tem 4 cortes. Cobrança recorrente automática no cartão ou Pix. | 🔥 Altíssimo | Médio | v1.1 |
| 2 | **Log de auditoria** | Registra quem lançou, alterou ou apagou cada movimentação financeira. | 🔥 Alto | Baixo | MVP |
| 3 | **Radar de cliente sumido** | Lista quem não volta há 30/45/60 dias + botão de WhatsApp. | Alto | Baixo | MVP |
| 4 | **Calculadora de preço mínimo** | Soma custo fixo + variável e mostra quanto o corte precisa custar pra dar lucro. Diz quantos cortes/mês pra não ter prejuízo (ponto de equilíbrio). | Alto | Baixo | v1.1 |
| 5 | **Termômetro de horário morto** | Aponta os horários vazios e sugere promoção relâmpago disparada no WhatsApp. | Alto | Médio | v1.1 |
| 6 | **Catálogo de cortes com foto** | O cliente escolhe a referência no agendamento. Reduz insatisfação e vira conteúdo pro Instagram da barbearia. | Médio | Baixo | v1.1 |
| 7 | **Relatório mensal automático** | PDF no WhatsApp do dono todo dia 1º, com o resumo do mês. Reforça o valor do sistema todo mês. | Médio | Médio | v1.1 |
| 8 | **Indicação premiada** | Cliente indica amigo, os dois ganham desconto. Rastreado por link. | Médio | Médio | v2 |

> **💡 A função número 1 merece parágrafo próprio**
> O **Clube do Corte** transforma a barbearia de "receita imprevisível" em "receita garantida no dia 5". Um dono com 40 assinantes a R$ 89 tem R$ 3.560 entrando antes de abrir a porta. **Isso muda a vida dele — e ele nunca mais cancela seu sistema, porque o clube vive dentro dele.** É a feature que trava o cliente com você. O BestBarbers já entendeu isso; a maioria dos outros não.

---

## 8. Arquitetura técnica

### 8.1 Stack recomendada

| Camada | Escolha | Motivo |
|---|---|---|
| Front-end | **Next.js 15 (App Router) + TypeScript + Tailwind** | Você já domina o ecossistema; App Router dá rota pública (agendamento) e privada (painel) no mesmo projeto |
| Componentes | **shadcn/ui**, mas com os tokens da seção 5.2 sobrescritos | Base acessível pronta, sem cara de template — desde que você troque a paleta e as fontes |
| Estado | **Zustand** (global leve) + **TanStack Query** (dados do servidor) | Cache e revalidação de dados resolvidos de fábrica |
| Banco + Auth + Storage | **Supabase (PostgreSQL)** | Você já usa; RLS resolve multi-barbearia com segurança no banco |
| Hospedagem | **Vercel** | Deploy contínuo, edge, PWA sem dor |
| Gráficos | **Recharts** | Leve, customizável com os tokens da marca |
| Pagamentos (assinatura do SaaS) | **Asaas** | Pix, boleto e cartão recorrente nacionais, taxa menor que Stripe pra Pix |
| WhatsApp (notificação automática) | **Cloud API oficial da Meta**, via BSP com plano free (ex.: AraraHQ) | Ver 8.3 — cheap, oficial, sem risco de banimento |
| WhatsApp (ligar/mensagem manual) | `tel:` + `wa.me` — sem API | Zero custo, abre o app nativo do celular |
| Job agendado (lembrete de 2h) | **Supabase pg_cron** (ou Vercel Cron) rodando a cada 15 min | Busca agendamentos com `inicio` entre 1h45 e 2h de agora, `status = confirmado` e `lembrete_cliente_enviado = false` — dispara e marca como enviado, pra nunca duplicar |
| Erros e métricas | **Sentry** + **Posthog** | Você vai precisar saber onde o dono trava no onboarding |

> **Termo técnico traduzido: RLS (Row Level Security)** = regra escrita dentro do próprio banco de dados que impede um usuário de ler dados de outra barbearia, mesmo que o código do site tenha um bug. É a proteção mais importante de um sistema multi-cliente.

### 8.2 Arquitetura multi-barbearia

Um único banco, uma coluna `barbearia_id` em **todas** as tabelas, e RLS obrigatória em **todas** elas. Nunca filtrar por barbearia só no código do front-end — se o filtro estiver só lá, um usuário mal-intencionado lê os dados de todo mundo trocando um parâmetro na URL.

Regra de ouro: **toda tabela nova nasce com RLS ativada e uma política escrita no mesmo commit.**

### 8.3 WhatsApp — ✅ **DECIDIDO: Cloud API oficial da Meta, categoria utilidade**

Existem três caminhos, e um deles está fora de cogitação:

| Caminho | Custo | Risco | Veredito |
|---|---|---|---|
| **Biblioteca não-oficial** (Baileys, Evolution API, Z-API, QR Code) | Mensalidade fixa, parece barato | **Alto — desde jan/2026 a Meta bane em até 48h**, mesmo com pouco volume | ❌ **Nunca.** Se o número da barbearia cair, você perdeu o cliente e a reputação na cidade inteira |
| **Cloud API oficial da Meta, categoria utilidade** | ~R$ 0,03 a R$ 0,21 por mensagem entregue no Brasil (varia por BSP/data — Meta atualiza a tabela) | Zero — é a via aprovada pela própria Meta | ✅ **Use no MVP**, só pra notificar o barbeiro do agendamento (é uma mensagem transacional, exatamente o que a categoria "utilidade" cobre mais barato) |
| **Link `wa.me` com texto pronto** | Zero | Zero | ✅ Continua no MVP pras mensagens que **não** precisam sair sozinhas (lembrete, aniversário) |

**Como simular o custo:** uma barbearia de médio porte tem uns 150-250 agendamentos/mês. Cada agendamento agora gera **2 mensagens automáticas** (aviso pro barbeiro + lembrete pro cliente) — **400 mensagens de utilidade × R$ 0,03 a R$ 0,21**, o custo fica entre **R$ 12 e R$ 84 por barbearia/mês** — ainda dá pra embutir no preço do plano sem apertar a margem, mas dobrou em relação à v1 do escopo (que só notificava o barbeiro).

**Como conectar sem ser você quem lida com aprovação de template e infraestrutura de webhook direto com a Meta** — use um BSP (empresa intermediária credenciada pela Meta):

| Opção | Modelo | Mensalidade | Cobrança por mensagem |
|---|---|---|---|
| Meta Cloud API direto | Você mesmo integra e mantém | R$ 0 | Preço de tabela da Meta |
| **BSP com plano free** (ex.: AraraHQ) | Você paga só o que enviar, sem markup, sem taxa fixa pra começar | R$ 0 no início | Preço da Meta repassado |
| BSP com plano fixo (ex.: 360dialog, Gupshup, Zenvia) | Mensalidade + markup por mensagem | R$ 100 a R$ 500+/mês | Preço da Meta + margem do BSP |

**Recomendação:** comece pela opção de plano free/pague-o-que-usar. Com o volume baixo do início (poucas barbearias, poucas mensagens por dia), o custo fica quase zero, e você migra pra um plano fixo só quando o volume realmente justificar.

> **⚠️ Isso pode atrasar o sprint de 6 dias**
> Verificação de negócio e aprovação de template na Meta **levam de 1 a 3 dias úteis** e não estão sob seu controle. Submeta isso **no dia 2** (é quando o cronograma atual chega em cadastro/conta — ver seção 12), em paralelo ao resto do trabalho, pra dar tempo de aprovar até o dia 5-6. **Se não aprovar a tempo, publique com a notificação em `wa.me` manual** (o dono/barbeiro toca em enviar) e troque pro automático assim que a Meta aprovar — o sistema já nasce preparado pros dois modos, então a troca é só de configuração, não de código novo.

---

## 9. Modelo de dados (esqueleto para o Claude Code)

Todas as tabelas têm `id (uuid)`, `barbearia_id (uuid)`, `criado_em`, `atualizado_em`, e RLS ativa.

```
barbearias        id, nome, slug (link público), telefone, endereco, instagram, logo_url,
                  fuso, horario_funcionamento (jsonb), plano, status (trial|ativo|
                  leitura|cancelado), trial_fim, criado_em

usuarios          id, barbearia_id, nome, email (único, só dono), whatsapp (único,
                  barbeiro/cliente), senha_hash, papel (dono|barbeiro|cliente),
                  status (pendente|aprovado), ativo, ultimo_acesso

dispositivos      id, usuario_id, token_hash, apelido, ip_ultimo, expira_em

profissionais     id, barbearia_id, usuario_id, nome, foto_url, especialidade, ativo

horarios_trabalho id, profissional_id, dia_semana, inicio, fim, intervalo_inicio,
                  intervalo_fim

bloqueios_agenda  id, barbearia_id, profissional_id, inicio, fim, motivo, criado_por

servicos          id, barbearia_id, nome, preco, duracao_min, cor, ativo

agendamentos      id, barbearia_id, cliente_id, profissional_id, servico_id,
                  inicio, fim, status (agendado|confirmado|concluido|cancelado|faltou),
                  valor_servico (snapshot do preço no momento — não muda se o
                  preço do serviço mudar depois), cancelado_por (dono|barbeiro|
                  cliente), observacao, criado_por, notificacao_barbeiro_enviada,
                  lembrete_cliente_enviado, notificacao_via (api|manual)

notificacoes_wa   id, barbearia_id, agendamento_id, destinatario_id, tipo
                  (aviso_barbeiro|lembrete_cliente), template,
                  status (enviada|falhou|pendente), custo, enviada_em

movimentacoes     id, barbearia_id, tipo (entrada|saida), categoria_id, descricao,
                  valor, data, profissional_id, agendamento_id (preenchido só
                  quando a origem é automática), origem (automatica|manual),
                  recorrente_id, criado_por

categorias_fin    id, barbearia_id, nome, tipo (entrada|saida), cor, padrao

despesas_fixas    id, barbearia_id, descricao, valor, dia_vencimento, categoria_id, ativa

auditoria         id, barbearia_id, usuario_id, acao, tabela, registro_id,
                  valor_antes (jsonb), valor_depois (jsonb), ip, criado_em

assinaturas_clube id, barbearia_id, cliente_id, plano_id, status, proxima_cobranca,
                  cortes_usados_mes            [v1.1]
```

> **💡 O que mudou aqui:** sem comanda, sem forma de pagamento, sem fiado e sem comissão — porque nenhuma dessas informações é capturada. Mas a entrada de um serviço **não é mais 100% manual**: marcar um agendamento como concluído gera a `movimentacao` sozinha (`origem: automatica`, ligada ao `agendamento_id`); tudo o que não vem de agendamento continua manual. `despesas_fixas` gera a saída sozinha no dia marcado.

### Índices obrigatórios (senão a agenda fica lenta com 6 meses de dados)

- `agendamentos (barbearia_id, inicio)`
- `agendamentos (profissional_id, inicio)`
- `movimentacoes (barbearia_id, data)`
- `usuarios (barbearia_id, whatsapp)`

---

## 10. Segurança — e a verdade sobre a senha de no mínimo 4 dígitos

Você definiu senha de **no mínimo 4 dígitos** — quem quiser usar só 4 (a mesma lógica do cartão do banco), pode; quem quiser mais, também pode. Mas preciso ser direto: **no pior caso (alguém que usa exatamente 4 dígitos numéricos), são só 10.000 combinações.** Um ataque automatizado testa isso em segundos. Sozinho, é inseguro para um sistema que guarda o faturamento de um negócio.

A solução não é impedir o mínimo de 4 — é **blindar em volta dele**, pra que mesmo o caso mais fraco fique seguro. Com as medidas abaixo, uma senha de 4 dígitos fica tão segura quanto uma senha comum, e continua fácil pro dono e pro barbeiro digitar.

### 10.1 Blindagem obrigatória da senha

| Proteção | Como implementar |
|---|---|
| **Hash forte** | `argon2id` com `pepper` (uma chave secreta guardada só no servidor, fora do banco). Nunca guardar a senha em texto. |
| **Bloqueio progressivo** | 3 erros → espera 30s · 5 erros → 5 min · 8 erros → conta bloqueada, só destrava com recuperação por e-mail (dono) ou WhatsApp (barbeiro/cliente) |
| **Limite de tentativas** | Por conta **e** por IP. Impede testar milhares de senhas em várias contas. |
| **Senha proibida** | Bloquear 0000, 1111, 1234, 4321, 1122 e sequências, mesmo em senhas maiores que 4 dígitos. Sugerir outra na hora do cadastro. |
| **Cadastro da barbearia** | Confirmação por **e-mail** (ver Módulo 1). Barbeiro entra "pendente" até o **dono aprovar no painel** — essa aprovação é o ponto de checagem dele. |
| **Sessão** | Dono: 12h. Barbeiro: 12h. Cliente: 30 dias. Token curto + refresh, cookie `HttpOnly` + `Secure` + `SameSite=Lax`. |
| **Reautenticação em ação crítica** | Apagar movimentação, exportar relatório completo, remover barbeiro → **pede a senha de novo**. |
| **Sem vazamento de informação** | Erro de login sempre diz "e-mail/WhatsApp ou senha incorretos", nunca "essa conta não existe". Isso impede descobrir quem tem conta. |
| **Só o dono é dono** | Permissões detalhadas na tabela da seção 6.1.1 — checagem central, aplicada no banco (RLS) e não só no front. |

### 10.2 Checklist OWASP aplicado (implementar, não deixar como TODO)

- Validação de entrada no cliente **e** no servidor (Zod nos dois lados)
- Consultas parametrizadas via cliente do Supabase — nunca SQL montado com concatenação de texto
- Sanitização de saída para evitar XSS (script malicioso injetado num campo de nome, por exemplo)
- Cookies `SameSite` + token anti-CSRF nas rotas que alteram dados
- Rate limit em `/login`, `/agendar-publico` e `/recuperar-senha`
- Cabeçalhos de segurança: `Content-Security-Policy`, `HSTS`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- Segredos só em variáveis de ambiente — a chave `service_role` do Supabase **nunca** vai pro front-end
- Erro genérico pro usuário, log detalhado no servidor (sem senha, sem token)
- Upload de foto: validar tipo real do arquivo, limitar tamanho, servir de domínio separado
- Backup diário do banco com teste de restauração **feito de verdade** uma vez por mês

### 10.3 LGPD — o mínimo que evita problema

Você vai guardar nome e telefone de milhares de clientes de terceiros. Isso é dado pessoal.

- Aceite explícito na página pública de agendamento ("ao agendar, você concorda em receber mensagens sobre seu horário")
- Base legal: execução de contrato (o agendamento) para lembretes; **consentimento** para promoção
- Botão de descadastro em toda mensagem promocional
- Exclusão de dados a pedido, em até 15 dias
- **Contrato de operador de dados** entre você e cada barbearia — você é o operador, a barbearia é a controladora. Isso protege você juridicamente se a barbearia usar mal a base.
- Política de privacidade e termos de uso publicados antes do primeiro cliente pagante

---

## 11. Mapa de telas

### 11.0 Quem acessa o quê — e por qual link

São **4 portas de entrada diferentes**, todas rodando no mesmo projeto (Next.js), mas com rotas e permissões separadas. Ninguém enxerga a tela de quem não é:

| Quem | Link | Como entra | O que vê |
|---|---|---|---|
| **Dono/gestor** | `regua.app/painel` | E-mail + senha | Painel completo: agenda, financeiro, relatórios, aprovação de barbeiro |
| **Barbeiro** | `regua.app/painel` (mesma URL, view diferente) | WhatsApp + senha | Só a própria agenda — sem financeiro, sem dados de outros barbeiros |
| **Cliente** | `regua.app/nome-da-barbearia` (um link só, específico de cada barbearia) | WhatsApp + senha (cria a conta ali mesmo) | Só a página de agendamento daquela barbearia |
| **Você (dono do RÉGUA)** | `admin.regua.app` (domínio separado) | Sua conta, só sua | Painel mestre: todas as barbearias clientes, quem está ativo, quem está inadimplente, MRR, churn, suporte |

> **💡 Por que dono e barbeiro dividem a mesma URL**
> O sistema sabe quem é quem pelo **papel salvo na conta** (`dono` ou `barbeiro`), não pelo link. Isso simplifica o código — uma tela só, que mostra ou esconde blocos conforme quem logou — e evita ter dois apps pra manter. O painel admin (o seu) é o único que fica **fisicamente separado**, porque ele enxerga dados de todas as barbearias e não pode correr risco de vazar pra um cliente.

> **💡 Como o barbeiro cai direto na barbearia dele, sem escolher nada**
> A conta do barbeiro já nasce com o `barbearia_id` gravado — porque ele se cadastrou pelo **link exclusivo daquela barbearia**, não por um link genérico (ver Módulo 1). No login, o sistema lê esse vínculo da própria conta e monta a tela **já filtrada pra aquela barbearia** — sem tela de "escolher barbearia", sem dropdown. Ele digita WhatsApp e senha em `regua.app/painel` e cai direto na própria agenda. É a mesma lógica de RLS que impede vazamento entre barbearias (seção 8.2): o filtro não é escolhido pelo usuário, é imposto pelo banco de dados a partir de quem ele é.

### Painel do dono (mobile-first, menu inferior de 5 abas)

```
Hoje · Agenda · [+] · Financeiro · Mais
```

| Tela | Conteúdo |
|---|---|
| **Hoje** | Atendimentos feitos/restantes hoje · próximos 3 horários · **agendamentos passados sem status, se houver** |
| **Agenda** | Grade por dia/semana, colunas por barbeiro |
| **[+] (botão central)** | Bottom sheet: Novo agendamento · Lançar entrada · Lançar saída |
| **Financeiro** | Entradas x saídas do dia · lista de movimentações · despesas fixas |
| **Mais** | Relatórios · **Clientes** (lista simples: nome, WhatsApp, quantos cortes já fez — sem ficha, sem observações, é só quem já agendou) · Barbeiros (inclusive **aprovar cadastro pendente**) · Serviços · Configurações · Meu plano |
| **Relatórios** | Os três níveis do painel do gestor (seção 6.1, módulo 5) |

> **💡 "Clientes" não é a ficha que cortamos**
> A decisão de tirar aniversário/observação/histórico com foto continua de pé. Isso aqui é só **uma lista** — quem já agendou nessa barbearia, nome e WhatsApp, pra o dono não ficar sem visibilidade nenhuma de quem é a própria clientela (esse dado já existe na conta que o cliente criou; é só mostrar, não é cadastro novo).

### Painel do barbeiro (mesma URL, versão reduzida)

Minha agenda de hoje · Meus atendimentos · **Meu desempenho** (atendimentos concluídos e valor gerado — hoje / semana / mês, só o dele). Sem acesso ao financeiro da barbearia, sem ver dados de outro barbeiro.

### Página pública do cliente (`regua.app/nome-da-barbearia`)

Capa e logo → o cliente entra com a conta dele (ou cria em segundos: nome, WhatsApp, senha) → serviços com preço e duração → escolher barbeiro (ou "primeiro que liberar") → calendário com horários livres → confirmação com botão "salvar no calendário" e "chamar no WhatsApp".

### Painel Admin — SaaS (só você, `admin.regua.app`)

Lista de todas as barbearias clientes com status (trial/ativo/atrasado/cancelado) → detalhe de cada uma (plano, data de assinatura, uso) → métricas gerais (MRR, churn, novos cadastros no mês) → ação de suspender/reativar conta → fila de suporte. Essa tela **não faz parte do que você entrega ao cliente** — é sua ferramenta de gestão do próprio negócio.

### Landing page de venda (`regua.app`)

Hero com headline emocional e **fundo animado de linhas fluidas reagindo ao mouse** (referência: reactbits.dev "Threads", reescrito em Canvas 2D) → o problema (caderno, planilha, furo de sábado) → as provas de diferencial (seção 3) → demonstração em vídeo de 40s → preços → depoimento das primeiras barbearias → FAQ → CTA "Testar 14 dias grátis, sem cartão". Motion pesado só aqui — amostra publicada e aprovada.

---

## 12. Cronograma — ✅ **DECIDIDO: sprint de 6 dias**

**Só funciona com dedicação full-time (8-10h/dia) e Claude Code escrevendo a maior parte do código enquanto você revisa e testa.** O Concept Barber entra só como **referência de padrão** (como resolveu login, agenda etc. lá) — o RÉGUA nasce em projeto e schema novos, sem copiar arquivo dele. É por isso que o cronograma tem 1 dia a mais que a versão anterior, que assumia reaproveitar o código diretamente.

**O que fica de fora dos 6 dias, por escolha, não por atraso:** o beta com barbearia real precisa do sistema já publicado e de dias de uso de verdade — não dá pra comprimir isso, porque depende do calendário de terceiros, não do seu. Ele roda **na semana seguinte ao sprint**, com o produto já no ar.

| Dia | Bloco | Entregável | Pronto quando... |
|---|---|---|---|
| **1** | Scaffold + Fundação | Projeto Next.js novo (App Router, TypeScript, Tailwind, shadcn/ui), projeto/schema Supabase novo com a migration completa (RLS incluída), tokens de design aplicados, deploy configurado na Vercel com preview automático | Projeto sobe local e em preview, com os tokens aplicados e a migration rodada sem erro |
| **2** | Conta e Cadastros | Login e-mail (dono) / WhatsApp (barbeiro/cliente), aprovação de barbeiro no painel, cadastro de barbearia/profissionais/serviços (com Instagram). **Submeter verificação de negócio + template na Meta hoje** (roda em paralelo, não bloqueia o resto) | Consigo criar a conta da barbearia, aprovar um barbeiro e cadastrar um serviço; um usuário de outra barbearia não lê meus dados (testado com script) |
| **3** | Agenda + conta do cliente | Grade, criar/cancelar, bloqueio de horário do barbeiro (próprio horário + bloqueio pontual), link público de agendamento, cadastro do cliente (nome/WhatsApp/senha) | Um amigo cria a conta e agenda pelo celular dele sem ajuda nenhuma; um barbeiro bloqueia um horário e ele some da página pública |
| **4** | Financeiro + Dashboards | Entrada automática ao concluir agendamento, saídas manuais, categorias, despesa fixa recorrente, extrato por período/barbeiro, os 3 níveis do painel do gestor | Marco um corte como concluído e a entrada aparece sozinha no financeiro, no valor certo |
| **5** | WhatsApp + Painel Admin + Comercial | Notificação automática ao barbeiro + lembrete automático de 2h ao cliente (Cloud API + job agendado, ou fallback `wa.me` se a aprovação da Meta não saiu ainda), botão ligar/mensagem no agendamento, log de auditoria, seu painel em `admin.regua.app`, landing page, cobrança (Asaas), trial de 14 dias | Alguém assina sozinho, do zero, sem eu tocar; agendo um teste pra daqui 2h10 e o lembrete chega sozinho |
| **6** | Testes e publicação | Teste de ponta a ponta (criar conta → cadastrar → agendar → lançar financeiro → ver dashboard), correção de bugs críticos, backup configurado, deploy final | Primeira barbearia real consegue usar o sistema sozinha, do zero, sem eu do lado |

**Depois do sprint (fora da contagem de 6 dias):**

| Quando | Bloco | Pronto quando... |
|---|---|---|
| Semana seguinte | Beta real | 3 barbearias de Feira usando de graça, com você presente na implantação — 2 semanas de operação real sem perda de dado |
| Em paralelo | Hardening | Correções do beta, revisão de segurança mais a fundo, teste de restauração de backup, monitoramento — antes da primeira barbearia **pagante** |

### Marcos de decisão (não pule)

- **Fim do dia 4:** se marcar "concluído" não gerar a entrada certa (valor certo, sem duplicar, sumindo se o status voltar), **pare e conserte antes de seguir pro dia 5.** É o coração do módulo financeiro.
- **Fim da semana de beta:** se as 3 barbearias não usarem o sistema **espontaneamente por 2 semanas seguidas**, o problema não é feature — é encaixe na rotina. Volte pra entrevista antes de vender pra mais gente.

### Regras de execução

1. **Nada de branch longa.** Trabalhe direto na `main` com deploy de preview na Vercel a cada push.
2. **Não construa nada da v1.1 durante o sprint.** Vontade de codar feature nova é a armadilha número 1 de dev solo — principalmente sob prazo apertado.
3. **Teste com dado real desde o dia 3**, não só no dia 6. Cadastre o serviço de verdade, o barbeiro de verdade. Erro de schema encontrado no dia 6 custa caro demais nesse ritmo.

> **💡 O Concept Barber vira referência, não base**
> Você já tem o **Concept Barber** (agendamento para barbearia, em Supabase) — mas decidiu construir o RÉGUA em projeto novo, consultando o código antigo só quando travar em algo específico. Isso custa 1 dia a mais que reaproveitar direto, mas evita carregar decisão técnica antiga que talvez não sirva mais pro escopo atual.

---

## 13. Precificação e modelo de negócio

### 13.1 Onde você se posiciona no mercado

Referência real (seção 1): Barbeiro.app tem plano grátis e Pro a R$ 59,90; EiBarber começa em R$ 49; AppBarber vai de R$ 79,90 a R$ 219,90.

**Você não deve ser o mais barato.** Guerra de preço com quem tem plano grátis é suicídio. Você deve ser **o que resolve com a mão na massa** — e isso vale mais caro.

### 13.2 Tabela de planos — ✅ **DECIDIDO**

| Plano | Preço/mês | Quem é | O que tem |
|---|---|---|---|
| **Teste** | Grátis, 14 dias | Todo mundo | Tudo liberado, sem cartão |
| **Cadeira** | **R$ 39,99** | Barbeiro autônomo, 1 cadeira | Agenda, link público, financeiro completo, dashboard |
| **Barbearia** ⭐ | **R$ 79,99** | Até 3 profissionais | Tudo do Cadeira + auditoria, relatórios avançados |
| **Rede** | **R$ 129,99** | Profissionais ilimitados / mais de uma unidade | Tudo + multi-unidade, relatório consolidado |

**Anual:** paga 10, leva 12 (economia de ~16%). Melhora seu caixa e derruba o churn.

> **💡 Por que ,99 e não valor redondo**
> Preço terminado em ,99 lê como "menos que o próximo número redondo" mesmo a diferença sendo 1 centavo — efeito de ancoragem bem documentado em precificação. Os cálculos de ponto de equilíbrio e cenários (13.4) seguem usando os valores arredondados (R$40/80/130) só pra simplificar a conta; a diferença de 1 centavo não muda nenhuma conclusão.

### 13.3 Onde está o dinheiro de verdade

| Receita | Valor | Por quê |
|---|---|---|
| **Implantação assistida** (uma vez) | **R$ 297** | Você vai na barbearia, cadastra serviços e convida os barbeiros, treina a equipe por 1h e entrega a arte do link pro Instagram. **É o que nenhum concorrente do Sudeste faz.** Margem quase pura e é o que faz o cliente ficar. |
| **WhatsApp automático completo** (add-on) | R$ 29/mês + custo Meta | O aviso ao barbeiro e o lembrete de 2h ao cliente já vêm inclusos em todos os planos (custo baixo, R$ 12-84/mês por barbearia, embutido no preço). Esse add-on é a suíte completa — aniversário automático, promoção de horário morto — a partir da v1.1 |
| **Revenda / marca branca** | R$ 397/mês | Outro freelancer vende o sistema com a marca dele em outra cidade. Você escala sem vender. |

### 13.4 Conta do negócio

**Custo fixo mensal para operar:**

| Item | Custo |
|---|---|
| Supabase Pro | ~R$ 140 (US$ 25) |
| Vercel Pro | ~R$ 110 (US$ 20) |
| Domínio + e-mail | ~R$ 20 |
| Sentry / Posthog (free tier no início) | R$ 0 |
| **Total fixo** | **~R$ 270/mês** |

**Custo variável por barbearia** (não entra na conta acima porque cresce com a base, não é fixo): WhatsApp API, **~R$ 12 a R$ 84/mês por barbearia** conforme o volume de agendamentos dela (aviso ao barbeiro + lembrete ao cliente, seção 8.3) — dá pra embutir dentro do preço do plano sem apertar a margem.

**Ponto de equilíbrio** (quantos clientes pagam a conta fixa antes de sobrar lucro):
> R$ 270 ÷ R$ 79,99 (plano Barbearia) = **4 barbearias no plano Barbearia.**
> A partir da quinta, é lucro — porque o custo de servir mais uma barbearia (banco, hospedagem, WhatsApp) é baixo e cresce devagar.

**Cenários em 12 meses** (mix assumido: 30% Cadeira, 60% Barbearia, 10% Rede — ticket médio ~R$ 73):

| Cenário | Clientes | MRR (receita recorrente/mês) | Receita anual recorrente | + implantações |
|---|---|---|---|---|
| Conservador | 15 | R$ 1.095 | R$ 13.140 | + R$ 4.455 |
| Realista | 35 | R$ 2.555 | R$ 30.660 | + R$ 10.395 |
| Otimista | 70 | R$ 5.110 | R$ 61.320 | + R$ 20.790 |

> **💡 Traduzindo:** no cenário realista, 35 barbearias significam **R$ 2.555 entrando todo mês sem você trabalhar mais por isso** — mais R$ 10 mil de implantações ao longo do ano. Com custo de R$ 270/mês, a margem passa de 89%. **É esse número que separa freelancer de dono de produto.**

### 13.5 Sobre vender licença vitalícia

Muito dono de barbearia do interior prefere pagar uma vez ("R$ 1.500 e é meu"). É tentador — entra caixa rápido.

**Não faça.** Você fica com o custo de servidor e suporte pra sempre, sem receita nova. Se precisar de caixa imediato, use o **plano anual com desconto** — tem o mesmo efeito de caixa e mantém a recorrência.

---

## 14. Como conseguir as 10 primeiras barbearias

O produto não vale nada sem isso. Sequência concreta para Feira de Santana e região:

**Etapa 1 — as 3 do beta (semana 13).** Escolha 3 barbearias de perfis diferentes: uma de 1 cadeira, uma de 3-4 barbeiros, uma que já usa algum sistema. Ofereça **6 meses grátis em troca de uso real e depoimento em vídeo**. O depoimento vale mais que os R$ 582 que você deixou de cobrar.

**Etapa 2 — a prova visual.** Grave um vídeo de 40 segundos: dono fechando o caixa do dia no celular, ao vivo, na barbearia dele. Sem narração corporativa. Esse vídeo é seu único material de venda por 3 meses.

**Etapa 3 — abordagem presencial (a que funciona).** Vá na barbearia terça ou quarta de manhã (movimento fraco, dono disponível). Nunca sexta ou sábado. Script:

> "Quanto você faturou terça passada?"
>
> (Ele não vai saber com precisão. Silêncio.)
>
> "É isso que eu resolvo. Em 15 dias você sabe isso todo dia, no celular, sem planilha. E seu cliente marca por link, sem baixar app nenhum. Posso te mostrar em 4 minutos?"

**Etapa 4 — implantação como evento.** Vá no dia, cadastre tudo você mesmo, tire foto da equipe, entregue a arte do link pro Instagram da barbearia pronta. A barbearia posta. **Isso é sua propaganda gratuita pra outros barbeiros da cidade.**

**Etapa 5 — indicação com dinheiro.** Barbeiro conhece barbeiro. Ofereça **1 mês grátis por indicação que fechar**. Barbearia é uma rede fechada e fofoqueira — use isso a favor.

**Etapa 6 — conteúdo local.** Instagram falando com dono de barbearia, não com barbeiro genérico. Ganchos que funcionam: *"Você sabe quanto sobrou da sua barbearia mês passado? Não o que entrou. O que sobrou."*

---

## 15. Métricas — como saber se está dando certo

| Métrica | Meta | O que significa |
|---|---|---|
| **Ativação** | 80% das barbearias com 20+ agendamentos na 1ª semana | Se não usa na 1ª semana, não usa nunca |
| **Uso do financeiro** | Lançamento em 5 dias por semana, em 70% da base | O indicador mais confiável de que o sistema entrou na rotina |
| **Churn mensal** | Abaixo de 5% | Acima de 8%, tem problema de produto, não de venda |
| **Conversão do trial** | 30%+ | Abaixo disso, o onboarding está falhando |
| **MRR** | R$ 3.100 em 12 meses | Cenário realista da seção 13.4 |

---

## 16. Riscos e como reduzir cada um

| Risco | Gravidade | Como reduzir |
|---|---|---|
| **Mercado de software saturado** | Alta | Não competir por feature. Competir por presença local e implantação assistida (seção 3) |
| **Concorrente com plano grátis** | Alta | Nunca vender preço. Vender "eu vou aí montar pra você" |
| **Dev solo com emprego e faculdade** | Alta | Trilha A do cronograma, escopo travado, reaproveitar o Concept Barber |
| **Suporte comendo seu tempo** | Alta | Onboarding guiado + 6 vídeos curtos de 60s + FAQ. Suporte por WhatsApp com horário definido, não 24h |
| **Barbearia que fecha** (churn involuntário) | Média | Esperado no setor. Compensar com fluxo de novos, que é alto (141 mil/ano) |
| **Bloqueio do WhatsApp** | Média | Nunca usar biblioteca não-oficial (seção 8.3) |
| **Vazamento de dados de clientes** | Alta | RLS + auditoria + backup testado + contrato de operador (seção 10) |
| **Você construir feature demais antes de vender** | **Altíssima** | Regra da seção 12: nada de v1.1 antes do primeiro cliente pagante |
| **Agendamento sem status final trava relatório e financeiro** | Média | Destaque visual de pendência na tela Hoje (Módulo 3) |
| **Barbeiro sai da barbearia e deixa agenda futura órfã** | Média | Cancelamento automático + aviso aos clientes ao remover barbeiro (Módulo 1) |
| **Cliente esquece que agendou e não há como ele conferir** | Média | Tela "Meus agendamentos" (Módulo 3) |
| **Trial acaba e dono perde acesso sem aviso, cancela por susto** | Média | Lembrete 3 dias antes + modo somente leitura, nunca bloqueio total (seção 6.1.3) |

---

## 17. Checklist de aprovação — o que eu preciso que você decida

Responda esses pontos e o briefing vai fechado pro Claude Code.

| # | Decisão | Status |
|---|---|---|
| 1 | **Produto novo ou evolução do Concept Barber?** | ✅ **Decidido — novo projeto do zero; Concept Barber vira só referência de padrão** |
| 2 | **Comissão do barbeiro** | ✅ **Decidido — fora do sistema, em todo lugar** |
| 3 | **Fiado / pagamento pelo app / sinal via Pix** | ✅ **Decidido — fora do sistema. Pix é sempre presencial** |
| 4 | **Comanda (desconto, gorjeta, forma de pagamento no atendimento)** | ✅ **Decidido — fora. Cliente só escolhe serviço, barbeiro e horário** |
| 5 | **Modo Balcão, fila ao vivo, encaixe rápido, recorrência** | ✅ **Decidido — fora do MVP** |
| 6 | **Ficha de cliente (aniversário, observação, histórico, foto)** | ✅ **Decidido — fora. Cliente só tem conta (nome, WhatsApp, senha)** |
| 7 | **Verificação de conta** | ✅ **Decidido — dono confirma por e-mail; barbeiro entra "pendente" até o dono aprovar no painel** |
| 8 | **Nome** | ✅ **Decidido — RÉGUA** |
| 9 | **Slogan principal** | ✅ **Decidido — "Sua barbearia na régua."** |
| 10 | **Paleta** | ✅ **Decidido — A (Aço & Âmbar)** |
| 11 | **Identidade visual / tipografia** | ✅ **Decidido — direção "Oficina Noturna", Anton (títulos) + Oswald (UI) + Open Sans (texto) + Space Mono (números)** |
| 12 | **Login do dono** | ✅ **Decidido — e-mail + senha (não WhatsApp)** |
| 13 | **Senha** | ✅ **Decidido — mínimo 4 dígitos (não fixa em 4)** |
| 14 | **Cadastro da barbearia** | ✅ **Decidido — inclui rede social (Instagram)** |
| 15 | **Agendamento** | ✅ **Decidido — só criar e cancelar, sem remarcar/bloqueio como opções de tela** |
| 16 | **Preços** | ✅ **Decidido — Cadeira R$ 39,99 · Barbearia R$ 79,99 (até 3 profissionais) · Rede R$ 129,99** |
| 17 | **Cronograma** | ✅ **Decidido — sprint de 6 dias, full-time** |
| 18 | **WhatsApp** | ✅ **Decidido — Cloud API oficial (notificação automática pro barbeiro) + botão `tel:`/`wa.me` (ligar/mensagem manual pro cliente)** |
| 19 | **Implantação assistida a R$ 297** | Sim / Não — **recomendação: sim** |
| 20 | **Stack** | Next.js + Supabase + Vercel + Asaas — confirmar |

---

## 18. Próximo passo depois da aprovação

Só restam as decisões 17 a 19 — cronograma, implantação assistida e confirmação de stack. Com elas, o próximo entregável é o **prompt de fundação para o Claude Code**: schema SQL completo com RLS, estrutura de pastas, arquivo de tokens de design e as telas da semana 0 e 1 — pronto pra colar e rodar.

---

## 19. Auditoria técnica final — antes de virar código

Revisão como desenvolvedor, administrador de sistema e técnico em SI/TI — não como quem escreveu o documento. O objetivo aqui é achar o que ainda quebra, não confirmar o que já está bom.

### Nota por categoria

| Categoria | Nota | Por quê |
|---|---|---|
| **Arquitetura e stack** | 9,0 | Multi-tenant com RLS bem desenhado, stack madura e testada, reaproveitamento do Concept Barber reduz risco real. Falta só: pooling de conexão do Supabase sob pico (Next.js serverless abre muitas conexões curtas — sem PgBouncer/Supavisor configurado, isso derruba o banco antes de 30 barbearias simultâneas) e um ambiente de **staging** separado de produção antes de bater em cliente de verdade. |
| **Modelagem de dados** | 9,0 | Schema consistente, snapshot de preço no agendamento, rastreabilidade de origem automática/manual no financeiro, índices nos lugares certos. Falta definir **soft-delete vs. hard-delete** em `agendamentos` e `movimentacoes` — se apagar de verdade, a auditoria (seção 10) perde o histórico que ela promete guardar. |
| **Segurança** | 8,5 | Blindagem de senha (hash, bloqueio progressivo, senha proibida), RLS, checklist OWASP, LGPD e reautenticação em ação crítica — nível acima do que a maioria dos concorrentes desse porte tem. Falta: **rotação do pepper** documentada, e um **alarme de custo** na notificação automática (um bug em loop no job de lembrete pode gerar centenas de mensagens pagas antes de alguém notar). |
| **Fluxos de produto** | 9,0 | Depois da revisão de hoje: onboarding, permissões por papel (dono/barbeiro/cliente) e os gargalos operacionais estão fechados um por um, não just documentados por cima. Falta: nenhum desses fluxos tem um **roteiro de teste manual** escrito — "teste isso, nessa ordem, antes de considerar pronto". |
| **Viabilidade comercial** | 7,5 | Precificação com ponto de equilíbrio calculado, cenários realistas, script de venda concreto e testável. O ponto fraco é o **cronograma de 5 dias** — mesmo com o Concept Barber pronto e Claude Code escrevendo código, é o item de maior risco de todo o documento. Não é impossível, é otimista. |
| **Prontidão operacional** | 5,5 | **O elo mais fraco.** Zero teste automatizado (unitário ou e2e) mencionado em qualquer lugar. Zero pipeline de CI/CD além de "deploy de preview a cada push" — não tem etapa que barra um bug óbvio antes de ir pro ar. Backup mencionado, mas sem checklist de restauração. Pra um sprint de 6 dias, isso é o que mais aumenta a chance de um bug chegar na primeira barbearia real. |

### Nota final: **8,2 / 10**

Documento pronto pra virar prompt de fundação — a parte de produto e arquitetura está no nível de quem já vendeu isso antes, não de MVP amador. O que baixa a nota não é o que foi pensado, é o que **ainda não foi verificado fora do papel.**

### ⚠️ Bloqueio crítico que não está em lugar nenhum do documento: CNPJ

Duas peças centrais do sprint **exigem** CNPJ (pessoa jurídica), e isso nunca foi checado:

1. **Verificação de negócio na Meta** (Módulo 6, seção 8.3) — pra usar a Cloud API oficial do WhatsApp, o Meta Business Manager exige verificação de empresa com CNPJ. Sem isso, a submissão do dia 1 não sai do lugar, e o fallback manual (`wa.me`) vira o modo permanente, não temporário.
2. **Cobrança recorrente via Asaas** — conta de recebimento como pessoa jurídica também pede CNPJ pra emitir cobrança recorrente/assinatura pros seus clientes (as barbearias).

**Se você ainda não tem CNPJ (MEI resolve os dois casos), isso precisa ser resolvido *antes* do dia 1 do sprint** — abertura de MEI é rápida, mas não é instantânea, e enfiar isso no meio da semana de código trava exatamente os dois pontos que dependem de terceiros (Meta e Asaas), que já são os mais lentos do cronograma.

### Resumo em uma frase

O produto está bem pensado; o que falta agora é **verificar as dependências externas (CNPJ) e blindar a operação (teste, CI/CD, staging)** antes de tratar 5 dias como uma certeza.
