import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { mySchema } from './schema';
import Device from './models/Device';
import Report from './models/Report';
import Outbox from './models/Outbox';

const adapter = new LokiJSAdapter({
  schema: mySchema,
  useWebWorker: false,
  useIncrementalIndexedDB: false,
});

export const database = new Database({
  adapter,
  modelClasses: [Device, Report, Outbox],
});
