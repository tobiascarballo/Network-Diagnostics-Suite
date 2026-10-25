import { Database } from '@nozbe/watermelondb';
import { mySchema } from './schema';
import Device from './models/Device';
import Report from './models/Report';
import Outbox from './models/Outbox';

let adapter: any;

try {
  const SQLiteAdapter = require('@nozbe/watermelondb/adapters/sqlite').default || require('@nozbe/watermelondb/adapters/sqlite');
  adapter = new SQLiteAdapter({
    schema: mySchema,
    jsi: false,
    onSetUpError: (error: any) => {
      console.warn('[WatermelonDB SQLite Error]:', error);
    },
  });
} catch (_) {
  // Fallback si no está compilado el driver nativo SQLite (Expo Go / Web)
  const LokiJSAdapter = require('@nozbe/watermelondb/adapters/lokijs').default || require('@nozbe/watermelondb/adapters/lokijs');
  adapter = new LokiJSAdapter({
    schema: mySchema,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
  });
}

export const database = new Database({
  adapter,
  modelClasses: [Device, Report, Outbox],
});