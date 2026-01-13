import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { ENVIROMENTS } from 'src/config';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly resend: Resend;
  constructor() {
    this.resend = new Resend(ENVIROMENTS.RESEND_API_KEY);
  }

  async sendEmail(to: string, subject: string, html: string) {
    return await this.resend.emails.send({
      from: `Miyoru <${ENVIROMENTS.RESEND_FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
  }
}
