<?php

declare(strict_types=1);

$user = Http::requireAuthUser();
Http::json([
    'ok' => true,
    'data' => $user,
]);
