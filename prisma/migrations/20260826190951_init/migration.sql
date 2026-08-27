-- CreateTable
CREATE TABLE `imoveis` (
    `id` CHAR(36) NOT NULL,
    `apelido` VARCHAR(80) NOT NULL,
    `estrategia` ENUM('REVENDA', 'LOCACAO', 'TERRENO', 'USO_PROPRIO') NOT NULL,
    `situacao` ENUM('PROSPECCAO', 'ADQUIRIDO', 'EM_REFORMA', 'A_VENDA', 'PARA_ALUGAR', 'ALUGADO', 'VENDIDO') NOT NULL DEFAULT 'PROSPECCAO',
    `tipo` ENUM('APARTAMENTO', 'CASA', 'TERRENO', 'COMERCIAL', 'RURAL') NOT NULL,
    `cep` VARCHAR(9) NULL,
    `logradouro` VARCHAR(150) NULL,
    `numero` VARCHAR(20) NULL,
    `complemento` VARCHAR(80) NULL,
    `bairro` VARCHAR(80) NULL,
    `cidade` VARCHAR(80) NULL,
    `uf` CHAR(2) NULL,
    `matricula` VARCHAR(50) NULL,
    `inscricao_municipal` VARCHAR(50) NULL,
    `area_total` DECIMAL(10, 2) NULL,
    `area_construida` DECIMAL(10, 2) NULL,
    `quartos` INTEGER NULL,
    `vagas` INTEGER NULL,
    `data_aquisicao` DATE NULL,
    `valor_aquisicao` DECIMAL(14, 2) NULL,
    `data_venda` DATE NULL,
    `valor_venda` DECIMAL(14, 2) NULL,
    `valor_venda_alvo` DECIMAL(14, 2) NULL,
    `aluguel_alvo` DECIMAL(14, 2) NULL,
    `observacoes` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,
    `arquivado_em` DATETIME(3) NULL,

    INDEX `imoveis_situacao_idx`(`situacao`),
    INDEX `imoveis_estrategia_idx`(`estrategia`),
    INDEX `imoveis_arquivado_em_idx`(`arquivado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pessoas` (
    `id` CHAR(36) NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `documento` VARCHAR(18) NULL,
    `email` VARCHAR(150) NULL,
    `telefone` VARCHAR(20) NULL,
    `data_nascimento` DATE NULL,
    `cep` VARCHAR(9) NULL,
    `logradouro` VARCHAR(150) NULL,
    `numero` VARCHAR(20) NULL,
    `complemento` VARCHAR(80) NULL,
    `bairro` VARCHAR(80) NULL,
    `cidade` VARCHAR(80) NULL,
    `uf` CHAR(2) NULL,
    `observacoes` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,
    `arquivado_em` DATETIME(3) NULL,

    UNIQUE INDEX `pessoas_documento_key`(`documento`),
    INDEX `pessoas_email_idx`(`email`),
    INDEX `pessoas_nome_idx`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categorias` (
    `id` CHAR(36) NOT NULL,
    `nome` VARCHAR(80) NOT NULL,
    `natureza` ENUM('ENTRADA', 'SAIDA') NOT NULL,
    `categoria_pai_id` CHAR(36) NULL,
    `capitalizavel_padrao` BOOLEAN NOT NULL DEFAULT false,
    `codigo_fiscal` VARCHAR(20) NULL,
    `do_sistema` BOOLEAN NOT NULL DEFAULT false,
    `ativa` BOOLEAN NOT NULL DEFAULT true,

    INDEX `categorias_natureza_ativa_idx`(`natureza`, `ativa`),
    UNIQUE INDEX `categorias_nome_natureza_key`(`nome`, `natureza`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lancamentos` (
    `id` CHAR(36) NOT NULL,
    `imovel_id` CHAR(36) NOT NULL,
    `contrato_id` CHAR(36) NULL,
    `categoria_id` CHAR(36) NOT NULL,
    `pessoa_id` CHAR(36) NULL,
    `natureza` ENUM('ENTRADA', 'SAIDA') NOT NULL,
    `situacao` ENUM('PENDENTE', 'PAGO', 'ATRASADO', 'PARCIAL', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
    `origem` ENUM('MANUAL', 'CONTRATO_AUTOMATICO') NOT NULL DEFAULT 'MANUAL',
    `descricao` VARCHAR(200) NOT NULL,
    `valor` DECIMAL(14, 2) NOT NULL,
    `competencia` DATE NOT NULL,
    `vencimento` DATE NULL,
    `pago_em` DATETIME(3) NULL,
    `valor_pago` DECIMAL(14, 2) NULL,
    `valor_multa` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `valor_juros` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `valor_desconto` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `capitalizavel` BOOLEAN NOT NULL DEFAULT false,
    `formaPagamento` ENUM('PIX', 'TED', 'DINHEIRO', 'BOLETO', 'CARTAO') NULL,
    `pix_txid` VARCHAR(25) NULL,
    `pix_payload` TEXT NULL,
    `chave_geracao` VARCHAR(60) NULL,
    `observacoes` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lancamentos_pix_txid_key`(`pix_txid`),
    UNIQUE INDEX `lancamentos_chave_geracao_key`(`chave_geracao`),
    INDEX `lancamentos_imovel_id_competencia_idx`(`imovel_id`, `competencia`),
    INDEX `lancamentos_situacao_vencimento_idx`(`situacao`, `vencimento`),
    INDEX `lancamentos_contrato_id_competencia_idx`(`contrato_id`, `competencia`),
    INDEX `lancamentos_categoria_id_idx`(`categoria_id`),
    INDEX `lancamentos_capitalizavel_idx`(`capitalizavel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itens_lancamento` (
    `id` CHAR(36) NOT NULL,
    `lancamento_id` CHAR(36) NOT NULL,
    `categoria_id` CHAR(36) NOT NULL,
    `descricao` VARCHAR(150) NOT NULL,
    `valor` DECIMAL(14, 2) NOT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,

    INDEX `itens_lancamento_lancamento_id_idx`(`lancamento_id`),
    INDEX `itens_lancamento_categoria_id_idx`(`categoria_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contratos` (
    `id` CHAR(36) NOT NULL,
    `imovel_id` CHAR(36) NOT NULL,
    `situacao` ENUM('RASCUNHO', 'ATIVO', 'ENCERRADO', 'RESCINDIDO') NOT NULL DEFAULT 'RASCUNHO',
    `data_inicio` DATE NOT NULL,
    `data_fim` DATE NOT NULL,
    `data_rescisao` DATE NULL,
    `dia_vencimento` TINYINT NOT NULL,
    `valor_aluguel` DECIMAL(14, 2) NOT NULL,
    `percentual_multa` DECIMAL(5, 2) NOT NULL DEFAULT 2.00,
    `percentual_juros_dia` DECIMAL(6, 4) NOT NULL DEFAULT 0.0330,
    `desconto_pontualidade` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `indice_reajuste` ENUM('IGPM', 'IPCA', 'INCC', 'NENHUM') NOT NULL DEFAULT 'IGPM',
    `intervalo_reajuste_meses` INTEGER NOT NULL DEFAULT 12,
    `proximo_reajuste_em` DATE NULL,
    `tipo_garantia` ENUM('CAUCAO', 'FIADOR', 'SEGURO_FIANCA', 'NENHUMA') NOT NULL DEFAULT 'NENHUMA',
    `valor_garantia` DECIMAL(14, 2) NULL,
    `chave_pix_id` CHAR(36) NULL,
    `regua_cobranca_id` CHAR(36) NULL,
    `dias_aviso_encerramento` INTEGER NOT NULL DEFAULT 90,
    `gerar_cobrancas` BOOLEAN NOT NULL DEFAULT true,
    `dias_antecedencia_geracao` INTEGER NOT NULL DEFAULT 10,
    `observacoes` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    INDEX `contratos_imovel_id_situacao_idx`(`imovel_id`, `situacao`),
    INDEX `contratos_situacao_idx`(`situacao`),
    INDEX `contratos_proximo_reajuste_em_idx`(`proximo_reajuste_em`),
    INDEX `contratos_data_fim_idx`(`data_fim`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itens_contrato` (
    `id` CHAR(36) NOT NULL,
    `contrato_id` CHAR(36) NOT NULL,
    `categoria_id` CHAR(36) NOT NULL,
    `descricao` VARCHAR(150) NOT NULL,
    `valor` DECIMAL(14, 2) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    INDEX `itens_contrato_contrato_id_idx`(`contrato_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partes_contrato` (
    `id` CHAR(36) NOT NULL,
    `contrato_id` CHAR(36) NOT NULL,
    `pessoa_id` CHAR(36) NOT NULL,
    `papel` ENUM('INQUILINO', 'FIADOR', 'CONJUGE') NOT NULL,
    `contato_principal` BOOLEAN NOT NULL DEFAULT false,

    INDEX `partes_contrato_pessoa_id_idx`(`pessoa_id`),
    UNIQUE INDEX `partes_contrato_contrato_id_pessoa_id_papel_key`(`contrato_id`, `pessoa_id`, `papel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modelos_email` (
    `id` CHAR(36) NOT NULL,
    `chave` VARCHAR(50) NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `assunto` VARCHAR(200) NOT NULL,
    `corpo_html` TEXT NOT NULL,
    `corpo_texto` TEXT NULL,
    `variaveis_disponiveis` JSON NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `modelos_email_chave_key`(`chave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reguas_cobranca` (
    `id` CHAR(36) NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `padrao` BOOLEAN NOT NULL DEFAULT false,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    INDEX `reguas_cobranca_padrao_idx`(`padrao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `regras_cobranca` (
    `id` CHAR(36) NOT NULL,
    `regua_id` CHAR(36) NOT NULL,
    `sequencia` INTEGER NOT NULL,
    `dias_offset` INTEGER NOT NULL,
    `intervalo_repeticao_dias` INTEGER NULL,
    `maximo_repeticoes` INTEGER NULL,
    `modelo_email_id` CHAR(36) NOT NULL,
    `hora_envio` CHAR(5) NOT NULL DEFAULT '09:00',
    `apenas_se_situacao` ENUM('PENDENTE', 'PAGO', 'ATRASADO', 'PARCIAL', 'CANCELADO') NULL,
    `ativa` BOOLEAN NOT NULL DEFAULT true,

    INDEX `regras_cobranca_ativa_idx`(`ativa`),
    UNIQUE INDEX `regras_cobranca_regua_id_sequencia_key`(`regua_id`, `sequencia`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificacoes` (
    `id` CHAR(36) NOT NULL,
    `lancamento_id` CHAR(36) NULL,
    `contrato_id` CHAR(36) NULL,
    `regra_cobranca_id` CHAR(36) NULL,
    `modelo_email_id` CHAR(36) NOT NULL,
    `ocorrencia` INTEGER NOT NULL DEFAULT 1,
    `destinatario` VARCHAR(150) NOT NULL,
    `copia` VARCHAR(500) NULL,
    `assunto` VARCHAR(200) NOT NULL,
    `corpo_renderizado` TEXT NOT NULL,
    `agendado_para` DATETIME(3) NOT NULL,
    `enviado_em` DATETIME(3) NULL,
    `situacao` ENUM('PENDENTE', 'ENVIADO', 'FALHOU', 'IGNORADO', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
    `tentativas` INTEGER NOT NULL DEFAULT 0,
    `mensagem_erro` TEXT NULL,
    `id_provedor` VARCHAR(200) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notificacoes_situacao_agendado_para_idx`(`situacao`, `agendado_para`),
    UNIQUE INDEX `notificacoes_lancamento_id_regra_cobranca_id_ocorrencia_key`(`lancamento_id`, `regra_cobranca_id`, `ocorrencia`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chaves_pix` (
    `id` CHAR(36) NOT NULL,
    `tipo_chave` ENUM('CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA') NOT NULL,
    `chave` VARCHAR(77) NOT NULL,
    `nome_beneficiario` VARCHAR(25) NOT NULL,
    `cidade_beneficiario` VARCHAR(15) NOT NULL,
    `padrao` BOOLEAN NOT NULL DEFAULT false,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    INDEX `chaves_pix_padrao_idx`(`padrao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `anexos` (
    `id` CHAR(36) NOT NULL,
    `entidade_tipo` ENUM('IMOVEL', 'LANCAMENTO', 'CONTRATO', 'PESSOA') NOT NULL,
    `entidade_id` CHAR(36) NOT NULL,
    `especie` ENUM('COMPROVANTE', 'NOTA_FISCAL', 'CONTRATO', 'FOTO', 'ESCRITURA', 'LAUDO', 'OUTRO') NOT NULL,
    `bucket` VARCHAR(63) NOT NULL,
    `chave_objeto` VARCHAR(500) NOT NULL,
    `nome_arquivo` VARCHAR(255) NOT NULL,
    `tipo_conteudo` VARCHAR(100) NOT NULL,
    `tamanho_bytes` BIGINT NOT NULL,
    `checksum` VARCHAR(64) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `anexos_entidade_tipo_entidade_id_idx`(`entidade_tipo`, `entidade_id`),
    INDEX `anexos_especie_idx`(`especie`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuracoes` (
    `chave` VARCHAR(80) NOT NULL,
    `valor` TEXT NOT NULL,
    `tipo` ENUM('TEXTO', 'NUMERO', 'BOOLEANO', 'JSON') NOT NULL DEFAULT 'TEXTO',
    `grupo` VARCHAR(50) NOT NULL,
    `descricao` VARCHAR(200) NULL,
    `atualizado_em` DATETIME(3) NOT NULL,

    INDEX `configuracoes_grupo_idx`(`grupo`),
    PRIMARY KEY (`chave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` CHAR(36) NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `senha_hash` VARCHAR(255) NOT NULL,
    `perfil` ENUM('ADMIN', 'OPERADOR', 'LEITURA') NOT NULL DEFAULT 'ADMIN',
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `categorias` ADD CONSTRAINT `categorias_categoria_pai_id_fkey` FOREIGN KEY (`categoria_pai_id`) REFERENCES `categorias`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamentos` ADD CONSTRAINT `lancamentos_imovel_id_fkey` FOREIGN KEY (`imovel_id`) REFERENCES `imoveis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamentos` ADD CONSTRAINT `lancamentos_contrato_id_fkey` FOREIGN KEY (`contrato_id`) REFERENCES `contratos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamentos` ADD CONSTRAINT `lancamentos_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamentos` ADD CONSTRAINT `lancamentos_pessoa_id_fkey` FOREIGN KEY (`pessoa_id`) REFERENCES `pessoas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_lancamento` ADD CONSTRAINT `itens_lancamento_lancamento_id_fkey` FOREIGN KEY (`lancamento_id`) REFERENCES `lancamentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_lancamento` ADD CONSTRAINT `itens_lancamento_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contratos` ADD CONSTRAINT `contratos_imovel_id_fkey` FOREIGN KEY (`imovel_id`) REFERENCES `imoveis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contratos` ADD CONSTRAINT `contratos_chave_pix_id_fkey` FOREIGN KEY (`chave_pix_id`) REFERENCES `chaves_pix`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contratos` ADD CONSTRAINT `contratos_regua_cobranca_id_fkey` FOREIGN KEY (`regua_cobranca_id`) REFERENCES `reguas_cobranca`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_contrato` ADD CONSTRAINT `itens_contrato_contrato_id_fkey` FOREIGN KEY (`contrato_id`) REFERENCES `contratos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itens_contrato` ADD CONSTRAINT `itens_contrato_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partes_contrato` ADD CONSTRAINT `partes_contrato_contrato_id_fkey` FOREIGN KEY (`contrato_id`) REFERENCES `contratos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partes_contrato` ADD CONSTRAINT `partes_contrato_pessoa_id_fkey` FOREIGN KEY (`pessoa_id`) REFERENCES `pessoas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `regras_cobranca` ADD CONSTRAINT `regras_cobranca_regua_id_fkey` FOREIGN KEY (`regua_id`) REFERENCES `reguas_cobranca`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `regras_cobranca` ADD CONSTRAINT `regras_cobranca_modelo_email_id_fkey` FOREIGN KEY (`modelo_email_id`) REFERENCES `modelos_email`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacoes` ADD CONSTRAINT `notificacoes_lancamento_id_fkey` FOREIGN KEY (`lancamento_id`) REFERENCES `lancamentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacoes` ADD CONSTRAINT `notificacoes_contrato_id_fkey` FOREIGN KEY (`contrato_id`) REFERENCES `contratos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacoes` ADD CONSTRAINT `notificacoes_regra_cobranca_id_fkey` FOREIGN KEY (`regra_cobranca_id`) REFERENCES `regras_cobranca`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificacoes` ADD CONSTRAINT `notificacoes_modelo_email_id_fkey` FOREIGN KEY (`modelo_email_id`) REFERENCES `modelos_email`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

