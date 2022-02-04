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

#### Syncronously:

```typescript
import { AppService } from './app.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [KinesisProducerModule.forRoot(new Kinesis())],
  providers: [AppService],
})
export class AppModule {}
```

#### Asyncronously:

```typescript
import { AppService } from './app.service';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
      KinesisProducerModule.forRootAsync({
        useFactory: (cfg: ConfigService) => new Kinesis({credentials: cfg.getCreds()}),
        inject: [ConfigService],
        imports: [ConfigModule],
      }),
    ),
  ],
  providers: [AppService],
})
export class AppModule {}
```

### Use the Publisher

```typescript
import { hash } from 'crypto';
import { RetryingBatchKinesisPublisher } from "nest-kinesis-producer";


export class AppService {
  constructor(private readonly kinesisPublisher: RetryingBatchKinesisPublisher){}

  public async sendToKinesis(messages: string[]): Promise<void> {
    const events = messages.map((x) => {
      return {
        PartitionKey: this.getPartitionKey(x),
        Data: x
      };
    });
    await this.kinesisPublisher.putRecords('fakeStreamName', events);
  }

  public getPartitionKey(mesage: string): string {
    ...
  }
}
```

An example of sending JSON data, notice message not encoded prior to `putRecords()`
```typescript
import { hash } from 'crypto';
import { RetryingBatchKinesisPublisher } from "nest-kinesis-producer";
import { v4 as uuidv4 } from 'uuid';


export class AppService {
  constructor(private readonly kinesisPublisher: RetryingBatchKinesisPublisher){}

  public async sendToKinesis(messages: any[]): Promise<void> {
    const events = messages.map((x) => {
      return {
        PartitionKey: uuidv4(),
        Data: JSON.stringify(data),
      };
    });
    await this.kinesisPublisher.putRecords('fakeStreamName', events);
  }

  public getPartitionKey(mesage: string): string {
    ...
  }
}
```

## VSCode debug testing

Migrating husky v4 -> v7
https://github.com/typicode/husky/issues/854#issuecomment-776126582
https://github.com/typicode/husky-4-to-7

`launch.json

```json
{
  // Use IntelliSense to learn about possible attributes.
  // Hover to view descriptions of existing attributes.
  // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "name": "vscode-jest-tests",
      "request": "launch",
      "args": ["--runInBand"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "disableOptimisticBPs": true,
      "program": "${workspaceFolder}/node_modules/jest/bin/jest",
      "outputCapture": "std",
      "skipFiles": [
        "${workspaceFolder}/node_modules/**/*.js",
        "${workspaceFolder}/lib/**/*.js",
        "<node_internals>/**/*.js"
      ]
    }
  ]
}
```

## Support

Pull requests are welcome. Please remember that commits must be made using Angular [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-angular)

## Stay in touch

- Author - [Benjamin Main](mailto::bam036036@gmail.com)
- Twitter - [@Ben05920582](https://twitter.com/https://twitter.com/Ben05920582)

## License

Nest-Kinesis-Producer is [MIT licensed](LICENSE).
