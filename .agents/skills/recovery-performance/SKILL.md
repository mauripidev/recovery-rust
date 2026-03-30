---
name: recovery-performance
description: Diretrizes de Performance para escaneamento e I/O crítico de HDs e FAT32 em Rust.
---

# Diretrizes de Performance para Recuperação de Dados (Rust)

Quando escaneamos Terabytes de dados, milissegundos importam. Esta skill direciona a arquitetura de alta performance do motor de recuperação.

## 1. I/O Eficiente através de Buffers Grandes (Chunking)
- Jamais faça leitura byte-a-byte ou bloco-a-bloco (512 bytes) a partir da mídia física.
- O Gargalo da velocidade de acesso a disco se resolve lendo em "blocos super dimensionados" (ex: buffers de **4MB**, **16MB** ou **32MB** a cada syscall do SO).
- Implemente uma abstração de `ChunkedReader` sobre o `File`, mantendo um array do tamanho do pedaço na memória e só buscando o próximo bloco quando esgotar o atual.
- Para procurar cabeçalhos de arquivo (*File Carving* de JPEGs/PDFs) ou analisar a estrutura FAT32 de forma sequencial, utilize leitura via Mapeamento em Memória (MMAP - crate `memmap2`) **apenas** quando lidar com pequenos *image disks* (arquivos `.img` ou `.dd`); mas para dispositivos físicos block/device file puros, prefira Buffers alocados explicitamente para evitar comportamento imprevisível do Virtual Memory Manager.

## 2. Paralelismo Massivo em CPU (Data-Parallelism com Rayon)
- Ler disco é o gargalo, mas *processar assinaturas* em 16MB de memória também custa.
- Ao identificar *clusters* no formato FAT32, ou rodar heurísticas de File Carving num Buffer recém lido, despache fatias desse Buffer (*slices*) para a pool de threads do **Rayon**.
- Use `.par_iter()` ou `par_chunks()` para que o processador multi-core analise assinaturas simultaneamente enquanto a Thread principal aguarda o IO continuar.
- **Canal de Comunicação (MPSC):** A thread que varre o disco e produz buffers manda metadados detectados (ex: offset do arquivo, tamanho de clusters de FAT32 encontrados) por MPSC Channels (ex: crate `flume` ou `crossbeam`) para uma thread central de coordenação que organiza as evidências e manda eventos pro Tauri.

## 3. Estruturas Zero-Copy
- Evite criar `String` e alocações dinâmicas a cada nome de arquivo parseado no diretório base do FAT32.
- Use referências (`&[u8]`) mapeadas em cima do slice do buffer (Lifetime de Rust) ou bibliotecas de conversões seguras (como o crate `zerocopy`) para interpretar a tabela (`FAT`) e os descritores de diretórios de 32 bytes sem copiar a memória.
- No File Carving ou FAT32 parsing, passe offsets numéricos em vez de fatias contínuas de array sempre que um arquivo longo for gravado diretamente do chunk atual para um arquivo de salvamento do OS.

## 4. Otimização de Busca Textual (Algoritmos de Matching)
- Se fizer busca rápida de "Assinaturas de Binário" (Magic Numbers de cabeçalhos de arquivos como `\xFF\xD8\xFF\xE0` (JPEG)), NÃO use loops for aninhados rústicos.
- Utilize algoritmos rápidos e vetorização (SIMD opcional) do crate `memchr` (`memchr::memmem`) que oferecem speedups altíssimos na busca de substrings e arrays de bytes em blocos grandes.
