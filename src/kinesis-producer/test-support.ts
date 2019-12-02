import { AWSError, Kinesis, Request } from 'aws-sdk';

import { KinesisEvent } from './kinesis-event.interface';
import { PromiseResult } from 'aws-sdk/lib/request';
import { PutRecordsOutput } from 'aws-sdk/clients/kinesis';

export class TestSupport {
  public generateKinesisEvent(): KinesisEvent {
    return {
      Data: JSON.stringify({ Ben: 'Is Awesome!' }),
      PartitionKey: '1',
    };
  }

  public generatePutRecordsRequest(
    isGood: boolean,
  ): Request<PutRecordsOutput, AWSError> {
    return {
      abort: null,
      createReadStream: null,
      eachPage: null,
      isPageable: null,
      send: null,
      on: null,
      onAsync: null,
      startTime: null,
      httpRequest: null,
      promise: isGood ? goodPromise : failPromise,
    };
  }

  public generatePutRecordsRequestIndividualFailure(): Request<
    PutRecordsOutput,
    AWSError
  > {
    const request = this.generatePutRecordsRequest(true);
    request.promise = retryablePromise;
    return request;
  }
}

const goodPromise = () =>
  new Promise<PromiseResult<PutRecordsOutput, AWSError>>(resolve =>
    resolve({
      Records: [{ ShardId: '1' }],
      $response: null,
    }),
  );

const failPromise = () =>
  new Promise<PromiseResult<PutRecordsOutput, AWSError>>((resolve, reject) =>
    reject({
      statusCode: 500,
      message: 'You Better Retry this server failure',
    }),
  );

const retryablePromise = () =>
  new Promise<PromiseResult<PutRecordsOutput, AWSError>>(resolve =>
    resolve({
      Records: [
        { ShardId: '1', ErrorCode: 'ProvisionedThroughputExceededException' },
      ],
      $response: null,
    }),
  );
