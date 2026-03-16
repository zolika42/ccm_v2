<?php

declare(strict_types=1);

/**
 * @fileoverview Authentication application service built around customer records and session state.
 */

namespace ColumbiaGames\Api\Services;

use ColumbiaGames\Api\Repositories\CustomerRepository;
use ColumbiaGames\Api\Support\SessionAuth;
use DomainException;
use RuntimeException;

final class AuthService
{
    public function __construct(private readonly CustomerRepository $customers)
    {
    }

    public function login(string $email, string $password, bool $rememberMe = false, ?string $browserId = null): array
    {
        $customer = $this->customers->findByEmail($email);
        if ($customer === null) {
            throw new RuntimeException('Invalid credentials.');
        }

        $legacyPassword = (string) ($customer['customer_password'] ?? '');
        if ($legacyPassword !== $password) {
            throw new RuntimeException('Invalid credentials.');
        }

        SessionAuth::login($customer, $rememberMe, $browserId);
        return $this->me() ?? [];
    }

    public function register(array $input, bool $rememberMe = false, ?string $browserId = null): array
    {
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        if ($this->customers->emailExists($email)) {
            throw new DomainException('A customer with this email already exists.');
        }

        $created = $this->customers->createCustomer($input);
        SessionAuth::login($created, $rememberMe, $browserId);
        return $this->me() ?? [];
    }

    public function logout(): void
    {
        SessionAuth::logout();
    }

    public function me(): ?array
    {
        $sessionUser = SessionAuth::user();
        if ($sessionUser === null) {
            return null;
        }

        $customer = $this->customers->findPublicProfileById((int) $sessionUser['customerid']);
        if ($customer === null) {
            SessionAuth::logout();
            return null;
        }

        return $this->mapPublicUser($customer);
    }

    public function updateProfile(array $input): array
    {
        $sessionUser = SessionAuth::user();
        if ($sessionUser === null) {
            throw new RuntimeException('Not authenticated.');
        }

        $customerId = (int) ($sessionUser['customerid'] ?? 0);
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        if ($this->customers->emailExists($email, $customerId)) {
            throw new DomainException('A different customer already uses this email.');
        }

        $updated = $this->customers->updateProfile($customerId, $input);
        if ($updated === null) {
            throw new RuntimeException('Customer profile could not be saved.');
        }

        SessionAuth::refreshProfile($updated);
        return $this->mapPublicUser($updated);
    }

    public function changePassword(string $currentPassword, string $newPassword): void
    {
        $sessionUser = SessionAuth::user();
        if ($sessionUser === null) {
            throw new RuntimeException('Not authenticated.');
        }

        $customerId = (int) ($sessionUser['customerid'] ?? 0);
        $profile = $this->customers->findPublicProfileById($customerId);
        if ($profile === null) {
            throw new RuntimeException('Authenticated customer no longer exists.');
        }

        $current = $this->customers->findByEmail((string) ($profile['ship_email'] ?? ''));
        if ($current === null) {
            throw new RuntimeException('Authenticated customer no longer exists.');
        }

        $legacyPassword = (string) ($current['customer_password'] ?? '');
        if ($legacyPassword !== $currentPassword) {
            throw new RuntimeException('Current password is incorrect.');
        }

        $this->customers->updatePassword($customerId, $newPassword);
    }

    private function mapPublicUser(array $customer): array
    {
        return [
            'customerId' => (int) $customer['customerid'],
            'email' => (string) ($customer['ship_email'] ?? ''),
            'name' => (string) ($customer['ship_name'] ?? ''),
            'points' => (int) ($customer['points'] ?? 0),
            'shipPhone' => (string) ($customer['ship_phone'] ?? ''),
            'shipStreet' => (string) ($customer['ship_street'] ?? ''),
            'shipStreet2' => (string) ($customer['ship_street2'] ?? ''),
            'shipCity' => (string) ($customer['ship_city'] ?? ''),
            'shipState' => (string) ($customer['ship_state'] ?? ''),
            'shipZip' => (string) ($customer['ship_zip'] ?? ''),
            'shipCountry' => (string) ($customer['ship_country'] ?? ''),
            'billName' => (string) ($customer['bill_name'] ?? ''),
            'billStreet' => (string) ($customer['bill_street'] ?? ''),
            'billStreet2' => (string) ($customer['bill_street2'] ?? ''),
            'billCity' => (string) ($customer['bill_city'] ?? ''),
            'billState' => (string) ($customer['bill_state'] ?? ''),
            'billZip' => (string) ($customer['bill_zip'] ?? ''),
            'billCountry' => (string) ($customer['bill_country'] ?? ''),
            'payCardType' => (string) ($customer['pay_cardtype'] ?? ''),
            'payCardMonth' => (string) ($customer['pay_cardmonth'] ?? ''),
            'payCardYear' => (string) ($customer['pay_cardyear'] ?? ''),
            'payCardName' => (string) ($customer['pay_cardname'] ?? ''),
            'payCardLast4' => (string) ($customer['pay_card_last4'] ?? ''),
            'authPersistence' => SessionAuth::persistenceMode(),
            'browserId' => SessionAuth::browserId(),
        ];
    }
}
