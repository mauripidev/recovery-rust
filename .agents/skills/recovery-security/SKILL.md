---
name: recovery-security
description: Diretrizes de Segurança para o software de Data Recovery em Rust, garantindo proteção contra perda de dados.
---

# Diretrizes de Segurança para Recuperação de Dados (Rust)

Esta skill define as regras inegociáveis de segurança que o Agente de IA e os desenvolvedores devem seguir ao trabalhar no projeto de recuperação de dados.

## 1. Operações em Blocos Estritamente Somente-Leitura (Read-Only)
- **Nunca abra um dispositivo de bloco com permissões de gravação.**
- Ao lidar diretamente com o disco (ex: `/dev/disk2` no Mac/Linux ou `\\.\PhysicalDrive1` no Windows), utilize **apenas** `File::open()`.
- Se usar `OpenOptions`, garanta que apenas `.read(true)` seja invocado. Chamadas para `write(true)`, `append(true)`, ou `create(true)` estão **estritamente proibidas** no código de engine de leitura.
- **Racional:** Qualquer gravação acidental em um disco com sistema de arquivos corrompido pode destruir permanentemente os dados remanescentes (FAT32 ou assinaturas soltas).

## 2. Bloqueio Funcional contra Ações Destrutivas (Dead-Locks)
- A lógica de negócio no Rust deve interceptar o caminho de destino onde os arquivos recuperados serão salvos.
- **Proteção do "Disco Fonte":** Compare o UUID/Mountpoint/DevicePath do disco que está sendo escaneado com o caminho onde os arquivos serão salvos.
- Se o diretório alvo pertencer ao mesmo disco físico da recuperação, a operação **DEVE ABORTAR** e emitir um erro crítico para o frontend Tauri, instruindo o usuário a escolher outro local.

## 3. Gestão Segura de Permissões (Privilege Escalation)
- Para ler dispositivos de bloco bruto, são necessários privilégios administrativos.
- O software deve detectar a falta de permissões (capturar `ErrorKind::PermissionDenied` em operações de leitura de disco) e não apenas falhar silenciosamente ('panicking').
- O frontend Tauri deve alertar o usuário com clareza sobre a necessidade de executar o programa como Administrador/Root (ou implementar pacotes de "UAC Prompts" se for em Windows, ou polkit/osascript se for Linux/Mac).

## 4. Parser FAT32 Seguro
- Ao realizar o parser de Boot Sectors (VBR), FAT (File Allocation Tables) e Diretórios (Root Directory ou subdiretórios), a memória deve ser tratada como suja (Untrusted Input).
- Não confie cegamente nos campos estruturais definidos por bytes do disco (ex: `bytes_per_sector`, `sectors_per_cluster`) para calcular alocações de memória ou ler dados, pois valores corrompidos podem causar `Out of Memory` ou Pointers selvagens.
- Sempre faça o "clamp" / limite razoável (sanity check) de tamanhos e offset ao analisar inodes/diretórios em FAT32.
- Procure não usar `unsafe` para dar `transmute` de *bytes* diretos para *structs* se não for garantido seu alinhamento. Prefira bibliotecas focadas em Zero-Copy seguro como o crate `zerocopy` ou parsers como `nom`.

## 5. Tratamento Defensivo contra Setores Defeituosos (Bad Blocks)
- HDDs corrompidos possuem *bad sectors*. A engrenagem de leitura (`std::io::Read` ou P/Invoke de sistema operacional) lançará erros de I/O em setores específicos.
- Em vez de propagar o erro e derrubar o app, grave um aviso de log, preencha o *buffer* de destino com Zeros temporariamente para aquele bloco, e continue para o próximo setor. A recuperação deve ser resiliente.
