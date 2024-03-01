import { AsyncProvider, ImportableFactoryProvider } from './async-types';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { KINESIS, NEST_KINESIS_PUBLISHER_CONFIG } from './constants';

import { BatchKinesisPublisher } from './batch-kinesis-publisher';
import { Kinesis } from '@aws-sdk/client-kinesis';
import { KinesisPublisherModuleOptions } from './module-config';
import { RetryingBatchKinesisPublisher } from './retrying-batch-kinesis-publisher';

@Global()
@Module({})
export class KinesisProducerModule {
  static forRoot(
    kinesis: Kinesis,
    options: Partial<KinesisPublisherModuleOptions> = {
      enableDebugLogs: true,
    },
  ): DynamicModule {
    return {
      module: KinesisProducerModule,
      providers: [
        BatchKinesisPublisher,
        RetryingBatchKinesisPublisher,
        {
          provide: KINESIS,
          useValue: kinesis,
        },
        {
          provide: NEST_KINESIS_PUBLISHER_CONFIG,
          useValue: new KinesisPublisherModuleOptions(options),
        },
      ],
      exports: [RetryingBatchKinesisPublisher, NEST_KINESIS_PUBLISHER_CONFIG],
    };
  }

  static forRootAsync(
    kinesisProvider: AsyncProvider<Kinesis | Promise<Kinesis>>,
    options: AsyncProvider<
      | Partial<KinesisPublisherModuleOptions>
      | Promise<Partial<KinesisPublisherModuleOptions>>
    >,
  ) {
    const module: DynamicModule = {
      global: true,
      module: KinesisProducerModule,
      imports: [],
      providers: [
        BatchKinesisPublisher,
        RetryingBatchKinesisPublisher,
        {
          provide: NEST_KINESIS_PUBLISHER_CONFIG,
          useFactory: async (
            config: Partial<KinesisPublisherModuleOptions>,
          ) => {
            return new KinesisPublisherModuleOptions(config);
          },
          inject: [NEST_KINESIS_PUBLISHER_CONFIG],
        },
      ],
      exports: [RetryingBatchKinesisPublisher, NEST_KINESIS_PUBLISHER_CONFIG],
    };
    this.addAsyncProvider(module, KINESIS, kinesisProvider, false);
    this.addAsyncProvider(
      module,
      NEST_KINESIS_PUBLISHER_CONFIG,
      options,
      false,
    );
    return module;
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
