# Validação da Sprint 8

Data: 20/10/2026, ambiente local Windows, Node 20.20.0, PostgreSQL 18.1, aplicação em http://localhost:3000.

- `npm run typecheck`: aprovado.
- `npm run build`: aprovado; 159 módulos de frontend transformados.
- `npm test`: 148 testes aprovados, 0 falhas, 0 ignorados, 0 pendentes.
- `node --import tsx --test test/sprint8.test.mjs`: 15 testes aprovados.
- `git diff --check`: aprovado; avisos de conversão LF/CRLF não indicam erro de conteúdo.
- Consulta somente leitura do PostgreSQL: 11 tabelas de negócio, 104 colunas e 18 FKs. Sem migration de Sprint 8.
- ViaCEP real: CEP público 01001000, Praça da Sé, Sé, São Paulo/SP.
- Interface: 27 opções de UF; 645 municípios de SP e 497 do RS carregados pelo IBGE; troca de UF limpa a cidade; divergência com o CEP impede salvar; nova consulta restaura São Paulo/SP.
- Não foram salvos endereços nem criados/alterados pedidos, pagamentos, estoque ou movimentações reais na conferência.
- Nenhum erro/aviso de console foi observado na conferência das listas.

As métricas detalhadas estão em `sprint-8-schema-and-api.json` e `sprint-8-ui.json`. A medida de API inclui leitura do JSON, não renderização. A medida de interface inclui custo da automação até observar o DOM, não LCP ou pintura das imagens. São amostras locais pequenas, sem carga concorrente ou simulação de redes/dispositivos de terceiros, não um SLA de produção.

O diagnóstico de desempenho executou 20 leituras sequenciais por endpoint. A conferência de interface fez cinco recargas e cinco buscas. Os resultados não substituem cinco avaliações reais de colegas, vídeo do autor, template do AVA ou validação em hospedagem.

O Google Docs revisado recebeu a seção 15 e nove imagens incorporadas, com corpo justificado. Conteúdo e estrutura anteriores foram preservados; o original não foi editado. A exportação para PDF contém 52 páginas; as páginas novas foram renderizadas para conferência de paginação e figuras. O PDF exportado não é versionado por conter o documento pessoal completo.
