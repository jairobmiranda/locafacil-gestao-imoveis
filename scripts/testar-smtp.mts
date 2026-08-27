import 'dotenv/config';
import { createTransport } from 'nodemailer';

/**
 * Diagnostico de SMTP fora da API, para testar credenciais e provedores
 * sem reiniciar o servidor.
 *
 *   npm run smtp:testar
 *   npm run smtp:testar -- voce@exemplo.com
 */

const destinatario = process.argv[2];

const host = process.env.SMTP_HOST;
const porta = Number(process.env.SMTP_PORT ?? 587);
const usuario = process.env.SMTP_USER;
const senha = process.env.SMTP_PASS;
const remetente = process.env.SMTP_FROM;

function exigir(nome: string, valor: string | undefined): string {
  if (!valor) {
    console.error(`\n  Faltou definir ${nome} no .env\n`);
    process.exit(1);
  }

  return valor;
}

console.log('\n=== Configuração lida do .env ===');
console.log(`  host       ${host}`);
console.log(`  porta      ${porta}`);
console.log(`  usuário    ${usuario}`);
console.log(`  senha      ${senha ? `${senha.length} caracteres` : '(vazia)'}`);
console.log(`  remetente  ${remetente}`);
console.log(`  TLS        ${porta === 465 ? 'implícito' : 'STARTTLS'}\n`);

exigir('SMTP_HOST', host);
exigir('SMTP_USER', usuario);
exigir('SMTP_PASS', senha);

const transporte = createTransport({
  host,
  port: porta,
  secure: porta === 465,
  requireTLS: porta !== 465,
  auth: { user: usuario, pass: senha },
  // Mostra o diálogo SMTP completo, que é onde o motivo real da recusa aparece.
  logger: true,
  debug: true,
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
});

function explicar(erro: NodeJS.ErrnoException & { responseCode?: number; response?: string }): void {
  const resposta = erro.response ?? erro.message;

  console.error(`\n=== Falhou ===\n  ${resposta}\n`);

  if (resposta.includes('SmtpClientAuthentication is disabled')) {
    console.error('  A Microsoft desativou o SMTP AUTH nessa caixa. Nenhuma senha resolve.');
    console.error('  Use outro provedor (Brevo, Resend, SES) ou OAuth2 via Graph.\n');
    return;
  }

  if (erro.responseCode === 535) {
    console.error('  Credenciais recusadas. Em contas com 2FA use senha de aplicativo,');
    console.error('  não a senha da conta.\n');
    return;
  }

  if (erro.code === 'ETIMEDOUT' || erro.code === 'ECONNREFUSED') {
    console.error(`  Sem conexão TCP com ${host}:${porta}. Verifique firewall ou porta.`);
    console.error('  Provedores costumam aceitar 587 (STARTTLS) e 465 (TLS).\n');
    return;
  }

  if (erro.code === 'EDNS' || erro.code === 'ENOTFOUND') {
    console.error(`  O host ${host} não resolve. Confira a grafia.\n`);
  }
}

try {
  console.log('=== Verificando conexão e autenticação ===\n');
  await transporte.verify();
  console.log('\n=== Autenticação OK ===\n');

  if (destinatario) {
    const resultado = await transporte.sendMail({
      from: remetente,
      to: destinatario,
      subject: 'LocaFácil, teste de SMTP',
      text: 'Se você recebeu esta mensagem, o envio está funcionando.',
      html: '<p>Se você recebeu esta mensagem, o envio está funcionando.</p>',
    });

    console.log(`  Enviado para ${destinatario}`);
    console.log(`  Message-ID: ${resultado.messageId}`);
    console.log(`  Resposta:   ${resultado.response}\n`);
    console.log('  Não esqueça de conferir a caixa de spam.\n');
  } else {
    console.log('  Para enviar de verdade: npm run smtp:testar -- voce@exemplo.com\n');
  }
} catch (erro) {
  explicar(erro as NodeJS.ErrnoException);
  process.exitCode = 1;
} finally {
  transporte.close();
}
