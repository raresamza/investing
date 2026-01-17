export declare class MailService {
    private transporter;
    constructor();
    sendVerificationEmail(to: string, subject: string, html: string): Promise<import("nodemailer/lib/smtp-transport").SentMessageInfo>;
}
