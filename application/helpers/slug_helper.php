<?php
defined('BASEPATH') OR exit('No direct script access allowed');

if (!function_exists('create_slug')) {
    function create_slug($string) {
        $string = strtolower(trim($string));
        $string = preg_replace('/[^a-z0-9-]/', '-', $string);
        $string = preg_replace('/-+/', '-', $string);
        return trim($string, '-');
    }
}
