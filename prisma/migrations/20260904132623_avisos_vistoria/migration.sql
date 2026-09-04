-- AlterTable
ALTER TABLE `vistorias` ADD COLUMN `avisar_conclusao` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `avisar_emails` VARCHAR(500) NULL,
    ADD COLUMN `avisar_inicio` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `aviso_conclusao_em` DATETIME(3) NULL,
    ADD COLUMN `aviso_inicio_em` DATETIME(3) NULL;
