-- CreateTable
CREATE TABLE `vistoria_eventos` (
    `id` CHAR(36) NOT NULL,
    `vistoria_id` CHAR(36) NOT NULL,
    `tipo` ENUM('CRIADA', 'CONVITE_ENVIADO', 'COMPLEMENTO_SOLICITADO', 'LINK_ABERTO', 'EXECUCAO_INICIADA', 'CONCLUIDA', 'APROVADA', 'LAUDO_GERADO', 'LAUDO_ENVIADO') NOT NULL,
    `origem` ENUM('PAINEL', 'LINK_PUBLICO', 'SISTEMA') NOT NULL DEFAULT 'SISTEMA',
    `ocorrido_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `descricao` VARCHAR(300) NOT NULL,
    `autor` VARCHAR(150) NULL,
    `ip` VARCHAR(45) NULL,
    `agente` VARCHAR(255) NULL,

    INDEX `vistoria_eventos_vistoria_id_ocorrido_em_idx`(`vistoria_id`, `ocorrido_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vistoria_aceites` (
    `id` CHAR(36) NOT NULL,
    `vistoria_id` CHAR(36) NOT NULL,
    `papel` ENUM('EXECUTOR', 'GESTOR') NOT NULL,
    `aceito_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nome` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NULL,
    `documento` VARCHAR(20) NULL,
    `ip` VARCHAR(45) NULL,
    `agente` VARCHAR(255) NULL,
    `hash_conteudo` CHAR(64) NOT NULL,
    `declaracao` TEXT NOT NULL,

    UNIQUE INDEX `vistoria_aceites_vistoria_id_papel_key`(`vistoria_id`, `papel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vistoria_eventos` ADD CONSTRAINT `vistoria_eventos_vistoria_id_fkey` FOREIGN KEY (`vistoria_id`) REFERENCES `vistorias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vistoria_aceites` ADD CONSTRAINT `vistoria_aceites_vistoria_id_fkey` FOREIGN KEY (`vistoria_id`) REFERENCES `vistorias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
