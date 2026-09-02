-- AlterTable
ALTER TABLE `imoveis` ADD COLUMN `banheiros` INTEGER NULL;

-- CreateTable
CREATE TABLE `caracteristicas_imovel` (
    `id` CHAR(36) NOT NULL,
    `imovel_id` CHAR(36) NOT NULL,
    `descricao` VARCHAR(80) NOT NULL,
    `quantidade` INTEGER NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,

    INDEX `caracteristicas_imovel_imovel_id_idx`(`imovel_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `caracteristicas_imovel` ADD CONSTRAINT `caracteristicas_imovel_imovel_id_fkey` FOREIGN KEY (`imovel_id`) REFERENCES `imoveis`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
