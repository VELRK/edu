<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
|--------------------------------------------------------------------------
| reCAPTCHA Configuration
|--------------------------------------------------------------------------
|
| Configuration for Google reCAPTCHA v3
|
| To get your reCAPTCHA keys:
| 1. Go to https://www.google.com/recaptcha/admin
| 2. Create a new site or use existing one
| 3. Select reCAPTCHA v3
| 4. Add your domain (e.g., localhost for testing)
| 5. Copy the Site Key and Secret Key
|
*/

$config['recaptcha'] = array(
    'site_key' => '6LdsMw4sAAAAAD-x_yrdzTGAt_xX8CdBsdhs0AmT', // reCAPTCHA Site Key
    'secret_key' => '6LdsMw4sAAAAAHKACPE4Xh6OGd6rB3_IGTe6JynU', // reCAPTCHA Secret Key (corrected)
    'threshold' => 0.5, // Score threshold for reCAPTCHA v3 (0.0 to 1.0)
    'enabled' => true // reCAPTCHA is enabled
);
