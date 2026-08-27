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
    this.bucket = config.get<string>('MINIO_BUCKET') ?? 'locafacil';

    this.cliente = new Client({
      endPoint: config.getOrThrow<string>('MINIO_ENDPOINT'),
      port: Number(config.get<string>('MINIO_PORT') ?? 9000),
      useSSL: config.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: config.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: config.getOrThrow<string>('MINIO_SECRET_KEY'),
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      if (!(await this.cliente.bucketExists(this.bucket))) {
        await this.cliente.makeBucket(this.bucket);
        this.logger.log(`Bucket "${this.bucket}" criado`);
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
