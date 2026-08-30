-- CreateTable
CREATE TABLE `avisos_pagamento` (
    `id` CHAR(36) NOT NULL,
    `lancamento_id` CHAR(36) NOT NULL,
    `pago_em` DATE NOT NULL,
    `valor` DECIMAL(14, 2) NOT NULL,
    `forma_pagamento` ENUM('PIX', 'TED', 'DINHEIRO', 'BOLETO', 'CARTAO') NOT NULL,
    `observacoes` VARCHAR(500) NULL,
    `anexo_id` CHAR(36) NULL,
    `situacao` ENUM('PENDENTE', 'ACEITO', 'RECUSADO') NOT NULL DEFAULT 'PENDENTE',
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `avisos_pagamento_situacao_idx`(`situacao`),
    INDEX `avisos_pagamento_lancamento_id_idx`(`lancamento_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `avisos_pagamento` ADD CONSTRAINT `avisos_pagamento_lancamento_id_fkey` FOREIGN KEY (`lancamento_id`) REFERENCES `lancamentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
