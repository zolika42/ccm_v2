<?php

declare(strict_types=1);

/**
 * @fileoverview Checkout application service for summary, validation, and submit orchestration.
 */

namespace ColumbiaGames\Api\Services;

use ColumbiaGames\Api\Repositories\CartRepository;
use ColumbiaGames\Api\Repositories\CheckoutRepository;
use ColumbiaGames\Api\Repositories\CustomerRepository;
use ColumbiaGames\Api\Support\ApiLogger;
use ColumbiaGames\Api\Support\SessionAuth;

final class CheckoutService
{
    private const CARD_PAYMENT_TYPES = ['visa', 'mastercard', 'amex'];

    public function __construct(
        private readonly CartRepository $carts,
        private readonly CheckoutRepository $checkout,
        private readonly CustomerRepository $customers,
    ) {
    }

    public function summary(?string $cookieValue): array
    {
        $browserId = $this->carts->resolveBrowserId($cookieValue);
        $cart = $this->carts->getCart($browserId);
        $identity = $this->carts->getIdentity($browserId);

        return [
            'identity' => $identity,
            'checkout' => $this->buildCheckoutPayload($browserId, $cart, []),
        ];
    }

    public function validate(?string $cookieValue, array $input): array
    {
        $browserId = $this->carts->resolveBrowserId($cookieValue);
        $cart = $this->carts->getCart($browserId);
        $identity = $this->carts->getIdentity($browserId);

        return [
            'identity' => $identity,
            'checkout' => $this->buildCheckoutPayload($browserId, $cart, $input),
        ];
    }


    public function submit(?string $cookieValue, array $input): array
    {
        $browserId = $this->carts->resolveBrowserId($cookieValue);
        $cart = $this->carts->getCart($browserId);
        $checkout = $this->buildCheckoutPayload($browserId, $cart, $input);
        $identity = $this->carts->getIdentity($browserId);
        $customer = $checkout['customer'];

        if (!$checkout['validation']['isValid']) {
            ApiLogger::info('checkout_submit_rejected', [
                'browserId' => $browserId,
                'reason' => 'validation_failed',
                'errorKeys' => array_keys((array) ($checkout['validation']['errors'] ?? [])),
            ]);
            return [
                'identity' => $identity,
                'submitted' => false,
                'status' => 422,
                'checkout' => $checkout,
                'submission' => null,
            ];
        }

        if ($customer === null) {
            ApiLogger::info('checkout_submit_rejected', [
                'browserId' => $browserId,
                'reason' => 'unauthenticated',
            ]);
            return [
                'identity' => $identity,
                'submitted' => false,
                'status' => 401,
                'checkout' => $checkout,
                'submission' => null,
            ];
        }

        ApiLogger::info('checkout_submit_started', [
            'browserId' => $browserId,
            'customerId' => (int) ($customer['customerId'] ?? 0),
            'paymentType' => (string) ($checkout['draft']['paymentType'] ?? ''),
            'itemCount' => (int) (($cart['summary']['itemCount'] ?? 0)),
        ]);

        $this->checkout->beginStoreTransaction();
        $this->carts->beginTransaction();
        try {
            $storeSubmission = $this->checkout->submitToLegacyStore((int) $customer['customerId'], $checkout['draft'], $cart);
            $legacyOrder = $this->carts->submitOrderDraft(
                $browserId,
                $checkout['draft'],
                (int) $customer['customerId'],
                (int) ($customer['points'] ?? 0),
            );
            $this->checkout->commitStoreTransaction();
            $this->carts->commitTransaction();
            ApiLogger::info('checkout_submit_succeeded', [
                'browserId' => $browserId,
                'customerId' => (int) ($customer['customerId'] ?? 0),
                'orderId' => (string) ($storeSubmission['orderId'] ?? $legacyOrder['orderId'] ?? ''),
                'recordedItemCount' => (int) (($storeSubmission['store']['recordedItemCount'] ?? 0)),
            ]);
        } catch (\Throwable $e) {
            $this->checkout->rollBackStoreTransaction();
            $this->carts->rollBackTransaction();
            ApiLogger::error('checkout_submit_failed', [
                'browserId' => $browserId,
                'customerId' => (int) ($customer['customerId'] ?? 0),
                'message' => $e->getMessage(),
            ]);
            throw $e;
        }

        $postCart = $this->carts->getCart($browserId);
        $postIdentity = $this->carts->getIdentity($browserId);

        return [
            'identity' => $postIdentity,
            'submitted' => true,
            'status' => 200,
            'checkout' => $this->buildCheckoutPayload($browserId, $postCart, []),
            'submission' => [
                'orderId' => (string) ($legacyOrder['orderId'] ?? ''),
                'customerId' => (int) $customer['customerId'],
                'paymentType' => (string) ($checkout['draft']['paymentType'] ?? 'free'),
                'pointsApplied' => (int) ($checkout['draft']['pointsApplied'] ?? 0),
                'store' => $storeSubmission,
                'legacyOrder' => $legacyOrder,
                'postSubmitCart' => $postCart,
            ],
        ];
    }

    private function buildCheckoutPayload(string $browserId, array $cart, array $input): array
    {
        $orderId = trim((string) ($cart['orderId'] ?? '')) ?: null;
        $orderFields = $this->checkout->loadOrderFields($orderId);
        $browserStateFields = $this->checkout->loadBrowserStateFields($browserId);
        $customer = $this->loadCheckoutCustomer();
        $draft = $this->buildDraft($customer, $orderFields, $browserStateFields, $input);
        $requirements = $this->buildRequirements($cart, $customer);
        $validation = $this->validateDraft($cart, $customer, $draft, $requirements);
        $paymentConfig = $this->checkout->loadPaymentConfig(
            (string) ($browserStateFields['ec_m'] ?? 'cg'),
            (string) ($browserStateFields['ec_c'] ?? 'default'),
        );

        return [
            'orderId' => $orderId,
            'cart' => $cart,
            'customer' => $customer,
            'draft' => $draft,
            'requirements' => $requirements,
            'validation' => $validation,
            'paymentConfig' => $paymentConfig,
            'legacy' => [
                'orderFieldCount' => count($orderFields),
                'browserStateFieldCount' => count($browserStateFields),
                'storage' => (string) ($cart['storage'] ?? ''),
            ],
        ];
    }

    private function loadCheckoutCustomer(): ?array
    {
        $sessionUser = SessionAuth::user();
        if ($sessionUser === null) {
            return null;
        }

        $profile = $this->customers->findCheckoutProfileById((int) ($sessionUser['customerid'] ?? 0));
        if ($profile === null) {
            return null;
        }

        return [
            'customerId' => (int) ($profile['customerid'] ?? 0),
            'email' => (string) ($profile['ship_email'] ?? ''),
            'name' => (string) ($profile['ship_name'] ?? ''),
            'shipPhone' => (string) ($profile['ship_phone'] ?? ''),
            'shipStreet' => (string) ($profile['ship_street'] ?? ''),
            'shipStreet2' => (string) ($profile['ship_street2'] ?? ''),
            'shipCity' => (string) ($profile['ship_city'] ?? ''),
            'shipState' => (string) ($profile['ship_state'] ?? ''),
            'shipZip' => (string) ($profile['ship_zip'] ?? ''),
            'shipCountry' => (string) ($profile['ship_country'] ?? ''),
            'billName' => (string) ($profile['bill_name'] ?? ''),
            'billStreet' => (string) ($profile['bill_street'] ?? ''),
            'billStreet2' => (string) ($profile['bill_street2'] ?? ''),
            'billCity' => (string) ($profile['bill_city'] ?? ''),
            'billState' => (string) ($profile['bill_state'] ?? ''),
            'billZip' => (string) ($profile['bill_zip'] ?? ''),
            'billCountry' => (string) ($profile['bill_country'] ?? ''),
            'payCardType' => strtolower(trim((string) ($profile['pay_cardtype'] ?? ''))),
            'payCardMonth' => (string) ($profile['pay_cardmonth'] ?? ''),
            'payCardYear' => (string) ($profile['pay_cardyear'] ?? ''),
            'payCardName' => (string) ($profile['pay_cardname'] ?? ''),
            'payCardLast4' => (string) ($profile['pay_card_last4'] ?? ''),
            'points' => (int) ($profile['points'] ?? 0),
        ];
    }

    private function buildDraft(?array $customer, array $orderFields, array $browserStateFields, array $input): array
    {
        $input = $this->normalizeInput($input);
        $pointsApplied = $input['pointsApplied']
            ?? $orderFields['points_applied']
            ?? $browserStateFields['points_applied']
            ?? '0';

        return [
            'shipName' => (string) ($input['shipName'] ?? $orderFields['ship_name'] ?? ($customer['name'] ?? '')),
            'shipEmail' => (string) ($input['shipEmail'] ?? $orderFields['ship_email'] ?? ($customer['email'] ?? '')),
            'shipPhone' => (string) ($input['shipPhone'] ?? $orderFields['ship_phone'] ?? ($customer['shipPhone'] ?? '')),
            'shipStreet' => (string) ($input['shipStreet'] ?? $orderFields['ship_street'] ?? ($customer['shipStreet'] ?? '')),
            'shipStreet2' => (string) ($input['shipStreet2'] ?? $orderFields['ship_street2'] ?? ($customer['shipStreet2'] ?? '')),
            'shipCity' => (string) ($input['shipCity'] ?? $orderFields['ship_city'] ?? ($customer['shipCity'] ?? '')),
            'shipState' => (string) ($input['shipState'] ?? $orderFields['ship_state'] ?? ($customer['shipState'] ?? '')),
            'shipZip' => (string) ($input['shipZip'] ?? $orderFields['ship_zip'] ?? ($customer['shipZip'] ?? '')),
            'shipCountry' => (string) ($input['shipCountry'] ?? $orderFields['ship_country'] ?? ($customer['shipCountry'] ?? '')),
            'billName' => (string) ($input['billName'] ?? $orderFields['bill_name'] ?? ($customer['billName'] ?? $customer['name'] ?? '')),
            'billStreet' => (string) ($input['billStreet'] ?? $orderFields['bill_street'] ?? ($customer['billStreet'] ?? '')),
            'billStreet2' => (string) ($input['billStreet2'] ?? $orderFields['bill_street2'] ?? ($customer['billStreet2'] ?? '')),
            'billCity' => (string) ($input['billCity'] ?? $orderFields['bill_city'] ?? ($customer['billCity'] ?? '')),
            'billState' => (string) ($input['billState'] ?? $orderFields['bill_state'] ?? ($customer['billState'] ?? '')),
            'billZip' => (string) ($input['billZip'] ?? $orderFields['bill_zip'] ?? ($customer['billZip'] ?? '')),
            'billCountry' => (string) ($input['billCountry'] ?? $orderFields['bill_country'] ?? ($customer['billCountry'] ?? '')),
            'shipMethod' => (string) ($input['shipMethod'] ?? $orderFields['ship_method'] ?? $browserStateFields['ship_method'] ?? ''),
            'paymentType' => strtolower(trim((string) ($input['paymentType'] ?? $orderFields['pay_cardtype'] ?? $browserStateFields['pay_cardtype'] ?? ($customer['payCardType'] ?? '')))),
            'payCardName' => (string) ($input['payCardName'] ?? $orderFields['pay_cardname'] ?? ($customer['payCardName'] ?? '')),
            'payCardMonth' => (string) ($input['payCardMonth'] ?? $orderFields['pay_cardmonth'] ?? ($customer['payCardMonth'] ?? '')),
            'payCardYear' => (string) ($input['payCardYear'] ?? $orderFields['pay_cardyear'] ?? ($customer['payCardYear'] ?? '')),
            'payCardLast4' => (string) ($orderFields['pay_card_last4'] ?? ($customer['payCardLast4'] ?? '')),
            'payCardNumber' => (string) ($input['payCardNumber'] ?? ''),
            'promoCode' => (string) ($input['promoCode'] ?? $orderFields['promocode'] ?? $browserStateFields['promocode'] ?? ''),
            'pointsApplied' => max(0, (int) $pointsApplied),
            'euChoice' => (string) ($input['euChoice'] ?? $orderFields['eu_choice'] ?? $browserStateFields['eu_choice'] ?? ''),
        ];
    }

    private function normalizeInput(array $input): array
    {
        $normalized = [];
        foreach ($input as $key => $value) {
            if (!is_string($key)) {
                continue;
            }
            $normalized[$key] = is_scalar($value) ? trim((string) $value) : $value;
        }

        return $normalized;
    }

    private function buildRequirements(array $cart, ?array $customer): array
    {
        $summary = $cart['summary'] ?? [];
        $itemCount = (int) ($summary['itemCount'] ?? 0);
        $subtotal = (float) ($summary['subtotal'] ?? 0.0);
        $downloadableItemCount = (int) ($summary['downloadableItemCount'] ?? 0);
        $shippingRequired = $itemCount > 0 && $downloadableItemCount < $itemCount;
        $paymentRequired = $subtotal > 0.0;

        return [
            'requiresLogin' => true,
            'guestCheckoutAllowed' => false,
            'policy' => 'login-required',
            'policyReason' => 'legacy_submit_requires_customer_id',
            'shippingRequired' => $shippingRequired,
            'paymentRequired' => $paymentRequired,
            'availablePaymentTypes' => $paymentRequired ? ['paypal', ...self::CARD_PAYMENT_TYPES] : ['free'],
            'maxPointsApplicable' => (int) ($customer['points'] ?? 0),
        ];
    }

    private function validateDraft(array $cart, ?array $customer, array &$draft, array $requirements): array
    {
        $errors = [];

        if ((int) (($cart['summary']['itemCount'] ?? 0)) <= 0) {
            $errors['cart'][] = 'Your cart is empty.';
        }

        if ($customer === null) {
            $errors['auth'][] = 'Checkout requires an authenticated customer because legacy submit functions write by customer id.';
        }

        $this->requireField($errors, $draft, 'shipName', 'Shipping name is required.');
        $this->requireField($errors, $draft, 'shipEmail', 'Shipping email is required.');
        if ($draft['shipEmail'] !== '' && filter_var($draft['shipEmail'], FILTER_VALIDATE_EMAIL) === false) {
            $errors['shipEmail'][] = 'Shipping email must be a valid email address.';
        }

        if ($requirements['shippingRequired']) {
            foreach ([
                'shipStreet' => 'Shipping street is required.',
                'shipCity' => 'Shipping city is required.',
                'shipState' => 'Shipping state is required.',
                'shipZip' => 'Shipping zip is required.',
                'shipCountry' => 'Shipping country is required.',
                'shipMethod' => 'Shipping method is required.',
            ] as $field => $message) {
                $this->requireField($errors, $draft, $field, $message);
            }
        }

        if ($requirements['paymentRequired']) {
            foreach ([
                'billName' => 'Billing name is required.',
                'billStreet' => 'Billing street is required.',
                'billCity' => 'Billing city is required.',
                'billState' => 'Billing state is required.',
                'billZip' => 'Billing zip is required.',
                'billCountry' => 'Billing country is required.',
            ] as $field => $message) {
                $this->requireField($errors, $draft, $field, $message);
            }

            if ($draft['paymentType'] === '') {
                $errors['paymentType'][] = 'Payment type is required.';
            } elseif (!in_array($draft['paymentType'], $requirements['availablePaymentTypes'], true)) {
                $errors['paymentType'][] = 'Unsupported payment type.';
            }

            if (in_array($draft['paymentType'], self::CARD_PAYMENT_TYPES, true)) {
                $this->requireField($errors, $draft, 'payCardName', 'Cardholder name is required.');
                $this->requireField($errors, $draft, 'payCardMonth', 'Card expiration month is required.');
                $this->requireField($errors, $draft, 'payCardYear', 'Card expiration year is required.');
                $this->requireField($errors, $draft, 'payCardNumber', 'Card number is required.');

                if ($draft['payCardNumber'] !== '') {
                    $digits = preg_replace('/\D+/', '', $draft['payCardNumber']) ?? '';
                    if (strlen($digits) < 12 || strlen($digits) > 19) {
                        $errors['payCardNumber'][] = 'Card number must look like a real card number.';
                    }
                    $draft['payCardLast4'] = strlen($digits) >= 4 ? substr($digits, -4) : $draft['payCardLast4'];
                    $draft['payCardNumber'] = $digits;
                }

                if ($draft['payCardMonth'] !== '' && (!ctype_digit($draft['payCardMonth']) || (int) $draft['payCardMonth'] < 1 || (int) $draft['payCardMonth'] > 12)) {
                    $errors['payCardMonth'][] = 'Card expiration month must be between 1 and 12.';
                }
                if ($draft['payCardYear'] !== '' && (!ctype_digit($draft['payCardYear']) || strlen($draft['payCardYear']) !== 4)) {
                    $errors['payCardYear'][] = 'Card expiration year must be 4 digits.';
                }
            }
        } else {
            $draft['paymentType'] = 'free';
        }

        $pointsApplied = (int) ($draft['pointsApplied'] ?? 0);
        if ($pointsApplied > (int) ($customer['points'] ?? 0)) {
            $errors['pointsApplied'][] = 'Applied points exceed available customer points.';
        }

        return [
            'isValid' => $errors === [],
            'errors' => $errors,
        ];
    }

    private function requireField(array &$errors, array $draft, string $field, string $message): void
    {
        if (trim((string) ($draft[$field] ?? '')) === '') {
            $errors[$field][] = $message;
        }
    }
}
