# ERP Locação de Plataformas (Template)

Versão de **demonstração pública** de um ERP para locadoras de plataformas elevatórias, desenvolvido por mim e hoje em uso por uma empresa real.

> **Modo demonstração:** dados fictícios, somente leitura. Dá para entrar e navegar por todas as telas; salvar, editar e excluir mostram um aviso. Nada é enviado a servidores.

## Módulos

- **Dashboard:** frota alugada, contas a receber, faturamento por tipo de máquina, ranking de ocupação
- **Clientes:** cadastro PF/PJ com validação de CPF/CNPJ (inclusive CNPJ alfanumérico) e LGPD
- **Frota:** máquinas, tipos e preços, status em tempo real, financiamento e resultado por máquina
- **Contratos:** prévia do contrato, checagem de conflito de agenda, parcelas
- **Agenda:** entregas e devoluções, atrasos
- **Manutenção** e **Financeiro** (a receber / a pagar)
- **Usuários e perfis** (RBAC)

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind (`apps/web`) |
| Backend | NestJS + Prisma + PostgreSQL (`apps/api`) |
| Compartilhado | Regras e validações com Zod (`packages/shared`) |

Na demo, `apps/web/src/demo/demo-api.ts` substitui a API real e responde no próprio navegador.

## Segurança (versão de produção)

- Senhas com **Argon2id**; sessão em cookie `__Host-` HttpOnly, Secure, SameSite=Strict, token guardado como hash
- Bloqueio após 5 tentativas, rate limiting e resposta em tempo constante (contra enumeração de usuários)
- RBAC com negação por padrão em todas as rotas
- Validação com Zod no frontend e no backend; checagem de origem contra CSRF
- Upload de imagens revalidado e reprocessado (sharp), nomes gerados pela API (sem path traversal)
- Helmet/CSP, limite de tamanho das requisições, trilha de auditoria

## Privacidade

Nome, logo, clientes, telefones e endereços da empresa real **não fazem parte** deste repositório nem do histórico dele (repositório criado do zero).

---

Desenvolvido por **Paulo Henrique Guilhen Alves** · [Portfólio](https://paulohenrique-dev.vercel.app) · [LinkedIn](https://www.linkedin.com/in/paulo-henrique-guilhen)
