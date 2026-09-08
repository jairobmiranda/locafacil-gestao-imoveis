-- AlterTable
ALTER TABLE `chaves_pix` ADD COLUMN `instituicao` VARCHAR(60) NULL;

-- Insere o bloco de conferencia do destinatario logo abaixo do QR nos modelos ja existentes.
-- Modelo editado a mao fica de fora e precisa receber `{{pix.confirmacao}}` pela tela de modelos.
UPDATE `modelos_email`
SET `corpo_html` = REPLACE(
      `corpo_html`,
      'alt="QR Code Pix" width="180" height="180" /></p>',
      CONCAT('alt="QR Code Pix" width="180" height="180" /></p>', CHAR(10), '    {{pix.confirmacao}}')
    )
WHERE `corpo_html` LIKE '%{{pix.qrcode_url}}%'
  AND `corpo_html` NOT LIKE '%{{pix.confirmacao}}%';
