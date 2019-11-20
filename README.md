<p align="center">
  <img src="https://cdn-images-1.medium.com/max/1600/0*UQBKjEff1uIsXH8W" width="320" alt="Kinesis Logo" />
</p>

## Description

An effficient <a href="https://docs.nestjs.com/" target="blank">Nest.js</a> Kinesis Producer based on Kevin Deng's <a href="https://aws.amazon.com/blogs/big-data/implementing-efficient-and-reliable-producers-with-the-amazon-kinesis-producer-library/">blog piece</a>

## Installation

```bash
$ npm install nest-kinesis-producer
```

## Adding the Global Module

Add the Kinesis Producer to your App Module imports. It will register globally.

```typescript
import { Module } from '@nestjs/common';
import { AppService } from './app.service';

@Module({
  imports: [KinesisProducerModule.forRoot(new Kinesis())],
  providers: [AppService],
})
export class AppModule {}
```

### Use the Publisher

```typescript
import { hash } from 'crypto';
export class AppService {
  constructor(private readonly kinesisPublisher: RetryingBatchKinesisPublisher){}

  public async sendToKinesis(messages: string[]): Promise<void> {
    const events = messages.map(x => new KinesisEvent(this.getPartitionKey(x), x));
    await this.kinesisPublisher.putRecords('fakeStreamName', events);
  }

  public getPartitionKey(mesage: string): string {
    ...
  }
}

```

## Support

Pull requests are welcome. Please remember that commits must be made using Angular [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular)

## Stay in touch

- Author - [Benjamin Main](mailto::bam036036@gmail.com)
- Twitter - [@Ben05920582](https://twitter.com/https://twitter.com/Ben05920582)

## License

Nest-Kinesis-Producer is [MIT licensed](LICENSE).
