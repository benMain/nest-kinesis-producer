import { DynamicModule, Global, Module } from '@nestjs/common';

import { BatchKinesisPublisher } from './batch-kinesis-publisher';
import { Kinesis } from 'aws-sdk';
import { RetryingBatchKinesisPublisher } from './retrying-batch-kinesis-publisher';
import { AsyncProvider, ImportableFactoryProvider } from './async-types';

@Global()
@Module({})
export class KinesisProducerModule {
  static forRoot(kinesis: Kinesis): DynamicModule {
    return {
      module: KinesisProducerModule,
      providers: [
        BatchKinesisPublisher,
        RetryingBatchKinesisPublisher,
        {
          provide: Kinesis,
          useValue: kinesis,
        },
      ],
      exports: [RetryingBatchKinesisPublisher],
    };
  }

  static forRootAsync(kinesisProvider: AsyncProvider<Kinesis | Promise<Kinesis>>) {
    const module: DynamicModule = {
      global: true,
      module: KinesisProducerModule,
      imports: [],
      providers: [
        BatchKinesisPublisher,
        RetryingBatchKinesisPublisher,
      ],
      exports: [RetryingBatchKinesisPublisher],
    };
    this.addAsyncProvider(module, Kinesis, kinesisProvider, false);
    return module
  }

  private static addAsyncProvider<T>(
    module: DynamicModule,
    provide: string | (new () => T),
    asyncProvider: AsyncProvider<T | Promise<T>>,
    exportable: boolean,
  ) {
    const imports = (asyncProvider as ImportableFactoryProvider<T>).imports;
    if (imports?.length) {
      imports.forEach((i) => module.imports.push(i));
    }
    delete (asyncProvider as ImportableFactoryProvider<T>).imports;

    module.providers.push({
      ...asyncProvider,
      provide,
    });

    if (exportable) {
      module.exports.push(provide);
    }
  }
}
