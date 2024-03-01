import { KINESIS, NEST_KINESIS_PUBLISHER_CONFIG } from './constants';
import { Test, TestingModule } from '@nestjs/testing';

import { BatchKinesisPublisher } from './batch-kinesis-publisher';
import { KinesisEvent } from './kinesis-event.interface';
import { KinesisPublisherModuleOptions } from './module-config';
import {
  Kinesis,
  PutRecordsCommandInput,
  PutRecordsCommandOutput,
} from '@aws-sdk/client-kinesis';
import { TestSupport } from './test-support';

describe('BatchKinesisPublisher', () => {
  let provider: BatchKinesisPublisher;
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
        BatchKinesisPublisher,
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
    provider = module.get<BatchKinesisPublisher>(BatchKinesisPublisher);
    kinesisService = module.get(KINESIS);
    putRecordsMock = jest.spyOn(kinesisService, 'putRecords') as any;
    testSupport = new TestSupport();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
  it('putRecords(): should put records', async () => {
    const record: KinesisEvent = testSupport.generateKinesisEvent();
    putRecordsMock.mockResolvedValue(
      testSupport.generatePutRecordsCommandOutput(),
    );
    await provider.putRecords('fake', [record]);
    expect(putRecordsMock).toHaveBeenCalledTimes(1);
  });

  it('putRecords(): should put records', async () => {
    const record: KinesisEvent = {
      Data: Buffer.from(JSON.stringify({ Ben: 'Is Awesome!' }), 'utf8') as any,
      PartitionKey: '1',
    };
    putRecordsMock.mockResolvedValue(
      testSupport.generatePutRecordsCommandOutput(),
    );
    await provider.putRecords('fake', [record]);
    expect(putRecordsMock).toHaveBeenCalledTimes(1);
  });
  it('putRecords(): should error when non-string/buffer sent to put records', async () => {
    const record: KinesisEvent = {
      Data: { Ben: 'Is Awesome!' } as any,
      PartitionKey: '1',
    };
    putRecordsMock.mockResolvedValue(
      testSupport.generatePutRecordsCommandOutput(),
    );
    try {
      await provider.putRecords('fake', [record]);
    } catch (ex) {
      expect(putRecordsMock).toHaveBeenCalledTimes(0);
      expect(ex.message).toEqual(
        'Unable to transform event Data into buffer to send to kinesis.',
      );
    }
  });
});
