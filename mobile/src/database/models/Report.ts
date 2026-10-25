import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class Report extends Model {
  static table = 'reports';

  @field('technician_name') technicianName!: string;
  @field('device_ip') deviceIp!: string;
  @field('device_mac') deviceMac?: string;
  @field('qr_code') qrCode?: string;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('notes') notes!: string;
  @field('photo_uri') photoUri?: string;
  @field('pdf_path') pdfPath?: string;
  @date('created_at') createdAt!: Date;
  @field('is_synced') isSynced!: boolean;
}