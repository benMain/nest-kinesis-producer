import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { Kinesis } from '@aws-sdk/client-kinesis';
import { KinesisProducerModule } from './kinesis-producer.module';
import { KinesisPublisherModuleOptions } from './module-config';
import { RetryingBatchKinesisPublisher } from './retrying-batch-kinesis-publisher';

describe('RetryingBatchKinesisPublisher', () => {
  let asyncProvider: RetryingBatchKinesisPublisher;
  let syncProvider: RetryingBatchKinesisPublisher;

  beforeEach(async () => {
    const asyncModule: TestingModule = await Test.createTestingModule({
      imports: [
        KinesisProducerModule.forRootAsync(
          {
            useFactory: () => new Kinesis(),
            inject: [ConfigService],
            imports: [ConfigModule],
          },
          {
            useValue: new KinesisPublisherModuleOptions({
              enableDebugLogs: true,
            }),
          },
        ),
      ],
    }).compile();

    const syncModule: TestingModule = await Test.createTestingModule({
      imports: [
        KinesisProducerModule.forRoot(new Kinesis(), { enableDebugLogs: true }),
      ],
    }).compile();

    asyncProvider = asyncModule.get<RetryingBatchKinesisPublisher>(
      RetryingBatchKinesisPublisher,
    );
    syncProvider = syncModule.get<RetryingBatchKinesisPublisher>(
      RetryingBatchKinesisPublisher,
    );
  });

  it('should setup the module correctly async', async () => {
    expect(asyncProvider.kinesis).toBeTruthy();
    expect(asyncProvider.kinesis.putRecords).toBeTruthy();
  });

  it('should setup the module correctly sync', async () => {
    expect(syncProvider.kinesis).toBeTruthy();
    expect(syncProvider.kinesis.putRecords).toBeTruthy();
  });
});
