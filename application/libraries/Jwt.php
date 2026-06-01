<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Jwt {

    private static function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64url_decode($data) {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
    }

    public static function encode($payload, $secret) {
        $header  = self::base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload = self::base64url_encode(json_encode($payload));
        $sig     = self::base64url_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
        return "$header.$payload.$sig";
    }

    public static function decode($token, $secret) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) throw new Exception('Invalid token format');
        list($header, $payload, $sig) = $parts;
        $expected = self::base64url_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
        if (!hash_equals($expected, $sig)) throw new Exception('Invalid signature');
        $data = json_decode(self::base64url_decode($payload), true);
        if (!$data) throw new Exception('Invalid payload');
        if (isset($data['exp']) && $data['exp'] < time()) throw new Exception('Token expired');
        return $data;
    }
}
