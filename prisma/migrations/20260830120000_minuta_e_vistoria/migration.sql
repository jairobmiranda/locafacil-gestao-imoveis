-- PapelParte: INQUILINO vira LOCATARIO. Alarga o enum antes de converter os dados,
-- senao o MySQL trunca as linhas existentes.
ALTER TABLE `partes_contrato` MODIFY `papel` ENUM('INQUILINO', 'LOCADOR', 'LOCATARIO', 'FIADOR', 'CONJUGE', 'ANUENTE', 'TESTEMUNHA') NOT NULL;

UPDATE `partes_contrato` SET `papel` = 'LOCATARIO' WHERE `papel` = 'INQUILINO';

-- AlterTable
ALTER TABLE `partes_contrato` ADD COLUMN `ordem` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `participacao` DECIMAL(5, 2) NULL,
    ADD COLUMN `solidario` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `papel` ENUM('LOCADOR', 'LOCATARIO', 'FIADOR', 'CONJUGE', 'ANUENTE', 'TESTEMUNHA') NOT NULL;

-- AlterTable
ALTER TABLE `anexos` MODIFY `entidade_tipo` ENUM('IMOVEL', 'LANCAMENTO', 'CONTRATO', 'PESSOA', 'VISTORIA') NOT NULL,
    MODIFY `especie` ENUM('COMPROVANTE', 'NOTA_FISCAL', 'CONTRATO', 'FOTO', 'ESCRITURA', 'LAUDO', 'MINUTA', 'CONTRATO_ASSINADO', 'DOCUMENTO_PESSOAL', 'OUTRO') NOT NULL;

-- AlterTable
ALTER TABLE `contratos` ADD COLUMN `finalidade` ENUM('RESIDENCIAL', 'NAO_RESIDENCIAL', 'TEMPORADA') NOT NULL DEFAULT 'RESIDENCIAL',
    ADD COLUMN `respostas_blindagem` JSON NULL,
    MODIFY `situacao` ENUM('RASCUNHO', 'EM_ASSINATURA', 'ATIVO', 'ENCERRADO', 'RESCINDIDO') NOT NULL DEFAULT 'RASCUNHO',
    MODIFY `tipo_garantia` ENUM('CAUCAO', 'FIADOR', 'SEGURO_FIANCA', 'TITULO_CAPITALIZACAO', 'NENHUMA') NOT NULL DEFAULT 'NENHUMA';

-- AlterTable
ALTER TABLE `pessoas` ADD COLUMN `estado_civil` ENUM('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL', 'SEPARADO') NULL,
    ADD COLUMN `nacionalidade` VARCHAR(40) NULL,
    ADD COLUMN `orgao_expedidor` VARCHAR(20) NULL,
    ADD COLUMN `profissao` VARCHAR(80) NULL,
    ADD COLUMN `rg` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `minutas_contrato` (
    `id` CHAR(36) NOT NULL,
    `contrato_id` CHAR(36) NOT NULL,
    `versao` INTEGER NOT NULL,
    `situacao` ENUM('RASCUNHO', 'GERADA', 'ENVIADA_ASSINATURA', 'ASSINADA', 'CANCELADA') NOT NULL DEFAULT 'GERADA',
    `modelo_versao` INTEGER NOT NULL,
    `dados_snapshot` JSON NOT NULL,
    `clausulas_usadas` JSON NOT NULL,
    `conteudo_html` LONGTEXT NOT NULL,
    `hash_conteudo` CHAR(64) NOT NULL,
    `nivel_protecao` INTEGER NOT NULL DEFAULT 0,
    `alertas` JSON NULL,
    `enviada_em` DATETIME(3) NULL,
    `assinada_em` DATETIME(3) NULL,
    `cancelada_em` DATETIME(3) NULL,
    `anexo_assinado_id` CHAR(36) NULL,
    `hash_assinado` CHAR(64) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `minutas_contrato_situacao_idx`(`situacao`),
    UNIQUE INDEX `minutas_contrato_contrato_id_versao_key`(`contrato_id`, `versao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vistorias` (
    `id` CHAR(36) NOT NULL,
    `imovel_id` CHAR(36) NOT NULL,
    `contrato_id` CHAR(36) NULL,
    `tipo` ENUM('ENTRADA', 'SAIDA', 'PERIODICA') NOT NULL,
    `situacao` ENUM('RASCUNHO', 'CONVITE_ENVIADO', 'EM_EXECUCAO', 'ENVIADA', 'APROVADA', 'RECUSADA') NOT NULL DEFAULT 'RASCUNHO',
    `roteiro_chave` VARCHAR(40) NOT NULL,
    `roteiro_versao` INTEGER NOT NULL,
    `responsavel_id` CHAR(36) NULL,
    `convite_email` VARCHAR(150) NULL,
    `convite_enviado_em` DATETIME(3) NULL,
    `convite_expira_em` DATETIME(3) NULL,
    `iniciada_em` DATETIME(3) NULL,
    `enviada_em` DATETIME(3) NULL,
    `aprovada_em` DATETIME(3) NULL,
    `recusada_em` DATETIME(3) NULL,
    `motivo_recusa` VARCHAR(500) NULL,
    `observacoes` TEXT NULL,
    `laudo_anexo_id` CHAR(36) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    INDEX `vistorias_imovel_id_tipo_idx`(`imovel_id`, `tipo`),
    INDEX `vistorias_contrato_id_idx`(`contrato_id`),
    INDEX `vistorias_situacao_idx`(`situacao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vistoria_ambientes` (
    `id` CHAR(36) NOT NULL,
    `vistoria_id` CHAR(36) NOT NULL,
    `chave` VARCHAR(40) NOT NULL,
    `nome` VARCHAR(80) NOT NULL,
    `ordem` INTEGER NOT NULL,
    `concluido` BOOLEAN NOT NULL DEFAULT false,

    INDEX `vistoria_ambientes_vistoria_id_idx`(`vistoria_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vistoria_itens` (
    `id` CHAR(36) NOT NULL,
    `ambiente_id` CHAR(36) NOT NULL,
    `chave` VARCHAR(40) NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `dica` VARCHAR(200) NULL,
    `ordem` INTEGER NOT NULL,
    `minimo_fotos` INTEGER NOT NULL DEFAULT 1,
    `estado` ENUM('NOVO', 'BOM', 'REGULAR', 'RUIM', 'AUSENTE', 'NAO_APLICAVEL') NULL,
    `observacao` TEXT NULL,

    INDEX `vistoria_itens_ambiente_id_idx`(`ambiente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vistoria_fotos` (
    `id` CHAR(36) NOT NULL,
    `item_id` CHAR(36) NOT NULL,
    `bucket` VARCHAR(63) NOT NULL,
    `chave_objeto` VARCHAR(500) NOT NULL,
    `tipo_conteudo` VARCHAR(100) NOT NULL,
    `tamanho_bytes` INTEGER NOT NULL,
    `largura` INTEGER NULL,
    `altura` INTEGER NULL,
    `hash_sha256` CHAR(64) NOT NULL,
    `capturada_em` DATETIME(3) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `recebida_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `legenda` VARCHAR(200) NULL,

    INDEX `vistoria_fotos_item_id_idx`(`item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `minutas_contrato` ADD CONSTRAINT `minutas_contrato_contrato_id_fkey` FOREIGN KEY (`contrato_id`) REFERENCES `contratos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vistorias` ADD CONSTRAINT `vistorias_imovel_id_fkey` FOREIGN KEY (`imovel_id`) REFERENCES `imoveis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vistorias` ADD CONSTRAINT `vistorias_contrato_id_fkey` FOREIGN KEY (`contrato_id`) REFERENCES `contratos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vistorias` ADD CONSTRAINT `vistorias_responsavel_id_fkey` FOREIGN KEY (`responsavel_id`) REFERENCES `pessoas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vistoria_ambientes` ADD CONSTRAINT `vistoria_ambientes_vistoria_id_fkey` FOREIGN KEY (`vistoria_id`) REFERENCES `vistorias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vistoria_itens` ADD CONSTRAINT `vistoria_itens_ambiente_id_fkey` FOREIGN KEY (`ambiente_id`) REFERENCES `vistoria_ambientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vistoria_fotos` ADD CONSTRAINT `vistoria_fotos_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `vistoria_itens`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
