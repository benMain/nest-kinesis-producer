import { AWSError, Kinesis, Request } from 'aws-sdk';
import { KINESIS, NEST_KINESIS_PUBLISHER_CONFIG } from './constants';
import { Test, TestingModule } from '@nestjs/testing';

import { BatchKinesisPublisher } from './batch-kinesis-publisher';
import { KinesisEvent } from './kinesis-event.interface';
import { KinesisPublisherModuleOptions } from './module-config';
import { PutRecordsOutput } from 'aws-sdk/clients/kinesis';
import { TestSupport } from './test-support';

describe('BatchKinesisPublisher', () => {
  let provider: BatchKinesisPublisher;
  let kinesisService: Kinesis;
  let putRecordsMock: jest.SpyInstance<Request<PutRecordsOutput, AWSError>>;
  let testSupport: TestSupport;
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
          useValue: new KinesisPublisherModuleOptions({ enableDebugLogs: true }),
        },
      ],
    }).compile();
    provider = module.get<BatchKinesisPublisher>(BatchKinesisPublisher);
    kinesisService = module.get(KINESIS);
    putRecordsMock = jest.spyOn(kinesisService, 'putRecords');
    testSupport = new TestSupport();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
  it('putRecords(): should put records', async () => {
    const record: KinesisEvent = testSupport.generateKinesisEvent();
    const mockResponse: Request<PutRecordsOutput, AWSError> = testSupport.generatePutRecordsRequest(true);
    putRecordsMock.mockImplementation(() => mockResponse);
    await provider.putRecords('fake', [record]);
    expect(putRecordsMock).toHaveBeenCalledTimes(1);
  });

  it('putRecords(): should put records', async () => {
    const record: KinesisEvent = {
      Data: Buffer.from(JSON.stringify({ Ben: 'Is Awesome!' }), 'utf8') as any,
      PartitionKey: '1',
    };
    const mockResponse: Request<PutRecordsOutput, AWSError> = testSupport.generatePutRecordsRequest(true);
    putRecordsMock.mockImplementation(() => mockResponse);
    await provider.putRecords('fake', [record]);
    expect(putRecordsMock).toHaveBeenCalledTimes(1);
  });
  it('putRecords(): should error when non-string/buffer sent to put records', async () => {
    const record: KinesisEvent = {
      Data: { Ben: 'Is Awesome!' } as any,
      PartitionKey: '1',
    };
    const mockResponse: Request<PutRecordsOutput, AWSError> = testSupport.generatePutRecordsRequest(true);
    putRecordsMock.mockImplementation(() => mockResponse);
    try {
      await provider.putRecords('fake', [record]);
    } catch (ex) {
      expect(putRecordsMock).toHaveBeenCalledTimes(0);
      expect(ex.message).toEqual('Unable to transform event Data into buffer to send to kinesis.');
    }
  });
});
