import { AWSError, Kinesis, Request } from 'aws-sdk';
import { Test, TestingModule } from '@nestjs/testing';

import { BatchKinesisPublisher } from './batch-kinesis-publisher';
import { KinesisEvent } from './kinesis-event.interface';
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
          provide: Kinesis,
          useFactory: () => new Kinesis(),
        },
      ],
    }).compile();
    provider = module.get<BatchKinesisPublisher>(BatchKinesisPublisher);
    kinesisService = module.get<Kinesis>(Kinesis);
    putRecordsMock = jest.spyOn(kinesisService, 'putRecords');
    testSupport = new TestSupport();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
  it('putRecords(): should put records', async () => {
    const record: KinesisEvent = testSupport.generateKinesisEvent();
    const mockResponse: Request<
      PutRecordsOutput,
      AWSError
    > = testSupport.generatePutRecordsRequest(true);
    putRecordsMock.mockImplementation(() => mockResponse);
    await provider.putRecords('fake', [record]);
    expect(putRecordsMock).toHaveBeenCalledTimes(1);
  });
});
