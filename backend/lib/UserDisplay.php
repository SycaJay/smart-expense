<?php

declare(strict_types=1);

final class UserDisplay
{
    public static function format(string $firstName, string $lastName): string
    {
        $first = trim($firstName);
        $last = trim($lastName);
        if ($first !== '' && $last !== '') {
            return $first . ' ' . $last;
        }

        return $first !== '' ? $first : $last;
    }

    /** @param array<string, mixed> $row */
    public static function fromUserRow(array $row): string
    {
        return self::format(
            (string) ($row['first_name'] ?? ''),
            (string) ($row['last_name'] ?? '')
        );
    }
}
