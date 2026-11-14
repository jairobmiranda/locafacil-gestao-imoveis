import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import type { Readable } from 'node:stream';

@Injectable()
export class ArmazenamentoService implements OnModuleInit {
  private readonly logger = new Logger(ArmazenamentoService.name);
  private readonly cliente: Client;
  readonly bucket: string;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET') ?? 'locafacil';

    // A lib `minio` é só o cliente S3; o servidor é o Garage.
    this.cliente = new Client({
      endPoint: config.getOrThrow<string>('S3_ENDPOINT'),
      port: Number(config.get<string>('S3_PORT') ?? 3900),
      useSSL: config.get<string>('S3_USE_SSL') === 'true',
      accessKey: config.getOrThrow<string>('S3_ACCESS_KEY'),
      secretKey: config.getOrThrow<string>('S3_SECRET_KEY'),
      // Igual ao s3_region de docker/garage.toml. Sem isso o cliente assina como us-east-1 e o
      // Garage recusa a requisição.
      region: config.get<string>('S3_REGION') ?? 'garage',
    });
  }

  /** Só confere: quem cria o bucket é o próprio Garage (`--default-bucket`). */
  async onModuleInit(): Promise<void> {
    try {
      if (!(await this.cliente.bucketExists(this.bucket))) {
        this.logger.error(
          `Bucket "${this.bucket}" não existe. Confira GARAGE_DEFAULT_BUCKET no Garage e S3_BUCKET na API.`,
        );
      }
    } catch (erro) {
      this.logger.error(
        `Não foi possível validar o bucket "${this.bucket}": ${(erro as Error).message}`,
      );
    }
  }

  async enviar(
    chave: string,
    conteudo: Buffer,
    tipoConteudo: string,
  ): Promise<void> {
    await this.cliente.putObject(this.bucket, chave, conteudo, conteudo.length, {
      'Content-Type': tipoConteudo,
    });
  }

  obter(chave: string): Promise<Readable> {
    return this.cliente.getObject(this.bucket, chave);
  }

  remover(chave: string): Promise<void> {
    return this.cliente.removeObject(this.bucket, chave);
  }
}
