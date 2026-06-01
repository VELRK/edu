<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Home extends CI_Controller {

    public function index() {
        header('Content-Type: application/json');
        http_response_code(200);
        echo json_encode(['status' => 'ok', 'message' => 'API is running']);
        exit;
    }
}
