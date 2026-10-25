import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'devices',
      columns: [
        { name: 'ip', type: 'string' },
        { name: 'mac', type: 'string', isOptional: true },
        { name: 'hostname', type: 'string', isOptional: true },
        { name: 'device_type', type: 'string' },
        { name: 'discovered_via', type: 'string' },
        { name: 'last_seen', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'reports',
      columns: [
        { name: 'technician_name', type: 'string' },
        { name: 'device_ip', type: 'string' },
        { name: 'device_mac', type: 'string', isOptional: true },
        { name: 'qr_code', type: 'string', isOptional: true },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'notes', type: 'string' },
        { name: 'photo_uri', type: 'string', isOptional: true },
        { name: 'pdf_path', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'is_synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'outbox',
      columns: [
        { name: 'action_type', type: 'string' },
        { name: 'payload', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'retries', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});