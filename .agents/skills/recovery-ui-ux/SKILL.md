---
name: recovery-ui-ux
description: Diretrizes de UI/UX focado em empatia e clareza para a aplicação Desktop Tauri (React).
---

# Diretrizes de UI e UX para o Tauri App (Data Recovery)

Um usuário que utiliza um *Data Recovery* está estressado, desesperado ou frustrado pela perda de informações. A interface (Frontend Tauri/Web) deve transparecer **solidez, extrema clareza e controle absoluto**.

## 1. Arquitetura de Comunicação (Tauri Events)
- O processamento em Rust (Backend) deve despachar eventos frequentes de andamento com `app.emit_all("scan-progress", Payload {...})`.
- A UI não bloqueia; deve reagir e desenhar atualizações progressivas a cada "Heartbeat" (por exemplo, emitido pelo backend a cada 500ms ou cada "chunk" concluído).
- Parâmetros vitais de Feedback: Setores Processados, Total de Setores, Erros Lidos, Quantidade e Tipos de Arquivos localizados (recém saídos da FAT32 ou do Carving), Tempo Restante Estimado (ETA).

## 2. A Jornada do Usuário (Fluxo Principal)
- **Passo 1: Seleção de Origem (Select Drive)**
   - Ao iniciar, liste os discos do sistema de forma fácil. Inclua o ícone do tipo de dispositivo (USB Pendrive vs Disco Interno vs SSD), Tamanho (ex: 32 GB) e Sistema de Arquivos Detectado (Se NTFS, exFAT, FAT32 ou 'RAW').
   - Insira tooltips/alertas indicando "Selecione o Pendrive ou HD afetado".
- **Passo 2: Escaneamento e Árvore Parcial**
   - Durante a varredura das Tabelas FAT32, exiba uma tela com **Animações Subtis (Micro-animations)** de progresso que não sobrecarreguem o processamento da UI.
   - Traga os dados em estrutura de árvore assim que forem achados (Tree View na UI React). Deixe o usuário ver os "órfãos" do disco se montando em tempo real (Pastas vazias e arquivos resgatáveis).
- **Passo 3: Seleção e Salvamento**
   - Botões intuitivos e de contraste forte ("Salvar x Itens Selecionados").
   - **Regra UX/Segurança CRÍTICA:** Se o usuário escolher como "Destino" uma unidade correspondente ao "Disco Afetado", bloqueie visualmente e exiba um *Modal Enorme e Vermelho*: "VOCÊ VAI DESTRUIR SEUS DADOS. Selecione outro destino diferente de `[NOME DA ORIGEM]`".

## 3. Estética do Design (Aesthetics Requirement)
- **Aparência Premium (Dark Mode por Definição):** A paleta de cores deve expressar profissionalismo moderno ("Vibrant Dark Mode").
- Não utilize cores brutas ou Tailwind padrão sem refinamento. Use esquemas HSL sofisticados (`Slate`, `Zinc` com toques sutis em `Indigo` ou `Teal`).
- Tipografia Importa: Utilize `Inter` ou `Outfit`.
- Use `Glassmorphism` (efeitos de desfoque/blur no CSS - backdrop-filter) em modais e sidebars do app React.
- Uma estética Premium transmite a ideia de que "O software sabe o que está fazendo e não vai travar na hora da verdade", reduzindo a ansiedade do usuário.

## 4. Gerenciamento de Expectativas e Cancelamento
- Se encontrar "Bad Sectors" (erros do disco rústico), apenas anote em um "Log Visível" (`Tauri Event`) no canto da tela. Não cause pânico ("Aviso: 2MB pulados por falha física de leitura na origem").
- Um botão de Cancelar ou "Pausar/Finalizar Varredura Agora" deve ser sempre visível e funcional. O `Rust` aborta a thread graciosamente ao receber o comando respectivo via Tauri Command IPC (`invoke("cancel_scan")`).
