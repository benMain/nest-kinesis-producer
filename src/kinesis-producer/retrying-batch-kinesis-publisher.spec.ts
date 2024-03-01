import { KINESIS, NEST_KINESIS_PUBLISHER_CONFIG } from './constants';
import { Test, TestingModule } from '@nestjs/testing';
import { KinesisEvent } from './kinesis-event.interface';
import { KinesisPublisherModuleOptions } from './module-config';
import { RetryingBatchKinesisPublisher } from './retrying-batch-kinesis-publisher';
import { TestSupport } from './test-support';
import {
  Kinesis,
  PutRecordsCommandInput,
  PutRecordsCommandOutput,
} from '@aws-sdk/client-kinesis';

describe('RetryingBatchKinesisPublisher', () => {
  let provider: RetryingBatchKinesisPublisher;
  let kinesisService: Kinesis;
  let testSupport: TestSupport;
  let putRecordsMock: jest.SpyInstance<
    Promise<PutRecordsCommandOutput>,
    [args: PutRecordsCommandInput, options: any],
    any
  >;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetryingBatchKinesisPublisher,
        {
          provide: KINESIS,
          useFactory: () => new Kinesis(),
        },
        {
          provide: NEST_KINESIS_PUBLISHER_CONFIG,
          useValue: new KinesisPublisherModuleOptions({
            enableDebugLogs: true,
          }),
        },
      ],
    }).compile();

    provider = module.get<RetryingBatchKinesisPublisher>(
      RetryingBatchKinesisPublisher,
    );
    kinesisService = module.get(KINESIS);
    putRecordsMock = jest.spyOn(kinesisService, 'putRecords') as any;
    testSupport = new TestSupport();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
  it('putRecords(): should retry on retryable failure', async () => {
    const record: KinesisEvent = testSupport.generateKinesisEvent();
    putRecordsMock
      .mockResolvedValue(testSupport.generatePutRecordsCommandOutput())
      .mockRejectedValueOnce({
        statusCode: 500,
        message: 'This needs to be retried',
      } as any);
    await provider.putRecords('fake', [record]);
    expect(putRecordsMock).toHaveBeenCalledTimes(2);
  });
  it('putRecords(): should handle individual retryable record failures', async () => {
    const record: KinesisEvent = testSupport.generateKinesisEvent();
    putRecordsMock
      .mockResolvedValue(testSupport.generatePutRecordsCommandOutput())
      .mockResolvedValueOnce(
        testSupport.generateRetryableIndividualRecordFailure(),
      );
    await provider.putRecords('fake', [record]);
    expect(putRecordsMock).toHaveBeenCalledTimes(2);
  });
  it('putRecords(): should put records', async () => {
    const record: KinesisEvent = testSupport.generateKinesisEvent();
    putRecordsMock.mockResolvedValue(
      testSupport.generatePutRecordsCommandOutput(),
    );
    await provider.putRecords('fake', [record]);
    expect(putRecordsMock).toHaveBeenCalledTimes(1);
  });
});
