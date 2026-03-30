# 🛡️ Recovery Rust

**Recovery Rust** é uma ferramenta de recuperação de dados de alta performance, desenvolvida com **Rust** no backend e uma interface gráfica moderna em **React + Tauri**. Projetada para ser segura, rápida e multiplataforma (Windows, Linux, macOS).

![Status do Build](https://github.com/mauripidev/recovery-rust/actions/workflows/release.yml/badge.svg)

## ✨ Principais Características

- **Motor de Alto Desempenho:** Varredura física bit-a-bit usando buffers de 4MB para leitura otimizada em HDs e SSDs.
- **Segurança (Read-Only):** Acesso estritamente em modo de leitura; o software nunca grava no disco que está sendo recuperado.
- **Identificação por Magic Bytes:** Detecção inteligente de arquivos (Imagens, Vídeos, PDFs, Docs) baseada em assinaturas hexadecimais, mesmo que a tabela de arquivos esteja corrompida.
- **Interface Premium (Dark Mode):** Experiência de usuário fluida com Glassmorphism, animações e barra de progresso em tempo real.
- **Multiplataforma Nativo:** Suporte a macOS (`diskutil`), Windows (`PowerShell/Get-PhysicalDisk`) e Linux (`lsblk`).

## 🛠️ Tecnologias Utilizadas

- **Backend:** [Rust](https://www.rust-lang.org/) + [Tauri v2](https://v2.tauri.app/)
- **Frontend:** [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Estilização:** CSS Vanilla (Glassmorphism Design)

## 🚀 Como Executar (Desenvolvimento)

### Pré-requisitos
- **Rust** (stable)
- **Node.js** (v18+)
- **Permissões de Administrador:** Necessário para ler discos físicos diretamente.

### Passos
1. Clone o repositório:
   ```bash
   git clone https://github.com/mauripidev/recovery-rust.git
   cd recovery-rust
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o ambiente de desenvolvimento:
   ```bash
   npm run tauri dev
   ```

## 📦 Como Distribuir (Build)

Para gerar o instalador para o seu sistema operacional atual:
```bash
npm run tauri build
```

Os instaladores serão gerados na pasta `src-tauri/target/release/bundle/`.

## 🤖 Automação de Release (CI/CD)

O projeto está configurado com **GitHub Actions** para gerar releases automáticas. Para lançar uma nova versão:
1. Atualize a versão no `package.json`.
2. Crie uma tag Git: `git tag v1.0.0`
3. Suba a tag: `git push origin v1.0.0`
4. Vá até a aba **Releases** no GitHub para encontrar os binários (`.msi`, `.dmg`, `.deb`).

## ⚠️ Isenção de Responsabilidade

Este software é uma ferramenta educacional e deve ser usado com cautela. A execução de varreduras em discos físicos requer privilégios de root/administrador. Sempre garanta que você tem backups de dados críticos.

---
Desenvolvido com 🦀 por **MauripiDev**
