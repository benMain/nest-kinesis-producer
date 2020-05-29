import { AWSError, Kinesis, Request } from 'aws-sdk';
import { Test, TestingModule } from '@nestjs/testing';

import { KinesisEvent } from './kinesis-event.interface';
import { PutRecordsOutput } from 'aws-sdk/clients/kinesis';
import { RetryingBatchKinesisPublisher } from './retrying-batch-kinesis-publisher';
import { TestSupport } from './test-support';

describe('RetryingBatchKinesisPublisher', () => {
  let provider: RetryingBatchKinesisPublisher;
  let kinesisService: Kinesis;
  let putRecordsMock: jest.SpyInstance<Request<PutRecordsOutput, AWSError>>;
  let testSupport: TestSupport;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetryingBatchKinesisPublisher,
        {
          provide: Kinesis,
          useFactory: () => new Kinesis(),
        },
      ],
    }).compile();

    provider = module.get<RetryingBatchKinesisPublisher>(RetryingBatchKinesisPublisher);
    kinesisService = module.get<Kinesis>(Kinesis);
    putRecordsMock = jest.spyOn(kinesisService, 'putRecords');
    testSupport = new TestSupport();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
  it('putRecords(): should retry on retryable failure', async () => {
    const record: KinesisEvent = testSupport.generateKinesisEvent();
    const failedResponse: Request<PutRecordsOutput, AWSError> = testSupport.generatePutRecordsRequest(false);
    const successfulResponse: Request<PutRecordsOutput, AWSError> = testSupport.generatePutRecordsRequest(true);
    putRecordsMock.mockImplementationOnce(() => failedResponse);
    putRecordsMock.mockImplementationOnce(() => successfulResponse);
    await provider.putRecords('fake', [record]);
    expect(putRecordsMock).toHaveBeenCalledTimes(2);
  });
  it('putRecords(): should handle individual retryable record failures', async () => {
    const record: KinesisEvent = testSupport.generateKinesisEvent();
    const retryableResponse: Request<
      PutRecordsOutput,
      AWSError
    > = testSupport.generatePutRecordsRequestIndividualFailure();
    const successfulResponse: Request<PutRecordsOutput, AWSError> = testSupport.generatePutRecordsRequest(true);
    putRecordsMock.mockImplementationOnce(() => retryableResponse);
    putRecordsMock.mockImplementationOnce(() => successfulResponse);
    await provider.putRecords('fake', [record]);
    expect(putRecordsMock).toHaveBeenCalledTimes(2);
  });
  it('putRecords(): should put records', async () => {
    const record: KinesisEvent = testSupport.generateKinesisEvent();
    const mockResponse: Request<PutRecordsOutput, AWSError> = testSupport.generatePutRecordsRequest(true);
    putRecordsMock.mockImplementation(() => mockResponse);
    await provider.putRecords('fake', [record]);
    expect(putRecordsMock).toHaveBeenCalledTimes(1);
  });
});
