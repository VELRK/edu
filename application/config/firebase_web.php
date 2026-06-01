<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/*
|--------------------------------------------------------------------------
| Firebase Web Configuration
|--------------------------------------------------------------------------
|
| This file contains the Firebase web configuration for client-side
| authentication and messaging. You need to get these values from your
| Firebase Console under Project Settings > General > Your apps.
|
| STEPS TO GET YOUR FIREBASE WEB CONFIG:
| 1. Go to https://console.firebase.google.com/
| 2. Select your project: dvm-listing
| 3. Click the gear icon (Project Settings)
| 4. Scroll down to "Your apps" section
| 5. If you don't have a web app, click "Add app" and select Web
| 6. Copy the config values from the Firebase SDK snippet
|
*/

$config['firebase_web'] = array(
    'apiKey' => 'AIzaSyA7AmjUH_3PuRfpBuuUUfjwg3T6SVI4vnA', // ✅ Correct from Firebase Console
    'authDomain' => 'dvm-listing.firebaseapp.com',
    'projectId' => 'dvm-listing',
    'storageBucket' => 'dvm-listing.firebasestorage.app', // ✅ Updated from Firebase Console
    'messagingSenderId' => '500519495771', // ✅ Correct from Firebase Console
    'appId' => '1:500519495771:web:0a3505253f20f8fb28b77e' // ✅ Correct from Firebase Console
);
