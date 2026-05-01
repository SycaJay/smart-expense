<?php

declare(strict_types=1);

final class SettlementEngine
{
    // Running balance per user: expenses + settlement payments so far.
    public static function balancesForPod(PDO $pdo, int $podId): array
    {
        $memberStmt = $pdo->prepare('SELECT user_id FROM pod_members WHERE pod_id = :pod_id');
        $memberStmt->execute([':pod_id' => $podId]);
        $memberIdsRaw = $memberStmt->fetchAll(PDO::FETCH_COLUMN);
        $balances = [];
        foreach ($memberIdsRaw as $uidRaw) {
            $balances[(int) $uidRaw] = 0.0;
        }

        $expenseStmt = $pdo->prepare(
            'SELECT expense_id, amount, paid_by_user_id
             FROM expenses
             WHERE pod_id = :pod_id'
        );
        $expenseStmt->execute([':pod_id' => $podId]);
        $expenses = $expenseStmt->fetchAll();

        $participantsStmt = $pdo->prepare(
            'SELECT user_id, weight
             FROM expense_participants
             WHERE expense_id = :expense_id'
        );

        foreach ($expenses as $expense) {
            $expenseId = (int) $expense['expense_id'];
            $amount = (float) $expense['amount'];
            $paidBy = (int) $expense['paid_by_user_id'];
            if (!isset($balances[$paidBy])) {
                $balances[$paidBy] = 0.0;
            }

            $participantsStmt->execute([':expense_id' => $expenseId]);
            $parts = $participantsStmt->fetchAll();
            $totalWeight = 0.0;
            foreach ($parts as $part) {
                $totalWeight += max(0.0, (float) $part['weight']);
            }
            if ($totalWeight <= 0.0) {
                continue;
            }

            foreach ($parts as $part) {
                $uid = (int) $part['user_id'];
                $weight = max(0.0, (float) $part['weight']);
                $share = self::round2($amount * ($weight / $totalWeight));
                if (!isset($balances[$uid])) {
                    $balances[$uid] = 0.0;
                }
                if ($uid === $paidBy) {
                    $balances[$uid] = self::round2($balances[$uid] + ($amount - $share));
                } else {
                    $balances[$uid] = self::round2($balances[$uid] - $share);
                }
            }
        }

        $payStmt = $pdo->prepare(
            'SELECT pr.payer_user_id, pr.receiver_user_id, pr.amount
             FROM payment_records pr
             INNER JOIN settlement_transfers st ON st.transfer_id = pr.transfer_id
             INNER JOIN settlement_plans sp ON sp.settlement_plan_id = st.settlement_plan_id
             WHERE sp.pod_id = :pod_id'
        );
        $payStmt->execute([':pod_id' => $podId]);
        $payments = $payStmt->fetchAll();
        foreach ($payments as $payment) {
            $payer = (int) $payment['payer_user_id'];
            $receiver = (int) $payment['receiver_user_id'];
            $amount = self::round2((float) $payment['amount']);
            if (!isset($balances[$payer])) {
                $balances[$payer] = 0.0;
            }
            if (!isset($balances[$receiver])) {
                $balances[$receiver] = 0.0;
            }
            $balances[$payer] = self::round2($balances[$payer] + $amount);
            $balances[$receiver] = self::round2($balances[$receiver] - $amount);
        }

        return $balances;
    }

    // Greedy match: biggest debtors pay biggest creditors first.
    public static function minimizeTransfers(array $balances): array
    {
        $eps = 0.005;
        $creditors = [];
        $debtors = [];
        foreach ($balances as $uid => $balance) {
            if ($balance > $eps) {
                $creditors[] = ['user_id' => (int) $uid, 'value' => (float) $balance];
            } elseif ($balance < -$eps) {
                $debtors[] = ['user_id' => (int) $uid, 'value' => (float) abs($balance)];
            }
        }

        usort(
            $creditors,
            static fn(array $a, array $b): int => ($b['value'] <=> $a['value'])
        );
        usort(
            $debtors,
            static fn(array $a, array $b): int => ($b['value'] <=> $a['value'])
        );

        $out = [];
        $i = 0;
        $j = 0;
        while ($i < count($debtors) && $j < count($creditors)) {
            $pay = min((float) $debtors[$i]['value'], (float) $creditors[$j]['value']);
            $amount = self::round2($pay);
            if ($amount >= 0.01) {
                $out[] = [
                    'from_user_id' => (int) $debtors[$i]['user_id'],
                    'to_user_id' => (int) $creditors[$j]['user_id'],
                    'amount' => $amount,
                ];
            }
            $debtors[$i]['value'] = self::round2((float) $debtors[$i]['value'] - $pay);
            $creditors[$j]['value'] = self::round2((float) $creditors[$j]['value'] - $pay);
            if ((float) $debtors[$i]['value'] < $eps) {
                $i++;
            }
            if ((float) $creditors[$j]['value'] < $eps) {
                $j++;
            }
        }

        return $out;
    }

    public static function createOpenPlan(PDO $pdo, int $podId, int $createdByUserId, array $transfers): int
    {
        $closeStmt = $pdo->prepare(
            'UPDATE settlement_plans
             SET status = "cancelled"
             WHERE pod_id = :pod_id
               AND status = "open"'
        );
        $closeStmt->execute([':pod_id' => $podId]);

        $createStmt = $pdo->prepare(
            'INSERT INTO settlement_plans (pod_id, created_by_user_id, status)
             VALUES (:pod_id, :created_by_user_id, "open")'
        );
        $createStmt->execute([
            ':pod_id' => $podId,
            ':created_by_user_id' => $createdByUserId,
        ]);
        $planId = (int) $pdo->lastInsertId();

        if ($transfers !== []) {
            $transferStmt = $pdo->prepare(
                'INSERT INTO settlement_transfers (settlement_plan_id, from_user_id, to_user_id, amount, status)
                 VALUES (:plan_id, :from_user_id, :to_user_id, :amount, "pending")'
            );
            foreach ($transfers as $transfer) {
                $transferStmt->execute([
                    ':plan_id' => $planId,
                    ':from_user_id' => $transfer['from_user_id'],
                    ':to_user_id' => $transfer['to_user_id'],
                    ':amount' => self::round2((float) $transfer['amount']),
                ]);
            }
        }

        return $planId;
    }

    public static function closePlanIfSettled(PDO $pdo, int $settlementPlanId): bool
    {
        $pendingStmt = $pdo->prepare(
            'SELECT COUNT(*) AS pending_count
             FROM settlement_transfers
             WHERE settlement_plan_id = :plan_id
               AND status = "pending"'
        );
        $pendingStmt->execute([':plan_id' => $settlementPlanId]);
        $pendingCount = (int) ($pendingStmt->fetchColumn() ?: 0);

        if ($pendingCount > 0) {
            return false;
        }

        $closeStmt = $pdo->prepare(
            'UPDATE settlement_plans
             SET status = "closed"
             WHERE settlement_plan_id = :plan_id
               AND status = "open"'
        );
        $closeStmt->execute([':plan_id' => $settlementPlanId]);
        return true;
    }

    private static function round2(float $value): float
    {
        return round($value, 2);
    }
}
