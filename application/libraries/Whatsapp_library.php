<?php
defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * WhatsApp Library
 * Supports multiple WhatsApp API providers
 */
class Whatsapp_library {

    private $provider;
    private $api_key;
    private $api_url;
    private $from_number;
    private $ci;

    public function __construct($config = array())
    {
        $this->ci =& get_instance();
        
        // Load config from config file or use provided config
        $this->ci->config->load('whatsapp', TRUE);
        $config = $this->ci->config->item('whatsapp') ?: $config;
        
        // Use config values if available, otherwise use defaults
        $this->provider = 'syncr';
        $this->api_key = '7fb0608e5260b2b542e729927a233b5a47100911028e51dfc481719a3fa5a5bba98ec5127f49547965dacfc3602c8228aa56ec758433dda3abe16ae217e2ae09';
        $this->api_url =    'https://waadmin.syncr.in/v1/message/send-message';
        $this->from_number =   '919790919412';
        
        // Debug: Log what was loaded (masked) for verification
        if (!empty($this->api_key)) {
            $masked_key = substr($this->api_key, 0, 8) . '...' . substr($this->api_key, -8);
            log_message('debug', 'Whatsapp_library initialized - Provider: ' . $this->provider . ', API Key: ' . $masked_key . ' (length: ' . strlen($this->api_key) . ')');
        } else {
            log_message('error', 'Whatsapp_library initialized - API Key is empty!');
        }
    }

    /**
     * Get current configuration status (for debugging)
     * @return array Configuration details
     */
    public function get_config_status()
    {
        return array(
            'provider' => $this->provider,
            'api_key_set' => !empty($this->api_key) && $this->api_key !== 'YOUR_SYNCR_TOKEN_HERE',
            'api_key_length' => strlen($this->api_key),
            'api_url' => $this->api_url,
            'from_number' => $this->from_number
        );
    }

    /**
     * Get cURL command for testing (development mode)
     * @param string $phone Phone number with country code
     * @param string $otp 6-digit OTP code
     * @return string cURL command string
     */
    public function get_curl_command($phone, $otp)
    {
        if ($this->provider === 'syncr' || $this->provider === 'waadmin') {
            // Format phone number - remove + sign for this API
            $phone_number = str_replace('+', '', $phone);
            
            // Build URL with token
            $base_url = !empty($this->api_url) ? $this->api_url : 'https://waadmin.syncr.in/v1/message/send-message';
            $url = $base_url . '?token=' . urlencode($this->api_key);
            
            // Prepare template data
            $data = array(
                'to' => $phone_number,
                'type' => 'template',
                'template' => array(
                    'language' => array(
                        'policy' => 'deterministic',
                        'code' => 'en'
                    ),
                    'name' => 'user_verified',
                    'components' => array(
                        array(
                            'type' => 'body',
                            'parameters' => array(
                                array(
                                    'type' => 'text',
                                    'text' => $otp
                                )
                            )
                        ),
                        array(
                            'type' => 'button',
                            'sub_type' => 'url',
                            'index' => '0',
                            'parameters' => array(
                                array(
                                    'type' => 'text',
                                    'text' => $otp
                                )
                            )
                        )
                    )
                )
            );
            
            $json_data = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            
            // Build cURL command
            $curl_cmd = "curl --location '" . $url . "' \\\n";
            $curl_cmd .= "  --header 'Content-Type: application/json' \\\n";
            $curl_cmd .= "  --data '" . str_replace("'", "'\\''", $json_data) . "'";
            
            return $curl_cmd;
        }
        
        return "cURL command not available for provider: " . $this->provider;
    }

    /**
     * Send OTP via WhatsApp
     * @param string $phone Phone number with country code
     * @param string $otp 6-digit OTP code
     * @return array Response array with success status and message
     */
    public function send_otp($phone, $otp)
    {
        // Format phone number (remove spaces, ensure it starts with country code)
        $phone = preg_replace('/[^0-9+]/', '', $phone);
        if (substr($phone, 0, 1) !== '+') {
            $phone = '+' . $phone;
        }

        $message = "Your OTP for login is: *{$otp}*. This OTP is valid for 10 minutes. Do not share this OTP with anyone.";

      

        switch ($this->provider) {
            case 'gupshup':
                return $this->send_via_gupshup($phone, $message);
            
            case 'twilio':
                return $this->send_via_twilio($phone, $message);
            
            case 'wati':
                return $this->send_via_wati($phone, $message);
            
            case '360dialog':
                return $this->send_via_360dialog($phone, $message);
            
            case 'messagebird':
                return $this->send_via_messagebird($phone, $message);
            
            case 'syncr':
            case 'waadmin':
                return $this->send_via_syncr($phone, $otp);
            
            default:
                return $this->send_via_gupshup($phone, $message);
        }
    }

    /**
     * Send via Gupshup API
     */
    private function send_via_gupshup($phone, $message)
    {
        // Use default Gupshup API URL if not provided
        $url = !empty($this->api_url) ? $this->api_url : 'https://api.gupshup.io/sm/api/v1/msg';
        
        // Prepare data array
        $data = array(
            'channel' => 'whatsapp',
            'source' => $this->from_number,
            'destination' => $phone,
            'message' => $message,
            'src.name' => 'SRIVISH' // Your WhatsApp Business name (max 25 chars)
        );

        // Add API key as query parameter (Gupshup accepts it both ways)
        $url_with_key = $url . '?apikey=' . urlencode($this->api_key);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url_with_key);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Content-Type: application/x-www-form-urlencoded',
            'Accept: application/json'
        ));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For testing, remove in production if you have proper SSL
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);

        // Log response for debugging (remove in production)
        log_message('debug', 'Gupshup Response: ' . $response . ' | HTTP Code: ' . $http_code);

        if ($curl_error) {
            return array('success' => false, 'message' => 'CURL Error: ' . $curl_error);
        }

        if ($http_code == 200 || $http_code == 202) {
            // Parse response to check for errors in response body
            $response_data = json_decode($response, true);
            if (isset($response_data['status']) && $response_data['status'] == 'success') {
                return array('success' => true, 'message' => 'OTP sent successfully');
            } elseif (isset($response_data['status']) && $response_data['status'] == 'error') {
                return array('success' => false, 'message' => 'Gupshup Error: ' . (isset($response_data['message']) ? $response_data['message'] : $response));
            } else {
                // Some Gupshup endpoints return success with 200 but different format
                return array('success' => true, 'message' => 'OTP sent successfully');
            }
        } else {
            // Try to parse error message
            $error_msg = $response;
            $response_data = json_decode($response, true);
            if (isset($response_data['message'])) {
                $error_msg = $response_data['message'];
            } elseif (isset($response_data['error'])) {
                $error_msg = $response_data['error'];
            }
            return array('success' => false, 'message' => 'Failed to send OTP: ' . $error_msg . ' (HTTP ' . $http_code . ')');
        }
    }

    /**
     * Send via Twilio WhatsApp API
     */
    private function send_via_twilio($phone, $message)
    {
        $account_sid = $this->api_key; // Twilio Account SID
        $auth_token = $this->api_url; // Twilio Auth Token (using api_url for auth token)
        $from = 'whatsapp:' . $this->from_number; // Twilio WhatsApp number
        
        $url = "https://api.twilio.com/2010-04-01/Accounts/{$account_sid}/Messages.json";
        
        $data = array(
            'From' => $from,
            'To' => 'whatsapp:' . $phone,
            'Body' => $message
        );

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERPWD, $account_sid . ':' . $auth_token);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http_code == 200 || $http_code == 201) {
            return array('success' => true, 'message' => 'OTP sent successfully');
        } else {
            return array('success' => false, 'message' => 'Failed to send OTP: ' . $response);
        }
    }

    /**
     * Send via Wati.io API
     */
    private function send_via_wati($phone, $message)
    {
        $url = $this->api_url ?: 'https://api.wati.io/v1/sendSessionMessage/' . $phone;
        
        $data = array(
            'messageText' => $message
        );

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Authorization: Bearer ' . $this->api_key,
            'Content-Type: application/json'
        ));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http_code == 200 || $http_code == 201) {
            return array('success' => true, 'message' => 'OTP sent successfully');
        } else {
            return array('success' => false, 'message' => 'Failed to send OTP: ' . $response);
        }
    }

    /**
     * Send via 360dialog API
     */
    private function send_via_360dialog($phone, $message)
    {
        $url = $this->api_url ?: 'https://waba-api.360dialog.io/v1/messages';
        
        $data = array(
            'to' => $phone,
            'type' => 'text',
            'text' => array(
                'body' => $message
            )
        );

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'D360-API-KEY: ' . $this->api_key,
            'Content-Type: application/json'
        ));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http_code == 200 || $http_code == 201) {
            return array('success' => true, 'message' => 'OTP sent successfully');
        } else {
            return array('success' => false, 'message' => 'Failed to send OTP: ' . $response);
        }
    }

    /**
     * Send via MessageBird API
     */
    private function send_via_messagebird($phone, $message)
    {
        $url = 'https://rest.messagebird.com/messages';
        
        $data = array(
            'recipients' => $phone,
            'originator' => $this->from_number,
            'body' => $message,
            'type' => 'text'
        );

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Authorization: AccessKey ' . $this->api_key,
            'Content-Type: application/x-www-form-urlencoded'
        ));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($http_code == 200 || $http_code == 201) {
            return array('success' => true, 'message' => 'OTP sent successfully');
        } else {
            return array('success' => false, 'message' => 'Failed to send OTP: ' . $response);
        }
    }

    /**
     * Send via Syncr/WAAdmin API (Template-based OTP)
     */
    private function send_via_syncr($phone, $otp)
    {
        // Validate API key is set
        if (empty($this->api_key) || trim($this->api_key) === '' || $this->api_key === 'YOUR_SYNCR_TOKEN_HERE') {
            log_message('error', 'Syncr/WAAdmin API key is not configured. Current value: ' . (empty($this->api_key) ? 'empty' : 'placeholder'));
            return array('success' => false, 'message' => 'WhatsApp API key is not configured. Please set your Syncr token in application/config/whatsapp.php');
        }
        
        // Log token status (masked) for debugging
        $token_length = strlen($this->api_key);
        $token_preview = substr($this->api_key, 0, 8) . '...' . substr($this->api_key, -8);
        log_message('debug', 'Syncr/WAAdmin: Using API token (length: ' . $token_length . ', preview: ' . $token_preview . ')');
        log_message('debug', 'Syncr/WAAdmin: Provider = ' . $this->provider);
        log_message('debug', 'Syncr/WAAdmin: API URL = ' . $this->api_url);
        
        // Additional check: verify provider matches
        if ($this->provider !== 'syncr' && $this->provider !== 'waadmin') {
            log_message('error', 'Syncr/WAAdmin: Provider mismatch. Expected syncr/waadmin, got: ' . $this->provider);
        }
        
        // Use custom API URL if provided, otherwise use default
        $base_url = !empty($this->api_url) ? $this->api_url : 'https://waadmin.syncr.in/v1/message/send-message';
        
        // Format phone number - remove + sign for this API (based on example: 9197XXXXXXXX)
        $phone_number = str_replace('+', '', $phone);
        
        // Prepare template data
        $data = array(
            'to' => $phone_number,
            'type' => 'template',
            'template' => array(
                'language' => array(
                    'policy' => 'deterministic',
                    'code' => 'en'
                ),
                'name' => 'user_verified', // Template name
                'components' => array(
                    array(
                        'type' => 'body',
                        'parameters' => array(
                            array(
                                'type' => 'text',
                                'text' => $otp
                            )
                        )
                    ),
                    array(
                        'type' => 'button',
                        'sub_type' => 'url',
                        'index' => '0',
                        'parameters' => array(
                            array(
                                'type' => 'text',
                                'text' => $otp
                            )
                        )
                    )
                )
            )
        );

        // Build URL with token as query parameter (as per API documentation)
        // Original cURL: curl --location 'https://waadmin.syncr.in/v1/message/send-message?token=<sample-token>'
        // The token should be URL encoded to handle special characters safely
        $url = $base_url . '?token=' . urlencode($this->api_key);
        
        // Log the actual URL being used (masked for security)
        $masked_url_for_log = preg_replace('/token=[^&]+/', 'token=***', $url);
        log_message('debug', 'Syncr/WAAdmin: Full request URL (masked): ' . $masked_url_for_log);
        log_message('debug', 'Syncr/WAAdmin: Token being sent (first 10 chars): ' . substr($this->api_key, 0, 10) . '...');
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Content-Type: application/json'
        ));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For testing, remove in production if you have proper SSL
        curl_setopt($ch, CURLOPT_TIMEOUT, 30); // 30 second timeout
        curl_setopt($ch, CURLOPT_VERBOSE, true); // Enable verbose output for debugging
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);

        // Log request and response for debugging (mask token in logs for security)
        $masked_url = preg_replace('/token=[^&]+/', 'token=***', $url);
        log_message('debug', 'Syncr/WAAdmin Request URL: ' . $masked_url);
        log_message('debug', 'Syncr/WAAdmin Request Data: ' . json_encode($data));
        log_message('debug', 'Syncr/WAAdmin Response: ' . $response . ' | HTTP Code: ' . $http_code);
        
        // Also log if token appears to be placeholder
        if ($this->api_key === 'YOUR_SYNCR_TOKEN_HERE' || empty(trim($this->api_key))) {
            log_message('error', 'Syncr/WAAdmin: API token appears to be placeholder or empty');
        }

        if ($curl_error) {
            log_message('error', 'Syncr/WAAdmin CURL Error: ' . $curl_error);
            return array('success' => false, 'message' => 'CURL Error: ' . $curl_error);
        }

        // Parse response
        $response_data = json_decode($response, true);

        // Check for successful HTTP status codes (200, 201, 202 are common for success)
        if ($http_code >= 200 && $http_code < 300) {
            // Check if response indicates success
            if (isset($response_data['status']) && ($response_data['status'] == 'success' || $response_data['status'] == 'sent' || $response_data['status'] == 'accepted')) {
                return array('success' => true, 'message' => 'OTP sent successfully');
            } elseif (isset($response_data['message']) && (stripos($response_data['message'], 'success') !== false || stripos($response_data['message'], 'sent') !== false)) {
                return array('success' => true, 'message' => 'OTP sent successfully');
            } elseif (empty($response_data) || !isset($response_data['error'])) {
                // If no error field, assume success for 2xx status codes
                return array('success' => true, 'message' => 'OTP sent successfully');
            } else {
                // Has error field even with 2xx status
                $error_msg = isset($response_data['error']) ? $response_data['error'] : (isset($response_data['message']) ? $response_data['message'] : 'Unknown error');
                return array('success' => false, 'message' => 'API Error: ' . $error_msg);
            }
        } else {
            // HTTP error status codes
            $error_msg = 'HTTP ' . $http_code;
            if (isset($response_data['message'])) {
                $error_msg = $response_data['message'];
            } elseif (isset($response_data['error'])) {
                $error_msg = is_array($response_data['error']) ? json_encode($response_data['error']) : $response_data['error'];
            } elseif (isset($response_data['errors'])) {
                $error_msg = is_array($response_data['errors']) ? implode(', ', $response_data['errors']) : $response_data['errors'];
            } elseif (!empty($response)) {
                $error_msg = $response;
            }
            log_message('error', 'Syncr/WAAdmin API Error: ' . $error_msg . ' | HTTP Code: ' . $http_code);
            return array('success' => false, 'message' => $error_msg);
        }
    }
}

