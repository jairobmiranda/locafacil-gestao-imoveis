-- AlterTable
ALTER TABLE `notificacoes` ADD COLUMN `pix_payload` TEXT NULL;

-- AlterTable
ALTER TABLE `reguas_cobranca` ADD COLUMN `modelo_consolidado_id` CHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `reguas_cobranca` ADD CONSTRAINT `reguas_cobranca_modelo_consolidado_id_fkey` FOREIGN KEY (`modelo_consolidado_id`) REFERENCES `modelos_email`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
