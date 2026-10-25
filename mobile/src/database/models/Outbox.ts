import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class Outbox extends Model {
  static table = 'outbox';

  @field('action_type') actionType!: string;
  @field('payload') payload!: string;
  @field('status') status!: string; // 'pending' | 'processing' | 'failed'
  @field('retries') retries!: number;
  @date('created_at') createdAt!: Date;
}