import { Module, Global, DynamicModule } from '@nestjs/common';
import { BatchKinesisPublisher } from './batch-kinesis-publisher';
import { RetryingBatchKinesisPublisher } from './retrying-batch-kinesis-publisher';
import { Kinesis } from 'aws-sdk';

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
}
