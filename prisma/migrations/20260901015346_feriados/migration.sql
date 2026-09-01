-- CreateTable
CREATE TABLE `feriados` (
    `id` CHAR(36) NOT NULL,
    `data` DATE NOT NULL,
    `descricao` VARCHAR(120) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `feriados_data_key`(`data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
