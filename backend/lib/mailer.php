<?php

declare(strict_types=1);

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

$vendorAutoload = dirname(__DIR__, 2) . '/vendor/autoload.php';
if (!is_file($vendorAutoload)) {
    error_log('Missing Composer autoload file at: ' . $vendorAutoload);
    return;
}

require_once $vendorAutoload;

final class Mailer
{
    private static function env(string $key, string $default = ''): string
    {
        $value = getenv($key);
        if ($value === false || $value === null || $value === '') {
            return $default;
        }

        return (string) $value;
    }

    public static function send(
        string $to,
        string $name,
        string $subject,
        string $body,
        string $plainTextBody = ''
    ): bool {
        $mail = new PHPMailer(true);
        $host = self::env('MAIL_HOST', 'smtp.gmail.com');
        $username = self::env('MAIL_USERNAME');
        $password = self::env('MAIL_PASSWORD');
        $port = (int) self::env('MAIL_PORT', '587');
        $fromAddress = self::env('MAIL_FROM_ADDRESS', $username);
        $fromName = self::env('MAIL_FROM_NAME', 'Smart Expense Team');

        if ($username === '' || $password === '' || $fromAddress === '') {
            error_log('Mailer is not configured. Missing MAIL_USERNAME / MAIL_PASSWORD / MAIL_FROM_ADDRESS.');
            return false;
        }

        try {
            $mail->isSMTP();
            $mail->Host = $host;
            $mail->SMTPAuth = true;
            $mail->Username = $username;
            $mail->Password = $password;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = $port;

            $mail->setFrom($fromAddress, $fromName);
            $mail->addAddress($to, $name);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $body;
            $mail->AltBody = $plainTextBody;

            $mail->send();
            return true;
        } catch (Exception $e) {
            error_log('Email could not be sent. Error: ' . $mail->ErrorInfo);
            return false;
        }
    }
}