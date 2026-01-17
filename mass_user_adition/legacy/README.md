# GHL - Criacao em lote de usuarios

Este script cria usuarios no GHL usando um CSV e templates por cargo.

## Requisitos
- Python 3.8+
- Token de acesso (Bearer)

## Configuracao
O script ja inclui um token padrao, mas voce pode sobrescrever por variavel de ambiente:

```bash
export GHL_ACCESS_TOKEN="seu_token_aqui"
```

## CSV
Colunas esperadas (qualquer combinacao de aliases funciona):

```
cargo,name,firstName,lastName,email,phone
```

Exemplo comum:

```
USUARIO,FONE,EMAIL,PERFIL
```

Aliases aceitos (case-insensitive):
- cargo: `role`, `funcao`, `perfil`
- name: `nome`, `usuario`
- firstName: `first_name`, `first`
- lastName: `last_name`, `last`, `sobrenome`
- phone: `telefone`, `celular`, `fone`

Roles aceitos:
- `VENDEDOR`
- `MASTER` (mapeado para Administrador)

Se `firstName` e `lastName` nao forem informados, o script divide o campo `name`.
Para nomes com apenas um termo, ele usa o sobrenome padrao `Sem Sobrenome`.

Exemplo: `usuarios_exemplo.csv`

## Templates
- `templates/vendedor.json`
- `templates/administrador.json`

O script envia `firstName`, `lastName`, `email`, `phone`, `type`, `role`, `locationIds`,
`permissions`, `scopes` e `companyId`.

**Importante:** Location ID e Company ID são a mesma coisa na API do GHL.

Se a API rejeitar os `scopes`, o script tenta novamente sem eles.

## Executar
```bash
python3 create_users.py --csv usuarios.csv
```

## Interface simples (web)
```bash
python3 server.py
```

Abra `http://127.0.0.1:8080` no navegador.

## Dry-run
```bash
python3 create_users.py --csv usuarios.csv --dry-run
```

## Listar usuarios existentes
```bash
python3 create_users.py --list-users --location-id citQs4acsN1StzOEDuvj
```

Arquivos gerados:
- `users_existing.json`
- `users_existing.csv`

## Opcoes uteis
- `--delay 0.3` para aguardar entre requisicoes
- `--base-url` para trocar o host
- `--api-version` para mudar o header Version
- `--user-agent` para ajustar o User-Agent (padrao ja definido)
- `--location-id` para enviar o header LocationId e usar como companyId (padrao: primeiro `roles.locationIds` do body)
- `--company-id` alternativa para `--location-id` (são a mesma coisa)

## Endpoint
O script usa `POST /users/` em `https://services.leadconnectorhq.com`.
