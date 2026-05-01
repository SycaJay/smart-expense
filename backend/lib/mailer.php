<?php

declare(strict_types=1);

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

$vendorAutoload = dirname(__DIR__, 2) . '/vendor/autoload.php';
if (!is_file($vendorAutoload)) {
    error_log('Composer autoload missing: ' . $vendorAutoload);
    return;
}

require_once $vendorAutoload;

final class Mailer
{
    private static string $lastError = '';

    private static function env(string $key, string $default = ''): string
    {
        $value = getenv($key);
        if ($value === false || $value === null || $value === '') {
            return $default;
        }

        return (string) $value;
    }

    public static function missingConfigKeys(): array
    {
        $required = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_FROM_ADDRESS'];
        $missing = [];
        foreach ($required as $key) {
            $value = trim(self::env($key));
            if ($value === '') {
                $missing[] = $key;
            }
        }

        return $missing;
    }

    public static function isConfigured(): bool
    {
        return self::missingConfigKeys() === [];
    }

    public static function lastError(): string
    {
        return self::$lastError;
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
            self::$lastError = 'Mailer is not configured. Check MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, and MAIL_FROM_ADDRESS.';
            error_log(self::$lastError);
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
            self::$lastError = '';
            return true;
        } catch (Exception $e) {
            self::$lastError = 'Email could not be sent. Error: ' . $mail->ErrorInfo;
            error_log(self::$lastError);
            return false;
        }
    }
}