import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class Device extends Model {
  static table = 'devices';

  @field('ip') ip!: string;
  @field('mac') mac?: string;
  @field('hostname') hostname?: string;
  @field('device_type') deviceType!: string;
  @field('discovered_via') discoveredVia!: string;
  @date('last_seen') lastSeen!: Date;
}